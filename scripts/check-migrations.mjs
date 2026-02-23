import fs from "node:fs";
import path from "node:path";

const migrationsDir = path.resolve("drizzle");

if (!fs.existsSync(migrationsDir)) {
  throw new Error("Missing drizzle migrations directory.");
}

const sqlFiles = fs
  .readdirSync(migrationsDir)
  .filter((entry) => entry.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b));

if (sqlFiles.length === 0) {
  throw new Error("No SQL migrations found under drizzle/.");
}

const duplicateNames = sqlFiles.filter((name, index) => sqlFiles.indexOf(name) !== index);

if (duplicateNames.length > 0) {
  throw new Error(`Duplicate migration file names found: ${duplicateNames.join(", ")}`);
}

const hasMetaJournal = fs.existsSync(path.join(migrationsDir, "meta", "_journal.json"));
if (!hasMetaJournal) {
  throw new Error("Missing drizzle/meta/_journal.json. Run npm run db:generate.");
}

console.log(`migration check passed (${sqlFiles.length} sql file(s))`);
