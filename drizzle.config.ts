import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.LOCAL_SQLITE_PATH ?? "telecommut.db",
  },
  strict: true,
  verbose: true,
});
