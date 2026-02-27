import { resolve } from "node:path";

import { config as loadEnv } from "dotenv";

loadEnv({ path: resolve(process.cwd(), ".env") });

if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === "") {
  throw new Error("DATABASE_URL is required for tests. Set it in .env or environment.");
}
