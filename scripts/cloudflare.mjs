#!/usr/bin/env node
import path from "node:path";
import process from "node:process";

import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

function usage() {
  console.log("Usage: node scripts/cloudflare.mjs");
}

function requiredEnv(name) {
  const value = (process.env[name] ?? "").trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function resolveAppHost() {
  return requiredEnv("MAIN_DOMAIN");
}

function toIsoUtc(date) {
  return date.toISOString();
}

function toMysqlDatetimeUtc(input) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mi = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function resolveTimeRangeUtc(now = new Date()) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const hour = now.getUTCHours();

  if (hour >= 12) {
    return {
      start: new Date(Date.UTC(y, m, d, 0, 0, 0)),
      end: new Date(Date.UTC(y, m, d, 12, 0, 0)),
    };
  }

  return {
    start: new Date(Date.UTC(y, m, d - 1, 12, 0, 0)),
    end: new Date(Date.UTC(y, m, d, 0, 0, 0)),
  };
}

function buildGraphqlQuery({ zoneId, startIso, endIso, host }) {
  return `query {
    viewer {
      zones(filter: { zoneTag: "${zoneId}" }) {
        firewallEventsAdaptive(
          filter: {
            datetime_geq: "${startIso}"
            datetime_leq: "${endIso}"
            clientRequestHTTPHost: "${host}"
          }
          limit: 10000
          orderBy: [datetime_DESC]
        ) {
          action
          clientASNDescription
          clientAsn
          clientCountryName
          clientIP
          clientRequestHTTPHost
          clientRequestHTTPMethodName
          clientRequestPath
          datetime
          edgeResponseStatus
          rayName
          ruleId
          userAgent
        }
      }
    }
  }`;
}

async function fetchCloudflareEvents({ apiKey, zoneId, host, startIso, endIso }) {
  const query = buildGraphqlQuery({ zoneId, startIso, endIso, host });
  const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch data from Cloudflare API: ${response.status}`);
  }

  const data = await response.json();
  return data?.data?.viewer?.zones?.[0]?.firewallEventsAdaptive ?? [];
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    usage();
    return;
  }
  if (args.length > 0) {
    throw new Error(`Unknown argument: ${args[0]}`);
  }

  const apiKey = requiredEnv("CLOUDFLARE_API_KEY");
  const zoneId = requiredEnv("CLOUDFLARE_ZONE_ID");
  const appHost = resolveAppHost();
  const databaseUrl = requiredEnv("DATABASE_URL");
  const { start, end } = resolveTimeRangeUtc(new Date());

  console.info(`Fetching Cloudflare firewall events from ${toIsoUtc(start)} to ${toIsoUtc(end)}`);

  const events = await fetchCloudflareEvents({
    apiKey,
    zoneId,
    host: appHost,
    startIso: toIsoUtc(start),
    endIso: toIsoUtc(end),
  });

  if (events.length === 0) {
    console.info("No events found");
    return;
  }

  const recordsByRayName = new Map();
  for (const event of events) {
    const rayName = String(event.rayName ?? "").trim();
    if (!rayName) continue;
    recordsByRayName.set(rayName, {
      rayName,
      action: String(event.action ?? ""),
      asn: event.clientAsn == null ? null : String(event.clientAsn),
      asnDescription: event.clientASNDescription ?? null,
      country: String(event.clientCountryName ?? ""),
      ip: String(event.clientIP ?? ""),
      httpHost: String(event.clientRequestHTTPHost ?? ""),
      httpMethod: event.clientRequestHTTPMethodName ?? null,
      requestPath: event.clientRequestPath ?? null,
      userAgent: event.userAgent ?? null,
      status: event.edgeResponseStatus == null ? null : Number(event.edgeResponseStatus),
      ruleId: event.ruleId ?? null,
      createdAt: toMysqlDatetimeUtc(event.datetime),
    });
  }

  const records = Array.from(recordsByRayName.values());
  if (records.length === 0) {
    console.info("No events found");
    return;
  }

  const pool = mysql.createPool({
    uri: databaseUrl,
    connectionLimit: 5,
  });

  try {
    const rayNames = records.map((record) => record.rayName);
    const placeholders = rayNames.map(() => "?").join(", ");
    const [existingRows] = await pool.execute(
      `SELECT ray_name FROM cloudflare_events WHERE ray_name IN (${placeholders})`,
      rayNames,
    );
    const existing = new Set(existingRows.map((row) => String(row.ray_name)));

    let inserted = 0;
    let updated = 0;

    for (const record of records) {
      await pool.execute(
        `
        INSERT INTO cloudflare_events (
          ray_name,
          action,
          asn,
          asn_description,
          country,
          ip,
          http_host,
          http_method,
          request_path,
          user_agent,
          status,
          rule_id,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          action = VALUES(action),
          asn = VALUES(asn),
          asn_description = VALUES(asn_description),
          country = VALUES(country),
          ip = VALUES(ip),
          http_host = VALUES(http_host),
          http_method = VALUES(http_method),
          request_path = VALUES(request_path),
          user_agent = VALUES(user_agent),
          status = VALUES(status),
          rule_id = VALUES(rule_id),
          created_at = VALUES(created_at)
        `,
        [
          record.rayName,
          record.action,
          record.asn,
          record.asnDescription,
          record.country,
          record.ip,
          record.httpHost,
          record.httpMethod,
          record.requestPath,
          record.userAgent,
          record.status,
          record.ruleId,
          record.createdAt,
        ],
      );

      if (existing.has(record.rayName)) {
        updated += 1;
      } else {
        inserted += 1;
      }
    }

    if (updated > 0) {
      console.info(`Inserted: ${inserted}, Updated: ${updated}`);
    } else {
      console.info(`Inserted: ${inserted}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
