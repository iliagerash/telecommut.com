import { createMysqlClient } from "@/db/client";

let mysqlClientSingleton: ReturnType<typeof createMysqlClient> | null = null;

export function getMysqlDb() {
  if (!mysqlClientSingleton) {
    mysqlClientSingleton = createMysqlClient();
  }

  return mysqlClientSingleton;
}

export function getDb() {
  return getMysqlDb();
}
