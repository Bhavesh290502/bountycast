import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { checkEligibility } from '../../../../lib/neynar';

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { id, fid } = body || {}; // id is answerId

    if (!id || !fid) {
        return NextResponse.json({ error: 'id and fid required' }, { status: 400 });
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
        // Check if already upvoted
        const { rowCount } = await sql`
            SELECT 1 FROM upvotes WHERE answerId = ${id} AND fid = ${fid}
        `;

        if (rowCount && rowCount > 0) {
            // Already upvoted, so remove it (Undo)
            await sql`
                DELETE FROM upvotes WHERE answerId = ${id} AND fid = ${fid};
            `;
            await sql`
                UPDATE answers SET upvotes = GREATEST(0, upvotes - 1) WHERE id = ${id};
            `;
            return NextResponse.json({ success: true, action: 'removed' });
        } else {
            // Not upvoted, so add it
            await sql`
                WITH inserted AS (
                    INSERT INTO upvotes (answerId, fid, created)
                    VALUES (${id}, ${fid}, ${Date.now()})
                    RETURNING id
                )
                UPDATE answers SET upvotes = upvotes + 1 WHERE id = ${id}
            `;

            // Create notification for answer author
            const answerResult = await sql`SELECT fid, username FROM answers WHERE id = ${id}`;
            if (answerResult.rows.length > 0) {
                const answerAuthorFid = answerResult.rows[0].fid;
                if (answerAuthorFid && answerAuthorFid !== fid) { // Don't notify if upvoting own answer
                    await sql`
                        INSERT INTO notifications (user_fid, type, answer_id, from_fid, message, created_at)
                        VALUES (${answerAuthorFid}, 'upvote', ${id}, ${fid}, ${'Someone upvoted your answer'}, ${Date.now()})
                    `;
                }
            }
            return NextResponse.json({ success: true, action: 'added' });
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Update error' }, { status: 500 });
    }
}
