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

function requirePng(filePath, expectedWidth, expectedHeight) {
  requireFile(filePath);

  const buffer = fs.readFileSync(filePath);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature)) {
    throw new Error(`Invalid PNG signature in ${path.relative(process.cwd(), filePath)}`);
  }

  const ihdr = buffer.toString("ascii", 12, 16);
  if (ihdr !== "IHDR") {
    throw new Error(`Missing IHDR chunk in ${path.relative(process.cwd(), filePath)}`);
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (width !== expectedWidth || height !== expectedHeight) {
    throw new Error(
      `Unexpected PNG size in ${path.relative(process.cwd(), filePath)}: ${width}x${height} (expected ${expectedWidth}x${expectedHeight})`,
    );
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

function collectAstroPages(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectAstroPages(entryPath));
      continue;
    }

    if (entry.isFile() && entryPath.endsWith(".astro")) {
      files.push(entryPath);
    }
  }

  return files;
}

const publicLayoutPath = path.resolve("src/layouts/PublicLayout.astro");
const adminLayoutPath = path.resolve("src/layouts/admin/AdminLayout.astro");
const indexPagePath = path.resolve("src/pages/index.astro");
const jobsSearchPagePath = path.resolve("src/pages/search/jobs.astro");
const resumesSearchPagePath = path.resolve("src/pages/search/resumes.astro");
const contactPagePath = path.resolve("src/pages/contact.astro");
const helpPagePath = path.resolve("src/pages/help.astro");
const resourcesPagePath = path.resolve("src/pages/resources.astro");
const privacyPagePath = path.resolve("src/pages/privacy-policy.astro");
const termsPagePath = path.resolve("src/pages/terms-and-conditions.astro");
const resumeDetailPagePath = path.resolve("src/pages/resumes/[id].astro");
const jobDetailPagePath = path.resolve("src/pages/jobs/[id].ts");
const loginPagePath = path.resolve("src/pages/login.astro");
const searchFiltersPath = path.resolve("src/components/search/SearchFilters.tsx");

requireContains(publicLayoutPath, /property="og:image"/, "OpenGraph image meta");
requireContains(publicLayoutPath, /name="twitter:image"/, "Twitter image meta");
requireContains(publicLayoutPath, /socialImagePath/, "social image layout prop");
requireContains(publicLayoutPath, /Skip to main content/, "skip link");
requireContains(publicLayoutPath, /id="main-content"/, "main content anchor");
requireContains(adminLayoutPath, /Skip to main content/, "admin skip link");
requireContains(adminLayoutPath, /id="admin-main-content"/, "admin main content anchor");
requireContains(adminLayoutPath, /aria-current=\{isActive \? "page" : undefined\}/, "admin active nav semantics");
requireContains(adminLayoutPath, /overflow-x-auto/, "admin responsive nav overflow");
requireContains(indexPagePath, /socialImagePath=\{socialImages\.home\}/, "home social image mapping");
requireContains(jobsSearchPagePath, /socialImagePath=\{socialImages\.jobs\}/, "jobs social image mapping");
requireContains(resumesSearchPagePath, /socialImagePath=\{socialImages\.resumes\}/, "resumes social image mapping");
requireContains(contactPagePath, /socialImagePath=\{socialImages\.contact\}/, "contact social image mapping");
requireContains(helpPagePath, /socialImagePath=\{socialImages\.help\}/, "help social image mapping");
requireContains(resourcesPagePath, /socialImagePath=\{socialImages\.resources\}/, "resources social image mapping");
requireContains(privacyPagePath, /socialImagePath=\{socialImages\.legal\}/, "privacy social image mapping");
requireContains(termsPagePath, /socialImagePath=\{socialImages\.legal\}/, "terms social image mapping");
requireContains(resumeDetailPagePath, /socialImagePath=\{socialImages\.resumes\}/, "resume detail social image mapping");
requireContains(jobDetailPagePath, /og:image/, "job detail og image tag");
requireContains(jobDetailPagePath, /twitter:image/, "job detail twitter image tag");
requireContains(jobDetailPagePath, /socialImages\.jobs/, "job detail social image mapping");
requireContains(loginPagePath, /<PublicLayout/, "login uses shared public layout");
requireContains(loginPagePath, /robots="noindex,nofollow"/, "login noindex robots");
requireContains(loginPagePath, /socialImagePath=\{socialImages\.home\}/, "login social image mapping");
requireContains(searchFiltersPath, /from "@\/components\/ui\/button"/, "search uses shared button primitive");
requireContains(searchFiltersPath, /from "@\/components\/ui\/input"/, "search uses shared input primitive");

for (const filePath of collectAstroPages(path.resolve("src/pages"))) {
  const content = fs.readFileSync(filePath, "utf8");
  if (!content.includes("<PublicLayout")) {
    continue;
  }

  const isNoindex = /robots="noindex,nofollow"/.test(content);
  if (isNoindex) {
    continue;
  }

  if (!/socialImagePath=/.test(content)) {
    throw new Error(
      `Indexable PublicLayout route missing explicit socialImagePath: ${path.relative(process.cwd(), filePath)}`,
    );
  }
}

requireFile(path.resolve("public/brand/logo-primary.svg"));
requireFile(path.resolve("public/brand/logo-mark.svg"));
requireFile(path.resolve("public/brand/logo-mono.svg"));
requireFile(path.resolve("public/favicon.svg"));
requirePng(path.resolve("public/brand/logo-primary.png"), 840, 840);
requirePng(path.resolve("public/brand/logo-mark.png"), 256, 256);
requirePng(path.resolve("public/brand/logo-mono.png"), 840, 840);
requirePng(path.resolve("public/favicon.png"), 256, 256);
const ogDefaultPath = path.resolve("public/brand/og-default.svg");
requireFile(ogDefaultPath);
requireSvgSize(ogDefaultPath, 1200, 630);
requirePng(path.resolve("public/brand/og-default.png"), 1200, 1200);
requirePng(path.resolve("public/brand/og-home.png"), 1200, 1200);
requirePng(path.resolve("public/brand/og-jobs.png"), 1200, 1200);
requirePng(path.resolve("public/brand/og-resumes.png"), 1200, 1200);
requirePng(path.resolve("public/brand/og-contact.png"), 1200, 1200);
requirePng(path.resolve("public/brand/og-help.png"), 1200, 1200);
requirePng(path.resolve("public/brand/og-resources.png"), 1200, 1200);
requirePng(path.resolve("public/brand/og-legal.png"), 1200, 1200);

console.log("wave 6 baseline check passed");
