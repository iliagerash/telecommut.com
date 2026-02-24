# Wave 7 Final Delta Import + Integrity Verification

Use this runbook to execute `W7-2`.

## Goal

- Apply final DB delta from MySQL into production D1.
- Validate checksums and row-level parity from migration report.
- Validate representative R2 object mappings for image fields.

## 1) Final Delta Import (DB)

Run from `telecommut-data-migrate` with production env:

```bash
php migrate.php --skip-images --report=/tmp/telecommut-final-delta-report.json
```

Expected:
- No fatal runtime errors.
- Report file created.

## 2) Validate Report Integrity

Run from `telecommut.com`:

```bash
npm run qa:delta-report -- /tmp/telecommut-final-delta-report.json
npm run qa:delta-summary -- /tmp/telecommut-final-delta-report.json > /tmp/telecommut-final-delta-summary.md
```

This fails if:
- any table has `errors > 0`
- source/upsert/target row parity is broken for non-empty tables

Checksums:
- default mode: checksum mismatches are warnings if hard integrity gates pass
- strict mode: set `DELTA_STRICT_CHECKSUM=true` to fail on any checksum mismatch

## 3) Images Delta (R2)

If image sync is required for the final window:

```bash
php migrate.php --images-only --report=/tmp/telecommut-final-images-report.json
```

Then sample-check object keys from D1 rows and confirm they exist in R2.

## 4) Evidence to Attach

- `/tmp/telecommut-final-delta-report.json`
- Output from `npm run qa:delta-report -- ...`
- `/tmp/telecommut-final-delta-summary.md`
- `/tmp/telecommut-final-images-report.json` (if images-only run executed)
- 3-5 sampled D1 rows with image keys + matching R2 object existence proof

## Exit Criteria for W7-2

- Final delta report passes `qa:delta-report`.
- No table-level migration errors.
- R2 mapping checks confirmed for sampled rows (if images run).
