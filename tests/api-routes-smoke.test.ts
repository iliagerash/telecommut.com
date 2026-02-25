import type { APIRoute } from "astro";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetIdempotencyStore } from "../src/services/jobs/idempotency";
import { resetRateLimitStore } from "../src/services/security/rate-limit";

function asApiContext(value: unknown): Parameters<APIRoute>[0] {
  return value as Parameters<APIRoute>[0];
}

async function loadContactRoute() {
  const sendMailgunMessage = vi.fn().mockResolvedValue(undefined);
  vi.doMock("@/services/mail", () => ({
    sendMailgunMessage,
    contactTemplate: ({ senderName, senderEmail, message }: { senderName: string; senderEmail: string; message: string }) => ({
      subject: `Contact from ${senderName}`,
      text: `${senderEmail}\n${message}`,
      html: `${senderEmail}<br/>${message}`,
    }),
  }));

  const module = await import("../src/pages/api/contact");
  return { post: module.POST, sendMailgunMessage };
}

async function loadApplyRoute() {
  const sendMailgunMessage = vi.fn().mockResolvedValue(undefined);
  vi.doMock("@/services/mail", () => ({
    sendMailgunMessage,
    applyTemplate: ({
      senderName,
      senderEmail,
      jobId,
      message,
    }: {
      senderName: string;
      senderEmail: string;
      jobId: string;
      message: string;
    }) => ({
      subject: `Apply ${jobId} by ${senderName}`,
      text: `${senderEmail}\n${message}`,
      html: `${senderEmail}<br/>${message}`,
    }),
  }));

  const module = await import("../src/pages/api/apply");
  return { post: module.POST, sendMailgunMessage };
}

describe("api smoke routes", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    resetRateLimitStore();
    resetIdempotencyStore();
  });

  it("accepts valid contact requests", async () => {
    vi.stubEnv("CONTACT_INBOX", "support@example.com");
    vi.stubEnv("MAILGUN_API_KEY", "test-key");
    vi.stubEnv("MAILGUN_DOMAIN", "mg.example.com");
    vi.stubEnv("MAILGUN_FROM", "Telecommut <noreply@example.com>");
    const { post, sendMailgunMessage } = await loadContactRoute();

    const response = await post(asApiContext({
      request: new Request("http://127.0.0.1:8787/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.5" },
        body: JSON.stringify({
          name: "Test User",
          email: "test@example.com",
          message: "Need support",
          website: "",
        }),
      }),
    }));

    expect(response.status).toBe(202);
    expect(sendMailgunMessage).toHaveBeenCalledTimes(1);
  });

  it("accepts valid apply requests", async () => {
    vi.stubEnv("APPLY_INBOX", "apply@example.com");
    const { post, sendMailgunMessage } = await loadApplyRoute();

    const response = await post(asApiContext({
      request: new Request("http://127.0.0.1:8787/api/apply", {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": "198.51.100.9" },
        body: JSON.stringify({
          name: "Candidate User",
          email: "candidate@example.com",
          jobId: "123",
          message: "I would like to apply.",
          website: "",
        }),
      }),
    }));

    expect(response.status).toBe(202);
    expect(sendMailgunMessage).toHaveBeenCalledTimes(1);
  });

  it("rejects unauthorized cron commands", async () => {
    vi.stubEnv("CRON_SECRET", "secret");
    const { POST } = await import("../src/pages/api/jobs/cron");

    const response = await POST(asApiContext({
      request: new Request("http://127.0.0.1:8787/api/jobs/cron", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ command: "daily" }),
      }),
      locals: { requestId: "req-test" },
    }));

    expect(response.status).toBe(401);
  });

  it("accepts authorized schedulable cron commands", async () => {
    vi.stubEnv("CRON_SECRET", "secret");
    const { POST } = await import("../src/pages/api/jobs/cron");

    const response = await POST(asApiContext({
      request: new Request("http://127.0.0.1:8787/api/jobs/cron", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-cron-secret": "secret",
        },
        body: JSON.stringify({ command: "daily", schedule: "0 2 * * *" }),
      }),
      locals: { requestId: "req-test" },
    }));

    expect(response.status).toBe(202);
  });

  it("enforces idempotency keys for manual run commands", async () => {
    vi.stubEnv("CRON_SECRET", "secret");
    const { POST } = await import("../src/pages/api/jobs/run");

    const response = await POST(asApiContext({
      request: new Request("http://127.0.0.1:8787/api/jobs/run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-cron-secret": "secret",
        },
        body: JSON.stringify({ command: "import" }),
      }),
      locals: { requestId: "req-test" },
    }));

    expect(response.status).toBe(400);
  });

  it("rejects duplicate manual run commands by idempotency key", async () => {
    vi.stubEnv("CRON_SECRET", "secret");
    const { POST } = await import("../src/pages/api/jobs/run");
    const firstRequest = asApiContext({
      request: new Request("http://127.0.0.1:8787/api/jobs/run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-cron-secret": "secret",
          "idempotency-key": "run-1",
        },
        body: JSON.stringify({ command: "submit" }),
      }),
      locals: { requestId: "req-test" },
    });

    const first = await POST(firstRequest);
    expect(first.status).toBe(202);

    const duplicate = await POST(asApiContext({
      request: new Request("http://127.0.0.1:8787/api/jobs/run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-cron-secret": "secret",
          "idempotency-key": "run-1",
        },
        body: JSON.stringify({ command: "submit" }),
      }),
      locals: { requestId: "req-test" },
    }));

    expect(duplicate.status).toBe(409);
  });
});
