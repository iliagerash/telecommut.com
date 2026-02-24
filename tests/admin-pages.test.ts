import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("admin page scaffolds", () => {
  it("has dashboard and table routes", () => {
    const expectedFiles = [
      "src/pages/admin/dashboard.astro",
      "src/pages/admin/jobs.astro",
      "src/pages/admin/resumes.astro",
      "src/pages/admin/users.astro",
      "src/pages/admin/seo.astro",
      "src/pages/admin/traffic.astro",
    ];

    for (const file of expectedFiles) {
      expect(existsSync(path.resolve(file))).toBe(true);
    }
  });
});
