import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sqlitePath = process.env.LOCAL_SQLITE_PATH ?? path.join(rootDir, "telecommut.db");
const migrationsDir = path.join(rootDir, "drizzle");

fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });

const db = new Database(sqlitePath);

// Minimal migration ledger so reruns remain deterministic.
db.exec(`
  CREATE TABLE IF NOT EXISTS __migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b));

for (const file of migrationFiles) {
  const existing = db
    .prepare("SELECT 1 FROM __migrations WHERE name = ?")
    .get(file);

  if (existing) {
    console.log(`skip ${file}`);
    continue;
  }

  const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");

  db.transaction(() => {
    db.exec(sql);
    db.prepare("INSERT INTO __migrations (name) VALUES (?)").run(file);
  })();

  console.log(`applied ${file}`);
}

console.log(`sqlite migrations complete at ${sqlitePath}`);
