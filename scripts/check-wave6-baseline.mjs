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
const indexPagePath = path.resolve("src/pages/index.astro");
const jobsSearchPagePath = path.resolve("src/pages/search/jobs.astro");
const resumesSearchPagePath = path.resolve("src/pages/search/resumes.astro");
const contactPagePath = path.resolve("src/pages/contact.astro");
const helpPagePath = path.resolve("src/pages/help.astro");
const resourcesPagePath = path.resolve("src/pages/resources.astro");
const privacyPagePath = path.resolve("src/pages/privacy-policy.astro");
const termsPagePath = path.resolve("src/pages/terms-and-conditions.astro");
const resumeDetailPagePath = path.resolve("src/pages/resumes/[id].astro");
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
requireContains(indexPagePath, /socialImagePath="\/brand\/og-home\.png"/, "home social image mapping");
requireContains(jobsSearchPagePath, /socialImagePath="\/brand\/og-jobs\.png"/, "jobs social image mapping");
requireContains(resumesSearchPagePath, /socialImagePath="\/brand\/og-resumes\.png"/, "resumes social image mapping");
requireContains(contactPagePath, /socialImagePath="\/brand\/og-contact\.png"/, "contact social image mapping");
requireContains(helpPagePath, /socialImagePath="\/brand\/og-help\.png"/, "help social image mapping");
requireContains(resourcesPagePath, /socialImagePath="\/brand\/og-resources\.png"/, "resources social image mapping");
requireContains(privacyPagePath, /socialImagePath="\/brand\/og-legal\.png"/, "privacy social image mapping");
requireContains(termsPagePath, /socialImagePath="\/brand\/og-legal\.png"/, "terms social image mapping");
requireContains(resumeDetailPagePath, /socialImagePath="\/brand\/og-resumes\.png"/, "resume detail social image mapping");
requireContains(searchFiltersPath, /from "@\/components\/ui\/button"/, "search uses shared button primitive");
requireContains(searchFiltersPath, /from "@\/components\/ui\/input"/, "search uses shared input primitive");

requireFile(path.resolve("public/brand/logo-primary.svg"));
requireFile(path.resolve("public/brand/logo-mark.svg"));
requireFile(path.resolve("public/brand/logo-mono.svg"));
requireFile(path.resolve("public/favicon.svg"));
requireFile(path.resolve("public/brand/logo-primary.png"));
requireFile(path.resolve("public/brand/logo-mark.png"));
requireFile(path.resolve("public/brand/logo-mono.png"));
requireFile(path.resolve("public/favicon.png"));
const ogDefaultPath = path.resolve("public/brand/og-default.svg");
requireFile(ogDefaultPath);
requireSvgSize(ogDefaultPath, 1200, 630);
requireFile(path.resolve("public/brand/og-default.png"));
requireFile(path.resolve("public/brand/og-home.png"));
requireFile(path.resolve("public/brand/og-jobs.png"));
requireFile(path.resolve("public/brand/og-resumes.png"));
requireFile(path.resolve("public/brand/og-contact.png"));
requireFile(path.resolve("public/brand/og-help.png"));
requireFile(path.resolve("public/brand/og-resources.png"));
requireFile(path.resolve("public/brand/og-legal.png"));

console.log("wave 6 baseline check passed");
