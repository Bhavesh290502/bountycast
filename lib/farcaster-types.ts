// Type definitions for Farcaster SDK responses

export interface FarcasterContext {
    user?: {
        fid: number;
        username?: string;
    };
    viewer?: {
        fid: number;
        username?: string;
    };
    client?: {
        added?: boolean;
        notificationDetails?: {
            url: string;
            token: string;
        };
    };
}

export interface AddFrameResult {
    notificationDetails?: {
        url: string;
        token: string;
    };
}

export interface WebhookEventData {
    event: 'notifications_enabled' | 'miniapp_added' | 'notifications_disabled' | 'miniapp_removed';
    notificationDetails?: {
        url: string;
        token: string;
    };
}

export interface WebhookRequest {
    header: {
        fid: number;
    };
}
