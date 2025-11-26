// app/api/answers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
    const questionId = Number(new URL(req.url).searchParams.get('questionId'));
    if (!questionId) {
        return NextResponse.json(
            { error: 'questionId required' },
            { status: 400 }
        );
    }

    try {
        const { rows } = await sql`
      SELECT * FROM answers
      WHERE questionId = ${questionId}
      ORDER BY upvotes DESC, id ASC
    `;

        // Enrich with Neynar data
        const fids = rows.map(r => r.fid).filter(f => f > 0);
        if (fids.length > 0) {
            const { getBulkUserProfiles } = await import('../../../lib/neynar');
            const profiles = await getBulkUserProfiles(fids);

            const enrichedRows = rows.map(row => ({
                ...row,
                authorProfile: profiles[row.fid] || null
            }));
            return NextResponse.json(enrichedRows);
        }

        return NextResponse.json(rows);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}

import { checkEligibility } from '../../../lib/neynar';
import { sendFarcasterNotification } from '../../../lib/notifications';

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { questionId, fid, username, address, answer } = body || {};

    if (!questionId || !answer) {
        return NextResponse.json(
            { error: 'questionId and answer required' },
            { status: 400 }
        );
    }

    if (!fid) {
        return NextResponse.json(
            { error: 'fid required (please log in)' },
            { status: 400 }
        );
    }

    // Check Eligibility
    const eligibility = await checkEligibility(fid);
    if (!eligibility.allowed) {
        return NextResponse.json(
            { error: eligibility.reason },
            { status: 403 }
        );
    }

    try {
        // Check if user already answered this question
        const { rowCount } = await sql`
            SELECT 1 FROM answers 
            WHERE questionId = ${questionId} AND fid = ${fid}
        `;

        if (rowCount && rowCount > 0) {
            return NextResponse.json(
                { error: 'You have already answered this question' },
                { status: 400 }
            );
        }

        const { rows } = await sql`
      INSERT INTO answers (questionId, fid, username, address, answer, upvotes)
      VALUES (${questionId}, ${fid}, ${username || 'anon'}, ${address || ''}, ${answer}, 0)
      RETURNING id;
    `;

        // Create notification for question asker
        const questionResult = await sql`SELECT fid, question FROM questions WHERE id = ${questionId}`;
        if (questionResult.rows.length > 0) {
            const askerFid = questionResult.rows[0].fid;
            if (askerFid && askerFid !== fid) { // Don't notify if answering own question
                await sql`
                    INSERT INTO notifications (user_fid, type, question_id, answer_id, from_fid, message, created_at)
                    VALUES (${askerFid}, 'answer', ${questionId}, ${rows[0].id}, ${fid}, ${`${username || 'Someone'} answered your question`}, ${Date.now()})
                `;

                // Send Push Notification
                await sendFarcasterNotification(
                    askerFid,
                    "New Answer! 💡",
                    `${username || 'Someone'} answered your question: "${questionResult.rows[0].question.substring(0, 50)}..."`
                );
            }
        }

        return NextResponse.json({ id: rows[0].id });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Insert error' }, { status: 500 });
    }
}

