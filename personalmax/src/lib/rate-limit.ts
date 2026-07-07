// Fixed-cost sliding-window rate limiter, kept in process memory.
//
// Scope: first line of defense for auth endpoints and battle challenges.
// Layered with (a) Supabase Auth's own server-side rate limits on all
// /auth/v1 endpoints and (b) the database-enforced battle limit inside
// rpc_resolve_battle (max 10 challenges/hour, counted in Postgres), so a
// multi-instance deployment cannot bypass the battle limit even though this
// in-memory window is per-instance.

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket) {
    if (buckets.size >= MAX_BUCKETS) {
      // Drop the oldest entry to bound memory under key churn.
      const oldest = buckets.keys().next().value;
      if (oldest !== undefined) buckets.delete(oldest);
    }
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }

  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
  if (bucket.timestamps.length >= limit) {
    return false;
  }
  bucket.timestamps.push(now);
  return true;
}

export const LIMITS = {
  auth: { limit: 10, windowMs: 15 * 60 * 1000 },
  battle: { limit: 10, windowMs: 60 * 60 * 1000 },
  write: { limit: 120, windowMs: 60 * 1000 },
} as const;
