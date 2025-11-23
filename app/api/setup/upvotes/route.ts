import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
    try {
        await sql`
      CREATE TABLE IF NOT EXISTS upvotes (
        id SERIAL PRIMARY KEY,
        answer_id INTEGER REFERENCES answers(id),
        fid INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(answer_id, fid)
      );
    `;
        return NextResponse.json({ success: true, message: 'Table upvotes created' });
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}
