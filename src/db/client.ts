import Database from "better-sqlite3";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";

import * as schema from "@/db/schema";

export function createD1Client(d1: D1Database) {
  return drizzleD1(d1, { schema });
}

export function createSqliteClient(filePath = process.env.LOCAL_SQLITE_PATH ?? "telecommut.db") {
  const sqlite = new Database(filePath);
  return drizzleSqlite(sqlite, { schema });
}

export type D1Client = ReturnType<typeof createD1Client>;
export type SqliteClient = ReturnType<typeof createSqliteClient>;
