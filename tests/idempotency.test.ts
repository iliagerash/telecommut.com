import { beforeEach, describe, expect, it } from "vitest";

import { recordIdempotencyKey, resetIdempotencyStore } from "../src/services/jobs/idempotency";

describe("idempotency store", () => {
  beforeEach(() => {
    resetIdempotencyStore();
  });

  it("accepts first invocation and rejects duplicate within ttl", () => {
    const t0 = 1000;
    const first = recordIdempotencyKey({ key: "k1", command: "import", nowMs: t0, ttlMs: 1000 });
    const second = recordIdempotencyKey({ key: "k1", command: "import", nowMs: t0 + 200, ttlMs: 1000 });

    expect(first.accepted).toBe(true);
    expect(second.accepted).toBe(false);
    expect(second.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("allows reuse after ttl expiration", () => {
    const t0 = 2000;
    recordIdempotencyKey({ key: "k2", command: "submit", nowMs: t0, ttlMs: 1000 });
    const later = recordIdempotencyKey({ key: "k2", command: "submit", nowMs: t0 + 1500, ttlMs: 1000 });

    expect(later.accepted).toBe(true);
  });
});
