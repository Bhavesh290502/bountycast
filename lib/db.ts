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
      status TEXT
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
}

export { sql };

