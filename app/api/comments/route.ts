import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const answerId = searchParams.get('answerId');

    if (!answerId) {
        return NextResponse.json({ error: 'answerId required' }, { status: 400 });
    }

    try {
        const { rows } = await sql`
            SELECT * FROM comments 
            WHERE answer_id = ${answerId}
            ORDER BY created_at ASC
        `;
        return NextResponse.json(rows);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to load comments' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { answerId, fid, username, address, comment } = await req.json();

        if (!answerId || !comment || !fid) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const createdAt = Date.now();

        await sql`
            INSERT INTO comments (answer_id, fid, username, address, comment, created_at)
            VALUES (${answerId}, ${fid}, ${username}, ${address}, ${comment}, ${createdAt})
        `;

        // Create notification for answer author
        const answerResult = await sql`SELECT fid FROM answers WHERE id = ${answerId}`;
        if (answerResult.rows.length > 0) {
            const answerAuthorFid = answerResult.rows[0].fid;
            if (answerAuthorFid !== fid) { // Don't notify if commenting on own answer
                await sql`
                    INSERT INTO notifications (user_fid, type, answer_id, from_fid, message, created_at)
                    VALUES (${answerAuthorFid}, 'comment', ${answerId}, ${fid}, ${`${username} commented on your answer`}, ${createdAt})
                `;
            }
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
    }
}
