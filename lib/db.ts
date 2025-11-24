// lib/db.ts
import { sql } from '@vercel/postgres';

export async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      fid INTEGER,
      username TEXT,
      address TEXT,
      question TEXT,
      bounty REAL,
      token TEXT,
      created BIGINT,
      deadline BIGINT,
      onchainId INTEGER,
      status TEXT,
      category TEXT,
      tags TEXT[],
      is_private BOOLEAN DEFAULT false,
      updated_at BIGINT
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS answers (
      id SERIAL PRIMARY KEY,
      questionId INTEGER,
      fid INTEGER,
      username TEXT,
      address TEXT,
      answer TEXT,
      upvotes INTEGER DEFAULT 0
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS comments (
      id SERIAL PRIMARY KEY,
      answer_id INTEGER REFERENCES answers(id) ON DELETE CASCADE,
      fid INTEGER,
      username TEXT,
      address TEXT,
      comment TEXT,
      created_at BIGINT
    );
  `;

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
    );
  `;

  // Create indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_fid, read);`;
}

export { sql };

