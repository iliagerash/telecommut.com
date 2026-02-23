import { createD1Client, createSqliteClient } from "@/db/client";

let sqliteClientSingleton: ReturnType<typeof createSqliteClient> | null = null;

export function getSqliteDb() {
  if (!sqliteClientSingleton) {
    sqliteClientSingleton = createSqliteClient();
  }

  return sqliteClientSingleton;
}

export function getD1Db(d1: D1Database) {
  return createD1Client(d1);
}

export function getDb(options: { d1?: D1Database; client?: "sqlite" | "d1" } = {}) {
  const client = options.client ?? (process.env.DB_CLIENT === "d1" ? "d1" : "sqlite");

  if (client === "d1") {
    if (!options.d1) {
      throw new Error("D1 client selected but no D1 binding was provided.");
    }

    return getD1Db(options.d1);
  }

  return getSqliteDb();
}
