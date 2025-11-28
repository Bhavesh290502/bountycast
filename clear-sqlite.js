import sqlite3 from 'sqlite3';

const verbose = sqlite3.verbose();
const db = new verbose.Database('bountycast.db');

console.log('Clearing SQLite database...');

db.serialize(() => {
    db.run("DELETE FROM questions", (err) => {
        if (err) console.log('Error clearing questions:', err.message);
        else console.log('Cleared questions');
    });
    db.run("DELETE FROM answers", (err) => {
        if (err) console.log('Error clearing answers:', err.message);
        else console.log('Cleared answers');
    });
    db.run("DELETE FROM comments", (err) => {
        if (err) console.log('Error clearing comments (might not exist):', err.message);
        else console.log('Cleared comments');
    });
    db.run("DELETE FROM notifications", (err) => {
        if (err) console.log('Error clearing notifications (might not exist):', err.message);
        else console.log('Cleared notifications');
    });
    db.run("DELETE FROM user_notification_tokens", (err) => {
        if (err) console.log('Error clearing tokens (might not exist):', err.message);
        else console.log('Cleared tokens');
    });

    // Reset sequences
    db.run("DELETE FROM sqlite_sequence", (err) => {
        if (err) console.log('Error resetting sequences:', err.message);
        else console.log('Reset sequences');
    });
});

db.close();
