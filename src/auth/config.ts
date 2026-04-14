import { betterAuth, generateId } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import bcrypt from "bcryptjs";

import { getDb } from "@/db/runtime";
import * as schema from "@/db/schema";
import {
  resetPasswordTemplate,
  sendMailgunMessage,
  verifyEmailTemplate,
} from "@/services/mail";

type RuntimeEnv = Record<string, unknown> | undefined;

function normalizeEnvValue(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  if (
    normalized === "" ||
    normalized.toLowerCase() === "undefined" ||
    normalized.toLowerCase() === "null"
  ) {
    return undefined;
  }

  return normalized;
}

function readEnv(name: string, runtimeEnv?: RuntimeEnv): string | undefined {
  const runtimeValue = normalizeEnvValue(runtimeEnv?.[name]);
  if (runtimeValue) {
    return runtimeValue;
  }

  const importMetaValue = normalizeEnvValue(import.meta.env[name]);
  if (importMetaValue) {
    return importMetaValue;
  }

  const processValue = normalizeEnvValue(process.env[name]);
  if (processValue) {
    return processValue;
  }

  return undefined;
}

function requiredEnv(name: string, runtimeEnv?: RuntimeEnv): string {
  const value = readEnv(name, runtimeEnv);
  if (!value || value.trim() === "") {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value.trim();
}

function parseTrustedOrigins(runtimeEnv?: RuntimeEnv): string[] {
  const configured = readEnv("BETTER_AUTH_TRUSTED_ORIGINS", runtimeEnv);
  if (!configured || configured.trim() === "") {
    return [requiredEnv("BETTER_AUTH_URL", runtimeEnv)];
  }

  return configured
    .split(",")
    .map((origin: string) => origin.trim())
    .filter(Boolean);
}

function parseBooleanEnv(name: string, defaultValue: boolean, runtimeEnv?: RuntimeEnv): boolean {
  const value = readEnv(name, runtimeEnv);
  if (!value || value.trim() === "") {
    return defaultValue;
  }

  return value.trim().toLowerCase() === "true";
}

function parsePositiveIntEnv(name: string, defaultValue: number, runtimeEnv?: RuntimeEnv): number {
  const value = readEnv(name, runtimeEnv);
  if (!value || value.trim() === "") {
    return defaultValue;
  }

  const parsed = Number.parseInt(value.trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid positive integer env var: ${name}`);
  }

  return parsed;
}

export function createAuth(options: { db?: ReturnType<typeof getDb>; env?: RuntimeEnv } = {}) {
  const runtimeEnv = options.env;
  const appName = "Telecommut";
  const bcryptRounds = parsePositiveIntEnv("BETTER_AUTH_BCRYPT_ROUNDS", 10, runtimeEnv);
  const requireEmailVerification = parseBooleanEnv(
    "BETTER_AUTH_REQUIRE_EMAIL_VERIFICATION",
    true,
    runtimeEnv,
  );
  const db = options.db ?? getDb();

  return betterAuth({
    appName,
    baseURL: requiredEnv("BETTER_AUTH_URL", runtimeEnv),
    secret: requiredEnv("BETTER_AUTH_SECRET", runtimeEnv),
    trustedOrigins: parseTrustedOrigins(runtimeEnv),
    database: drizzleAdapter(db, {
      provider: "mysql",
      schema,
      camelCase: true,
    }),
    advanced: {
      database: {
        generateId: ({ model, size }: { model: string; size?: number }) =>
          model === "user" ? false : generateId(size),
      },
    },
    user: {
      modelName: "authUsers",
      additionalFields: {
        role: {
          type: "string",
          defaultValue: "candidate",
          input: true,
        },
        subscribe: {
          type: "number",
          defaultValue: 0,
          input: true,
        },
        subscribePartners: {
          type: "number",
          defaultValue: 0,
          input: true,
        },
        candidatePhoto: {
          type: "string",
          defaultValue: "",
          input: false,
        },
        companyLogo: {
          type: "string",
          defaultValue: "",
          input: false,
        },
      },
    },
    session: {
      modelName: "authSessions",
    },
    account: {
      modelName: "authAccounts",
    },
    verification: {
      modelName: "authVerifications",
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: parsePositiveIntEnv("BETTER_AUTH_VERIFY_TOKEN_TTL_SECONDS", 3600, runtimeEnv),
      sendVerificationEmail: async ({ user, url }) => {
        const template = verifyEmailTemplate({
          appName,
          actionUrl: url,
          recipientEmail: user.email,
        });

        await sendMailgunMessage({
          to: user.email,
          subject: template.subject,
          text: template.text,
          html: template.html,
        }, { env: runtimeEnv });
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      password: {
        hash: async (password: string): Promise<string> => bcrypt.hash(password, bcryptRounds),
        verify: async ({ hash, password }: { hash: string; password: string }): Promise<boolean> => {
          const normalizedHash = hash.startsWith("$2y$") ? `$2b$${hash.slice(4)}` : hash;
          return bcrypt.compare(password, normalizedHash);
        },
      },
      resetPasswordTokenExpiresIn: parsePositiveIntEnv(
        "BETTER_AUTH_RESET_TOKEN_TTL_SECONDS",
        3600,
        runtimeEnv,
      ),
      sendResetPassword: async ({ user, url }) => {
        const template = resetPasswordTemplate({
          appName,
          actionUrl: url,
          recipientEmail: user.email,
        });

        await sendMailgunMessage({
          to: user.email,
          subject: template.subject,
          text: template.text,
          html: template.html,
        }, { env: runtimeEnv });
      },
    },
  });
}

export type AuthInstance = ReturnType<typeof createAuth>;
