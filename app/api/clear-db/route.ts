import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { initDB } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const confirm = searchParams.get('confirm');

    if (confirm !== 'true') {
        return NextResponse.json({ error: 'Please add ?confirm=true to the URL to clear the database' }, { status: 400 });
    }

    try {
        // Initialize DB first to ensure tables exist
        await initDB();

        // Clear all tables
        // Using CASCADE to handle foreign key constraints if they exist
        try {
            await sql`TRUNCATE TABLE notifications, comments, answers, questions, user_notification_tokens CASCADE;`;
            return NextResponse.json({ message: 'Database cleared successfully (TRUNCATE)' });
        } catch (truncateError) {
            console.warn('TRUNCATE failed, attempting individual DELETEs:', truncateError);

            // Fallback to individual DELETEs
            const results = [];

            try { await sql`DELETE FROM notifications`; results.push('notifications'); } catch (e) { }
            try { await sql`DELETE FROM comments`; results.push('comments'); } catch (e) { }
            try { await sql`DELETE FROM answers`; results.push('answers'); } catch (e) { }
            try { await sql`DELETE FROM questions`; results.push('questions'); } catch (e) { }
            try { await sql`DELETE FROM user_notification_tokens`; results.push('user_notification_tokens'); } catch (e) { }

            return NextResponse.json({
                message: 'Database cleared successfully (DELETE)',
                cleared_tables: results
            });
        }
    } catch (error: any) {
        console.error('Failed to clear database:', error);
        return NextResponse.json({
            error: 'Failed to clear database',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
