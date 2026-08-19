/**
 * Lightweight in-memory limiter for development and single-instance deployments.
 * Replace the map with Upstash/Redis before running multiple application instances.
 *
 * Expired entries are swept periodically so the map cannot grow without bound
 * on a long-running server.
 */
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

export function checkRateLimit(key: string, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  sweepExpired(now);
  const current = requests.get(key);
  if (!current || now > current.resetAt) { requests.set(key, { count: 1, resetAt: now + windowMs }); return { allowed: true, remaining: limit - 1 }; }
  if (current.count >= limit) return { allowed: false, remaining: 0 };
  current.count += 1; return { allowed: true, remaining: limit - current.count };
}

/** Number of tracked keys; exposed for tests and observing the expiry sweep. */
export function rateLimiterSize() {
  return requests.size;
}
