import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import readline from "node:readline";

import type { APIRoute } from "astro";

import { getAuth } from "@/auth";
import { resolveNormalizedUserRoleFromRecord } from "@/services/users/role-adapter";

export const prerender = false;

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

async function extractLinesBySubnet(logFile: string, prefix: string, isIpv6: boolean): Promise<string> {
  const stream = createReadStream(logFile, { encoding: "utf8" });
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  const lines: string[] = [];

  if (isIpv6) {
    // prefix is 16 lowercase hex chars = first 8 bytes of IPv6 address
    const prefixBytes = Buffer.from(prefix, "hex");

    try {
      for await (const line of rl) {
        const spacePos = line.indexOf(" ");
        if (spacePos === -1) continue;
        const ipStr = line.slice(0, spacePos);
        if (!ipStr.includes(":")) continue;
        // Expand IPv6
        const halves = ipStr.split("::");
        if (halves.length > 2) continue;
        const left = halves[0] ? halves[0].split(":") : [];
        const right = halves.length > 1 && halves[1] ? halves[1].split(":") : [];
        const missing = 8 - left.length - right.length;
        if (missing < 0) continue;
        const full = [...left, ...Array(missing).fill("0"), ...right];
        if (full.length !== 8) continue;
        const ipBytes = Buffer.alloc(16);
        let valid = true;
        for (let i = 0; i < 8; i++) {
          const val = Number.parseInt(full[i]!, 16);
          if (!Number.isFinite(val) || val < 0 || val > 0xffff) { valid = false; break; }
          ipBytes[i * 2] = (val >> 8) & 0xff;
          ipBytes[i * 2 + 1] = val & 0xff;
        }
        if (!valid) continue;
        if (ipBytes.slice(0, 8).equals(prefixBytes)) {
          lines.push(line);
        }
      }
    } finally {
      rl.close();
      stream.destroy();
    }
  } else {
    // prefix is "x.y.z" (3 octets)
    const subnetPattern = new RegExp(`^${prefix.replace(/\./g, "\\.")}\\.[0-9]{1,3} `);

    try {
      for await (const line of rl) {
        if (subnetPattern.test(line)) {
          lines.push(line);
        }
      }
    } finally {
      rl.close();
      stream.destroy();
    }
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

  const prefix = String(url.searchParams.get("prefix") ?? "").trim();
  const today = url.searchParams.has("today");

  if (!prefix) {
    return new Response(JSON.stringify({ error: "Query parameter 'prefix' is required" }), {
      status: 422,
      headers: { "content-type": "application/json" },
    });
  }

  const isIpv6 = /^[0-9a-f]{16}$/.test(prefix);
  if (!isIpv6 && !/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(prefix)) {
    return new Response(JSON.stringify({ error: "Invalid subnet prefix parameter" }), {
      status: 422,
      headers: { "content-type": "application/json" },
    });
  }

  const subnetDisplay = isIpv6
    ? prefix.match(/.{4}/g)!.join(":") + "::/64"
    : `${prefix}.0/24`;

  try {
    const domain = resolveMainDomain();
    const logFile = resolveLogFile(today, domain);
    await access(logFile);
    const content = await extractLinesBySubnet(logFile, prefix, isIpv6);

    return new Response(
      JSON.stringify({
        subnet: subnetDisplay,
        period: today ? "today" : "yesterday",
        logFile,
        content: content || "No matching log lines found.",
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
