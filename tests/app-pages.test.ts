import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("app page scaffolds", () => {
  it("has profile workspace route", () => {
    const expectedFiles = [
      "src/pages/app/profile.astro",
    ];

    for (const file of expectedFiles) {
      expect(existsSync(path.resolve(file))).toBe(true);
    }
  });
});
