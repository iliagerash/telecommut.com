import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const localSqlitePath = process.env.LOCAL_SQLITE_PATH?.trim();
if (!localSqlitePath) {
  throw new Error("LOCAL_SQLITE_PATH is required for drizzle-kit.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: localSqlitePath,
  },
  strict: true,
  verbose: true,
});
