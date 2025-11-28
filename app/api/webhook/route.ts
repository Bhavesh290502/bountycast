import { NextRequest, NextResponse } from 'next/server';
import { parseWebhookEvent, verifyAppKeyWithNeynar } from '@farcaster/miniapp-node';
import { sql } from '@vercel/postgres';
import type { WebhookEventData, WebhookRequest } from '../../../lib/farcaster-types';
import { Validators } from '../../../lib/validation';
import { ErrorResponses, formatErrorResponse } from '../../../lib/errors';
import { checkRateLimit } from '../../../lib/rate-limiter';
import { RATE_LIMIT_CONFIG } from '../../../lib/constants';

export async function POST(req: NextRequest) {
    const requestJson = await req.json() as WebhookRequest;

    try {
        const data = await parseWebhookEvent(requestJson as any, verifyAppKeyWithNeynar as any) as unknown as WebhookEventData;

        if (data.event === 'notifications_enabled' || data.event === 'miniapp_added') {
            const { notificationDetails } = data;
            const fid = requestJson.header.fid;

            // Validate FID
            const fidValidation = Validators.fid(fid);
            if (!fidValidation.valid) {
                const error = ErrorResponses.VALIDATION_ERROR(fidValidation.error!);
                const formatted = formatErrorResponse(error);
                return NextResponse.json(
                    { error: formatted.error, code: formatted.code },
                    { status: formatted.statusCode }
                );
            }

            // Rate limiting
            const rateLimit = checkRateLimit(
                `webhook:${fid}`,
                RATE_LIMIT_CONFIG.NOTIFICATIONS_PER_MINUTE,
                60 * 1000 // 1 minute
            );

            if (!rateLimit.allowed) {
                const error = ErrorResponses.RATE_LIMIT_EXCEEDED();
                const formatted = formatErrorResponse(error);
                return NextResponse.json(
                    { error: formatted.error, code: formatted.code },
                    { status: formatted.statusCode }
                );
            }

            // Validate notification details
            if (notificationDetails) {
                const validation = Validators.notificationDetails(notificationDetails);
                if (!validation.valid) {
                    const error = ErrorResponses.VALIDATION_ERROR(validation.error!);
                    const formatted = formatErrorResponse(error);
                    return NextResponse.json(
                        { error: formatted.error, code: formatted.code },
                        { status: formatted.statusCode }
                    );
                }

                await sql`
                    INSERT INTO user_notification_tokens (fid, url, token, updated_at)
                    VALUES (${fid}, ${notificationDetails.url}, ${notificationDetails.token}, ${Date.now()})
                    ON CONFLICT (fid)
                    DO UPDATE SET url = ${notificationDetails.url}, token = ${notificationDetails.token}, updated_at = ${Date.now()};
                `;
            }
        } else if (data.event === 'notifications_disabled' || data.event === 'miniapp_removed') {
            const fid = requestJson.header.fid;
            if (fid) {
                await sql`DELETE FROM user_notification_tokens WHERE fid = ${fid}`;
            }
        }

        return NextResponse.json({ success: true });
    } catch (e: unknown) {
        const formattedError = formatErrorResponse(ErrorResponses.INTERNAL_ERROR('Webhook processing failed'));
        return NextResponse.json(
            { error: formattedError.error, code: formattedError.code },
            { status: formattedError.statusCode }
        );
    }
}
