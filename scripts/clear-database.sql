-- Clear all test data from BountyCast database
-- Run this script before production deployment

-- Clear all tables in reverse dependency order
DELETE FROM comments;
DELETE FROM answers;
DELETE FROM upvotes;
DELETE FROM user_notification_tokens;
DELETE FROM questions;

-- Reset any sequences if needed (PostgreSQL auto-increments)
-- This ensures IDs start from 1 again
ALTER SEQUENCE IF EXISTS questions_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS answers_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS comments_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS upvotes_id_seq RESTART WITH 1;

-- Verify all tables are empty
SELECT 'questions' as table_name, COUNT(*) as count FROM questions
UNION ALL
SELECT 'answers', COUNT(*) FROM answers
UNION ALL
SELECT 'comments', COUNT(*) FROM comments
UNION ALL
SELECT 'upvotes', COUNT(*) FROM upvotes
UNION ALL
SELECT 'user_notification_tokens', COUNT(*) FROM user_notification_tokens;
