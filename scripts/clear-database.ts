// Script to clear all test data from the database
// Run this before production deployment

import { sql } from '@vercel/postgres';

async function clearDatabase() {
    try {
        console.log('🗑️  Starting database cleanup...\n');

        // Clear all tables in reverse dependency order
        console.log('Clearing comments...');
        const commentsResult = await sql`DELETE FROM comments`;
        console.log(`✅ Deleted ${commentsResult.rowCount} comments`);

        console.log('Clearing answers...');
        const answersResult = await sql`DELETE FROM answers`;
        console.log(`✅ Deleted ${answersResult.rowCount} answers`);

        console.log('Clearing upvotes...');
        const upvotesResult = await sql`DELETE FROM upvotes`;
        console.log(`✅ Deleted ${upvotesResult.rowCount} upvotes`);

        console.log('Clearing user notification tokens...');
        const tokensResult = await sql`DELETE FROM user_notification_tokens`;
        console.log(`✅ Deleted ${tokensResult.rowCount} notification tokens`);

        console.log('Clearing questions...');
        const questionsResult = await sql`DELETE FROM questions`;
        console.log(`✅ Deleted ${questionsResult.rowCount} questions`);

        // Reset sequences
        console.log('\n🔄 Resetting ID sequences...');
        await sql`ALTER SEQUENCE IF EXISTS questions_id_seq RESTART WITH 1`;
        await sql`ALTER SEQUENCE IF EXISTS answers_id_seq RESTART WITH 1`;
        await sql`ALTER SEQUENCE IF EXISTS comments_id_seq RESTART WITH 1`;
        await sql`ALTER SEQUENCE IF EXISTS upvotes_id_seq RESTART WITH 1`;
        console.log('✅ Sequences reset');

        // Verify all tables are empty
        console.log('\n📊 Verifying database is empty...');
        const verification = await sql`
            SELECT 'questions' as table_name, COUNT(*) as count FROM questions
            UNION ALL
            SELECT 'answers', COUNT(*) FROM answers
            UNION ALL
            SELECT 'comments', COUNT(*) FROM comments
            UNION ALL
            SELECT 'upvotes', COUNT(*) FROM upvotes
            UNION ALL
            SELECT 'user_notification_tokens', COUNT(*) FROM user_notification_tokens
        `;

        console.log('\nTable counts:');
        verification.rows.forEach(row => {
            console.log(`  ${row.table_name}: ${row.count}`);
        });

        console.log('\n✨ Database cleared successfully!');
        console.log('🚀 Ready for production deployment!\n');

    } catch (error) {
        console.error('❌ Error clearing database:', error);
        process.exit(1);
    }
}

clearDatabase();
