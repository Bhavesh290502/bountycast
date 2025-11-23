// app/api/answers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
    const questionId = Number(new URL(req.url).searchParams.get('questionId'));
    if (!questionId) {
        return NextResponse.json(
            { error: 'questionId required' },
            { status: 400 }
        );
    }

    try {
        const { rows } = await sql`
      SELECT * FROM answers
      WHERE questionId = ${questionId}
      ORDER BY upvotes DESC, id ASC
    `;
        return NextResponse.json(rows);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { questionId, fid, username, address, answer } = body || {};

    if (!questionId || !answer) {
        return NextResponse.json(
            { error: 'questionId and answer required' },
            { status: 400 }
        );
    }

    try {
        const { rows } = await sql`
      INSERT INTO answers (questionId, fid, username, address, answer, upvotes)
      VALUES (${questionId}, ${fid || 0}, ${username || 'anon'}, ${address || ''}, ${answer}, 0)
      RETURNING id;
    `;
        return NextResponse.json({ id: rows[0].id });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Insert error' }, { status: 500 });
    }
}

