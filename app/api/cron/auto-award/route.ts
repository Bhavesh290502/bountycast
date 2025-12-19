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
        // Buffer reduced to 0 for immediate award (testing phase)
        const now = Date.now();
        const buffer = 0;
        const { rows: expiredQuestions } = await sql`
            SELECT * FROM questions 
            WHERE status = 'active' 
            AND deadline < ${now - buffer}
        `;

        console.log(`[Auto-Award] Found ${expiredQuestions.length} expired active questions.`);

        const results = [];

        for (const q of expiredQuestions) {
            console.log(`[Auto-Award] Processing Question ID: ${q.id}`);

            // 4. Find Top Answer
            const { rows: answers } = await sql`
                SELECT * FROM answers 
                WHERE questionId = ${q.id}
            `;

            console.log(`[Auto-Award] Question ${q.id} has ${answers.length} answers.`);

            if (answers.length === 0) {
                // No answers -> Expire
                console.log(`[Auto-Award] Expiring Question ${q.id} (no answers)`);
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
            console.log(`[Auto-Award] Winner for Question ${q.id} is ${winner?.username} (${winner?.address})`);

            if (!winner.address) {
                results.push({ id: q.id, status: 'skipped', reason: 'winner has no wallet address' });
                continue;
            }

            // 5. Award on Blockchain
            try {
                console.log(`[Auto-Award] Sending transaction for Question ${q.id}...`);
                const hash = await client.writeContract({
                    address: BOUNTYCAST_ADDRESS,
                    abi: bountycastAbi,
                    functionName: 'awardBounty',
                    args: [BigInt(q.onchainid || q.onchain_id), winner.address],
                });
                console.log(`[Auto-Award] Tx sent: ${hash}`);

                // Wait for confirmation
                await publicClient.waitForTransactionReceipt({ hash });
                console.log(`[Auto-Award] Tx confirmed: ${hash}`);

                // 6. Update DB
                await sql`
                    UPDATE questions 
                    SET status = 'awarded', winner_fid = ${winner.fid}, updated_at = ${Date.now()}
                    WHERE id = ${q.id}
                `;

                results.push({ id: q.id, status: 'awarded', winner: winner.username, tx: hash });

            } catch (err: any) {
                console.error(`[Auto-Award] Failed to award question ${q.id}:`, err);
                results.push({ id: q.id, status: 'failed', error: err.message });
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
