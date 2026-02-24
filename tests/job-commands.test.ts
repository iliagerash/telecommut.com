import { describe, expect, it } from "vitest";

import {
  isManualOnlyCommand,
  isSchedulableCommand,
  parseJobCommand,
  requiresIdempotencyKey,
} from "../src/services/jobs/commands";

describe("job command parsing", () => {
  it("accepts supported commands", () => {
    expect(parseJobCommand("import")).toBe("import");
    expect(parseJobCommand("daily")).toBe("daily");
    expect(parseJobCommand("sitemap_ping")).toBe("sitemap_ping");
    expect(parseJobCommand("unknown")).toBeNull();
  });

  it("marks mutating commands as idempotency-protected", () => {
    expect(requiresIdempotencyKey("import")).toBe(true);
    expect(requiresIdempotencyKey("submit")).toBe(true);
    expect(requiresIdempotencyKey("daily")).toBe(false);
    expect(requiresIdempotencyKey("seo")).toBe(false);
  });

  it("separates schedulable and manual-only commands", () => {
    expect(isSchedulableCommand("daily")).toBe(true);
    expect(isSchedulableCommand("process_dedupe")).toBe(true);
    expect(isSchedulableCommand("import")).toBe(false);

    expect(isManualOnlyCommand("import")).toBe(true);
    expect(isManualOnlyCommand("reindex")).toBe(true);
    expect(isManualOnlyCommand("weekly")).toBe(false);
  });
});
