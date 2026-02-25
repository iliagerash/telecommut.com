const BASE_URL = (process.env.WAVE6_BASE_URL ?? "http://127.0.0.1:8787").replace(/\/+$/, "");

const routes = [
  { path: "/", og: "/brand/og-home.png" },
  { path: "/search/jobs", og: "/brand/og-jobs.png" },
  { path: "/search/resumes", og: "/brand/og-resumes.png" },
  { path: "/contact", og: "/brand/og-contact.png" },
  { path: "/help", og: "/brand/og-help.png" },
  { path: "/privacy-policy", og: "/brand/og-legal.png" },
  { path: "/terms-and-conditions", og: "/brand/og-legal.png" },
];

function requireMatch(html, regex, label, path) {
  if (!regex.test(html)) {
    throw new Error(`[wave6-social] ${path}: missing ${label}`);
  }
}

function getMetaContentByAttr(html, attr, value) {
  const pattern = new RegExp(
    `<meta[^>]*${attr}=["']${value}["'][^>]*content=["']([^"']+)["'][^>]*>|<meta[^>]*content=["']([^"']+)["'][^>]*${attr}=["']${value}["'][^>]*>`,
    "i",
  );
  const match = html.match(pattern);
  return match?.[1] ?? match?.[2] ?? null;
}

function requireMetaPath(content, expectedPath, label, pagePath) {
  if (!content) {
    throw new Error(`[wave6-social] ${pagePath}: missing ${label}`);
  }

  let actualPath = content;
  try {
    actualPath = new URL(content).pathname;
  } catch {
    // keep relative path as-is
  }

  if (actualPath !== expectedPath) {
    throw new Error(`[wave6-social] ${pagePath}: ${label} expected ${expectedPath}, got ${content}`);
  }
}

async function checkRoute({ path, og }) {
  const response = await fetch(`${BASE_URL}${path}`, { method: "GET", redirect: "follow" });
  if (response.status !== 200) {
    throw new Error(`[wave6-social] ${path}: expected 200, got ${response.status}`);
  }

  const html = await response.text();
  const ogImage = getMetaContentByAttr(html, "property", "og:image");
  const twitterImage = getMetaContentByAttr(html, "name", "twitter:image");

  requireMetaPath(ogImage, og, "og:image", path);
  requireMetaPath(twitterImage, og, "twitter:image", path);
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
