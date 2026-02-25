import { existsSync } from "node:fs";
import path from "node:path";

import "dotenv/config";
import Database from "better-sqlite3";

const dbClient = process.env.DB_CLIENT ?? "sqlite";
const sqlitePath = process.env.LOCAL_SQLITE_PATH ?? "telecommut.db";
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

function hasColumn(table, column) {
  const rows = db.prepare(`PRAGMA table_info(${table});`).all();
  return rows.some((row) => String(row.name) === column);
}

function scalar(sql) {
  const row = db.prepare(sql).get();
  const value = row ? Object.values(row)[0] : 0;
  return Number(value ?? 0);
}

const hasUsersRoleColumn = hasColumn("users", "role");
const hasUsersTypeColumn = hasColumn("users", "type");
const userRoleExpr = hasUsersRoleColumn
  ? (hasUsersTypeColumn ? "COALESCE(role, type)" : "role")
  : "type";
const ownerRoleExpr = hasUsersRoleColumn
  ? (hasUsersTypeColumn ? "COALESCE(u.role, u.type)" : "u.role")
  : "u.type";

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
  adminUsers: scalar(`
    SELECT COUNT(*) AS c
    FROM users
    WHERE LOWER(${userRoleExpr}) = 'admin'
  `),
  usersWithUnknownRole: scalar(`
    SELECT COUNT(*) AS c
    FROM users
    WHERE LOWER(${userRoleExpr}) NOT IN ('admin', 'user', 'candidate', 'employer', 'company')
  `),
  usersWithNullNormalizedRole: hasUsersRoleColumn
    ? scalar("SELECT COUNT(*) AS c FROM users WHERE role IS NULL")
    : 0,
  usersWithUnknownNormalizedRole: hasUsersRoleColumn
    ? scalar(`
      SELECT COUNT(*) AS c
      FROM users
      WHERE LOWER(role) NOT IN ('admin', 'candidate', 'employer')
    `)
    : 0,
  usersWithRoleTypeMismatch: hasUsersRoleColumn && hasUsersTypeColumn
    ? scalar(`
      SELECT COUNT(*) AS c
      FROM users
      WHERE role IS NOT NULL
        AND (
          (LOWER(role) = 'admin' AND LOWER(type) <> 'admin')
          OR (LOWER(role) = 'candidate' AND LOWER(type) NOT IN ('candidate', 'user'))
          OR (LOWER(role) = 'employer' AND LOWER(type) NOT IN ('employer', 'company'))
          OR (LOWER(role) NOT IN ('admin', 'candidate', 'employer'))
        )
    `)
    : 0,
  jobsWithUnknownOwnerRole: scalar(`
    SELECT COUNT(*) AS c
    FROM jobs j
    JOIN users u ON u.id = j.user_id
    WHERE LOWER(${ownerRoleExpr}) NOT IN ('admin', 'candidate', 'employer', 'user', 'company')
  `),
  resumesWithUnknownOwnerRole: scalar(`
    SELECT COUNT(*) AS c
    FROM resumes r
    JOIN users u ON u.id = r.user_id
    WHERE LOWER(${ownerRoleExpr}) NOT IN ('admin', 'candidate', 'employer', 'user', 'company')
  `),
  jobsWithUnexpectedStatus: scalar(`
    SELECT COUNT(*) AS c
    FROM jobs
    WHERE status NOT IN (0, 1)
  `),
  resumesWithUnexpectedStatus: scalar(`
    SELECT COUNT(*) AS c
    FROM resumes
    WHERE status NOT IN (0, 1)
  `),
};

db.close();

console.log(JSON.stringify(report, null, 2));

if (
  report.orphanJobsByUser > 0
  || report.orphanResumesByUser > 0
  || report.jobsWithMissingCategory > 0
  || report.duplicateUserEmails > 0
  || report.usersWithUnknownRole > 0
  || report.usersWithNullNormalizedRole > 0
  || report.usersWithUnknownNormalizedRole > 0
  || report.usersWithRoleTypeMismatch > 0
  || report.jobsWithUnknownOwnerRole > 0
  || report.resumesWithUnknownOwnerRole > 0
  || report.jobsWithUnexpectedStatus > 0
  || report.resumesWithUnexpectedStatus > 0
) {
  process.exit(2);
}
