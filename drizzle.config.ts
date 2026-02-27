import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const mysqlUrl = process.env.DATABASE_URL?.trim();
if (!mysqlUrl) {
  throw new Error("DATABASE_URL is required for drizzle-kit.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: mysqlUrl,
  },
  strict: true,
  verbose: true,
});
