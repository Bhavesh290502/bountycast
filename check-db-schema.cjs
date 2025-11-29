const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function checkSchema() {
    try {
        const result = await sql`SELECT * FROM questions LIMIT 1`;
        if (result.rows.length > 0) {
            console.log('Row keys:', Object.keys(result.rows[0]));
            console.log('Sample row:', result.rows[0]);
        } else {
            console.log('No rows found in questions table.');
        }
    } catch (e) {
        console.error(e);
    }
}

checkSchema();
