import { logInfo } from "@/services/observability/logger";

type MailgunConfig = {
  apiKey: string;
  domain: string;
  from: string;
};

export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function requiredEnv(name: string): string {
  const value = import.meta.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

function getConfig(): MailgunConfig {
  return {
    apiKey: requiredEnv("MAILGUN_API_KEY"),
    domain: requiredEnv("MAILGUN_DOMAIN"),
    from: requiredEnv("MAILGUN_FROM"),
  };
}

export async function sendMailgunMessage(input: SendMailInput): Promise<void> {
  const config = getConfig();
  const endpoint = `https://api.mailgun.net/v3/${config.domain}/messages`;

  const formData = new URLSearchParams();
  formData.set("from", config.from);
  formData.set("to", input.to);
  formData.set("subject", input.subject);
  formData.set("text", input.text);
  if (input.html) {
    formData.set("html", input.html);
  }

  const encodedKey = btoa(`api:${config.apiKey}`);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${encodedKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
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
