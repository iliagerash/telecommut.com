export const allowedCommands = [
  "import",
  "daily",
  "weekly",
  "analyze",
  "seo",
  "cloudflare",
  "submit",
  "reindex",
  "google_time",
  "bing_time",
  "process_dedupe",
  "sitemap_ping",
] as const;

export type JobCommand = (typeof allowedCommands)[number];

const idempotentRequiredCommands = new Set<JobCommand>([
  "import",
  "submit",
  "reindex",
  "google_time",
  "bing_time",
  "process_dedupe",
]);

const schedulableCommands = new Set<JobCommand>([
  "daily",
  "weekly",
  "analyze",
  "seo",
  "cloudflare",
  "process_dedupe",
  "sitemap_ping",
]);

export function parseJobCommand(value: unknown): JobCommand | null {
  if (typeof value !== "string") {
    return null;
  }

  return (allowedCommands as readonly string[]).includes(value)
    ? (value as JobCommand)
    : null;
}

export function requiresIdempotencyKey(command: JobCommand): boolean {
  return idempotentRequiredCommands.has(command);
}

export function isSchedulableCommand(command: JobCommand): boolean {
  return schedulableCommands.has(command);
}

export function isManualOnlyCommand(command: JobCommand): boolean {
  return !isSchedulableCommand(command);
}
