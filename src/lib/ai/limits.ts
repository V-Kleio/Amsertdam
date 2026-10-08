import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

/**
 * Accept the common ways the Upstash URL gets pasted: with stray quotes or
 * whitespace, without a scheme ("xyz.upstash.io"), or as the TCP connection
 * string ("rediss://default:<pw>@xyz.upstash.io:6379"). The REST client only
 * understands "https://<host>", so normalize to that.
 */
function normalizeRestUrl(raw: string | undefined): string | undefined {
    const v = raw?.trim().replace(/^["']|["']$/g, "");
    if (!v) return undefined;
    const tcp = v.match(/^rediss?:\/\/(?:[^@]*@)?([^:/]+)/);
    if (tcp) return `https://${tcp[1]}`;
    return /^https?:\/\//.test(v) ? v : `https://${v}`;
}

// Created lazily, on first use, NOT at module load: a missing or malformed
// env var must surface as a handled runtime error (QuotaUnavailableError /
// cache miss), never crash `next build` while it collects page data.
let redisClient: Redis | null = null;
export function getRedis(): Redis {
    if (!redisClient) {
        const url = normalizeRestUrl(process.env.UPSTASH_REDIS_REST_URL);
        const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim().replace(/^["']|["']$/g, "");
        if (!url || !token) {
            throw new Error("UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set");
        }
        redisClient = new Redis({ url, token });
    }
    return redisClient;
}

// Spam guard: max 5 requests / 10s per identifier (user or IP).
let burstLimiterInstance: Ratelimit | null = null;
function getBurstLimiter(): Ratelimit {
    burstLimiterInstance ??= new Ratelimit({
        redis: getRedis(),
        limiter: Ratelimit.slidingWindow(5, "10 s"),
        prefix: "rl:burst",
    });
    return burstLimiterInstance;
}

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
        const used = (await getRedis().get<number>(quotaKey(userId))) ?? 0;
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
        const results = await Promise.all(ids.map((id) => getBurstLimiter().limit(id)));
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
        const used = await getRedis().incr(key);
        if (used === 1) await getRedis().expire(key, secondsUntilUtcMidnight());
        if (used > DAILY_QUOTA) {
            await getRedis().decr(key);       // roll back the over-count
            return null;
        }
        return DAILY_QUOTA - used;
    });
}

/** Give the unit back if the AI call failed — don't burn quota on errors. */
export async function refundQuota(userId: string): Promise<void> {
    await bestEffort(() => getRedis().decr(quotaKey(userId)));
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
        const used = await getRedis().incrby(key, n);
        await getRedis().expire(key, secondsUntilUtcMidnight());
        if (used > DAILY_QUOTA) {
            const rollback = Math.min(n, used - DAILY_QUOTA);
            if (rollback > 0) await getRedis().decrby(key, rollback);
            return n - rollback;
        }
        return n;
    });
}

/** Refund `n` units (e.g. items reserved up front but never produced). */
export async function refundQuotaN(userId: string, n: number): Promise<void> {
    if (n > 0) await bestEffort(() => getRedis().decrby(quotaKey(userId), n));
}