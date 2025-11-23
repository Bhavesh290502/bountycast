// app/api/questions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

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
    const {
        fid,
        username,
        pfpUrl,
        address,
        question,
        bounty,
        token,
        onchainId,
        deadline,
    } = body || {};

    if (!question || onchainId === undefined || !deadline) {
        return NextResponse.json(
            { error: 'question, onchainId, deadline required' },
            { status: 400 }
        );
    }

    const created = Date.now();

    try {
        const { rows } = await sql`
      INSERT INTO questions
      (fid, username, pfpUrl, address, question, bounty, token, created, deadline, onchainId, status)
      VALUES (
        ${fid || 0},
        ${username || 'anon'},
        ${pfpUrl || ''},
        ${address || ''},
        ${question},
        ${bounty || 0},
        ${token || 'ETH'},
        ${created},
        ${deadline},
        ${onchainId},
        'open'
      )
      RETURNING id;
    `;
        return NextResponse.json({ id: rows[0].id });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Insert error' }, { status: 500 });
    }
}

