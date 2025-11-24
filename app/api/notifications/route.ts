import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const fid = searchParams.get('fid');

    if (!fid) {
        return NextResponse.json({ error: 'fid required' }, { status: 400 });
    }

    try {
        const { rows } = await sql`
            SELECT * FROM notifications 
            WHERE user_fid = ${fid}
            ORDER BY created_at DESC
            LIMIT 50
        `;
        return NextResponse.json(rows);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { notificationIds } = await req.json();

        if (!notificationIds || !Array.isArray(notificationIds)) {
            return NextResponse.json({ error: 'notificationIds array required' }, { status: 400 });
        }

        // Use parameterized query with proper array handling
        const placeholders = notificationIds.map((_, i) => `$${i + 1}`).join(',');
        await sql.query(
            `UPDATE notifications SET read = true WHERE id IN (${placeholders})`,
            notificationIds
        );

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
    }
}
