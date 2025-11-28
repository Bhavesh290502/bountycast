import { NextRequest, NextResponse } from 'next/server';
import { parseWebhookEvent, verifyAppKeyWithNeynar } from '@farcaster/miniapp-node';
import { sql } from '@vercel/postgres';

export async function POST(req: NextRequest) {
    const requestJson = await req.json();

    try {
        const data = await parseWebhookEvent(requestJson as any, verifyAppKeyWithNeynar as any) as any;

        if (data.event === 'notifications_enabled' || data.event === 'miniapp_added') {
            const { notificationDetails } = data;
            const fid = (requestJson as any).header.fid;

            if (notificationDetails && fid) {
                await sql`
                    INSERT INTO user_notification_tokens (fid, url, token, updated_at)
                    VALUES (${fid}, ${notificationDetails.url}, ${notificationDetails.token}, ${Date.now()})
                    ON CONFLICT (fid)
                    DO UPDATE SET url = ${notificationDetails.url}, token = ${notificationDetails.token}, updated_at = ${Date.now()};
                `;
            }
        } else if (data.event === 'notifications_disabled' || data.event === 'miniapp_removed') {
            const fid = (requestJson as any).header.fid;
            if (fid) {
                await sql`DELETE FROM user_notification_tokens WHERE fid = ${fid}`;
            }
        }

        return NextResponse.json({ success: true });
    } catch (e: unknown) {
        console.error('Webhook error:', e);
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
