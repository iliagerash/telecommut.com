import fs from "node:fs";
import path from "node:path";

function requireContains(filePath, pattern, label) {
  const content = fs.readFileSync(filePath, "utf8");
  if (!pattern.test(content)) {
    throw new Error(`${label} missing in ${path.relative(process.cwd(), filePath)}`);
  }
}

function requireFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required asset: ${path.relative(process.cwd(), filePath)}`);
  }
}

function requireSvgSize(filePath, expectedWidth, expectedHeight) {
  const content = fs.readFileSync(filePath, "utf8");
  const widthMatch = content.match(/width="(\d+)"/i);
  const heightMatch = content.match(/height="(\d+)"/i);

  if (!widthMatch || !heightMatch) {
    throw new Error(`SVG size attributes missing in ${path.relative(process.cwd(), filePath)}`);
  }

  const width = Number(widthMatch[1]);
  const height = Number(heightMatch[1]);

  if (width !== expectedWidth || height !== expectedHeight) {
    throw new Error(
      `Unexpected SVG size in ${path.relative(process.cwd(), filePath)}: ${width}x${height} (expected ${expectedWidth}x${expectedHeight})`,
    );
  }
}

const publicLayoutPath = path.resolve("src/layouts/PublicLayout.astro");
const adminLayoutPath = path.resolve("src/layouts/admin/AdminLayout.astro");

requireContains(publicLayoutPath, /property="og:image"/, "OpenGraph image meta");
requireContains(publicLayoutPath, /name="twitter:image"/, "Twitter image meta");
requireContains(publicLayoutPath, /Skip to main content/, "skip link");
requireContains(publicLayoutPath, /id="main-content"/, "main content anchor");
requireContains(adminLayoutPath, /Skip to main content/, "admin skip link");
requireContains(adminLayoutPath, /id="admin-main-content"/, "admin main content anchor");

requireFile(path.resolve("public/brand/logo-primary.svg"));
requireFile(path.resolve("public/brand/logo-mark.svg"));
requireFile(path.resolve("public/brand/logo-mono.svg"));
requireFile(path.resolve("public/favicon.svg"));
const ogDefaultPath = path.resolve("public/brand/og-default.svg");
requireFile(ogDefaultPath);
requireSvgSize(ogDefaultPath, 1200, 630);

console.log("wave 6 baseline check passed");
