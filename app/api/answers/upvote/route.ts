// app/api/answers/upvote/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { id } = body || {};
    if (!id) {
        return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    try {
        await sql`UPDATE answers SET upvotes = upvotes + 1 WHERE id = ${id}`;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Update error' }, { status: 500 });
    }
}

