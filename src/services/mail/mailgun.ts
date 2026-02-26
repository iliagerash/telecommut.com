import { logInfo } from "@/services/observability/logger";

type MailgunConfig = {
  apiKey: string;
  domain: string;
  from: string;
  region: "us" | "eu";
};
type RuntimeEnv = Record<string, unknown> | undefined;

export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

function readEnv(name: string, runtimeEnv?: RuntimeEnv): string | undefined {
  const runtimeValue = runtimeEnv?.[name];
  if (typeof runtimeValue === "string" && runtimeValue.trim() !== "") {
    return runtimeValue.trim();
  }

  const importMetaValue = import.meta.env[name];
  if (typeof importMetaValue === "string" && importMetaValue.trim() !== "") {
    return importMetaValue.trim();
  }

  const processValue = process.env[name];
  if (typeof processValue === "string" && processValue.trim() !== "") {
    return processValue.trim();
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

function parseMailgunRegion(runtimeEnv?: RuntimeEnv): "us" | "eu" {
  const rawRegion = readEnv("MAILGUN_REGION", runtimeEnv);
  if (!rawRegion || rawRegion.trim() === "") {
    return "us";
  }

  const region = rawRegion.trim().toLowerCase();
  if (region === "us" || region === "eu") {
    return region;
  }

  throw new Error("Invalid MAILGUN_REGION. Use 'us' or 'eu'.");
}

function getConfig(runtimeEnv?: RuntimeEnv): MailgunConfig {
  return {
    apiKey: requiredEnv("MAILGUN_API_KEY", runtimeEnv),
    domain: requiredEnv("MAILGUN_DOMAIN", runtimeEnv),
    from: requiredEnv("MAILGUN_FROM", runtimeEnv),
    region: parseMailgunRegion(runtimeEnv),
  };
}

export async function sendMailgunMessage(input: SendMailInput, options: { env?: RuntimeEnv } = {}): Promise<void> {
  const config = getConfig(options.env);
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
