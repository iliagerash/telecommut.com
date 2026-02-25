import { logInfo } from "@/services/observability/logger";

type MailgunConfig = {
  apiKey: string;
  domain: string;
  from: string;
  region: "us" | "eu";
};

export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

function requiredEnv(name: string): string {
  const value = import.meta.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

function parseMailgunRegion(): "us" | "eu" {
  const rawRegion = import.meta.env.MAILGUN_REGION;
  if (!rawRegion || rawRegion.trim() === "") {
    return "us";
  }

  const region = rawRegion.trim().toLowerCase();
  if (region === "us" || region === "eu") {
    return region;
  }

  throw new Error("Invalid MAILGUN_REGION. Use 'us' or 'eu'.");
}

function getConfig(): MailgunConfig {
  return {
    apiKey: requiredEnv("MAILGUN_API_KEY"),
    domain: requiredEnv("MAILGUN_DOMAIN"),
    from: requiredEnv("MAILGUN_FROM"),
    region: parseMailgunRegion(),
  };
}

export async function sendMailgunMessage(input: SendMailInput): Promise<void> {
  const config = getConfig();
  const apiHost = config.region === "eu" ? "api.eu.mailgun.net" : "api.mailgun.net";
  const endpoint = `https://${apiHost}/v3/${config.domain}/messages`;

  const formData = new FormData();
  formData.set("from", config.from);
  formData.set("to", input.to);
  formData.set("subject", input.subject);
  formData.set("text", input.text);
  if (input.html) {
    formData.set("html", input.html);
  }
  if (input.replyTo) {
    formData.set("h:Reply-To", input.replyTo);
  }

  const encodedKey = btoa(`api:${config.apiKey}`);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${encodedKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Mailgun request failed (${response.status}): ${body}`);
  }

  logInfo("mail.sent", {
    provider: "mailgun",
    to: input.to,
    subject: input.subject,
  });
}
