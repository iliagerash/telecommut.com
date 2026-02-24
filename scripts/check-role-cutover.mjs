import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src");

const includeExt = new Set([".ts", ".tsx", ".astro"]);
const ignoredFiles = new Set([
  path.resolve("src/db/schema.ts"),
  path.resolve("src/services/users/role-adapter.ts"),
]);

const forbiddenPatterns = [
  { label: "legacy role fallback helper", pattern: /\bresolveAccessRoleFromRecord\b/g },
  { label: "legacy normalized fallback helper", pattern: /\bresolveNormalizedUserRoleFromRecord\b/g },
  { label: "direct legacy type read", pattern: /\buserRecord\.type\b/g },
];

function collectFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(entryPath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!includeExt.has(path.extname(entry.name))) {
      continue;
    }

    files.push(entryPath);
  }

  return files;
}

const violations = [];

for (const file of collectFiles(root)) {
  if (ignoredFiles.has(file)) {
    continue;
  }

  const content = fs.readFileSync(file, "utf8");
  for (const forbidden of forbiddenPatterns) {
    let match = forbidden.pattern.exec(content);
    while (match) {
      const before = content.slice(0, match.index);
      const line = before.split("\n").length;
      violations.push({
        file: path.relative(process.cwd(), file),
        line,
        label: forbidden.label,
        snippet: match[0],
      });
      match = forbidden.pattern.exec(content);
    }
    forbidden.pattern.lastIndex = 0;
  }
}

if (violations.length > 0) {
  console.error("role cutover check failed. Found legacy role-read references:");
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line} ${violation.label} (${violation.snippet})`);
  }
  process.exit(2);
}

console.log("role cutover check passed");
