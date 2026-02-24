import fs from "node:fs";
import path from "node:path";

function fail(message) {
  console.error(`[delta-summary] ${message}`);
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

const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const tables = Array.isArray(report.tables) ? report.tables : [];
if (tables.length === 0) {
  fail("Report has no table entries.");
}

const errored = tables.filter((table) => Number(table.errors ?? 0) > 0);
const mismatched = tables.filter(
  (table) => !report.dry_run && Number(table.source_rows ?? 0) > 0 && table.checksums_match !== true,
);

const rows = tables.reduce(
  (acc, table) => {
    acc.source += Number(table.source_rows ?? 0);
    acc.upserted += Number(table.upserted_rows ?? 0);
    return acc;
  },
  { source: 0, upserted: 0 },
);

const lines = [
  "# Delta Report Summary",
  "",
  `- Report: \`${reportPath}\``,
  `- Started: ${report.started_at ?? "unknown"}`,
  `- Dry run: ${Boolean(report.dry_run)}`,
  `- Tables: ${tables.length}`,
  `- Source rows: ${rows.source}`,
  `- Upserted rows: ${rows.upserted}`,
  `- Tables with errors: ${errored.length}`,
  `- Tables with checksum mismatch: ${mismatched.length}`,
  "",
];

if (errored.length > 0) {
  lines.push("## Error Tables", "");
  for (const table of errored) {
    lines.push(`- \`${table.mysql_table} -> ${table.d1_table}\`: errors=${table.errors}`);
  }
  lines.push("");
}

if (mismatched.length > 0) {
  lines.push("## Checksum Mismatches", "");
  for (const table of mismatched) {
    lines.push(
      `- \`${table.mysql_table} -> ${table.d1_table}\`: source=${table.source_checksum ?? "null"} target=${table.target_checksum ?? "null"}`,
    );
  }
  lines.push("");
}

const output = lines.join("\n");
console.log(output);
