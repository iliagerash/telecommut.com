import { mkdtempSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

import Database from "better-sqlite3";

const tempDir = mkdtempSync(join(tmpdir(), "telecommut-vitest-"));
const sqlitePath = join(tempDir, "telecommut.test.db");

process.env.LOCAL_SQLITE_PATH = sqlitePath;

const migrationPath = resolve(process.cwd(), "drizzle/0000_nifty_thena.sql");
const migrationSql = readFileSync(migrationPath, "utf8")
  .split("--> statement-breakpoint")
  .map((statement) => statement.trim())
  .filter(Boolean);

const db = new Database(sqlitePath);
for (const statement of migrationSql) {
  db.exec(statement);
}
db.close();
