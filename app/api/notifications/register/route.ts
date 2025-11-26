import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { fid, url, token } = body;

    if (!fid || !url || !token) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    try {
        await sql`
            INSERT INTO user_notification_tokens (fid, url, token, updated_at)
            VALUES (${fid}, ${url}, ${token}, ${Date.now()})
            ON CONFLICT (fid)
            DO UPDATE SET url = ${url}, token = ${token}, updated_at = ${Date.now()};
        `;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error registering notification token:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}
