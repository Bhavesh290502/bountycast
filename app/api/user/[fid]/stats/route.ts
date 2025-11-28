import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getUserProfile } from '../../../../../lib/neynar';

export async function GET(req: NextRequest, { params }: { params: any }) {
    const fid = Number(params.fid);
    if (!fid) {
        return NextResponse.json({ error: 'Invalid FID' }, { status: 400 });
    }

    try {
        // 1. Get User Profile (Neynar)
        const profile = await getUserProfile(fid);

        // 2. Get Stats (DB)
        const statsResult = await sql`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'awarded' AND winner_fid = ${fid}) as bounties_won,
                COALESCE(SUM(bounty) FILTER (WHERE status = 'awarded' AND winner_fid = ${fid}), 0) as total_earned,
                COUNT(*) FILTER (WHERE fid = ${fid}) as questions_asked
            FROM questions
        `;
        const stats = statsResult.rows[0];

        // 3. Get Recent Activity (Questions Asked)
        const activityResult = await sql`
            SELECT id, question, bounty, status, created 
            FROM questions 
            WHERE fid = ${fid} 
            ORDER BY created DESC 
            LIMIT 5
        `;

        return NextResponse.json({
            profile,
            stats: {
                bountiesWon: Number(stats.bounties_won),
                totalEarned: Number(stats.total_earned),
                questionsAsked: Number(stats.questions_asked)
            },
            recentActivity: activityResult.rows
        });

    } catch (error) {
        console.error('User Stats API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch user stats' }, { status: 500 });
    }
}
