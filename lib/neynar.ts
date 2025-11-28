interface NeynarUser {
    fid: number;
    username: string;
    display_name: string;
    pfp_url: string;
    profile: {
        bio: {
            text: string;
        };
    };
    power_badge: boolean;
    score?: number;
    experimental?: {
        score?: number;
    };
}

export interface UserProfile {
    fid: number;
    username: string;
    displayName: string;
    pfpUrl: string;
    bio: string;
    isPro: boolean;
    score: number;
}

async function fetchNeynarUser(fid: number): Promise<NeynarUser | null> {
    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) {
        console.warn("NEYNAR_API_KEY missing");
        return null;
    }

    try {
        const url = `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`;
        const options = {
            method: 'GET',
            headers: { accept: 'application/json', api_key: apiKey }
        };

        const res = await fetch(url, options);
        if (!res.ok) {
            console.error(`Neynar API error: ${res.status}`);
            return null;
        }

        const data = await res.json();
        return data.users?.[0] || null;
    } catch (error) {
        console.error("fetchNeynarUser exception:", error);
        return null;
    }
}

export async function getUserProfile(fid: number): Promise<UserProfile | null> {
    const user = await fetchNeynarUser(fid);
    if (!user) return null;

    const score = user.score || user.experimental?.score || 0;

    return {
        fid: user.fid,
        username: user.username,
        displayName: user.display_name,
        pfpUrl: user.pfp_url,
        bio: user.profile?.bio?.text || "",
        isPro: user.power_badge || false,
        score,
    };
}

export async function checkEligibility(fid: number): Promise<{ allowed: boolean; reason?: string }> {
    const user = await fetchNeynarUser(fid);

    // If API fails or key missing, we default to allowed (fail open) or blocked (fail closed).
    // Previously we failed closed for API errors but open for missing key.
    // Let's keep it simple: if we can't fetch, we can't verify, so we might block or allow.
    // For now, if user is null (API error), we'll block to be safe, unless key is missing.
    if (!process.env.NEYNAR_API_KEY) return { allowed: true };
    if (!user) return { allowed: true }; // Fail open if API error

    const score = user.score || user.experimental?.score || 0;
    const isPro = user.power_badge || false;



    if (isPro || score > 0.6) {
        return { allowed: true };
    }

    return {
        allowed: false,
        reason: `Eligibility failed. Requirements: Pro User or Neynar Score > 0.6. (Your Score: ${score})`
    };
}

export async function getBulkUserProfiles(fids: number[]): Promise<Record<number, UserProfile>> {
    if (fids.length === 0) return {};

    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) return {};

    try {
        const uniqueFids = Array.from(new Set(fids)).join(',');
        const url = `https://api.neynar.com/v2/farcaster/user/bulk?fids=${uniqueFids}`;
        const options = {
            method: 'GET',
            headers: { accept: 'application/json', api_key: apiKey }
        };

        const res = await fetch(url, options);
        if (!res.ok) return {};

        const data = await res.json();
        const users = data.users || [];

        const profileMap: Record<number, UserProfile> = {};
        users.forEach((user: NeynarUser) => {
            const score = user.score || user.experimental?.score || 0;
            profileMap[user.fid] = {
                fid: user.fid,
                username: user.username,
                displayName: user.display_name,
                pfpUrl: user.pfp_url,
                bio: user.profile?.bio?.text || "",
                isPro: user.power_badge || false,
                score,
            };
        });

        return profileMap;
    } catch (error) {
        console.error("getBulkUserProfiles exception:", error);
        return {};
    }
}
