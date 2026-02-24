import { existsSync } from "node:fs";
import path from "node:path";

import "dotenv/config";
import Database from "better-sqlite3";

const dbClient = process.env.DB_CLIENT ?? "sqlite";
const sqlitePath = process.env.LOCAL_SQLITE_PATH ?? ".local/telecommut.db";
const resolvedPath = path.resolve(process.cwd(), sqlitePath);

if (dbClient !== "sqlite") {
  console.log(`data-qa skipped: DB_CLIENT=${dbClient} (script currently supports sqlite only)`);
  process.exit(0);
}

if (!existsSync(resolvedPath)) {
  console.log(`data-qa skipped: sqlite file not found at ${resolvedPath}`);
  process.exit(0);
}

const db = new Database(resolvedPath, { readonly: true });

function scalar(sql) {
  const row = db.prepare(sql).get();
  const value = row ? Object.values(row)[0] : 0;
  return Number(value ?? 0);
}

const report = {
  dbPath: resolvedPath,
  users: scalar("SELECT COUNT(*) AS c FROM users"),
  jobs: scalar("SELECT COUNT(*) AS c FROM jobs"),
  resumes: scalar("SELECT COUNT(*) AS c FROM resumes"),
  orphanJobsByUser: scalar(`
    SELECT COUNT(*) AS c
    FROM jobs j
    LEFT JOIN users u ON u.id = j.user_id
    WHERE u.id IS NULL
  `),
  orphanResumesByUser: scalar(`
    SELECT COUNT(*) AS c
    FROM resumes r
    LEFT JOIN users u ON u.id = r.user_id
    WHERE u.id IS NULL
  `),
  jobsWithMissingCategory: scalar(`
    SELECT COUNT(*) AS c
    FROM jobs j
    LEFT JOIN categories c ON c.id = j.category_id
    WHERE c.id IS NULL
  `),
  duplicateUserEmails: scalar(`
    SELECT COUNT(*) AS c
    FROM (
      SELECT email
      FROM users
      GROUP BY email
      HAVING COUNT(*) > 1
    )
  `),
};

db.close();

console.log(JSON.stringify(report, null, 2));

if (
  report.orphanJobsByUser > 0
  || report.orphanResumesByUser > 0
  || report.jobsWithMissingCategory > 0
  || report.duplicateUserEmails > 0
) {
  process.exit(2);
}
