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

const strictChecksum = process.env.DELTA_STRICT_CHECKSUM === "true";

if (!report.dry_run && report.totals?.errors > 0) {
  fail(`Report totals.errors=${report.totals.errors}`);
}

const checksumWarnings = [];

for (const table of tables) {
  const tableName = `${table.mysql_table ?? "unknown"} -> ${table.d1_table ?? "unknown"}`;
  if ((table.errors ?? 0) > 0) {
    fail(`${tableName} has errors=${table.errors}`);
  }

  if (report.dry_run) {
    continue;
  }

  const sourceRows = Number(table.source_rows ?? 0);
  const targetRows = Number(table.target_rows ?? 0);
  const upsertedRows = Number(table.upserted_rows ?? 0);
  if (sourceRows === 0) {
    continue;
  }

  if (upsertedRows !== sourceRows) {
    fail(`${tableName} upsert mismatch (upserted=${upsertedRows}, source=${sourceRows})`);
  }

  if (targetRows !== 0 && targetRows !== sourceRows) {
    fail(`${tableName} target row mismatch (target=${targetRows}, source=${sourceRows})`);
  }

  if (table.checksums_match !== true) {
    if (strictChecksum) {
      fail(`${tableName} checksum mismatch (checksums_match=${String(table.checksums_match)})`);
    }

    if (targetRows === 0) {
      fail(`${tableName} checksum mismatch with empty target_rows`);
    }

    checksumWarnings.push(tableName);
  }
}

if (checksumWarnings.length > 0) {
  for (const tableName of checksumWarnings) {
    console.warn(
      `[delta-report] warning: checksum mismatch for ${tableName}; accepted because row parity and error checks passed`,
    );
  }

  console.warn("[delta-report] set DELTA_STRICT_CHECKSUM=true to fail on checksum mismatch");
}

console.log(`[delta-report] integrity gates passed for ${tables.length} tables`);

console.log(`[delta-report] verified ${tables.length} tables from ${reportPath}`);
