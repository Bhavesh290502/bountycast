const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('bountycast.db');

db.serialize(() => {
    db.all("SELECT sql FROM sqlite_master WHERE type='table' AND name='questions'", (err, rows) => {
        if (err) {
            console.error(err);
            return;
        }
        if (rows.length > 0) {
            console.log('CREATE statement:', rows[0].sql);
        } else {
            console.log('Table not found.');
        }
    });
});

db.close();
