import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { createWalletClient, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { bountycastAbi, BOUNTYCAST_ADDRESS } from '../../../../lib/contract';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { questionId } = body;

        if (!questionId) {
            return NextResponse.json({ error: 'Question ID required' }, { status: 400 });
        }

        if (!process.env.OWNER_PK) {
            return NextResponse.json({ error: 'Owner private key not configured' }, { status: 500 });
        }

        // 1. Fetch Question
        const { rows } = await sql`SELECT * FROM questions WHERE id = ${questionId}`;
        const q = rows[0];

        if (!q) {
            return NextResponse.json({ error: 'Question not found' }, { status: 404 });
        }

        if (q.status !== 'active') {
            return NextResponse.json({ error: 'Question is not active' }, { status: 400 });
        }

        if (q.deadline > Date.now()) {
            return NextResponse.json({ error: 'Question has not expired yet' }, { status: 400 });
        }

        // 2. Fetch Answers
        const { rows: answers } = await sql`
            SELECT * FROM answers 
            WHERE questionId = ${q.id}
        `;

        if (answers.length === 0) {
            // Should have been handled by auto-expiry, but handle here just in case
            await sql`
                UPDATE questions 
                SET status = 'expired', updated_at = ${Date.now()}
                WHERE id = ${q.id}
            `;
            return NextResponse.json({ status: 'expired', message: 'No answers, marked as expired' });
        }

        // 3. Determine Winner
        // Sort by upvotes desc (using the cached count in answers table)
        const sortedAnswers = [...answers].sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
        const winner = sortedAnswers[0];

        if (!winner.address) {
            return NextResponse.json({ error: 'Winner has no wallet address' }, { status: 400 });
        }

        // 4. Award on Blockchain
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

        const hash = await client.writeContract({
            address: BOUNTYCAST_ADDRESS,
            abi: bountycastAbi,
            functionName: 'awardBounty',
            args: [BigInt(q.onchainid || q.onchain_id), winner.address],
        });

        await publicClient.waitForTransactionReceipt({ hash });

        // 5. Update DB
        await sql`
            UPDATE questions 
            SET status = 'awarded', winner_fid = ${winner.fid}, updated_at = ${Date.now()}
            WHERE id = ${q.id}
        `;

        return NextResponse.json({
            success: true,
            status: 'awarded',
            winner: winner.username,
            tx: hash
        });

    } catch (error: any) {
        console.error("Settlement error:", error);
        return NextResponse.json({ error: error.message || 'Failed to settle bounty' }, { status: 500 });
    }
}
