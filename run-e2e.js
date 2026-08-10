/**
 * run-e2e.js — Cucumber wrapper that always generates the HTML report,
 * even when one or more scenarios fail (Cucumber exits non-zero).
 *
 * Usage (via npm scripts):
 *   node --env-file=.env run-e2e.js [--tags "@TC-20001"] [...]
 */

import { spawnSync }     from 'child_process';
import { unlinkSync }    from 'fs';

// ── 1. Pre-clean: remove stale JSON report ────────────────────────────────────
try { unlinkSync('reports/cucumber-json/cucumber-report.json'); } catch {}

// ── 2. Run Cucumber ───────────────────────────────────────────────────────────
const cucumberResult = spawnSync(
  process.execPath,
  [
    '--import', 'tsx/esm',
    'node_modules/@cucumber/cucumber/bin/cucumber.js',
    ...process.argv.slice(2),   // forward any extra flags (e.g. --tags)
  ],
  { stdio: 'inherit', env: process.env },
);

// ── 3. Always generate the report ────────────────────────────────────────────
const reportResult = spawnSync(
  process.execPath,
  ['generate-report.js'],
  { stdio: 'inherit', env: process.env },
);

if (reportResult.status !== 0) {
  console.error('⚠  Report generation failed (exit', reportResult.status, ')');
}

// ── 4. Preserve Cucumber's exit code so CI knows if tests failed ──────────────
process.exit(cucumberResult.status ?? 1);
