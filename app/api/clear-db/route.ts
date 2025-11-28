import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
    try {
        // Clear all tables
        // Using CASCADE to handle foreign key constraints if they exist
        // Note: TRUNCATE is faster than DELETE and resets identity columns (auto-increment IDs)

        await sql`TRUNCATE TABLE notifications, comments, answers, questions, user_notification_tokens CASCADE;`;

        return NextResponse.json({ message: 'Database cleared successfully' });
    } catch (error) {
        console.error('Failed to clear database:', error);
        console.log('Env vars:', Object.keys(process.env).filter(k => k.includes('POSTGRES') || k.includes('DATABASE')));

        // Fallback to DELETE if TRUNCATE fails (e.g. due to permissions or specific DB limitations)
        try {
            await sql`DELETE FROM notifications`;
            await sql`DELETE FROM comments`;
            await sql`DELETE FROM answers`;
            await sql`DELETE FROM questions`;
            await sql`DELETE FROM user_notification_tokens`;
            return NextResponse.json({ message: 'Database cleared successfully (via DELETE)' });
        } catch (deleteError) {
            console.error('Failed to clear database via DELETE:', deleteError);
            return NextResponse.json({ error: 'Failed to clear database' }, { status: 500 });
        }
    }
}
