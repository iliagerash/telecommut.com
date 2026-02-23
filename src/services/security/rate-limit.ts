type LimitRecord = {
  count: number;
  resetAtMs: number;
};

const store = new Map<string, LimitRecord>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function checkRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
  nowMs?: number;
}): RateLimitResult {
  const nowMs = input.nowMs ?? Date.now();
  const current = store.get(input.key);

  if (!current || nowMs >= current.resetAtMs) {
    store.set(input.key, {
      count: 1,
      resetAtMs: nowMs + input.windowMs,
    });

    return {
      allowed: true,
      remaining: Math.max(0, input.limit - 1),
      retryAfterSeconds: 0,
    };
  }

  if (current.count >= input.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((current.resetAtMs - nowMs) / 1000),
    };
  }

  current.count += 1;
  store.set(input.key, current);

  return {
    allowed: true,
    remaining: Math.max(0, input.limit - current.count),
    retryAfterSeconds: 0,
  };
}

export function resetRateLimitStore(): void {
  store.clear();
}
