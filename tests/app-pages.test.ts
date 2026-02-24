import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("app page scaffolds", () => {
  it("has workspace layout and dashboard route", () => {
    const expectedFiles = [
      "src/layouts/app/AppLayout.astro",
      "src/pages/app/dashboard.astro",
    ];

    for (const file of expectedFiles) {
      expect(existsSync(path.resolve(file))).toBe(true);
    }
  });
});
