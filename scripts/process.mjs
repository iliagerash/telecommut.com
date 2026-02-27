#!/usr/bin/env node
import path from "node:path";
import process from "node:process";

import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

function usage() {
  console.log("Usage: node scripts/process.mjs [--dry-run]");
}

function parseArgs(argv) {
  const args = { dryRun: false };

  for (const arg of argv.slice(2)) {
    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (arg === "-h" || arg === "--help") {
      usage();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function requiredDatabaseUrl() {
  const value = (process.env.DATABASE_URL ?? "").trim();
  if (!value) {
    throw new Error("DATABASE_URL is required.");
  }
  return value;
}

function toMysqlDatetime(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

async function main() {
  const { dryRun } = parseArgs(process.argv);
  const databaseUrl = requiredDatabaseUrl();

  const pool = mysql.createPool({
    uri: databaseUrl,
    connectionLimit: 5,
  });

  try {
    console.info("Processing duplicate jobs");

    const [duplicateRows] = await pool.query(
      `
      SELECT j.id
      FROM jobs j
      WHERE EXISTS (
        SELECT 1
        FROM jobs x
        WHERE x.id <> j.id
          AND x.position = j.position
          AND x.company_name = j.company_name
          AND x.category_id = j.category_id
      )
      ORDER BY j.id
      `,
    );

    const duplicateIds = duplicateRows.map((row) => row.id);

    if (duplicateIds.length === 0) {
      console.info("No duplicates found");
      return;
    }

    for (const id of duplicateIds) {
      console.info(String(id));
    }

    const expiresAt = toMysqlDatetime(new Date(Date.now() - 24 * 60 * 60 * 1000));

    if (dryRun) {
      console.info(`Dry run: ${duplicateIds.length} rows would be marked expired at ${expiresAt}`);
      return;
    }

    const [result] = await pool.execute(
      `
      UPDATE jobs j
      SET j.expires = ?
      WHERE EXISTS (
        SELECT 1
        FROM jobs x
        WHERE x.id <> j.id
          AND x.position = j.position
          AND x.company_name = j.company_name
          AND x.category_id = j.category_id
      )
      `,
      [expiresAt],
    );

    console.info(`Updated rows: ${result.affectedRows}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
