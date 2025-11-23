import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { checkEligibility } from '../../../lib/neynar';

export async function GET() {
    try {
        const { rows } = await sql`SELECT * FROM questions ORDER BY created DESC`;
        return NextResponse.json(rows);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { fid, username, address, question, bounty, token, onchainId, deadline } = body || {};

    if (!question || !bounty) {
        return NextResponse.json(
            { error: 'Question and bounty required' },
            { status: 400 }
        );
    }

    if (fid) {
        const eligibility = await checkEligibility(fid);
        if (!eligibility.allowed) {
            return NextResponse.json(
                { error: eligibility.reason },
                { status: 403 }
            );
        }
    }

    try {
        const { rows } = await sql`
      INSERT INTO questions (fid, username, address, question, bounty, token, created, deadline, onchainId, status)
      VALUES (${fid || 0}, ${username || 'anon'}, ${address || ''}, ${question}, ${bounty}, ${token || 'ETH'}, ${Date.now()}, ${deadline}, ${onchainId}, 'active')
      RETURNING id;
    `;
        return NextResponse.json({ id: rows[0].id });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Insert error' }, { status: 500 });
    }
}
