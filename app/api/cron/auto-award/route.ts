import { NextResponse } from 'next/server';
import { createWalletClient, http, publicActions } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { sql } from '@vercel/postgres';
import { bountycastAbi, BOUNTYCAST_ADDRESS } from '../../../../lib/contract';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const ownerPk = process.env.OWNER_PK;
        if (!ownerPk) {
            return NextResponse.json({ error: 'OWNER_PK not configured' }, { status: 500 });
        }

        const account = privateKeyToAccount(ownerPk as `0x${string}`);
        const client = createWalletClient({
            account,
            chain: baseSepolia,
            transport: http(),
        }).extend(publicActions);

        const now = Date.now();

        // 1. Find open questions where deadline has passed
        // Note: Postgres stores deadline as BIGINT (ms since epoch)
        const { rows: questions } = await sql`
            SELECT * FROM questions 
            WHERE status = 'open' 
            AND deadline <= ${now}
            AND onchainid IS NOT NULL
            AND onchainid > -1
        `;

        const results = [];

        for (const q of questions) {
            // 2. Find top answer for each question
            const { rows: answers } = await sql`
                SELECT * FROM answers 
                WHERE question_id = ${q.id}
                ORDER BY upvotes DESC, id ASC
                LIMIT 1
            `;

            if (answers.length > 0) {
                const winner = answers[0];
                if (winner.address) {
                    try {
                        // 3. Call awardBounty on contract
                        const hash = await client.writeContract({
                            address: BOUNTYCAST_ADDRESS,
                            abi: bountycastAbi,
                            functionName: 'awardBounty',
                            args: [BigInt(q.onchainid), winner.address as `0x${string}`],
                        });

                        // 4. Update DB status
                        await sql`
                            UPDATE questions 
                            SET status = 'awarded' 
                            WHERE id = ${q.id}
                        `;

                        results.push({
                            questionId: q.id,
                            winner: winner.address,
                            tx: hash,
                            status: 'awarded'
                        });
                    } catch (e: any) {
                        console.error(`Failed to award question ${q.id}:`, e);
                        results.push({
                            questionId: q.id,
                            error: e.message
                        });
                    }
                } else {
                    results.push({ questionId: q.id, status: 'skipped_no_winner_address' });
                }
            } else {
                // No answers? Maybe refund? For now, just skip.
                results.push({ questionId: q.id, status: 'skipped_no_answers' });
            }
        }

        return NextResponse.json({ success: true, processed: results.length, results });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
