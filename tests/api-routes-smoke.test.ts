import type { APIRoute } from "astro";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

describe("api smoke routes", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    resetRateLimitStore();
  });

  it("accepts valid contact requests", async () => {
    vi.stubEnv("CONTACT_INBOX", "support@example.com");
    vi.stubEnv("MAILGUN_API_KEY", "test-key");
    vi.stubEnv("MAILGUN_DOMAIN", "mg.example.com");
    vi.stubEnv("MAILGUN_FROM", "Telecommut <noreply@example.com>");
    const { post, sendMailgunMessage } = await loadContactRoute();

    const response = await post(asApiContext({
      request: new Request("http://127.0.0.1:4321/api/contact", {
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
});
