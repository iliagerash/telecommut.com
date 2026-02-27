import { afterEach, describe, expect, it, vi } from "vitest";

import { serializeJsonLd, toAbsoluteUrl } from "../src/lib/seo";

describe("seo helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds absolute URLs from configured origin", () => {
    vi.stubEnv("PUBLIC_APP_URL", "https://telecommut.example");
    expect(toAbsoluteUrl("/jobs?page=2")).toBe("https://telecommut.example/jobs?page=2");
  });

  it("passes absolute URL through unchanged", () => {
    expect(toAbsoluteUrl("https://example.com/path")).toBe("https://example.com/path");
  });

  it("serializes JSON-LD payloads", () => {
    expect(serializeJsonLd(undefined)).toBeNull();
    expect(serializeJsonLd({ "@type": "WebSite" })).toBe("{\"@type\":\"WebSite\"}");
  });
});
