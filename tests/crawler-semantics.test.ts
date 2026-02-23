import { describe, expect, it } from "vitest";

import { evaluateJobHttpSemantics } from "../src/services/crawler/http-semantics";

const baseInput = {
  id: "123",
  state: "active" as const,
  updatedAt: new Date("2026-02-20T10:00:00.000Z"),
};

describe("job crawler semantics", () => {
  it("returns 200 for active jobs without conditionals", () => {
    const request = new Request("https://example.com/jobs/123");
    const result = evaluateJobHttpSemantics(baseInput, request);
    expect(result.status).toBe(200);
    expect(result.robots).toBe("index,follow");
  });

  it("returns 304 when etag matches if-none-match", () => {
    const first = evaluateJobHttpSemantics(baseInput, new Request("https://example.com/jobs/123"));
    const request = new Request("https://example.com/jobs/123", {
      headers: {
        "if-none-match": first.etag,
      },
    });
    const result = evaluateJobHttpSemantics(baseInput, request);
    expect(result.status).toBe(304);
  });

  it("returns 410 for expired/removed jobs", () => {
    const request = new Request("https://example.com/jobs/123");
    const expired = evaluateJobHttpSemantics({ ...baseInput, state: "expired" }, request);
    const removed = evaluateJobHttpSemantics({ ...baseInput, state: "removed" }, request);
    expect(expired.status).toBe(410);
    expect(removed.status).toBe(410);
    expect(expired.robots).toBe("noindex,nofollow");
  });
});
