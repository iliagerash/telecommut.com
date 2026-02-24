const BASE_URL = (process.env.WAVE6_BASE_URL ?? "http://127.0.0.1:8787").replace(/\/+$/, "");

const routes = [
  { path: "/", og: "/brand/og-home.png" },
  { path: "/search/jobs", og: "/brand/og-jobs.png" },
  { path: "/search/resumes", og: "/brand/og-resumes.png" },
  { path: "/contact", og: "/brand/og-contact.png" },
  { path: "/help", og: "/brand/og-help.png" },
  { path: "/resources", og: "/brand/og-resources.png" },
  { path: "/privacy-policy", og: "/brand/og-legal.png" },
  { path: "/terms-and-conditions", og: "/brand/og-legal.png" },
];

function requireMatch(html, regex, label, path) {
  if (!regex.test(html)) {
    throw new Error(`[wave6-social] ${path}: missing ${label}`);
  }
}

async function checkRoute({ path, og }) {
  const response = await fetch(`${BASE_URL}${path}`, { method: "GET", redirect: "manual" });
  if (response.status !== 200) {
    throw new Error(`[wave6-social] ${path}: expected 200, got ${response.status}`);
  }

  const html = await response.text();
  const escapedOg = og.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  requireMatch(html, /property="og:image"/, "og:image meta", path);
  requireMatch(html, new RegExp(`property="og:image"[^>]+${escapedOg}`), `og:image=${og}`, path);
  requireMatch(html, /name="twitter:image"/, "twitter:image meta", path);
  requireMatch(html, /name="twitter:card" content="summary_large_image"/, "twitter card", path);
  requireMatch(html, /href="#main-content"/, "skip link", path);

  console.log(`[ok] ${path} social metadata + skip link`);
}

async function main() {
  console.log(`[wave6-social] base url: ${BASE_URL}`);

  for (const route of routes) {
    await checkRoute(route);
  }

  console.log("[wave6-social] all route checks passed");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
