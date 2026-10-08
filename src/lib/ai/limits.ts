import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

export const redis = Redis.fromEnv();

// Spam guard: max 5 requests / 10s per identifier (user or IP).
export const burstLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "10 s"),
    prefix: "rl:burst",
});

export const DAILY_QUOTA = 20;

/**
 * Thrown when the Redis quota store can't be reached (e.g. the Upstash
 * database was deleted or the env vars are wrong). Routes map this to a 503
 * with a readable message instead of a bare 500 "fetch failed".
 */
export class QuotaUnavailableError extends Error {
    constructor(cause?: unknown) {
        super("The free AI quota service is unavailable right now. Use a Premium model, or try again later.");
        this.name = "QuotaUnavailableError";
        console.error("[limits] Redis unavailable:", cause);
    }
}

async function guard<T>(fn: () => Promise<T>): Promise<T> {
    try {
        return await fn();
    } catch (err) {
        throw new QuotaUnavailableError(err);
    }
}

/** Best-effort Redis write (refunds): never fail the request over it. */
async function bestEffort(fn: () => Promise<unknown>): Promise<void> {
    try {
        await fn();
    } catch (err) {
        console.error("[limits] Redis refund failed:", err);
    }
}

// Seconds until the next UTC midnight (so the key auto-expires = daily reset).
function secondsUntilUtcMidnight(): number {
    const now = new Date();
    const next = new Date(Date.UTC(
        now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0,
    ));
    return Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 1000));
}

function quotaKey(userId: string): string {
    const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    return `quota:${userId}:${day}`;
}

export async function peekQuota(userId: string): Promise<number> {
    return guard(async () => {
        const used = (await redis.get<number>(quotaKey(userId))) ?? 0;
        return Math.max(0, DAILY_QUOTA - used);
    });
}

/** peekQuota for display only — null when Redis is unreachable. */
export async function peekQuotaOrNull(userId: string): Promise<number | null> {
    return peekQuota(userId).catch(() => null);
}

/**
 * Spam guard for several identifiers at once. Fails OPEN if Redis is down —
 * it's a burst limiter, not billing, so it shouldn't take the feature down.
 */
export async function burstAllowed(ids: string[]): Promise<boolean> {
    try {
        const results = await Promise.all(ids.map((id) => burstLimiter.limit(id)));
        return results.every((r) => r.success);
    } catch (err) {
        console.error("[limits] burst limiter unavailable, failing open:", err);
        return true;
    }
}

/** Atomically consume one unit. Returns remaining, or null if exhausted. */
export async function consumeQuota(userId: string): Promise<number | null> {
    return guard(async () => {
        const key = quotaKey(userId);
        const used = await redis.incr(key);
        if (used === 1) await redis.expire(key, secondsUntilUtcMidnight());
        if (used > DAILY_QUOTA) {
            await redis.decr(key);       // roll back the over-count
            return null;
        }
        return DAILY_QUOTA - used;
    });
}

/** Give the unit back if the AI call failed — don't burn quota on errors. */
export async function refundQuota(userId: string): Promise<void> {
    await bestEffort(() => redis.decr(quotaKey(userId)));
}

/**
 * Consume up to `n` units in one shot (per-card/question generation billing).
 * Consumes as many as fit under the daily cap, rolls back any overage, and
 * returns how many were ACTUALLY consumed (0 if the user is already at the cap).
 */
export async function consumeQuotaN(userId: string, n: number): Promise<number> {
    if (n <= 0) return 0;
    return guard(async () => {
        const key = quotaKey(userId);
        const used = await redis.incrby(key, n);
        await redis.expire(key, secondsUntilUtcMidnight());
        if (used > DAILY_QUOTA) {
            const rollback = Math.min(n, used - DAILY_QUOTA);
            if (rollback > 0) await redis.decrby(key, rollback);
            return n - rollback;
        }
        return n;
    });
}

/** Refund `n` units (e.g. items reserved up front but never produced). */
export async function refundQuotaN(userId: string, n: number): Promise<void> {
    if (n > 0) await bestEffort(() => redis.decrby(quotaKey(userId), n));
}