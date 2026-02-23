import { describe, expect, it } from "vitest";

import { findLegacyRedirect } from "../src/routing/legacy-redirects";

describe("legacy redirects", () => {
  it("resolves known legacy routes", () => {
    expect(findLegacyRedirect("/home")).toEqual({
      from: "/home",
      to: "/",
      status: 308,
    });
    expect(findLegacyRedirect("/privacy")?.to).toBe("/privacy-policy");
    expect(findLegacyRedirect("/job/search")?.to).toBe("/search/jobs");
  });

  it("returns null for non-legacy routes", () => {
    expect(findLegacyRedirect("/")).toBeNull();
    expect(findLegacyRedirect("/contact")).toBeNull();
    expect(findLegacyRedirect("/jobs/123")).toBeNull();
  });
});
