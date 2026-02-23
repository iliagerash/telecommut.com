import { existsSync } from "node:fs";
import { readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("migration baseline", () => {
  it("has drizzle config and initial migration", () => {
    expect(existsSync(path.resolve("drizzle.config.ts"))).toBe(true);
    const migrationFiles = readdirSync(path.resolve("drizzle")).filter((entry) => entry.endsWith(".sql"));
    expect(migrationFiles.length).toBeGreaterThan(0);
  });
});
