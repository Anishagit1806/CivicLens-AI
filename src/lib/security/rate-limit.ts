interface BucketEntry {
  timestamps: number[];
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

const buckets = new Map<string, BucketEntry>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
  now = Date.now()
): RateLimitResult {
  const cutoff = now - windowMs;
  const entry = buckets.get(key) ?? { timestamps: [] };
  const valid = entry.timestamps.filter((ts) => ts > cutoff);

  if (valid.length >= maxRequests) {
    const oldest = valid[0] ?? now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    buckets.set(key, { timestamps: valid });
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  valid.push(now);
  buckets.set(key, { timestamps: valid });

  // Periodic pruning to avoid unbounded memory growth
  if (buckets.size > 2000) {
    for (const [bucketKey, bucketValue] of buckets.entries()) {
      const fresh = bucketValue.timestamps.filter((ts) => ts > cutoff);
      if (fresh.length === 0) {
        buckets.delete(bucketKey);
      } else {
        buckets.set(bucketKey, { timestamps: fresh });
      }
    }
  }

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - valid.length),
    retryAfterSeconds: 0,
  };
}

export function clearRateLimits(): void {
  buckets.clear();
}

export function getClientKey(request: Request, suffix = ''): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0]?.trim() || realIp?.trim() || 'local-client';
  return suffix ? `${ip}:${suffix}` : ip;
}
