import { beforeEach, describe, expect, it, vi } from "vitest";

function setupAuthEnv() {
  vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-value");
  vi.stubEnv("BETTER_AUTH_URL", "http://127.0.0.1:8787");
  vi.stubEnv("BETTER_AUTH_TRUSTED_ORIGINS", "http://127.0.0.1:8787");
  vi.stubEnv("BETTER_AUTH_REQUIRE_EMAIL_VERIFICATION", "false");
  vi.stubEnv("BETTER_AUTH_VERIFY_TOKEN_TTL_SECONDS", "3600");
  vi.stubEnv("BETTER_AUTH_RESET_TOKEN_TTL_SECONDS", "3600");
  vi.stubEnv("MAILGUN_API_KEY", "test-mailgun-key");
  vi.stubEnv("MAILGUN_DOMAIN", "mg.example.com");
  vi.stubEnv("MAILGUN_FROM", "no-reply@example.com");
  vi.stubEnv("MAILGUN_REGION", "eu");
}

async function createTestAuth() {
  const sendMailgunMessage = vi.fn().mockResolvedValue(undefined);

  vi.doMock("@/services/mail", () => ({
    sendMailgunMessage,
    verifyEmailTemplate: ({ appName, actionUrl }: { appName: string; actionUrl: string }) => ({
      subject: `${appName} verify`,
      text: actionUrl,
      html: actionUrl,
    }),
    resetPasswordTemplate: ({ appName, actionUrl }: { appName: string; actionUrl: string }) => ({
      subject: `${appName} reset`,
      text: actionUrl,
      html: actionUrl,
    }),
  }));

  const { createAuth } = await import("../src/auth/config");
  return { auth: createAuth(), sendMailgunMessage };
}

describe("auth routes", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    setupAuthEnv();
  });

  it("allows signup with trusted callback URL", async () => {
    const { auth, sendMailgunMessage } = await createTestAuth();
    const email = `user-${Date.now()}@example.com`;

    const response = await auth.handler(
      new Request("http://127.0.0.1:8787/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://127.0.0.1:8787",
        },
        body: JSON.stringify({
          name: "Test User",
          email,
          password: "StrongPass123!",
          callbackURL: "http://127.0.0.1:8787",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(sendMailgunMessage).toHaveBeenCalledTimes(1);
  });

  it("allows sign in after sign up", async () => {
    const { auth, sendMailgunMessage } = await createTestAuth();
    const email = `signin-${Date.now()}@example.com`;

    const signUpResponse = await auth.handler(
      new Request("http://127.0.0.1:8787/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://127.0.0.1:8787",
        },
        body: JSON.stringify({
          name: "Test User",
          email,
          password: "StrongPass123!",
          callbackURL: "http://127.0.0.1:8787",
        }),
      }),
    );
    expect(signUpResponse.status).toBe(200);

    const signInResponse = await auth.handler(
      new Request("http://127.0.0.1:8787/api/auth/sign-in/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://127.0.0.1:8787",
        },
        body: JSON.stringify({
          email,
          password: "StrongPass123!",
        }),
      }),
    );

    const payload = (await signInResponse.json()) as { token?: string };
    expect(signInResponse.status).toBe(200);
    expect(typeof payload.token).toBe("string");
    expect(payload.token?.length).toBeGreaterThan(0);
    expect(sendMailgunMessage).toHaveBeenCalledTimes(1);
  });
});
