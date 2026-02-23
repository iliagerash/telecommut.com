import { beforeEach, describe, expect, it } from "vitest";

import { checkRateLimit, resetRateLimitStore } from "../src/services/security/rate-limit";
import { isHoneypotTripped, isPlausibleEmail, sanitizeFreeText } from "../src/services/security/spam";

describe("security helpers", () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it("applies rate limits per key/window", () => {
    const now = 1_000_000;
    expect(checkRateLimit({ key: "k1", limit: 2, windowMs: 1000, nowMs: now }).allowed).toBe(true);
    expect(checkRateLimit({ key: "k1", limit: 2, windowMs: 1000, nowMs: now + 1 }).allowed).toBe(true);

    const blocked = checkRateLimit({ key: "k1", limit: 2, windowMs: 1000, nowMs: now + 2 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

    expect(checkRateLimit({ key: "k1", limit: 2, windowMs: 1000, nowMs: now + 1200 }).allowed).toBe(true);
  });

  it("detects honeypot and validates payload text", () => {
    expect(isHoneypotTripped("")).toBe(false);
    expect(isHoneypotTripped("bot-value")).toBe(true);
    expect(isPlausibleEmail("user@example.com")).toBe(true);
    expect(isPlausibleEmail("bad-email")).toBe(false);
    expect(sanitizeFreeText("  hello  ", 100)).toBe("hello");
    expect(sanitizeFreeText("abcdef", 3)).toBe("abc");
  });
});
