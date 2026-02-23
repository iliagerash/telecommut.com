import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";

const memoryDb: Record<string, unknown[]> = {
  user: [],
  session: [],
  account: [],
  verification: [],
};

function requiredEnv(name: string): string {
  const value = import.meta.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

function parseTrustedOrigins(): string[] {
  const configured = import.meta.env.BETTER_AUTH_TRUSTED_ORIGINS;
  if (!configured || configured.trim() === "") {
    return [requiredEnv("BETTER_AUTH_URL")];
  }

  return configured
    .split(",")
    .map((origin: string) => origin.trim())
    .filter(Boolean);
}

export function createAuth() {
  return betterAuth({
    appName: "Telecommut",
    baseURL: requiredEnv("BETTER_AUTH_URL"),
    secret: requiredEnv("BETTER_AUTH_SECRET"),
    trustedOrigins: parseTrustedOrigins(),
    database: memoryAdapter(memoryDb),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },
  });
}

export type AuthInstance = ReturnType<typeof createAuth>;
