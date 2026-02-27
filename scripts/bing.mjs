#!/usr/bin/env node
import path from "node:path";
import process from "node:process";

import dotenv from "dotenv";
import mysql from "mysql2/promise";

import { submitBingIndexNow } from "../src/lib/indexing.mjs";

dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

function usage() {
  console.log("Usage: node scripts/bing.mjs [-t6] [info]");
}

function parseArgs(argv) {
  const parsed = {
    time: 0,
    info: false,
  };

  const args = argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "info") {
      parsed.info = true;
      continue;
    }
    if (arg === "-h" || arg === "--help") {
      usage();
      process.exit(0);
    }
    if (arg.startsWith("-t")) {
      const suffix = arg.slice(2);
      if (!suffix) {
        throw new Error("Invalid -t argument. Use compact form like -t6");
      }
      const value = Number.parseInt(suffix, 10);
      if (!Number.isFinite(value) || value < 0) {
        throw new Error("Invalid -t value. Use a non-negative integer, e.g. -t6");
      }
      parsed.time = value;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
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

function resolveWindow(hours, defaultHours) {
  const now = new Date();
  const effectiveHours = hours === 0 ? defaultHours : hours;
  const start = new Date(now.getTime() - effectiveHours * 60 * 60 * 1000);
  const end = hours === 1 ? now : new Date(now.getTime() - 60 * 60 * 1000);
  return {
    start: toMysqlDatetime(start),
    end: toMysqlDatetime(end),
  };
}

function resolveBaseUrl() {
  const raw = (process.env.PUBLIC_APP_URL ?? "").trim();
  if (!raw) return "";
  return new URL(raw).toString();
}

function jobUrl(id, baseUrl) {
  const relative = `/jobs/${id}`;
  return baseUrl ? new URL(relative, baseUrl).toString() : relative;
}

async function main() {
  const { time, info } = parseArgs(process.argv);
  if (time > 720) {
    throw new Error("Time must be less than or equal to 720 hours");
  }

  const resubmitStart = optionalIntEnv("RESUBMIT_START", 24);
  const { start, end } = resolveWindow(time, resubmitStart);
  const databaseUrl = requiredEnv("DATABASE_URL");
  const baseUrl = resolveBaseUrl();

  const pool = mysql.createPool({
    uri: databaseUrl,
    connectionLimit: 5,
  });

  try {
    const [rows] = await pool.execute(
      `
      SELECT id, bing_crawled
      FROM jobs
      WHERE created_at > ? AND created_at < ?
      ORDER BY id
      `,
      [start, end],
    );

    const urls = [];
    let totalCrawled = 0;
    let totalSubmitted = 0;

    for (const row of rows) {
      const url = jobUrl(row.id, baseUrl);
      if (Number(row.bing_crawled ?? 0) > 0) {
        totalCrawled += 1;
      } else {
        totalSubmitted += 1;
        urls.push(url);
      }
      console.info(`${url} - ${row.bing_crawled}`);
    }

    if (!info && urls.length > 0) {
      if (!baseUrl) {
        console.info("Skipping Bing submission because PUBLIC_APP_URL is not set");
      } else {
        await submitBingIndexNow(urls, baseUrl);
      }
    }

    console.info(`Total crawled: ${totalCrawled}`);
    console.info(`Total submited: ${totalSubmitted}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
