import fs from "node:fs";
import path from "node:path";

function fail(message) {
  console.error(`[delta-report] ${message}`);
  process.exit(1);
}

const reportPathArg = process.argv[2] ?? process.env.DELTA_REPORT_PATH;
if (!reportPathArg) {
  fail("Provide report path as arg or DELTA_REPORT_PATH.");
}

const reportPath = path.resolve(reportPathArg);
if (!fs.existsSync(reportPath)) {
  fail(`Report file not found: ${reportPath}`);
}

const raw = fs.readFileSync(reportPath, "utf8");
const report = JSON.parse(raw);
const tables = Array.isArray(report.tables) ? report.tables : [];
if (tables.length === 0) {
  fail("Report has no table entries.");
}

if (!report.dry_run && report.totals?.errors > 0) {
  fail(`Report totals.errors=${report.totals.errors}`);
}

for (const table of tables) {
  const tableName = `${table.mysql_table ?? "unknown"} -> ${table.d1_table ?? "unknown"}`;
  if ((table.errors ?? 0) > 0) {
    fail(`${tableName} has errors=${table.errors}`);
  }

  if (report.dry_run) {
    continue;
  }

  const sourceRows = Number(table.source_rows ?? 0);
  if (sourceRows === 0) {
    continue;
  }

  if (table.checksums_match !== true) {
    fail(`${tableName} checksum mismatch (checksums_match=${String(table.checksums_match)})`);
  }
}

console.log(`[delta-report] verified ${tables.length} tables from ${reportPath}`);
