import { sql } from '@vercel/postgres';

export async function sendFarcasterNotification(fid: number, title: string, body: string, targetUrl?: string) {
    try {
        const result = await sql`
            SELECT url, token FROM user_notification_tokens WHERE fid = ${fid}
        `;

        if (result.rows.length === 0) {
            return;
        }

        const { url, token } = result.rows[0];

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                notificationId: crypto.randomUUID(),
                title,
                body,
                targetUrl: targetUrl || 'https://bountycast.vercel.app',
                tokens: [token]
            })
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`Failed to send notification to FID ${fid}: ${response.status} ${text}`);

            // If token is invalid (4xx), maybe delete it?
            if (response.status >= 400 && response.status < 500) {
                await sql`DELETE FROM user_notification_tokens WHERE fid = ${fid}`;
            }
        }

    } catch (e) {
        console.error('Error sending notification:', e);
    }
}
