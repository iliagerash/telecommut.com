import { describe, expect, it } from "vitest";
import { evaluateJobHttpSemantics } from "../src/services/crawler/http-semantics";

describe("job detail semantics", () => {
  it("returns 410 for removed state", () => {
    const result = evaluateJobHttpSemantics(
      {
        id: "42",
        state: "removed",
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      new Request("http://localhost:4321/jobs/42"),
    );
    expect(result.status).toBe(410);
    expect(result.robots).toBe("noindex,nofollow");
  });

  it("returns 304 when conditional headers match", () => {
    const updatedAt = new Date("2026-01-01T00:00:00.000Z");
    const seed = evaluateJobHttpSemantics(
      { id: "42", state: "active", updatedAt },
      new Request("http://localhost:4321/jobs/42"),
    );
    const result = evaluateJobHttpSemantics(
      { id: "42", state: "active", updatedAt },
      new Request("http://localhost:4321/jobs/42", {
        headers: {
          "if-none-match": seed.etag,
        },
      }),
    );
    expect(result.status).toBe(304);
  });
});
