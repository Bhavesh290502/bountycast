// Simple in-memory rate limiter for API routes
// For production, consider using Redis or Upstash

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

class RateLimiter {
    private store: Map<string, RateLimitEntry> = new Map();
    private cleanupInterval: NodeJS.Timeout;

    constructor() {
        // Cleanup expired entries every 5 minutes
        this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }

    private cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
            if (now > entry.resetTime) {
                this.store.delete(key);
            }
        }
    }

    check(identifier: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetTime: number } {
        const now = Date.now();
        const entry = this.store.get(identifier);

        if (!entry || now > entry.resetTime) {
            // New window
            const resetTime = now + windowMs;
            this.store.set(identifier, { count: 1, resetTime });
            return { allowed: true, remaining: limit - 1, resetTime };
        }

        if (entry.count >= limit) {
            // Rate limit exceeded
            return { allowed: false, remaining: 0, resetTime: entry.resetTime };
        }

        // Increment count
        entry.count++;
        this.store.set(identifier, entry);
        return { allowed: true, remaining: limit - entry.count, resetTime: entry.resetTime };
    }

    destroy() {
        clearInterval(this.cleanupInterval);
        this.store.clear();
    }
}

// Singleton instance
const rateLimiter = new RateLimiter();

export default rateLimiter;

// Helper function for API routes
export function checkRateLimit(
    identifier: string,
    limit: number,
    windowMs: number
): { allowed: boolean; remaining: number; resetTime: number } {
    return rateLimiter.check(identifier, limit, windowMs);
}
