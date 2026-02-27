#!/usr/bin/env node
import path from "node:path";
import process from "node:process";

import dotenv from "dotenv";
import mysql from "mysql2/promise";

import { submitGoogleIndexing } from "../src/lib/indexing.mjs";

dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

function usage() {
  console.log("Usage: node scripts/daily.mjs");
}

function requiredEnv(name) {
  const value = (process.env[name] ?? "").trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function nowClock() {
  const date = new Date();
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function resolveBaseUrl() {
  const value = (process.env.PUBLIC_APP_URL ?? "").trim();
  if (!value) return "";
  return new URL(value).toString();
}

async function tableExists(connection, tableName) {
  const [rows] = await connection.execute(
    `
    SELECT 1
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    LIMIT 1
    `,
    [tableName],
  );
  return rows.length > 0;
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

  const pool = mysql.createPool({
    uri: databaseUrl,
    connectionLimit: 5,
  });

  try {
    console.info(`Moving expired jobs to job_removals ${nowClock()}`);

    const hasJobRedirects = await tableExists(pool, "job_redirects");
    const [expiredJobs] = await pool.execute(
      `
      SELECT id, category_id, position, expires
      FROM jobs
      WHERE expires < NOW()
      ORDER BY id
      `,
    );

    const urls = [];
    for (const job of expiredJobs) {
      await pool.execute(
        "INSERT IGNORE INTO job_removals (id, category_id, position, expired_at) VALUES (?, ?, ?, ?)",
        [job.id, job.category_id, job.position, job.expires],
      );

      if (hasJobRedirects) {
        await pool.execute("DELETE FROM job_redirects WHERE new_id = ?", [job.id]);
      }

      await pool.execute("DELETE FROM jobs WHERE id = ?", [job.id]);

      const relative = `/jobs/${job.id}`;
      const url = baseUrl ? new URL(relative, baseUrl).toString() : relative;
      urls.push(url);
      console.info(url);
    }

    console.info(`Done ${nowClock()}`);

    if (urls.length > 0) {
      if (!baseUrl) {
        console.info("Skipping Google URL_DELETED submission because PUBLIC_APP_URL is not set");
      } else {
        await submitGoogleIndexing(urls, { notificationType: "URL_DELETED" });
      }
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
