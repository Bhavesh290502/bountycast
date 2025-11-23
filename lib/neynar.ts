export async function checkEligibility(fid: number): Promise<{ allowed: boolean; reason?: string }> {
    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) {
        console.warn("NEYNAR_API_KEY missing in env, skipping eligibility check.");
        return { allowed: true };
    }

    try {
        const url = `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`;
        const options = {
            method: 'GET',
            headers: { accept: 'application/json', api_key: apiKey }
        };

        const res = await fetch(url, options);

        if (!res.ok) {
            console.error(`Neynar API error: ${res.status} ${res.statusText}`);
            // Fail closed if API errors? Or open? 
            // Let's fail closed for security/exclusivity, but log it.
            return { allowed: false, reason: "Unable to verify eligibility (API error)" };
        }

        const data = await res.json();
        const user = data.users?.[0];

        if (!user) {
            return { allowed: false, reason: "User not found on Farcaster" };
        }

        // Logic: Pro User (Power Badge) OR Neynar Score > 0.6
        // Note: 'score' is sometimes at the top level of user, or experimental.
        // We'll check common locations.
        const score = user.score || user.experimental?.score || 0;
        const isPro = user.power_badge || false;

        console.log(`Eligibility Check [FID:${fid}]: Pro=${isPro}, Score=${score}`);

        if (isPro || score > 0.6) {
            return { allowed: true };
        }

        return {
            allowed: false,
            reason: `Eligibility failed. Requirements: Pro User or Neynar Score > 0.6. (Your Score: ${score})`
        };

    } catch (error) {
        console.error("Neynar check exception:", error);
        return { allowed: false, reason: "Eligibility check failed (Internal Error)" };
    }
}
