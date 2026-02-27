#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

const GOOD_BOTS = ["Googlebot", "Bingbot", "DuckDuckBot", "facebookexternalhit", "TwitterBot"];
const WHITELISTED_BOTS = ["Jooblebot", "IndeedBot", "GPTBot", "Mediapartners-Google"];

function usage() {
  console.log("Usage: node scripts/analyze.mjs [--log-file=/var/log/nginx/<host>-access.log.1]");
}

function parseArgs(argv) {
  const parsed = { logFile: "" };
  for (const arg of argv.slice(2)) {
    if (arg === "-h" || arg === "--help") {
      usage();
      process.exit(0);
    }
    if (arg.startsWith("--log-file=")) {
      parsed.logFile = arg.slice("--log-file=".length).trim();
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
}

function requiredEnv(name) {
  const value = (process.env[name] ?? "").trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optionalEnv(name, fallback = "") {
  const value = (process.env[name] ?? "").trim();
  return value || fallback;
}

function optionalIntEnv(name, fallback) {
  const raw = (process.env[name] ?? "").trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toDateOnlyLocal(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toMysqlDatetimeLocal(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function resolveDefaultLogFile() {
  const domain = requiredEnv("MAIN_DOMAIN");
  return `/var/log/nginx/${domain}-access.log.1`;
}

function buildAggAnalyzeUri() {
  const host = optionalEnv("AGG_DB_HOST");
  const username = optionalEnv("AGG_DB_USERNAME");
  if (!host || !username) {
    return "";
  }
  const port = optionalIntEnv("AGG_DB_PORT", 3306);
  const password = process.env.AGG_DB_PASSWORD ?? "";
  const database = optionalEnv("AGG_ANALYZE_DATABASE", "analyze");
  return `mysql://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

function parseNginxDate(input) {
  // Example: 10/Oct/2000:13:55:36 +0000
  const match = input.match(/^(\d{2})\/([A-Za-z]{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-]\d{4})$/);
  if (!match) return null;
  const months = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  };
  const month = months[match[2]];
  if (month == null) return null;
  const date = new Date(
    `${match[3]}-${String(month + 1).padStart(2, "0")}-${match[1]}T${match[4]}:${match[5]}:${match[6]}${match[7].slice(0, 3)}:${match[7].slice(3)}`,
  );
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function parseLogLine(line) {
  const match = line.match(/^([\d.]+)\s.+?\s\[(.+?)\]\s"(.+?)"\s(\d+)\s.+?\s".+?"\s"(.+?)"/);
  if (!match) return null;
  return {
    ip: match[1],
    datetimeRaw: match[2],
    request: match[3],
    status: Number.parseInt(match[4], 10),
    userAgent: match[5],
  };
}

function extractRequestPath(request) {
  const match = request.match(/(?:GET|POST|HEAD)\s+([^\s?]+)/);
  return match?.[1] ?? "";
}

function ipToLong(ip) {
  const parts = String(ip).split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part) || part < 0 || part > 255)) {
    return null;
  }
  return ((parts[0] << 24) >>> 0) + ((parts[1] << 16) >>> 0) + ((parts[2] << 8) >>> 0) + parts[3];
}

function ipInCidr(ip, cidr) {
  if (cidr.includes(":")) return false;
  const [subnet, bitsRaw] = String(cidr).split("/");
  const bits = Number.parseInt(bitsRaw ?? "32", 10);
  if (!Number.isFinite(bits) || bits < 0 || bits > 32) return false;
  const ipLong = ipToLong(ip);
  const subnetLong = ipToLong(subnet);
  if (ipLong == null || subnetLong == null) return false;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipLong & mask) === (subnetLong & mask);
}

function isKnownGoodBot(userAgents) {
  const allBots = GOOD_BOTS.concat(WHITELISTED_BOTS);
  for (const ua of Object.keys(userAgents ?? {})) {
    for (const bot of allBots) {
      if (ua.toLowerCase().includes(bot.toLowerCase())) {
        return true;
      }
    }
  }
  return false;
}

function defaultCfRules() {
  return {
    block: { ips: [], cidrs: [], asns: [], uaContains: [] },
    challenge: { countries: [], asns: [], uaContains: [] },
  };
}

function parseCloudflareRules(body) {
  const rules = defaultCfRules();

  const blockMatch = body.match(/\/\/ Block Bots\s+([\s\S]+?)(?=\/\/ Challenge|$)/);
  if (blockMatch?.[1]) {
    const text = blockMatch[1];
    const ipSet = text.match(/ip\.src in \{([^}]+)\}/);
    if (ipSet?.[1]) {
      for (const token of ipSet[1].trim().split(/\s+/)) {
        if (!token) continue;
        if (token.includes("/")) rules.block.cidrs.push(token);
        else rules.block.ips.push(token);
      }
    }
    const asnSet = text.match(/ip\.geoip\.asnum in \{([^}]+)\}/);
    if (asnSet?.[1]) {
      for (const asn of asnSet[1].trim().split(/\s+/)) {
        if (/^\d+$/.test(asn)) rules.block.asns.push(asn);
      }
    }
    const uaContains = [...text.matchAll(/http\.user_agent contains "([^"]+)"/g), ...text.matchAll(/lower\(http\.user_agent\) contains "([^"]+)"/g)];
    for (const match of uaContains) {
      rules.block.uaContains.push(match[1]);
    }
    if (text.includes('http.user_agent eq ""')) {
      rules.block.uaContains.push("");
    }
  }

  const challengeStart = body.search(/\/\/ Challenge\s+/);
  if (challengeStart >= 0) {
    const text = body.slice(challengeStart);
    const countries = text.match(/ip\.src\.country in \{([^}]+)\}/);
    if (countries?.[1]) {
      for (const code of countries[1].matchAll(/"([A-Z]{2})"/g)) {
        rules.challenge.countries.push(code[1]);
      }
    }
    const asnSet = text.match(/ip\.geoip\.asnum in \{([^}]+)\}/);
    if (asnSet?.[1]) {
      for (const asn of asnSet[1].trim().split(/\s+/)) {
        if (/^\d+$/.test(asn)) rules.challenge.asns.push(asn);
      }
    }
    for (const match of text.matchAll(/http\.user_agent contains "([^"]+)"/g)) {
      rules.challenge.uaContains.push(match[1]);
    }
  }

  return rules;
}

async function fetchCloudflareRules() {
  const endpoint = optionalEnv("GEOIP_ENDPOINT");
  if (!endpoint) return defaultCfRules();
  try {
    const url = `${endpoint.replace(/\/+$/, "")}/rules.txt`;
    const response = await fetch(url);
    if (!response.ok) return defaultCfRules();
    const body = await response.text();
    return parseCloudflareRules(body);
  } catch {
    return defaultCfRules();
  }
}

async function enrichGeoIpBypassIps(bypassIps) {
  const endpoint = optionalEnv("GEOIP_ENDPOINT");
  if (!endpoint) return;
  const base = endpoint.replace(/\/+$/, "");
  for (const ip of Object.keys(bypassIps)) {
    try {
      const response = await fetch(`${base}/?ip=${encodeURIComponent(ip)}`);
      if (!response.ok) continue;
      const json = await response.json();
      bypassIps[ip].geoip = {
        asn: json?.asn ?? null,
        org: json?.org ?? null,
        country: json?.country ?? null,
        city: json?.city ?? null,
      };
    } catch {
      bypassIps[ip].geoip = null;
    }
  }
}

function matchesCloudflareRules(ip, data, rules) {
  const asn = data.asn == null ? null : String(data.asn);
  const country = data.country ?? null;
  const userAgents = Object.keys(data.userAgents ?? {});

  if (rules.block.ips.includes(ip)) return true;
  for (const cidr of rules.block.cidrs) {
    if (ipInCidr(ip, cidr)) return true;
  }
  if (asn && rules.block.asns.includes(asn)) return true;
  if (asn && rules.challenge.asns.includes(asn)) return true;
  if (country && rules.challenge.countries.includes(country)) return true;

  const uaNeedles = [...rules.block.uaContains, ...rules.challenge.uaContains];
  for (const needle of uaNeedles) {
    for (const ua of userAgents) {
      if (needle === "" && ua === "") return true;
      if (needle !== "" && ua.toLowerCase().includes(needle.toLowerCase())) return true;
    }
  }

  return false;
}

function detectBypassingBots(nginxIps, cfByIp) {
  const output = { ips: {}, summary: {} };
  for (const [ip, data] of Object.entries(nginxIps)) {
    if (data.hasUtmSource) continue;
    if (data.hasRealUserPath) continue;
    if (data.count < 20) continue;
    if (isKnownGoodBot(data.userAgents)) continue;

    if (!cfByIp[ip]) {
      output.ips[ip] = {
        requests: data.count,
        user_agents: Object.keys(data.userAgents),
        reason: "Not seen",
      };
      continue;
    }

    const actions = cfByIp[ip].actions ?? [];
    const blockedOrChallenged = actions.filter((action) => ["block", "challenge", "managed_challenge"].includes(String(action).toLowerCase())).length;
    if (blockedOrChallenged > 0 && data.count > 50) {
      output.ips[ip] = {
        requests: data.count,
        cf_blocks_challenges: blockedOrChallenged,
        user_agents: Object.keys(data.userAgents),
        reason: "Bypassed",
      };
    }
  }

  const sorted = Object.entries(output.ips).sort(([, a], [, b]) => (b.requests ?? 0) - (a.requests ?? 0)).slice(0, 50);
  output.ips = Object.fromEntries(sorted);
  output.summary = {
    total_bypassing_ips: Object.keys(output.ips).length,
    total_bypass_requests: Object.values(output.ips).reduce((sum, row) => sum + Number(row.requests ?? 0), 0),
  };
  return output;
}

function detectFalsePositives(cfByIp, rules) {
  const falsePositives = [];
  const rawCountryCode = process.env.COUNTRY_CODE;
  const websiteCountry = typeof rawCountryCode === "string" && rawCountryCode.trim() !== ""
    ? rawCountryCode.trim()
    : null;

  for (const [ip, data] of Object.entries(cfByIp)) {
    if (data.country !== websiteCountry) continue;
    if (matchesCloudflareRules(ip, data, rules)) continue;

    const actions = data.actions ?? [];
    const total = actions.length;
    const blocks = actions.filter((action) => String(action).toLowerCase() === "block").length;
    const userAgents = Object.keys(data.userAgents ?? {});

    const hasLegitimateUa = userAgents.some(
      (ua) => /(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/i.test(ua) && !/(bot|crawler|spider|scraper)/i.test(ua),
    );

    if (hasLegitimateUa && blocks > 0 && total < 20) {
      falsePositives.push({
        ip,
        asn: data.asn,
        asn_description: data.asnDescription ?? null,
        country: data.country,
        total_events: total,
        blocks,
        user_agents: userAgents,
      });
    }
  }

  return falsePositives.slice(0, 50);
}

async function main() {
  const { logFile } = parseArgs(process.argv);
  const databaseUrl = requiredEnv("DATABASE_URL");
  const date = toDateOnlyLocal(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const logFilePath = logFile || resolveDefaultLogFile();
  const logContent = await readFile(logFilePath, "utf8");
  const lines = logContent.split(/\r?\n/);

  let active = 0;
  let archived = 0;
  let deleted = 0;
  let cached = 0;
  let total = 0;
  let fresh = 0;
  let days10 = 0;
  let days20 = 0;
  let days30 = 0;
  let hits = 0;

  const nginxIps = {};
  const nginxUserAgents = {};
  let totalNginxRequests = 0;
  const crawlEvents = [];

  for (const line of lines) {
    if (!line) continue;

    const parsed = parseLogLine(line);
    if (parsed) {
      totalNginxRequests += 1;
      const requestPath = extractRequestPath(parsed.request);
      const hasUtm = parsed.request.includes("utm_source");
      const hasRealUserPath = ["/profile/", "/resumes/", "/autocomplete/", "/email/verify"].some((prefix) => requestPath.startsWith(prefix));

      if (!nginxIps[parsed.ip]) {
        nginxIps[parsed.ip] = {
          count: 0,
          userAgents: {},
          hasUtmSource: false,
          hasRealUserPath: false,
        };
      }
      nginxIps[parsed.ip].count += 1;
      nginxIps[parsed.ip].userAgents[parsed.userAgent] = (nginxIps[parsed.ip].userAgents[parsed.userAgent] ?? 0) + 1;
      if (hasUtm) nginxIps[parsed.ip].hasUtmSource = true;
      if (hasRealUserPath) nginxIps[parsed.ip].hasRealUserPath = true;
      nginxUserAgents[parsed.userAgent] = (nginxUserAgents[parsed.userAgent] ?? 0) + 1;
    }

    if (line.includes("Googlebot")) {
      hits += 1;
    }

    const crawlMatch = line.match(/\[(.+?)\]\s"GET \/jobs(?:\/view)?\/(\d+)\sHTTP.+?"\s(200|404|410|304)\s.+?Googlebot/);
    if (crawlMatch) {
      const crawledDate = parseNginxDate(crawlMatch[1]);
      const crawledAt = crawledDate ? toMysqlDatetimeLocal(crawledDate) : crawlMatch[1];
      const jobId = Number.parseInt(crawlMatch[2], 10);
      const status = crawlMatch[3];
      console.info(`${crawledAt} ${jobId} ${status}`);
      total += 1;

      if (status === "404" || status === "410") deleted += 1;
      else if (status === "304") cached += 1;
      else crawlEvents.push(jobId);
    }
  }

  const pool = mysql.createPool({
    uri: databaseUrl,
    connectionLimit: 5,
  });

  try {
    if (crawlEvents.length > 0) {
      const placeholders = crawlEvents.map(() => "?").join(", ");
      const [rows] = await pool.execute(
        `SELECT id, created_at FROM jobs WHERE id IN (${placeholders})`,
        crawlEvents,
      );
      const jobMap = new Map(rows.map((row) => [Number(row.id), row]));

      for (const jobId of crawlEvents) {
        const job = jobMap.get(jobId);
        if (!job) {
          archived += 1;
          continue;
        }
        active += 1;
        const createdAt = new Date(job.created_at);
        const ageDays = Math.floor((Date.now() - createdAt.getTime()) / (24 * 60 * 60 * 1000));
        if (toDateOnlyLocal(createdAt) === date) fresh += 1;
        else if (ageDays < 10) days10 += 1;
        else if (ageDays < 20) days20 += 1;
        else days30 += 1;
      }
    }

    const [submittedRows] = await pool.execute(
      "SELECT COUNT(*) AS c FROM jobs WHERE DATE_ADD(DATE(created_at), INTERVAL 1 DAY) = DATE(NOW())",
    );
    const [crawledRows] = await pool.execute(
      "SELECT COUNT(*) AS c FROM jobs WHERE DATE_ADD(DATE(created_at), INTERVAL 1 DAY) = DATE(NOW()) AND google_crawled = 1",
    );

    const submitted = Number(submittedRows[0]?.c ?? 0);
    const crawled = Number(crawledRows[0]?.c ?? 0);
    const indexed = submitted > 0 ? Math.round((crawled / submitted) * 10000) / 100 : 0;
    const rate = Math.round((hits / 1440) * 100) / 100;

    console.info(`Date: ${date}`);
    console.info(`Submitted: ${submitted}`);
    console.info(`Crawled: ${crawled}`);
    console.info(`Indexed: ${indexed}%`);
    console.info(`Hits: ${hits}`);
    console.info(`Rate: ${rate}`);
    console.info(`New: ${fresh}`);
    console.info(`Total: ${total}`);
    console.info(`Active: ${active}`);
    console.info(`Archived: ${archived}`);
    console.info(`Deleted: ${deleted}`);
    console.info(`Cached: ${cached}`);
    console.info(`Days 1-10: ${days10}`);
    console.info(`Days 11-20: ${days20}`);
    console.info(`Days 21-30: ${days30}`);

    const aggAnalyzeUri = buildAggAnalyzeUri();
    if (aggAnalyzeUri) {
      const aggPool = mysql.createPool({
        uri: aggAnalyzeUri,
        connectionLimit: 3,
      });
      try {
        await aggPool.execute(
          `
          INSERT IGNORE INTO crawler (
            logged,
            website,
            domain,
            total,
            active,
            archived,
            deleted,
            cached,
            \`new\`,
            submitted,
            crawled,
            indexed,
            hits,
            rate,
            days10,
            days20,
            days30
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            date,
            optionalEnv("MAIN_DOMAIN"),
            optionalEnv("MAIN_DOMAIN"),
            total,
            active,
            archived,
            deleted,
            cached,
            fresh,
            submitted,
            crawled,
            indexed,
            hits,
            rate,
            days10,
            days20,
            days30,
          ],
        );
      } finally {
        await aggPool.end();
      }
    } else {
      console.info("Skipping remote crawler insert (AGG_DB_HOST/AGG_DB_USERNAME not configured)");
    }

    const [cfEvents] = await pool.execute(
      "SELECT action, asn, asn_description, country, ip, user_agent, created_at FROM cloudflare_events WHERE DATE(created_at) = ?",
      [date],
    );

    console.info("\n=== Bot Detection & Cloudflare Analysis ===");
    console.info(`Nginx requests: ${totalNginxRequests}`);
    console.info(`Cloudflare events: ${cfEvents.length}`);

    const cfByIp = {};
    const cfByAction = { block: 0, challenge: 0, managed_challenge: 0 };

    for (const event of cfEvents) {
      const ip = String(event.ip ?? "");
      if (!ip) continue;
      if (!cfByIp[ip]) {
        cfByIp[ip] = {
          count: 0,
          actions: [],
          asn: event.asn ?? null,
          asnDescription: event.asn_description ?? null,
          country: event.country ?? null,
          userAgents: {},
        };
      }
      cfByIp[ip].count += 1;
      cfByIp[ip].actions.push(event.action);
      const ua = String(event.user_agent ?? "");
      cfByIp[ip].userAgents[ua] = (cfByIp[ip].userAgents[ua] ?? 0) + 1;
      const action = String(event.action ?? "").toLowerCase();
      if (Object.hasOwn(cfByAction, action)) {
        cfByAction[action] += 1;
      }
    }

    const cfRules = await fetchCloudflareRules();
    const bypassBots = detectBypassingBots(nginxIps, cfByIp);
    await enrichGeoIpBypassIps(bypassBots.ips);
    const falsePositives = detectFalsePositives(cfByIp, cfRules);

    console.info("\n--- Bot Detection Summary ---");
    console.info(`Bots bypassing Cloudflare: ${Object.keys(bypassBots.ips).length}`);
    console.info(`Potential false positives: ${falsePositives.length}`);

    await pool.execute(
      `
      INSERT INTO direct_traffic (
        traffic_date,
        bypass_bots,
        false_positives,
        total_nginx_requests,
        total_cloudflare_events,
        cloudflare_blocks,
        cloudflare_challenges
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        bypass_bots = VALUES(bypass_bots),
        false_positives = VALUES(false_positives),
        total_nginx_requests = VALUES(total_nginx_requests),
        total_cloudflare_events = VALUES(total_cloudflare_events),
        cloudflare_blocks = VALUES(cloudflare_blocks),
        cloudflare_challenges = VALUES(cloudflare_challenges)
      `,
      [
        date,
        JSON.stringify(bypassBots),
        JSON.stringify(falsePositives),
        totalNginxRequests,
        cfEvents.length,
        cfByAction.block,
        cfByAction.challenge + cfByAction.managed_challenge,
      ],
    );

    console.info("\nTraffic analysis saved to direct_traffic table");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
