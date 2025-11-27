import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

import { sendFarcasterNotification } from '../../../../lib/notifications';

export async function POST(req: NextRequest) {
    try {
        const reqBody = await req.json();
        const { questionId, fid, txHash } = reqBody;

        if (!questionId || !fid || !txHash) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify the user owns this question
        const checkResult = await sql`SELECT fid FROM questions WHERE id = ${questionId}`;
        if (checkResult.rows.length === 0) {
            return NextResponse.json({ error: 'Question not found' }, { status: 404 });
        }

        if (checkResult.rows[0].fid !== fid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Update status to awarded
        // We could also store the txHash if we had a column for it, but for now status is enough
        await sql`
            UPDATE questions 
            SET status = 'awarded', winner_fid = ${reqBody.winnerFid || null}
            WHERE id = ${questionId}
        `;

        if (reqBody.winnerFid) {
            await sql`
                INSERT INTO notifications (user_fid, type, question_id, from_fid, message, created_at)
                VALUES (${reqBody.winnerFid}, 'bounty_won', ${questionId}, ${fid}, 'You won a bounty!', ${Date.now()})
            `;

            await sendFarcasterNotification(
                reqBody.winnerFid,
                "Bounty Won! 🏆",
                "You have been awarded a bounty! Check your wallet."
            );
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to resolve question' }, { status: 500 });
    }
}
