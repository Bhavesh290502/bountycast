-- Add new columns to questions table
ALTER TABLE questions ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS tags TEXT[]; -- Array of tags
ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS updated_at BIGINT;

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  answer_id INTEGER REFERENCES answers(id) ON DELETE CASCADE,
  fid INTEGER,
  username TEXT,
  address TEXT,
  comment TEXT,
  created_at BIGINT
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_fid INTEGER,
  type TEXT, -- 'answer', 'upvote', 'bounty_won', 'comment'
  question_id INTEGER,
  answer_id INTEGER,
  from_fid INTEGER,
  message TEXT,
  read BOOLEAN DEFAULT false,
  created_at BIGINT
);

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_fid, read);
