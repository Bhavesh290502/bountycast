// pages/api/questions.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../lib/db';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        db.all(
            'SELECT * FROM questions ORDER BY created DESC',
            (err, rows) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'DB error' });
                }
                return res.status(200).json(rows || []);
            }
        );
    } else if (req.method === 'POST') {
        const { fid, username, question, bounty, token } = req.body || {};
        if (!question) {
            return res.status(400).json({ error: 'Question required' });
        }

        const created = Date.now();
        const expires = created + 7 * 24 * 60 * 60 * 1000; // 7 days

        db.run(
            'INSERT INTO questions (fid, username, question, bounty, token, created, expires) VALUES (?,?,?,?,?,?,?)',
            [fid || 0, username || 'anon', question, bounty || 0, token || 'ETH', created, expires],
            function (err) {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Insert error' });
                }
                return res.status(200).json({ id: this.lastID });
            }
        );
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end('Method Not Allowed');
    }
}
