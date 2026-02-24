import fs from "node:fs";
import path from "node:path";

const configPath = path.resolve("wrangler.jsonc");
const raw = fs.readFileSync(configPath, "utf8");
const config = JSON.parse(raw);

function fail(message) {
  console.error(`[cutover-config] ${message}`);
  process.exit(1);
}

function ensureString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    fail(`${label} must be a non-empty string`);
  }
}

ensureString(config.name, "name");
if (config.name.includes(".")) {
  fail("worker name must not contain dots");
}

const d1 = config.d1_databases?.[0];
if (!d1) {
  fail("missing d1_databases[0]");
}
ensureString(d1.binding, "d1_databases[0].binding");
ensureString(d1.database_id, "d1_databases[0].database_id");
ensureString(d1.database_name, "d1_databases[0].database_name");

const kvNamespaces = Array.isArray(config.kv_namespaces) ? config.kv_namespaces : [];
if (kvNamespaces.length < 2) {
  fail("expected SESSION and SESSION_PREVIEW kv namespaces");
}
for (const [index, kv] of kvNamespaces.entries()) {
  ensureString(kv.binding, `kv_namespaces[${index}].binding`);
  ensureString(kv.id, `kv_namespaces[${index}].id`);
}

const r2 = config.r2_buckets?.[0];
if (!r2) {
  fail("missing r2_buckets[0]");
}
ensureString(r2.binding, "r2_buckets[0].binding");
ensureString(r2.bucket_name, "r2_buckets[0].bucket_name");

if (config.assets?.binding !== "ASSETS") {
  fail("assets.binding must be ASSETS");
}

console.log("[cutover-config] wrangler config preflight passed");
