import type { APIRoute } from "astro";

import { contactTemplate, sendMailgunMessage } from "@/services/mail";
import { checkRateLimit } from "@/services/security/rate-limit";
import { isHoneypotTripped, isPlausibleEmail, sanitizeFreeText } from "@/services/security/spam";

export const prerender = false;

const CONTACT_LIMIT = 5;
const CONTACT_WINDOW_MS = 15 * 60 * 1000;

function requiredEnv(name: string): string {
  const value = import.meta.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

function hasEnv(name: string): boolean {
  const value = import.meta.env[name];
  return typeof value === "string" && value.trim() !== "";
}

function getClientIp(request: Request): string {
  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "unknown";
}

export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIp(request);
  const limit = checkRateLimit({
    key: `contact:${ip}`,
    limit: CONTACT_LIMIT,
    windowMs: CONTACT_WINDOW_MS,
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
  const message = sanitizeFreeText(payload.message, 4000);

  if (!senderName || !isPlausibleEmail(senderEmail) || !message) {
    return new Response(JSON.stringify({ error: "Invalid payload" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const template = contactTemplate({
    senderName,
    senderEmail,
    message,
  });

  const isMailConfigured =
    hasEnv("CONTACT_INBOX") &&
    hasEnv("MAILGUN_API_KEY") &&
    hasEnv("MAILGUN_DOMAIN") &&
    hasEnv("MAILGUN_FROM");

  if (!isMailConfigured) {
    return new Response(JSON.stringify({ error: "Contact mail service is not configured" }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    await sendMailgunMessage({
      to: requiredEnv("CONTACT_INBOX"),
      subject: template.subject,
      text: template.text,
      html: template.html,
      replyTo: senderEmail,
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to deliver message" }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 202,
    headers: { "content-type": "application/json" },
  });
};
