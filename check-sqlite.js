import sqlite3 from 'sqlite3';

const verbose = sqlite3.verbose();
const db = new verbose.Database('bountycast.db');

console.log('Connected to the bountycast.db database.');

db.serialize(() => {
    db.each("SELECT name FROM sqlite_master WHERE type='table'", (err, row) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Table:', row.name);
    });
});

db.close();
