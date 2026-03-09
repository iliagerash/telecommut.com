import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import readline from "node:readline";

import type { APIRoute } from "astro";

import { getAuth } from "@/auth";
import { resolveNormalizedUserRoleFromRecord } from "@/services/users/role-adapter";

export const prerender = false;

function isValidIpv4(value: string): boolean {
  const parts = value.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^\d+$/.test(part)) return false;
    const num = Number.parseInt(part, 10);
    return Number.isFinite(num) && num >= 0 && num <= 255;
  });
}

function normalizeDomainCandidate(value: string | null | undefined): string {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) {
    return "";
  }
  const host = raw.split(",")[0]?.trim().split(":")[0]?.trim().replace(/\.+$/, "") ?? "";
  if (!host) {
    return "";
  }
  if (!/^[a-z0-9.-]+$/.test(host)) {
    return "";
  }
  return host;
}

function resolveMainDomain(): string {
  const fromProcess = normalizeDomainCandidate(process.env.MAIN_DOMAIN);
  if (fromProcess) {
    return fromProcess;
  }

  const fromImportMeta = normalizeDomainCandidate((import.meta.env as Record<string, unknown>).MAIN_DOMAIN as string | undefined);
  if (fromImportMeta) {
    return fromImportMeta;
  }

  throw new Error("MAIN_DOMAIN env var is required");
}

function resolveLogFile(today: boolean, domain: string): string {
  return today ? `/var/log/nginx/${domain}-access.log` : `/var/log/nginx/${domain}-access.log.1`;
}

async function extractLinesByIp(logFile: string, ip: string): Promise<string> {
  const stream = createReadStream(logFile, { encoding: "utf8" });
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  const lines: string[] = [];
  const prefix = `${ip} `;

  try {
    for await (const line of rl) {
      if (line.startsWith(prefix)) {
        lines.push(line);
      }
    }
  } finally {
    rl.close();
    stream.destroy();
  }

  return lines.join("\n");
}

export const GET: APIRoute = async ({ request, locals, url }) => {
  const session = await getAuth(locals).api.getSession({ headers: request.headers });
  if (!session?.session?.id || !session.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  if (resolveNormalizedUserRoleFromRecord(session.user) !== "admin") {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }

  const ip = String(url.searchParams.get("ip") ?? "").trim();
  const today = url.searchParams.has("today");

  if (!ip) {
    return new Response(JSON.stringify({ error: "Query parameter 'ip' is required" }), {
      status: 422,
      headers: { "content-type": "application/json" },
    });
  }

  if (!isValidIpv4(ip)) {
    return new Response(JSON.stringify({ error: "Invalid IPv4 address" }), {
      status: 422,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const domain = resolveMainDomain();
    const logFile = resolveLogFile(today, domain);
    await access(logFile);
    const content = await extractLinesByIp(logFile, ip);

    return new Response(
      JSON.stringify({
        ip,
        period: today ? "today" : "yesterday",
        logFile,
        content,
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Unable to read log file",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
};
