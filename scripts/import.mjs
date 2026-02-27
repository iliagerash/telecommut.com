#!/usr/bin/env node
import { randomInt } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import dotenv from "dotenv";
import mysql from "mysql2/promise";
import { submitBingIndexNow, submitGoogleIndexing } from "../src/lib/indexing.mjs";

dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

const CATEGORY_MAP = [
  ["IT Services and IT Consulting", 1],
  ["Technology, Information and Internet", 1],
  ["Financial Services", 9],
  ["Software Development", 1],
  ["Advertising Services", 11],
  ["Spectator Sports", 16],
  ["Staffing and Recruiting", 14],
  ["Outsourcing and Offshoring Consulting", 16],
  ["Renewable Energy Equipment Manufacturing", 16],
  ["Hospitals and Health Care", 13],
  ["Wellness and Fitness Services", 13],
  ["Market Research", 11],
  ["Marketing Services", 11],
  ["Non-profit Organizations", 16],
  ["Investment Management", 9],
  ["Primary and Secondary Education", 12],
  ["Business Consulting and Services", 16],
  ["Human Resources Services", 14],
  ["Insurance", 9],
  ["Computer Networking Products", 1],
  ["Legal Services", 15],
  ["Technology, Information and Media", 1],
  ["Professional Training and Coaching", 12],
  ["Accounting", 9],
  ["Wholesale", 11],
];

const POSITION_MAP = [
  ["Accounting", 9],
  ["Financ", 9],
  ["Administrative", 8],
  ["Business manag", 10],
  ["Writer", 6],
  ["Editor", 6],
  ["Support", 5],
  ["Customer Success", 5],
  ["Designer", 7],
  ["Multimedia", 7],
  ["3D", 7],
  ["Artist", 7],
  ["DevOps", 4],
  ["Sysadmin", 4],
  ["System Administrator", 4],
  ["Network Administrator", 4],
  ["Director", 10],
  ["Teacher", 12],
  ["Coach", 12],
  ["Medic", 13],
  ["Healthcare", 13],
  ["HR ", 14],
  ["Legal", 15],
  ["Lawyer", 15],
  ["Marketing", 11],
  ["Sales", 11],
  ["Social Media", 11],
  ["Account Executive", 11],
  ["Account Manager", 11],
  ["Product Manager", 2],
  ["Product Owner", 2],
  ["Project Manager", 3],
  ["Software", 1],
  ["Cyber", 1],
];

const COUNTRIES = [
  { database: "usa", currency: "USD", id: 1 },
  { database: "canada", currency: "CAD", id: 2 },
];

function usage() {
  console.log("Usage: node scripts/import.mjs [--dry-run]");
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

function requiredEnv(name) {
  const value = (process.env[name] ?? "").trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optionalIntEnv(name, defaultValue) {
  const raw = (process.env[name] ?? "").trim();
  if (!raw) return defaultValue;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be an integer`);
  }
  return value;
}

function normalizeContract(value) {
  if (!value) return "full_time";
  const normalized = String(value).trim().toLowerCase().replaceAll("-", "_");
  if (normalized === "contract" || normalized === "freelance") return "contractor";
  if (normalized === "internship") return "intern";
  if (!normalized || normalized === "other") return "full_time";
  return normalized;
}

function resolveCategoryId(category, position) {
  let categoryId = 16;
  const categoryText = String(category ?? "");
  const positionText = String(position ?? "");

  for (const [needle, id] of CATEGORY_MAP) {
    if (categoryText.toLowerCase().includes(needle.toLowerCase())) {
      categoryId = id;
      break;
    }
  }
  for (const [needle, id] of POSITION_MAP) {
    if (positionText.toLowerCase().includes(needle.toLowerCase())) {
      categoryId = id;
      break;
    }
  }

  return categoryId;
}

function buildAggUri(database) {
  const host = requiredEnv("AGG_DB_HOST");
  const port = requiredEnv("AGG_DB_PORT");
  const user = requiredEnv("AGG_DB_USERNAME");
  const password = process.env.AGG_DB_PASSWORD ?? "";
  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);
  return `mysql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}`;
}

function resolvePublicAppUrl() {
  const value = String(process.env.PUBLIC_APP_URL ?? "").trim();
  if (!value) {
    return "";
  }
  try {
    return new URL(value).toString();
  } catch {
    console.info("PUBLIC_APP_URL is invalid, submissions will be skipped");
    return "";
  }
}

async function downloadLogo(logoUrl, outputDir) {
  const response = await fetch(logoUrl);
  if (!response.ok) {
    throw new Error(`Logo download failed with status ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength === 0) {
    throw new Error("Downloaded logo is empty");
  }

  await mkdir(outputDir, { recursive: true });
  const fileName = `${Date.now()}${randomInt(100000, 1000000)}.png`;
  const filePath = path.join(outputDir, fileName);
  await writeFile(filePath, Buffer.from(arrayBuffer));
  return fileName;
}

function buildLegacyLogoUrl(imageBaseUrl, companyLogo) {
  return `${String(imageBaseUrl ?? "")}${String(companyLogo ?? "")}`;
}

function normalizeCompanyLogoPath(value) {
  if (typeof value !== "string") {
    return value ?? null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("/") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `/images/employers/${trimmed}`;
}

async function main() {
  const { dryRun } = parseArgs(process.argv);

  const destination = requiredEnv("AGG_DESTINATION");
  const imageBaseUrl = requiredEnv("AGG_IMAGE_URL");
  const appBaseUrl = resolvePublicAppUrl();
  const importMin = optionalIntEnv("AGG_IMPORT_MIN", 5);
  const importMax = optionalIntEnv("AGG_IMPORT_MAX", 10);
  if (importMin <= 0 || importMax <= 0 || importMax < importMin) {
    throw new Error("AGG_IMPORT_MIN and AGG_IMPORT_MAX must be positive integers and max >= min");
  }

  const appDatabaseUrl = requiredEnv("DATABASE_URL");
  const start = new Date(Date.now() - 96 * 60 * 60 * 1000);
  const jobsLimit = randomInt(importMin, importMax + 1);

  const localPool = mysql.createPool({
    uri: appDatabaseUrl,
    connectionLimit: 10,
  });

  let totalImported = 0;
  let totalSubmitted = 0;
  const submittedUrls = [];

  try {
    console.info(`Import limit: ${jobsLimit}, destination: ${destination}${dryRun ? " (dry-run)" : ""}`);

    for (const country of COUNTRIES) {
      const aggPool = mysql.createPool({
        uri: buildAggUri(country.database),
        connectionLimit: 4,
      });

      try {
        const [rows] = await aggPool.execute(
          `
          SELECT
            job.id,
            job.site_id,
            job.url,
            job.category,
            job.position,
            job.description,
            job.salary_min,
            job.salary_max,
            job.salary_period,
            job.contract,
            job.published,
            job.expires,
            company.id AS company_id,
            company.name AS company_name,
            company.logo AS company_logo
          FROM job
          JOIN company ON job.company_id = company.id
          WHERE job.destination = ?
            AND job.ctime IS NULL
            AND job.utime > ?
            AND job.id NOT IN (
              SELECT export.job_id
              FROM export
              WHERE export.destination = ?
            )
          LIMIT ?
          `,
          [destination, start, destination, jobsLimit],
        );

        console.info(`[${country.database}] candidates: ${rows.length}`);

        for (const row of rows) {
          const description = String(row.description ?? "").trim();
          if (description.length <= 255) {
            continue;
          }

          const categoryId = resolveCategoryId(row.category, row.position);
          const contractCode = normalizeContract(row.contract);
          const salaryMin = Number(row.salary_min ?? 0) || 0;
          const rowSalaryMax = Number(row.salary_max ?? 0) || 0;
          const salaryMax = rowSalaryMax !== salaryMin ? rowSalaryMax : 0;

          if (dryRun) {
            console.info(`[dry-run] would import: ${row.position} (${country.database} source job id ${row.id})`);
            totalImported += 1;
            continue;
          }

          const [result] = await localPool.execute(
            `
            INSERT INTO jobs (
              user_id,
              url,
              category_id,
              position,
              company_name,
              description,
              salary_min,
              salary_max,
              salary_period,
              currency,
              contract_code,
              country_id,
              country_groups,
              published,
              expires,
              skills,
              apply_text,
              created_at,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, NOW(), NOW())
            `,
            [
              1,
              row.url ?? "",
              categoryId,
              row.position ?? "",
              row.company_name ?? "",
              description,
              salaryMin,
              salaryMax,
              row.salary_period ?? "",
              country.currency,
              contractCode,
              country.id,
              "0",
              row.expires ?? null,
              "",
              "",
            ],
          );

          const jobId = Number(result.insertId);
          if (!jobId) {
            continue;
          }

          await aggPool.execute("UPDATE job SET ctime = NOW() WHERE id = ?", [row.id]);
          await aggPool.execute(
            "INSERT INTO export (job_id, destination, site_id, dt) VALUES (?, ?, ?, NOW())",
            [row.id, destination, row.site_id],
          );

          if (row.company_logo) {
            const [existingRows] = await localPool.execute(
              "SELECT company_logo FROM job_logos WHERE external_company_id = ? LIMIT 1",
              [row.company_id],
            );

            const existingLogo = existingRows[0]?.company_logo ?? "";
            if (existingLogo) {
              const normalizedExistingLogo = normalizeCompanyLogoPath(existingLogo);
              await localPool.execute("UPDATE jobs SET company_logo = ? WHERE id = ?", [normalizedExistingLogo, jobId]);
              console.info(`Used existing logo ${normalizedExistingLogo}`);
            } else {
              const logoUrl = buildLegacyLogoUrl(imageBaseUrl, row.company_logo);
              try {
                const outputDir = path.resolve(process.cwd(), "public/images/employers");
                const savedLogo = await downloadLogo(logoUrl, outputDir);
                const normalizedSavedLogo = normalizeCompanyLogoPath(savedLogo);
                await localPool.execute("UPDATE jobs SET company_logo = ? WHERE id = ?", [normalizedSavedLogo, jobId]);
                await localPool.execute(
                  "INSERT INTO job_logos (external_company_id, company_logo, created_at, updated_at) VALUES (?, ?, NOW(), NOW())",
                  [row.company_id, normalizedSavedLogo],
                );
                console.info(`Uploaded logo ${normalizedSavedLogo}`);
              } catch {
                console.info("Error uploading logo");
              }
            }
          }

          const jobPath = `/jobs/${jobId}`;
          const jobUrl = appBaseUrl ? new URL(jobPath, appBaseUrl).toString() : jobPath;
          console.info(jobUrl);
          if (appBaseUrl) {
            submittedUrls.push(jobUrl);
          }
          totalImported += 1;
          totalSubmitted += 1;
        }
      } finally {
        await aggPool.end();
      }
    }

    console.info(`Imported jobs: ${totalImported}`);
    if (dryRun) {
      console.info("Dry run complete. No rows were modified.");
    } else {
      console.info(`Index-submit candidates: ${totalSubmitted}`);
      if (!appBaseUrl) {
        console.info("Skipping Google/Bing submission because PUBLIC_APP_URL is not set");
      } else if (submittedUrls.length > 0) {
        await submitGoogleIndexing(submittedUrls);
        await submitBingIndexNow(submittedUrls, appBaseUrl);
      }
    }
  } finally {
    await localPool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
