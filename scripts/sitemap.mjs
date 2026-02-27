#!/usr/bin/env node
import { createSign } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

const SITEMAP_LIMIT = 50000;

function usage() {
  console.log("Usage: node scripts/sitemap.mjs");
}

function requiredEnv(name) {
  const value = (process.env[name] ?? "").trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optionalEnv(name, fallback = "") {
  const value = (process.env[name] ?? "").trim();
  return value || fallback;
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

function optionalBoolEnv(name, fallback = false) {
  const raw = (process.env[name] ?? "").trim().toLowerCase();
  if (!raw) return fallback;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function toIso(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
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

function resolveBaseUrl() {
  const domain = requiredEnv("MAIN_DOMAIN");
  return `https://${domain}`;
}

function buildSitemapXml(urlRows) {
  const header = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n";
  const footer = "</urlset>\n";
  const body = urlRows
    .map((row) => {
      const lastmod = row.lastmod ? `\n    <lastmod>${escapeXml(row.lastmod)}</lastmod>` : "";
      const changefreq = row.changefreq ? `\n    <changefreq>${escapeXml(row.changefreq)}</changefreq>` : "";
      return `<url>\n    <loc>${escapeXml(row.loc)}</loc>${lastmod}${changefreq}\n</url>\n`;
    })
    .join("");
  return `${header}${body}${footer}`;
}

function encodeBase64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function resolveGoogleServiceJsonPath() {
  const configured = optionalEnv("GOOGLE_SERVICE_JSON");
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
      // keep trying
    }
  }

  throw new Error("Google service JSON not found");
}

async function getGoogleAccessTokenWebmasters() {
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
    scope: "https://www.googleapis.com/auth/webmasters",
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
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    const message = data.error_description || data.error || `token request failed with ${response.status}`;
    throw new Error(`Google access token error: ${message}`);
  }
  return data.access_token;
}

async function pingSitemap(sitemapUrl, baseUrl) {
  if (optionalBoolEnv("GOOGLE_SERVICE_ENABLED", false)) {
    try {
      const token = await getGoogleAccessTokenWebmasters();
      const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(`${baseUrl}/`)}/sitemaps/${encodeURIComponent(sitemapUrl)}`;
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.info(`Google response: ${response.status}`);
    } catch (error) {
      console.info(`Google response: error (${error instanceof Error ? error.message : String(error)})`);
    }
  } else {
    console.info("Google service is disabled");
  }

  const bingKey = optionalEnv("BING_API_KEY");
  if (bingKey) {
    try {
      const endpoint = `https://ssl.bing.com/webmaster/api.svc/json/SubmitFeed?apikey=${encodeURIComponent(bingKey)}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          siteUrl: baseUrl,
          feedUrl: sitemapUrl,
        }),
      });
      console.info(`Bing response: ${response.status}`);
    } catch (error) {
      console.info(`Bing response: error (${error instanceof Error ? error.message : String(error)})`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    usage();
    return;
  }
  if (args.length > 0) {
    throw new Error(`Unknown argument: ${args[0]}`);
  }

  const databaseUrl = requiredEnv("DATABASE_URL");
  const baseUrl = resolveBaseUrl();
  const sitemapMain = optionalEnv("SITEMAP_MAIN", optionalEnv("SITEMAP_FILE", "sitemap.xml"));
  const sitemapCategories = optionalEnv("SITEMAP_CATEGORIES", "categories.xml");
  const jobsThreshold = optionalIntEnv("JOBS_THRESHOLD", 20);

  const publicDir = path.resolve(process.cwd(), "public");
  const sitemapMainPath = path.resolve(publicDir, sitemapMain);
  const sitemapCategoriesPath = path.resolve(publicDir, sitemapCategories);

  const pool = mysql.createPool({
    uri: databaseUrl,
    connectionLimit: 5,
  });

  try {
    const [maxRows] = await pool.execute(
      "SELECT MAX(updated_at) AS last_update FROM jobs WHERE status = 1",
    );
    const lastUpdate = maxRows[0]?.last_update ? new Date(maxRows[0].last_update) : null;

    if (lastUpdate) {
      try {
        const fileStats = await stat(sitemapMainPath);
        if (fileStats.mtime >= lastUpdate) {
          console.info(`Sitemap ${sitemapMainPath} is up to date`);
          return;
        }
      } catch {
        // file may not exist yet
      }
    }

    const rootLastmod = toIso(lastUpdate ?? new Date()) ?? new Date().toISOString();
    const mainRows = [
      {
        loc: `${baseUrl}/`,
        lastmod: rootLastmod,
        changefreq: "hourly",
      },
    ];

    const [jobRows] = await pool.execute(
      `
      SELECT id, updated_at
      FROM jobs
      WHERE status = 1
        AND updated_at > DATE_SUB(NOW(), INTERVAL 25 DAY)
        AND expires > DATE_ADD(NOW(), INTERVAL 5 DAY)
      ORDER BY id DESC
      LIMIT ?
      `,
      [SITEMAP_LIMIT],
    );

    for (const job of jobRows) {
      const lastmod = toIso(job.updated_at);
      mainRows.push({
        loc: `${baseUrl}/jobs/${job.id}`,
        lastmod: lastmod ?? rootLastmod,
        changefreq: "monthly",
      });
    }

    await writeFile(sitemapMainPath, buildSitemapXml(mainRows), "utf8");
    const mainUrl = `${baseUrl}/${sitemapMain}`;
    console.info(mainUrl);
    await pingSitemap(mainUrl, baseUrl);

    const [categoryRows] = await pool.execute(
      `
      SELECT
        categories.title AS category_title,
        categories.slug AS category_slug,
        MAX(jobs.updated_at) AS last_update,
        COUNT(jobs.id) AS jobs_count
      FROM categories
      JOIN jobs ON jobs.category_id = categories.id
      GROUP BY categories.id, categories.title, categories.slug
      HAVING jobs_count > ?
      ORDER BY last_update DESC
      `,
      [jobsThreshold],
    );

    const categorySitemapRows = [];
    for (const category of categoryRows) {
      const slug = String(category.category_slug ?? "").trim() || slugify(category.category_title);
      const lastmod = toIso(category.last_update);
      categorySitemapRows.push({
        loc: `${baseUrl}/category/${encodeURIComponent(slug)}`,
        lastmod: lastmod ?? rootLastmod,
        changefreq: "hourly",
      });
    }

    await writeFile(sitemapCategoriesPath, buildSitemapXml(categorySitemapRows), "utf8");
    const categoriesUrl = `${baseUrl}/${sitemapCategories}`;
    console.info(categoriesUrl);
    await pingSitemap(categoriesUrl, baseUrl);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
