import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export async function GET() {
    try {
        // Add new columns to questions table
        await sql`ALTER TABLE questions ADD COLUMN IF NOT EXISTS category TEXT`;
        await sql`ALTER TABLE questions ADD COLUMN IF NOT EXISTS tags TEXT[]`;
        await sql`ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false`;
        await sql`ALTER TABLE questions ADD COLUMN IF NOT EXISTS updated_at BIGINT`;

        // Create comments table
        await sql`
            CREATE TABLE IF NOT EXISTS comments (
                id SERIAL PRIMARY KEY,
                answer_id INTEGER,
                fid INTEGER,
                username TEXT,
                address TEXT,
                comment TEXT,
                created_at BIGINT
            )
        `;

        // Create notifications table
        await sql`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_fid INTEGER,
                type TEXT,
                question_id INTEGER,
                answer_id INTEGER,
                from_fid INTEGER,
                message TEXT,
                read BOOLEAN DEFAULT false,
                created_at BIGINT
            )
        `;

        // Create indexes
        await sql`CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_fid, read)`;

        // Create user_notification_tokens table
        await sql`
            CREATE TABLE IF NOT EXISTS user_notification_tokens (
                fid INTEGER PRIMARY KEY,
                url TEXT,
                token TEXT,
                updated_at BIGINT
            )
        `;

        return NextResponse.json({
            success: true,
            message: 'Database migration completed successfully!'
        });
    } catch (error) {
        console.error('Migration error:', error);
        return NextResponse.json({
            error: 'Migration failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
