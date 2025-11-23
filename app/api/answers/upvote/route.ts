// app/api/answers/upvote/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { id, fid } = body || {}; // id is answerId

    if (!id || !fid) {
        return NextResponse.json({ error: 'id and fid required' }, { status: 400 });
    }

    try {
        // Check if already upvoted
        const { rowCount } = await sql`
            SELECT 1 FROM upvotes WHERE answerId = ${id} AND fid = ${fid}
        `;

        if (rowCount && rowCount > 0) {
            return NextResponse.json({ error: 'Already upvoted' }, { status: 400 });
        }

        // Record upvote and increment count
        await sql`
            WITH inserted AS (
                INSERT INTO upvotes (answerId, fid, created)
                VALUES (${id}, ${fid}, ${Date.now()})
                RETURNING id
            )
            UPDATE answers SET upvotes = upvotes + 1 WHERE id = ${id}
        `;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Update error' }, { status: 500 });
    }
}

