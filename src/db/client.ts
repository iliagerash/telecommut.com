import Database from "better-sqlite3";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";

import * as schema from "@/db/schema";

export function createD1Client(d1: D1Database) {
  return drizzleD1(d1, { schema });
}

function requiredLocalSqlitePath() {
  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const value = (process.env.LOCAL_SQLITE_PATH ?? viteEnv?.LOCAL_SQLITE_PATH ?? "").trim();
  if (!value) {
    throw new Error("LOCAL_SQLITE_PATH is required for local SQLite client.");
  }
  return value;
}

export function createSqliteClient(filePath = requiredLocalSqlitePath()) {
  const sqlite = new Database(filePath, { fileMustExist: true });
  return drizzleSqlite(sqlite, { schema });
}

export type D1Client = ReturnType<typeof createD1Client>;
export type SqliteClient = ReturnType<typeof createSqliteClient>;
