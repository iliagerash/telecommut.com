import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildApplicantLocationRequirements,
  serializeJsonLd,
  toAbsoluteUrl,
  WORLDWIDE_APPLICANT_COUNTRY_CODES,
} from "../src/lib/seo";

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

  it("uses the job country for applicantLocationRequirements", () => {
    expect(
      buildApplicantLocationRequirements({
        countryId: 12,
        countryCode: "de",
        countryName: "Germany",
      }),
    ).toEqual([{ "@type": "Country", name: "DE" }]);
  });

  it("uses a hardcoded country list for worldwide jobs", () => {
    expect(buildApplicantLocationRequirements({ countryId: 0 })).toEqual(
      WORLDWIDE_APPLICANT_COUNTRY_CODES.map((name) => ({ "@type": "Country", name })),
    );
    expect(WORLDWIDE_APPLICANT_COUNTRY_CODES).toEqual(["US", "CA", "GB", "AU", "NZ", "SG", "ZA"]);
  });
});
