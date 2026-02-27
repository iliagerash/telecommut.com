import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("error page scaffolds", () => {
  it("has branded error route files", () => {
    const expectedFiles = [
      "src/pages/errors/401.astro",
      "src/pages/errors/403.astro",
      "src/pages/errors/404.astro",
      "src/pages/errors/429.astro",
      "src/pages/errors/500.astro",
      "src/pages/errors/503.astro",
    ];

    for (const file of expectedFiles) {
      expect(existsSync(path.resolve(file))).toBe(true);
    }
  });
});
