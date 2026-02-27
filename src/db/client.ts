import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";

import * as schema from "@/db/schema";

function requiredDatabaseUrl() {
  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const value = (process.env.DATABASE_URL ?? viteEnv?.DATABASE_URL ?? "").trim();
  if (!value) {
    throw new Error("DATABASE_URL is required for MySQL client.");
  }
  return value;
}

export function createMysqlClient(connectionString = requiredDatabaseUrl()) {
  const pool = mysql.createPool({
    uri: connectionString,
    connectionLimit: 10,
  });

  return drizzle(pool, { schema, mode: "default" });
}

export type MysqlClient = ReturnType<typeof createMysqlClient>;
