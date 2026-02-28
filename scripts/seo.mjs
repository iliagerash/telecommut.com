#!/usr/bin/env node
import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

function usage() {
  console.log("Usage: node scripts/seo.mjs [bing]");
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    usage();
    process.exit(0);
  }
  if (args.length > 1) {
    throw new Error(`Unknown arguments: ${args.join(" ")}`);
  }
  if (args.length === 0) return { mode: "google" };
  if (args[0] === "bing") return { mode: "bing" };
  throw new Error(`Unknown argument: ${args[0]}`);
}

function requiredEnv(name) {
  const value = (process.env[name] ?? "").trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optionalIntEnv(name, fallback) {
  const raw = (process.env[name] ?? "").trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be an integer`);
  }
  return parsed;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkArray(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function encodeBase64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function resolveMainBaseUrl() {
  const domain = requiredEnv("MAIN_DOMAIN");
  return `https://${domain}`;
}

function toAbsoluteUrl(raw, baseUrl) {
  const value = String(raw ?? "").trim();
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return new URL(value, `${baseUrl}/`).toString();
}

function slugify(input) {
  return String(input ?? "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function categoryUrl(slug, title, baseUrl) {
  const normalizedSlug = String(slug ?? "").trim() || slugify(title) || "";
  return new URL(`/categories/${encodeURIComponent(normalizedSlug)}`, `${baseUrl}/`).toString();
}

function toMysqlDatetime(input) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mi = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function parseMicrosoftDate(dateString) {
  if (!dateString) return null;
  const match = String(dateString).match(/\/Date\((-?\d+)([+-]\d+)?\)\//);
  if (match?.[1]) {
    const timestampMs = Number.parseInt(match[1], 10);
    if (Number.isFinite(timestampMs)) {
      // Bing may return .NET min-date sentinel for unknown crawl date.
      if (timestampMs <= 0) {
        return null;
      }
      return toMysqlDatetime(timestampMs);
    }
  }
  return null;
}

async function resolveGoogleServiceJsonPath() {
  const configured = (process.env.GOOGLE_SERVICE_JSON ?? "").trim();
  const candidates = [];
  if (configured) {
    candidates.push(path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured));
  }
  candidates.push(path.resolve(process.cwd(), "google_indexing.json"));

  for (const candidate of candidates) {
    try {
      await readFile(candidate, "utf8");
      return candidate;
    } catch {
      // continue
    }
  }

  throw new Error("Google service JSON not found");
}

async function getGoogleAccessTokenReadOnly() {
  const serviceJsonPath = await resolveGoogleServiceJsonPath();
  const raw = await readFile(serviceJsonPath, "utf8");
  const creds = JSON.parse(raw);

  if (!creds.client_email || !creds.private_key || !creds.token_uri) {
    throw new Error("Invalid Google service JSON: missing client_email/private_key/token_uri");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: creds.client_email,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: creds.token_uri,
    exp: now + 3600,
    iat: now,
  };

  const unsigned = `${encodeBase64Url(JSON.stringify(header))}.${encodeBase64Url(JSON.stringify(payload))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${encodeBase64Url(signer.sign(creds.private_key))}`;

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  const response = await fetch(creds.token_uri, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    const message = data.error_description || data.error || `token request failed with ${response.status}`;
    throw new Error(`Google access token error: ${message}`);
  }
  return data.access_token;
}

async function inspectGoogleUrl(inspectionUrl, siteUrl, token) {
  const response = await fetch("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      inspectionUrl,
      siteUrl,
    }),
  });

  if (!response.ok) {
    return { ok: false };
  }

  const data = await response.json().catch(() => ({}));
  const indexStatus = data?.inspectionResult?.indexStatusResult;
  return {
    ok: true,
    coverageState: indexStatus?.coverageState ?? "",
    lastCrawlTime: indexStatus?.lastCrawlTime ?? null,
    inspectionResultLink: data?.inspectionResult?.inspectionResultLink ?? "",
  };
}

async function inspectGoogleUrlsBatched(rows, siteUrl, token, getUrl, batchSize = 25) {
  const output = [];
  const safeBatchSize = Number.isFinite(batchSize) && batchSize > 0 ? Math.floor(batchSize) : 25;
  const batches = chunkArray(rows, safeBatchSize);

  for (const batch of batches) {
    const results = await Promise.all(
      batch.map(async (row) => {
        const url = getUrl(row);
        const result = await inspectGoogleUrl(url, siteUrl, token);
        return { row, url, result };
      }),
    );
    output.push(...results);
  }

  return output;
}

async function getBingUrlInfo(url, siteUrl, apiKey) {
  const endpoint = new URL("https://ssl.bing.com/webmaster/api.svc/json/GetUrlInfo");
  endpoint.searchParams.set("apikey", apiKey);
  endpoint.searchParams.set("siteUrl", siteUrl);
  endpoint.searchParams.set("url", url);

  try {
    const response = await fetch(endpoint, { method: "GET" });
    if (!response.ok) return null;
    return await response.json().catch(() => null);
  } catch {
    return null;
  }
}

async function handleGoogle(pool, baseUrl) {
  console.info("Inspecting pages...");

  await pool.execute("UPDATE seo_pages SET coverage_state = ''");
  const [seoPages] = await pool.execute(
    "SELECT id, url, title, inspection_url, crawled_at FROM seo_pages ORDER BY id ASC",
  );

  const siteUrl = `${baseUrl}/`;
  const token = await getGoogleAccessTokenReadOnly();
  const pageInspections = await inspectGoogleUrlsBatched(
    seoPages,
    siteUrl,
    token,
    (row) => toAbsoluteUrl(row.url, baseUrl),
  );

  for (const { row: page, url, result } of pageInspections) {

    let crawledAt = null;
    let coverageState = "Internal error occured";
    let inspectionUrl = page.inspection_url ?? "";
    if (result.ok) {
      crawledAt = result.lastCrawlTime ? result.lastCrawlTime.replace("T", " ").replace("Z", "") : null;
      coverageState = result.coverageState || "";
      inspectionUrl = result.inspectionResultLink || inspectionUrl;
    }

    await pool.execute(
      "UPDATE seo_pages SET coverage_state = ?, inspection_url = ?, crawled_at = ? WHERE id = ?",
      [coverageState, inspectionUrl, crawledAt, page.id],
    );

    const suffix = crawledAt ? ` - ${crawledAt}` : "";
    console.info(`${url} - ${coverageState}${suffix}`);
  }

  console.info("");
  console.info("Inspecting categories...");

  await pool.execute("UPDATE categories SET coverage_state = ''");
  const jobsThreshold = optionalIntEnv("JOBS_THRESHOLD", 20);
  const [categories] = await pool.execute(
    `
    SELECT
      categories.id,
      categories.title AS category_title,
      categories.slug AS category_slug,
      categories.inspection_url,
      categories.crawled_at,
      COUNT(jobs.id) AS jobs_count
    FROM categories
    JOIN jobs ON jobs.category_id = categories.id
    GROUP BY categories.id, categories.title, categories.slug, categories.inspection_url, categories.crawled_at
    HAVING jobs_count > ?
    ORDER BY category_title
    LIMIT 900
    `,
    [jobsThreshold],
  );

  let total = 0;
  let indexed = 0;
  let crawled = 0;
  let discovered = 0;
  const categoryInspections = await inspectGoogleUrlsBatched(
    categories,
    siteUrl,
    token,
    (row) => categoryUrl(row.category_slug, row.category_title, baseUrl),
  );

  for (const { row: category, url, result } of categoryInspections) {
    total += 1;

    let crawledAt = null;
    let coverageState = "Internal error occured";
    let inspectionUrl = category.inspection_url ?? "";
    if (result.ok) {
      crawledAt = result.lastCrawlTime ? result.lastCrawlTime.replace("T", " ").replace("Z", "") : null;
      coverageState = result.coverageState || "";
      inspectionUrl = result.inspectionResultLink || inspectionUrl;
    }

    await pool.execute(
      "UPDATE categories SET coverage_state = ?, inspection_url = ?, crawled_at = ? WHERE id = ?",
      [coverageState, inspectionUrl, crawledAt, category.id],
    );

    if (coverageState === "Submitted and indexed") indexed += 1;
    else if (coverageState === "Crawled - currently not indexed") crawled += 1;
    else discovered += 1;

    const suffix = crawledAt ? ` - ${crawledAt}` : "";
    console.info(`${url} - ${coverageState}${suffix}`);
  }

  if (categories.length > 0) {
    console.info(`Total: ${total}`);
    console.info(`Indexed: ${indexed}`);
    console.info(`Crawled: ${crawled}`);
    console.info(`Discovered: ${discovered}`);
  } else {
    console.info("No categories to inspect");
  }
}

async function handleBing(pool, baseUrl) {
  const apiKey = requiredEnv("BING_API_KEY");
  console.info("Inspecting pages from Bing Webmaster API...");

  const [seoPages] = await pool.execute(
    "SELECT id, url, bing_crawled_at FROM seo_pages ORDER BY id ASC",
  );

  for (const page of seoPages) {
    const url = toAbsoluteUrl(page.url, baseUrl);
    const data = await getBingUrlInfo(url, baseUrl, apiKey);
    const crawledAt = parseMicrosoftDate(data?.d?.LastCrawledDate ?? null);
    await pool.execute("UPDATE seo_pages SET bing_crawled_at = ? WHERE id = ?", [crawledAt, page.id]);
    console.info(`${url} - ${crawledAt}`);
    await sleep(200);
  }

  if (seoPages.length === 0) {
    console.info("No pages to inspect");
  }

  console.info("");
  console.info("Inspecting categories...");

  const jobsThreshold = optionalIntEnv("JOBS_THRESHOLD", 20);
  const [categories] = await pool.execute(
    `
    SELECT
      categories.id,
      categories.title AS category_title,
      categories.slug AS category_slug,
      COUNT(jobs.id) AS jobs_count
    FROM categories
    JOIN jobs ON jobs.category_id = categories.id
    GROUP BY categories.id, categories.title, categories.slug
    HAVING jobs_count > ?
    ORDER BY category_title
    LIMIT 900
    `,
    [jobsThreshold],
  );

  let total = 0;
  let crawled = 0;

  for (const category of categories) {
    total += 1;
    const url = categoryUrl(category.category_slug, category.category_title, baseUrl);
    const data = await getBingUrlInfo(url, baseUrl, apiKey);
    const crawledAt = parseMicrosoftDate(data?.d?.LastCrawledDate ?? null);
    if (crawledAt) crawled += 1;
    await pool.execute("UPDATE categories SET bing_crawled_at = ? WHERE id = ?", [crawledAt, category.id]);
    console.info(`${url} - ${crawledAt}`);
    await sleep(200);
  }

  if (categories.length > 0) {
    console.info(`Total: ${total}`);
    console.info(`Crawled: ${crawled}`);
  } else {
    console.info("No categories to inspect");
  }
}

async function main() {
  const { mode } = parseArgs(process.argv);
  const databaseUrl = requiredEnv("DATABASE_URL");
  const baseUrl = resolveMainBaseUrl();

  const pool = mysql.createPool({
    uri: databaseUrl,
    connectionLimit: 5,
  });

  try {
    if (mode === "bing") {
      await handleBing(pool, baseUrl);
    } else {
      await handleGoogle(pool, baseUrl);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
