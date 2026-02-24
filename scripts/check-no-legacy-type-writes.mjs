import fs from "node:fs";
import path from "node:path";

const srcRoot = path.resolve("src");
const includeExt = new Set([".ts", ".tsx", ".astro"]);

const violations = [];

function collectFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(entryPath));
      continue;
    }

    if (entry.isFile() && includeExt.has(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }

  return files;
}

for (const file of collectFiles(srcRoot)) {
  if (file.endsWith("src/db/schema.ts")) {
    continue;
  }

  const content = fs.readFileSync(file, "utf8");
  const pattern = /(insert\s*\(\s*users\s*\)\s*\.values\s*\(\s*\{[\s\S]*?\btype\s*:)|(update\s*\(\s*users\s*\)\s*\.set\s*\(\s*\{[\s\S]*?\btype\s*:)/g;

  let match = pattern.exec(content);
  while (match) {
    const before = content.slice(0, match.index);
    const line = before.split("\n").length;
    violations.push({
      file: path.relative(process.cwd(), file),
      line,
    });
    match = pattern.exec(content);
  }
}

if (violations.length > 0) {
  console.error("legacy users.type writes detected:");
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line}`);
  }
  process.exit(2);
}

console.log("legacy users.type write check passed");
