type Entry = {
  command: string;
  expiresAtMs: number;
};

const store = new Map<string, Entry>();

export function recordIdempotencyKey(input: {
  key: string;
  command: string;
  ttlMs?: number;
  nowMs?: number;
}): { accepted: boolean; retryAfterSeconds: number } {
  const ttlMs = input.ttlMs ?? 10 * 60 * 1000;
  const nowMs = input.nowMs ?? Date.now();
  const existing = store.get(input.key);

  if (existing && nowMs < existing.expiresAtMs && existing.command === input.command) {
    return {
      accepted: false,
      retryAfterSeconds: Math.ceil((existing.expiresAtMs - nowMs) / 1000),
    };
  }

  store.set(input.key, {
    command: input.command,
    expiresAtMs: nowMs + ttlMs,
  });

  return {
    accepted: true,
    retryAfterSeconds: 0,
  };
}

export function resetIdempotencyStore(): void {
  store.clear();
}
