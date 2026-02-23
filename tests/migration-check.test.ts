import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("migration baseline", () => {
  it("has drizzle config and initial migration", () => {
    expect(existsSync(path.resolve("drizzle.config.ts"))).toBe(true);
    expect(existsSync(path.resolve("drizzle/0000_outgoing_devos.sql"))).toBe(true);
  });
});
