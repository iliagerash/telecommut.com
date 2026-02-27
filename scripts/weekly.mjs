#!/usr/bin/env node
import { readdir, unlink } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

function usage() {
  console.log("Usage: node scripts/weekly.mjs");
}

function requiredEnv(name) {
  const value = (process.env[name] ?? "").trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function normalizeLogoName(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  const maybeUrlPath = (() => {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      try {
        return new URL(trimmed).pathname;
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  })();
  return maybeUrlPath.split("/").filter(Boolean).pop() ?? "";
}

function isSafeLocalLogoFile(fileName) {
  if (!fileName) return false;
  if (fileName.includes("/") || fileName.includes("\\")) return false;
  if (fileName.includes("..")) return false;
  return true;
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
  const logosDir = path.resolve(process.cwd(), "public/images/employers");

  const pool = mysql.createPool({
    uri: databaseUrl,
    connectionLimit: 5,
  });

  try {
    await pool.execute(
      "DELETE FROM job_logos WHERE company_logo NOT IN (SELECT company_logo FROM jobs)",
    );

    const [userRows] = await pool.execute(
      "SELECT company_logo FROM auth_users WHERE role = 'employer' LIMIT 20000",
    );
    const employerLogoNames = new Set(
      userRows
        .map((row) => row.company_logo)
        .flatMap((logo) => [typeof logo === "string" ? logo.trim() : "", normalizeLogoName(logo)])
        .filter(Boolean),
    );

    const files = await readdir(logosDir).catch(() => []);
    for (const file of files) {
      if (file === "." || file === "..") continue;
      if (!isSafeLocalLogoFile(file)) continue;

      const [jobRows] = await pool.execute(
        "SELECT 1 FROM jobs WHERE company_logo = ? OR company_logo = ? LIMIT 1",
        [file, `/images/employers/${file}`],
      );
      if (jobRows.length > 0) continue;

      const userHasLogo =
        employerLogoNames.has(file) || employerLogoNames.has(`/images/employers/${file}`);
      if (userHasLogo) continue;

      await unlink(path.join(logosDir, file));
      console.info(`Deleted file ${file}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
