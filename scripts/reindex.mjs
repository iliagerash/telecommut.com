#!/usr/bin/env node
import path from "node:path";
import process from "node:process";

import dotenv from "dotenv";
import mysql from "mysql2/promise";

import { submitBingIndexNow, submitGoogleIndexing } from "../src/lib/indexing.mjs";

dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

function usage() {
  console.log("Usage: node scripts/reindex.mjs [bing]");
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
  if (args.length === 0) {
    return { mode: "google" };
  }
  if (args[0] === "bing") {
    return { mode: "bing" };
  }
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
  const value = (process.env[name] ?? "").trim();
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be an integer`);
  }
  return parsed;
}

function resolveBaseUrl() {
  const raw = (process.env.PUBLIC_APP_URL ?? "").trim();
  if (!raw) return "";
  return new URL(raw).toString();
}

function toMysqlDatetime(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
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

function toAbsoluteUrl(raw, baseUrl) {
  const value = String(raw ?? "").trim();
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  if (!baseUrl) {
    return value;
  }
  return new URL(value, baseUrl).toString();
}

function categoryUrl(slug, title, baseUrl) {
  const normalizedSlug = String(slug ?? "").trim() || slugify(title) || "";
  const relative = `/categories/${encodeURIComponent(normalizedSlug)}`;
  return baseUrl ? new URL(relative, baseUrl).toString() : relative;
}

async function handleGoogle(pool, baseUrl) {
  console.info("Starting reindex process...");

  const cutoff = toMysqlDatetime(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000));
  const urls = [];

  const [seoPages] = await pool.execute(
    `
    SELECT id, url, title, coverage_state
    FROM seo_pages
    WHERE url IS NOT NULL
      AND (
        (coverage_state = 'Crawled - currently not indexed' AND crawled_at < ? AND crawled_at IS NOT NULL)
        OR (
          coverage_state <> 'Submitted and indexed'
          AND coverage_state <> 'Crawled - currently not indexed'
          AND coverage_state <> 'Internal error occured'
          AND coverage_state <> ''
        )
        OR (coverage_state = 'Submitted and indexed' AND crawled_at < ? AND crawled_at IS NOT NULL)
      )
    `,
    [cutoff, cutoff],
  );

  for (const page of seoPages) {
    const url = toAbsoluteUrl(page.url, baseUrl);
    urls.push(url);
    console.info(`SEO Page: ${page.title} - ${page.url} [${page.coverage_state}]`);
  }

  const [categories] = await pool.execute(
    `
    SELECT id, title, slug, coverage_state
    FROM categories
    WHERE
      (
        (coverage_state = 'Crawled - currently not indexed' AND crawled_at < ? AND crawled_at IS NOT NULL)
        OR (
          coverage_state <> 'Submitted and indexed'
          AND coverage_state <> 'Crawled - currently not indexed'
          AND coverage_state <> 'Internal error occured'
          AND coverage_state <> ''
        )
        OR (coverage_state = 'Submitted and indexed' AND crawled_at < ? AND crawled_at IS NOT NULL)
      )
    `,
    [cutoff, cutoff],
  );

  for (const category of categories) {
    const url = categoryUrl(category.slug, category.title, baseUrl);
    urls.push(url);
    console.info(`Category: ${category.title} - ${url} [${category.coverage_state}]`);
  }

  if (urls.length === 0) {
    console.info("No URLs found for reindexing.");
    return;
  }

  console.info(`\nSubmitting ${urls.length} URLs for reindexing...`);
  if (!baseUrl) {
    console.info("Skipping submissions because PUBLIC_APP_URL is not set");
    return;
  }

  await submitGoogleIndexing(urls);
  await submitBingIndexNow(urls, baseUrl);
  console.info("Reindex process completed successfully!");
}

async function handleBing(pool, baseUrl) {
  console.info("Starting Bing reindex process...");

  const jobsThreshold = optionalIntEnv("JOBS_THRESHOLD", 20);
  const cutoff = toMysqlDatetime(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000));
  const urls = [];

  const [seoPages] = await pool.execute(
    `
    SELECT id, url, title, bing_crawled_at
    FROM seo_pages
    WHERE url IS NOT NULL
      AND bing_crawled_at < ?
      AND bing_crawled_at IS NOT NULL
    `,
    [cutoff],
  );

  for (const page of seoPages) {
    const url = toAbsoluteUrl(page.url, baseUrl);
    urls.push(url);
    console.info(`SEO Page: ${page.title} - ${page.url} [Bing crawled: ${page.bing_crawled_at}]`);
  }

  const [categories] = await pool.execute(
    `
    SELECT
      categories.id,
      categories.title AS category_title,
      categories.slug AS category_slug,
      categories.bing_crawled_at,
      COUNT(jobs.id) AS jobs_count,
      MAX(jobs.updated_at) AS last_update
    FROM categories
    JOIN jobs ON jobs.category_id = categories.id
    WHERE categories.bing_crawled_at < ?
      AND categories.bing_crawled_at IS NOT NULL
    GROUP BY categories.id, categories.title, categories.slug, categories.bing_crawled_at
    HAVING jobs_count > ?
    ORDER BY last_update DESC
    `,
    [cutoff, jobsThreshold],
  );

  for (const category of categories) {
    const url = categoryUrl(category.category_slug, category.category_title, baseUrl);
    urls.push(url);
    console.info(`Category: ${category.category_title} - ${url} [Bing crawled: ${category.bing_crawled_at}]`);
  }

  if (urls.length === 0) {
    console.info("No URLs found for Bing reindexing.");
    return;
  }

  console.info(`\nSubmitting ${urls.length} URLs for Bing reindexing...`);
  if (!baseUrl) {
    console.info("Skipping Bing submission because PUBLIC_APP_URL is not set");
    return;
  }

  await submitBingIndexNow(urls, baseUrl);
  console.info("Bing reindex process completed successfully!");
}

async function main() {
  const { mode } = parseArgs(process.argv);
  const databaseUrl = requiredEnv("DATABASE_URL");
  const baseUrl = resolveBaseUrl();

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
