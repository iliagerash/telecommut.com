import type { APIRoute } from "astro";

import { applyTemplate, sendMailgunMessage } from "@/services/mail";
import { checkRateLimit } from "@/services/security/rate-limit";
import { isHoneypotTripped, isPlausibleEmail, sanitizeFreeText } from "@/services/security/spam";

export const prerender = false;

const APPLY_LIMIT = 10;
const APPLY_WINDOW_MS = 60 * 60 * 1000;

function requiredEnv(name: string): string {
  const value = import.meta.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

function getClientIp(request: Request): string {
  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "unknown";
}

export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIp(request);
  const limit = checkRateLimit({
    key: `apply:${ip}`,
    limit: APPLY_LIMIT,
    windowMs: APPLY_WINDOW_MS,
  });

  if (!limit.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: {
        "content-type": "application/json",
        "retry-after": String(limit.retryAfterSeconds),
      },
    });
  }

  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (isHoneypotTripped(payload.website)) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 202,
      headers: { "content-type": "application/json" },
    });
  }

  const senderName = sanitizeFreeText(payload.name, 120);
  const senderEmail = sanitizeFreeText(payload.email, 320);
  const jobId = sanitizeFreeText(payload.jobId, 64);
  const message = sanitizeFreeText(payload.message, 4000);

  if (!senderName || !isPlausibleEmail(senderEmail) || !jobId || !message) {
    return new Response(JSON.stringify({ error: "Invalid payload" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const template = applyTemplate({
    senderName,
    senderEmail,
    jobId,
    message,
  });

  await sendMailgunMessage({
    to: requiredEnv("APPLY_INBOX"),
    subject: template.subject,
    text: template.text,
    html: template.html,
    replyTo: senderEmail,
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 202,
    headers: { "content-type": "application/json" },
  });
};
