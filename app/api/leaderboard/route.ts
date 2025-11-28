import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getBulkUserProfiles } from '../../../lib/neynar';

export async function GET() {
    try {
        // Aggregate stats for winners
        const { rows } = await sql`
            SELECT 
                winner_fid as fid,
                COUNT(*) as bounties_won,
                SUM(bounty) as total_earned
            FROM questions 
            WHERE status = 'awarded' AND winner_fid IS NOT NULL
            GROUP BY winner_fid
            ORDER BY total_earned DESC
            LIMIT 20
        `;

        if (rows.length === 0) {
            return NextResponse.json([]);
        }

        // Fetch user profiles
        const fids = rows.map(r => r.fid);
        const profiles = await getBulkUserProfiles(fids);

        // Merge data
        const leaderboard = rows.map(row => ({
            fid: row.fid,
            bountiesWon: Number(row.bounties_won),
            totalEarned: Number(row.total_earned),
            profile: profiles[row.fid] || null
        }));

        return NextResponse.json(leaderboard);
    } catch (error) {
        console.error('Leaderboard API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }
}
