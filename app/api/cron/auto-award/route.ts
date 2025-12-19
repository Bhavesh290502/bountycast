import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { createWalletClient, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains'; // Assuming Base chain
import { bountycastAbi, BOUNTYCAST_ADDRESS } from '../../../../lib/contract';

// Prevent caching
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    // 1. Security Check (Vercel Cron)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.OWNER_PK) {
        return NextResponse.json({ error: 'Owner private key not configured' }, { status: 500 });
    }

    try {
        // 2. Setup Wallet
        const account = privateKeyToAccount(process.env.OWNER_PK as `0x${string}`);
        const client = createWalletClient({
            account,
            chain: base,
            transport: http()
        });
        const publicClient = createPublicClient({
            chain: base,
            transport: http()
        });

        // 3. Find Expired, Active Questions
        const now = Date.now();
        const { rows: expiredQuestions } = await sql`
            SELECT * FROM questions 
            WHERE status = 'active' 
            AND deadline < ${now}
        `;

        const results = [];

        for (const q of expiredQuestions) {
            // 4. Find Top Answer
            const { rows: answers } = await sql`
                SELECT * FROM answers 
                WHERE question_id = ${q.id}
            `;

            if (answers.length === 0) {
                // No answers -> Expire
                await sql`
                    UPDATE questions 
                    SET status = 'expired', updated_at = ${Date.now()}
                    WHERE id = ${q.id}
                `;
                results.push({ id: q.id, status: 'expired', reason: 'no answers' });
                continue;
            }

            // Sort by upvotes desc (using the cached count in answers table)
            const sortedAnswers = [...answers].sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
            const winner = sortedAnswers[0];

            if (!winner.address) {
                results.push({ id: q.id, status: 'skipped', reason: 'winner has no wallet address' });
                continue;
            }

            // 5. Award on Blockchain
            try {
                const hash = await client.writeContract({
                    address: BOUNTYCAST_ADDRESS,
                    abi: bountycastAbi,
                    functionName: 'awardBounty',
                    args: [BigInt(q.onchainid || q.onchain_id), winner.address],
                });

                // Wait for confirmation
                await publicClient.waitForTransactionReceipt({ hash });

                // 6. Update DB
                await sql`
                    UPDATE questions 
                    SET status = 'awarded', winner_fid = ${winner.fid}, updated_at = ${Date.now()}
                    WHERE id = ${q.id}
                `;

                results.push({ id: q.id, status: 'awarded', winner: winner.username, tx: hash });

            } catch (err: any) {
                console.error(`Failed to award question ${q.id}:`, err);
                results.push({ id: q.id, status: 'failed', error: err.message });
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
