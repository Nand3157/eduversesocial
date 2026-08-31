import { logger } from "@/lib/logger";

/**
 * Rate limiting with a shared Upstash Redis backend when configured
 * (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN), falling back to an
 * in-memory limiter for development and single-instance deployments.
 *
 * The in-memory map cannot enforce limits across serverless instances — each
 * isolate keeps its own copy and cold starts wipe it — so production
 * deployments should always configure the Redis backend. Talks to the Upstash
 * REST API directly (INCR + PEXPIRE), so no SDK dependency is required.
 */
export type RateLimitResult = { allowed: boolean; remaining: number };

const requests = new Map<string, { count: number; resetAt: number }>();
const SWEEP_INTERVAL_MS = 60_000;
let lastSweepAt = 0;

function sweepExpired(now: number) {
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) return;
  lastSweepAt = now;
  for (const [key, entry] of requests) {
    if (now > entry.resetAt) requests.delete(key);
  }
}

function memoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweepExpired(now);
  const current = requests.get(key);
  if (!current || now > current.resetAt) { requests.set(key, { count: 1, resetAt: now + windowMs }); return { allowed: true, remaining: limit - 1 }; }
  if (current.count >= limit) return { allowed: false, remaining: 0 };
  current.count += 1; return { allowed: true, remaining: limit - current.count };
}

function upstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/+$/, ""), token } : null;
}

async function upstashFetch(config: { url: string; token: string }, path: string) {
  return fetch(`${config.url}${path}`, {
    headers: { Authorization: `Bearer ${config.token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(2_500)
  });
}

// Fixed-window counter in Redis. Only the first hit in a window sets the TTL,
// so later hits never extend it. If Redis is unreachable the limiter fails
// open to the in-memory fallback: a cache outage must not take the app down,
// and partial enforcement beats none.
async function upstashRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult | null> {
  const config = upstashConfig();
  if (!config) return null;
  const namespacedKey = encodeURIComponent(`eduverse:rl:${key}`);
  try {
    const incrResponse = await upstashFetch(config, `/incr/${namespacedKey}`);
    if (!incrResponse.ok) throw new Error(`INCR failed: HTTP ${incrResponse.status}`);
    const incrBody = await incrResponse.json() as { result?: number };
    const count = Number(incrBody.result);
    if (!Number.isFinite(count)) throw new Error("INCR returned a non-numeric count");
    if (count === 1) {
      try {
        await upstashFetch(config, `/pexpire/${namespacedKey}/${windowMs}`);
      } catch {
        // Best-effort: without a TTL the counter would stick, so reset it and
        // let this request through rather than locking the key forever.
        await upstashFetch(config, `/del/${namespacedKey}`).catch(() => undefined);
        return { allowed: true, remaining: limit - 1 };
      }
    }
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
  } catch (error) {
    logger.warn("rate_limit_redis_unavailable", { reason: error instanceof Error ? error.message : "unknown" });
    return null;
  }
}

export async function checkRateLimit(key: string, limit = 10, windowMs = 60_000): Promise<RateLimitResult> {
  const config = upstashConfig();
  const distributed = await upstashRateLimit(key, limit, windowMs);
  if (distributed) return distributed;
  // Production with Upstash must not fall back to per-isolate memory (bypassable via burst).
  // Fail closed so quota burn is safe; dev/test falls back to memory so tests still pass.
  if (config) {
    if (process.env.NODE_ENV === "production") {
      logger.error("rate_limit_degraded_fail_closed", { key });
      return { allowed: false, remaining: 0 };
    }
    logger.warn("rate_limit_redis_unavailable_falling_back_to_memory", { key });
    return memoryRateLimit(key, limit, windowMs);
  }
  if (process.env.NODE_ENV === "production") {
    logger.warn("rate_limit_no_upstash_falling_back_to_memory", { key });
  }
  return memoryRateLimit(key, limit, windowMs);
}

/** Number of tracked keys in the in-memory fallback; exposed for tests. */
export function rateLimiterSize() {
  return requests.size;
}
