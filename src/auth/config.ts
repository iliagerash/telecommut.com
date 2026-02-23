import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";

import {
  resetPasswordTemplate,
  sendMailgunMessage,
  verifyEmailTemplate,
} from "@/services/mail";

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

function parseBooleanEnv(name: string, defaultValue: boolean): boolean {
  const value = import.meta.env[name];
  if (!value || value.trim() === "") {
    return defaultValue;
  }

  return value.trim().toLowerCase() === "true";
}

function parsePositiveIntEnv(name: string, defaultValue: number): number {
  const value = import.meta.env[name];
  if (!value || value.trim() === "") {
    return defaultValue;
  }

  const parsed = Number.parseInt(value.trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid positive integer env var: ${name}`);
  }

  return parsed;
}

export function createAuth() {
  const appName = "Telecommut";
  const requireEmailVerification = parseBooleanEnv(
    "BETTER_AUTH_REQUIRE_EMAIL_VERIFICATION",
    true,
  );

  return betterAuth({
    appName,
    baseURL: requiredEnv("BETTER_AUTH_URL"),
    secret: requiredEnv("BETTER_AUTH_SECRET"),
    trustedOrigins: parseTrustedOrigins(),
    database: memoryAdapter(memoryDb),
    emailVerification: {
      sendOnSignUp: true,
      expiresIn: parsePositiveIntEnv("BETTER_AUTH_VERIFY_TOKEN_TTL_SECONDS", 3600),
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
        });
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      resetPasswordTokenExpiresIn: parsePositiveIntEnv(
        "BETTER_AUTH_RESET_TOKEN_TTL_SECONDS",
        3600,
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
        });
      },
    },
  });
}

export type AuthInstance = ReturnType<typeof createAuth>;
