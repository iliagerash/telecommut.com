#!/usr/bin/env node
import { randomInt } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const TABLE_MAP = [
  ["users", "auth_users"],
  ["categories", "categories"],
  ["countries", "countries"],
  ["country_groups", "country_groups"],
  ["contracts", "contracts"],
  ["jobs", "jobs"],
  ["resumes", "resumes"],
  ["seo_pages", "seo_pages"],
  ["job_removals", "job_removals"],
  ["job_logos", "job_logos"],
  ["cloudflare_events", "cloudflare_events"],
  ["direct_traffic", "direct_traffic"],
  ["subscriptions", "subscriptions"],
  ["subscription_items", "subscription_items"],
];

const ORDER_BY = {
  cloudflare_events: "ray_name",
};

const NOT_NULL_TEXT_DEFAULTS = {
  auth_users: [
    "candidate_name",
    "candidate_phone",
    "candidate_photo",
    "company_name",
    "company_phone",
    "company_contact",
    "company_logo",
    "name",
  ],
  categories: ["coverage_state"],
  jobs: ["apply_text", "company_logo", "skills"],
  resumes: ["skills"],
};

const NUMERIC_USER_ID_TABLES = new Set(["jobs", "resumes", "subscriptions"]);
const DEFAULT_BATCH_SIZE = 100;

const TITLE_DESCRIPTIONS = new Map([
  ["Software Development", "Build and ship remote software across frontend, backend, mobile, and platform teams working with modern engineering stacks."],
  ["Product Management", "Lead product direction for distributed teams by owning roadmap priorities, discovery cycles, and measurable customer outcomes."],
  ["Project Management", "Coordinate timelines, stakeholders, and delivery across remote projects to keep cross-functional execution predictable and on track."],
  ["DevOps and Sysadmin", "Operate reliable cloud infrastructure, CI/CD pipelines, observability tooling, and incident response for remote-first engineering organizations."],
  ["Customer Support", "Help customers succeed through chat, email, and support operations roles focused on resolution quality, empathy, and response speed."],
  ["Copywriting and Editing", "Create and refine high-impact written content, from product messaging to long-form editorial work, for globally distributed audiences."],
  ["Design and Multimedia", "Design polished digital experiences and visual assets spanning UI, brand, video, and multimedia production for remote teams."],
  ["Administrative", "Support business operations with remote administrative roles covering scheduling, coordination, documentation, and executive assistance."],
  ["Accounting and Finance", "Manage budgets, reporting, payroll, and financial planning in remote accounting and finance roles across growing global companies."],
  ["Business Management", "Drive strategy and operations through remote management roles focused on growth, process improvement, and organizational performance."],
  ["Marketing and Sales", "Scale demand and revenue through remote marketing and sales positions in content, lifecycle, partnerships, and account growth."],
  ["Education and Training", "Teach, coach, and enable learners through remote education and training jobs across curriculum, instruction, and learning operations."],
  ["Healthcare", "Find remote healthcare opportunities in clinical support, health operations, telehealth coordination, and regulated care workflows."],
  ["Human Resources", "Build strong distributed teams through remote HR roles in recruiting, people operations, performance, and employee experience."],
  ["Legal", "Support compliance and risk management with remote legal roles across contracts, privacy, policy, and corporate governance."],
  ["Other", "Browse remote openings that do not fit standard tracks, including specialized, emerging, and cross-disciplinary career paths."],
]);

const TITLE_PAGE_TEXT = new Map([
  ["Software Development", "Browse hand-curated software engineering roles across frontend, backend, full-stack, platform, and mobile teams. Listings are remote-first and include details on stack, ownership, and hiring scope."],
  ["Product Management", "Explore remote PM roles spanning product strategy, discovery, roadmap execution, and stakeholder alignment. Compare openings by product stage, ownership level, and domain focus."],
  ["Project Management", "Find distributed project management opportunities focused on delivery planning, cross-functional coordination, and execution governance. Roles include Agile, technical, and operations-heavy programs."],
  ["DevOps and Sysadmin", "Review infrastructure and reliability positions covering CI/CD, cloud operations, security hardening, observability, and incident response. These roles support always-on distributed systems."],
  ["Customer Support", "Discover customer support jobs in remote teams handling onboarding, retention, escalations, and technical troubleshooting. Openings range from frontline support to support operations leadership."],
  ["Copywriting and Editing", "Find writing and editing opportunities in content marketing, technical documentation, product copy, and editorial workflows. Roles are suited for strong communicators who can write with clarity and precision."],
  ["Design and Multimedia", "Browse design and multimedia roles in UI/UX, brand systems, motion, and creative production. Compare positions by product design depth, visual ownership, and collaboration model."],
  ["Administrative", "Explore remote administrative positions supporting executives and teams through scheduling, process management, communication, and operations coordination. Ideal for detail-driven organizational work."],
  ["Accounting and Finance", "Review accounting and finance opportunities in reporting, FP&A, bookkeeping, controls, and payroll operations. Roles span startups and established organizations with distributed finance teams."],
  ["Business Management", "Find business management jobs focused on operations, execution, and strategic growth initiatives. These openings often combine planning, people leadership, and measurable performance goals."],
  ["Marketing and Sales", "Explore remote marketing and sales roles across growth, lifecycle, paid channels, partnerships, and revenue operations. Compare openings by funnel stage responsibility and target market."],
  ["Education and Training", "Discover education and training opportunities in curriculum design, facilitation, coaching, and learner enablement. Roles support remote learning programs for customers, employees, and students."],
  ["Healthcare", "Browse healthcare openings in telehealth support, clinical operations, compliance, and care coordination. These roles combine domain expertise with remote-first delivery models."],
  ["Human Resources", "Find HR opportunities covering recruiting, people operations, performance systems, and employee experience. Positions are designed for distributed organizations building strong remote cultures."],
  ["Legal", "Explore legal roles in contracts, compliance, corporate governance, and policy advisory. Remote legal teams support business velocity while reducing risk across jurisdictions."],
  ["Other", "Review specialized remote jobs that do not fit standard functional tracks. This section includes niche, hybrid, and emerging roles with unique skill combinations."],
]);

const TITLE_META_TITLES = new Map([
  ["Software Development", "Remote Software Development Jobs"],
  ["Product Management", "Remote Product Management Jobs"],
  ["Project Management", "Remote Project Management Jobs"],
  ["DevOps and Sysadmin", "Remote DevOps and Sysadmin Jobs"],
  ["Customer Support", "Remote Customer Support Jobs"],
  ["Copywriting and Editing", "Remote Copywriting and Editing Jobs"],
  ["Design and Multimedia", "Remote Design and Multimedia Jobs"],
  ["Administrative", "Remote Administrative Jobs"],
  ["Accounting and Finance", "Remote Accounting and Finance Jobs"],
  ["Business Management", "Remote Business Management Jobs"],
  ["Marketing and Sales", "Remote Marketing and Sales Jobs"],
  ["Education and Training", "Remote Education and Training Jobs"],
  ["Healthcare", "Remote Healthcare Jobs"],
  ["Human Resources", "Remote Human Resources Jobs"],
  ["Legal", "Remote Legal Jobs"],
  ["Other", "Remote Jobs Across Specialized Roles"],
]);

const LEGACY_TO_LUCIDE_ICON = new Map([
  ["fa-code", "Code2"],
  ["fa-hdd", "HardDrive"],
  ["fa-tasks", "ListTodo"],
  ["fa-database", "Database"],
  ["fa-phone-volume", "Headset"],
  ["fa-edit", "FilePenLine"],
  ["fa-photo-video", "Palette"],
  ["fa-calendar-alt", "CalendarDays"],
  ["fa-coins", "Coins"],
  ["fa-chart-line", "LineChart"],
  ["fa-mail-bulk", "Megaphone"],
  ["fa-user-graduate", "GraduationCap"],
  ["fa-user-md", "Stethoscope"],
  ["fa-users", "Users"],
  ["fa-balance-scale", "Scale"],
  ["fa-sun", "Sun"],
  ["fa-check-circle", "CircleCheckBig"],
]);

function parseArgs(argv) {
  const parsed = {
    dryRun: false,
    reportPath: "",
    batchSize: DEFAULT_BATCH_SIZE,
  };

  for (const arg of argv.slice(2)) {
    if (arg === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }
    if (arg.startsWith("--report=")) {
      parsed.reportPath = arg.slice("--report=".length);
      continue;
    }
    if (arg.startsWith("--batch-size=")) {
      const n = Number.parseInt(arg.slice("--batch-size=".length), 10);
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error("--batch-size must be a positive integer");
      }
      parsed.batchSize = n;
      continue;
    }
    if (arg === "-h" || arg === "--help") {
      console.log("Usage: node scripts/migrate-data.mjs [--dry-run] [--batch-size=100] [--report=./path.json]");
      process.exit(0);
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

function buildMysqlUrlFromLegacy(prefix) {
  const host = (process.env[`${prefix}_HOST`] ?? "").trim();
  const db = (process.env[`${prefix}_DATABASE`] ?? "").trim();
  const user = (process.env[`${prefix}_USERNAME`] ?? process.env.DB_USERNAME ?? "").trim();
  const pass = process.env[`${prefix}_PASSWORD`] ?? process.env.DB_PASSWORD ?? "";

  if (!host || !db || !user) {
    return "";
  }

  const encodedUser = encodeURIComponent(user);
  const encodedPass = encodeURIComponent(pass);
  return `mysql://${encodedUser}:${encodedPass}@${host}:3306/${db}`;
}

function inferSourceDatabaseUrl() {
  const explicit = (process.env.SOURCE_DATABASE_URL ?? "").trim();
  if (explicit) {
    return explicit;
  }

  const fromLegacy = buildMysqlUrlFromLegacy("MYSQL");
  if (fromLegacy) {
    return fromLegacy;
  }

  const target = requiredEnv("DATABASE_URL");
  const url = new URL(target);
  if (!url.pathname || url.pathname === "/") {
    throw new Error("DATABASE_URL must include a database name");
  }
  url.pathname = "/telecommut_old";
  return url.toString();
}

function quoteIdent(identifier) {
  return `\`${String(identifier).replaceAll("`", "``")}\``;
}

function toMysqlDatetime(value) {
  const toDate = (input) => {
    if (input === null || input === undefined || input === "") return null;
    if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
    if (typeof input === "number") {
      const ms = input > 1_000_000_000_000 ? input : input * 1000;
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (typeof input === "string") {
      const trimmed = input.trim();
      if (!trimmed) return null;
      const d = new Date(trimmed.replace(" ", "T"));
      if (!Number.isNaN(d.getTime())) return d;
    }
    return null;
  };

  const date = toDate(value) ?? new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function normalizeRole(role, legacyType) {
  if (typeof role === "string") {
    const normalized = role.trim().toLowerCase();
    if (normalized === "admin") return "admin";
    if (normalized === "employer" || normalized === "company") return "employer";
    if (normalized === "candidate" || normalized === "user") return "candidate";
  }

  if (typeof legacyType === "string") {
    const normalized = legacyType.trim().toLowerCase();
    if (normalized === "admin") return "admin";
    if (normalized === "employer" || normalized === "company") return "employer";
  }

  return "candidate";
}

function deriveName(row) {
  const email = typeof row.email === "string" ? row.email.trim() : "";
  if (email) return email;
  return "User";
}

function deriveImage(row) {
  for (const key of ["candidate_photo", "company_logo"]) {
    const value = typeof row[key] === "string" ? row[key].trim() : "";
    if (value) return value;
  }
  return null;
}

function generateBetterAuthId(size = 32) {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < size; i += 1) {
    out += alphabet[randomInt(0, alphabet.length)];
  }
  return out;
}

function normalizeCredentialPasswordHash(hash) {
  if (typeof hash === "string" && hash.startsWith("$2y$")) {
    return `$2b$${hash.slice(4)}`;
  }
  return hash;
}

function slugify(input) {
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function destinationColumns(connection, dbName, tableName) {
  const [rows] = await connection.query(
    `SELECT COLUMN_NAME AS name
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
     ORDER BY ORDINAL_POSITION`,
    [dbName, tableName],
  );
  return rows.map((row) => String(row.name));
}

function buildInsertColumns(sourceTable, sourceColumns, destColumns) {
  const source = [...sourceColumns];

  if (sourceTable === "users") {
    const withoutType = source.filter((c) => c !== "type");
    const extras = ["role", "name", "email_verified", "email_verified_at", "image", "created_at", "updated_at"];
    for (const col of extras) {
      if (!withoutType.includes(col)) {
        withoutType.push(col);
      }
    }
    source.length = 0;
    source.push(...withoutType);
  }

  const lookup = new Set(destColumns);
  const filtered = source.filter((col) => lookup.has(col));
  return filtered.length > 0 ? filtered : source;
}

function normalizeRow(sourceTable, targetTable, row, columns) {
  const out = {};

  for (const column of columns) {
    if (NUMERIC_USER_ID_TABLES.has(sourceTable) && column === "user_id") {
      const value = row.user_id;
      out.user_id = value === null || value === undefined || value === "" ? null : Number(value);
      continue;
    }

    if (sourceTable === "users") {
      if (column === "id") {
        const id = Number(row.id);
        out.id = Number.isFinite(id) && id > 0 ? id : null;
        continue;
      }
      if (column === "role") {
        out.role = normalizeRole(row.role, row.type);
        continue;
      }
      if (column === "name") {
        out.name = deriveName(row);
        continue;
      }
      if (column === "email_verified") {
        out.email_verified = row.email_verified_at ? 1 : 0;
        continue;
      }
      if (column === "email_verified_at") {
        out.email_verified_at = row.email_verified_at ? toMysqlDatetime(row.email_verified_at) : null;
        continue;
      }
      if (column === "image") {
        out.image = deriveImage(row);
        continue;
      }
      if (column === "created_at") {
        out.created_at = toMysqlDatetime(row.created_at);
        continue;
      }
      if (column === "updated_at") {
        out.updated_at = toMysqlDatetime(row.updated_at);
        continue;
      }
    }

    out[column] = row[column] ?? null;
  }

  const forceDefaults = NOT_NULL_TEXT_DEFAULTS[targetTable] ?? [];
  for (const col of forceDefaults) {
    if (Object.hasOwn(out, col) && (out[col] === null || out[col] === undefined || out[col] === "")) {
      out[col] = "";
    }
  }

  return out;
}

function buildUpsertSql(tableName, columns, rowCount) {
  const placeholders = `(${columns.map(() => "?").join(", ")})`;
  const valuesSql = Array.from({ length: rowCount }).map(() => placeholders).join(", ");
  const colSql = columns.map(quoteIdent).join(", ");
  const updates = columns.map((c) => `${quoteIdent(c)} = VALUES(${quoteIdent(c)})`).join(", ");
  return `INSERT INTO ${quoteIdent(tableName)} (${colSql}) VALUES ${valuesSql} ON DUPLICATE KEY UPDATE ${updates}`;
}

async function* fetchBatched(connection, tableName, batchSize, orderBy) {
  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [rows] = await connection.query(
      `SELECT * FROM ${quoteIdent(tableName)} ORDER BY ${quoteIdent(orderBy)} LIMIT ${Number(batchSize)} OFFSET ${Number(offset)}`,
    );
    if (!rows || rows.length === 0) break;
    yield rows;
    if (rows.length < batchSize) break;
    offset += batchSize;
  }
}

async function migrateTable({ sourceConn, targetConn, targetDbName, sourceTable, targetTable, dryRun, batchSize }) {
  const orderBy = ORDER_BY[sourceTable] ?? "id";
  const report = {
    source_table: sourceTable,
    target_table: targetTable,
    order_by: orderBy,
    source_rows: 0,
    upserted_rows: 0,
    errors: 0,
    error_samples: [],
  };

  console.log(`  [start] ${sourceTable} -> ${targetTable}`);

  const destCols = await destinationColumns(targetConn, targetDbName, targetTable);
  if (destCols.length === 0) {
    report.errors += 1;
    report.error_samples.push({ table: sourceTable, message: "Destination table missing" });
    console.log(`  [error] ${targetTable} missing on destination`);
    return report;
  }

  let insertCols = null;
  let pendingParams = [];
  let pendingRows = 0;

  const flush = async () => {
    if (dryRun || pendingRows === 0 || !insertCols) {
      pendingParams = [];
      pendingRows = 0;
      return;
    }

    try {
      const sql = buildUpsertSql(targetTable, insertCols, pendingRows);
      await targetConn.query(sql, pendingParams);
      report.upserted_rows += pendingRows;
    } catch (error) {
      report.errors += pendingRows;
      if (report.error_samples.length < 10) {
        report.error_samples.push({
          table: sourceTable,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    pendingParams = [];
    pendingRows = 0;
  };

  for await (const rows of fetchBatched(sourceConn, sourceTable, batchSize, orderBy)) {
    for (const row of rows) {
      if (!insertCols) {
        insertCols = buildInsertColumns(sourceTable, Object.keys(row), destCols);
      }

      const normalized = normalizeRow(sourceTable, targetTable, row, insertCols);
      if (sourceTable === "users" && (normalized.id === null || normalized.id === undefined)) {
        continue;
      }

      report.source_rows += 1;
      for (const column of insertCols) {
        pendingParams.push(normalized[column] ?? null);
      }
      pendingRows += 1;

      if (pendingRows >= batchSize) {
        await flush();
      }
    }
  }

  await flush();

  const label = dryRun ? "dry-run" : "ok";
  console.log(`  [${label}] ${sourceTable} -> ${targetTable}: source=${report.source_rows}, upserted=${report.upserted_rows}, errors=${report.errors}`);
  return report;
}

async function migrateAuthAccounts({ sourceConn, targetConn, targetDbName, dryRun }) {
  const report = {
    source_table: "users",
    target_table: "auth_accounts",
    order_by: "id",
    source_rows: 0,
    upserted_rows: 0,
    errors: 0,
    error_samples: [],
  };

  console.log("  [start] users -> auth_accounts (password accounts)");

  const destCols = await destinationColumns(targetConn, targetDbName, "auth_accounts");
  if (destCols.length === 0) {
    report.errors += 1;
    report.error_samples.push({ table: "users", message: "Destination auth_accounts table missing" });
    console.log("  [error] auth_accounts missing on destination");
    return report;
  }

  const columns = ["id", "user_id", "account_id", "provider_id", "password", "created_at", "updated_at"].filter((c) => destCols.includes(c));
  if (columns.length === 0) {
    console.log("  [skip] auth_accounts (no matching columns)");
    return report;
  }

  const [existingUsers] = await targetConn.query(`SELECT id FROM ${quoteIdent("auth_users")} ORDER BY id`);
  const existingIds = new Set(existingUsers.map((row) => Number(row.id)).filter((id) => Number.isFinite(id) && id > 0));

  for await (const rows of fetchBatched(sourceConn, "users", 500, "id")) {
    for (const row of rows) {
      const legacyPassword = typeof row.password === "string" ? row.password.trim() : "";
      if (!legacyPassword) continue;

      const userId = Number(row.id);
      if (!Number.isFinite(userId) || userId <= 0 || !existingIds.has(userId)) continue;

      report.source_rows += 1;
      if (dryRun) continue;

      const normalized = {
        id: generateBetterAuthId(32),
        user_id: userId,
        account_id: String(userId),
        provider_id: "credential",
        password: normalizeCredentialPasswordHash(legacyPassword),
        created_at: toMysqlDatetime(row.created_at),
        updated_at: toMysqlDatetime(row.updated_at),
      };

      const params = columns.map((c) => normalized[c] ?? null);
      try {
        const sql = buildUpsertSql("auth_accounts", columns, 1);
        await targetConn.query(sql, params);
        report.upserted_rows += 1;
      } catch (error) {
        report.errors += 1;
        if (report.error_samples.length < 10) {
          report.error_samples.push({
            table: "users",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }

  const label = dryRun ? "dry-run" : "ok";
  console.log(`  [${label}] users -> auth_accounts: source=${report.source_rows}, upserted=${report.upserted_rows}, errors=${report.errors}`);
  return report;
}

async function backfillCategoryMetadata({ targetConn, targetDbName, dryRun }) {
  const report = {
    source_table: "categories",
    target_table: "categories",
    order_by: "id",
    source_rows: 0,
    upserted_rows: 0,
    errors: 0,
    error_samples: [],
  };

  console.log("  [start] categories metadata backfill");

  const destCols = await destinationColumns(targetConn, targetDbName, "categories");
  if (destCols.length === 0) {
    report.errors += 1;
    report.error_samples.push({ table: "categories", message: "Destination categories table missing" });
    console.log("  [error] categories missing on destination");
    return report;
  }

  const [rows] = await targetConn.query(
    "SELECT id, title, slug, description, page_text, meta_title, icon FROM categories ORDER BY id ASC",
  );

  if (!Array.isArray(rows) || rows.length === 0) {
    console.log("  [skip] categories metadata backfill (empty)");
    return report;
  }

  report.source_rows = rows.length;

  const used = new Set(
    rows
      .map((row) => String(row.slug ?? "").trim().toLowerCase())
      .filter(Boolean),
  );

  for (const row of rows) {
    const title = String(row.title ?? "").trim();
    let slug = String(row.slug ?? "").trim().toLowerCase();
    const description = String(row.description ?? "").trim();
    const pageText = String(row.page_text ?? "").trim();
    const metaTitle = String(row.meta_title ?? "").trim();
    const icon = String(row.icon ?? "").trim();

    if (!slug) {
      let base = slugify(title);
      if (!base) {
        base = `category-${row.id}`;
      }
      slug = base;
      let suffix = 2;
      while (used.has(slug)) {
        slug = `${base}-${suffix}`;
        suffix += 1;
      }
      used.add(slug);
    }

    const nextDescription = description || TITLE_DESCRIPTIONS.get(title) || `Remote jobs in ${title}.`;
    const nextPageText = pageText || TITLE_PAGE_TEXT.get(title) || `Browse remote opportunities in ${title}.`;
    const nextMetaTitle = metaTitle || TITLE_META_TITLES.get(title) || `Remote ${title} Jobs`;
    const nextIcon = LEGACY_TO_LUCIDE_ICON.get(icon) || icon || "CircleCheckBig";

    if (dryRun) {
      report.upserted_rows += 1;
      continue;
    }

    try {
      await targetConn.query(
        "UPDATE categories SET slug = ?, description = ?, page_text = ?, meta_title = ?, icon = ? WHERE id = ?",
        [slug, nextDescription, nextPageText, nextMetaTitle, nextIcon, row.id],
      );
      report.upserted_rows += 1;
    } catch (error) {
      report.errors += 1;
      if (report.error_samples.length < 10) {
        report.error_samples.push({
          table: "categories",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  const label = dryRun ? "dry-run" : "ok";
  console.log(`  [${label}] categories metadata backfill: source=${report.source_rows}, updated=${report.upserted_rows}, errors=${report.errors}`);
  return report;
}

async function main() {
  const args = parseArgs(process.argv);

  const sourceUrl = inferSourceDatabaseUrl();
  const targetUrl = requiredEnv("DATABASE_URL");

  const source = new URL(sourceUrl);
  const target = new URL(targetUrl);
  const targetDbName = target.pathname.replace(/^\//, "");
  if (!targetDbName) {
    throw new Error("DATABASE_URL must include target database name");
  }

  const sourceConn = await mysql.createConnection(sourceUrl);
  const targetConn = await mysql.createConnection(targetUrl);

  const report = {
    started_at: new Date().toISOString(),
    dry_run: args.dryRun,
    source_database: source.pathname.replace(/^\//, ""),
    target_database: targetDbName,
    tables: [],
    totals: {
      tables: 0,
      source_rows: 0,
      upserted_rows: 0,
      errors: 0,
    },
  };

  try {
    console.log(`Migrating MySQL -> MySQL (${source.host}${source.pathname} -> ${target.host}${target.pathname})${args.dryRun ? " [dry-run]" : ""}`);

    for (const [sourceTable, targetTable] of TABLE_MAP) {
      const tableReport = await migrateTable({
        sourceConn,
        targetConn,
        targetDbName,
        sourceTable,
        targetTable,
        dryRun: args.dryRun,
        batchSize: args.batchSize,
      });
      report.tables.push(tableReport);
      report.totals.tables += 1;
      report.totals.source_rows += tableReport.source_rows;
      report.totals.upserted_rows += tableReport.upserted_rows;
      report.totals.errors += tableReport.errors;
    }

    const accountsReport = await migrateAuthAccounts({
      sourceConn,
      targetConn,
      targetDbName,
      dryRun: args.dryRun,
    });
    report.tables.push(accountsReport);
    report.totals.tables += 1;
    report.totals.source_rows += accountsReport.source_rows;
    report.totals.upserted_rows += accountsReport.upserted_rows;
    report.totals.errors += accountsReport.errors;

    const categoriesBackfillReport = await backfillCategoryMetadata({
      targetConn,
      targetDbName,
      dryRun: args.dryRun,
    });
    report.tables.push(categoriesBackfillReport);
    report.totals.tables += 1;
    report.totals.source_rows += categoriesBackfillReport.source_rows;
    report.totals.upserted_rows += categoriesBackfillReport.upserted_rows;
    report.totals.errors += categoriesBackfillReport.errors;
  } finally {
    await sourceConn.end();
    await targetConn.end();
  }

  report.finished_at = new Date().toISOString();

  let reportPath = args.reportPath;
  if (!reportPath) {
    const reportsDir = path.resolve(process.cwd(), "logs");
    await mkdir(reportsDir, { recursive: true });
    const stamp = new Date().toISOString().replaceAll(":", "").replaceAll("-", "").replaceAll(".", "").replace("T", "-").slice(0, 15);
    reportPath = path.join(reportsDir, `migration-report-${stamp}.json`);
  }

  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Migration report: ${reportPath}`);

  if (args.dryRun) {
    console.log("Dry-run mode: no inserts executed.");
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
