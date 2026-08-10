// ─────────────────────────────────────────────────────────────────────────────
// Cucumber configuration for Kanesue POS e2e tests
//
// Run all tests           :  npm run test:e2e
// Run by Jira number      :  npm run test:jira   JIRA-101
// Run by scenario tag     :  npm run test:tag    smoke
// Run by test case        :  npm run test:case   TC-001
// Run by multiple tags    :  npm run test:e2e -- --tags "@smoke and @JIRA-101"
// ─────────────────────────────────────────────────────────────────────────────

export default {
  // Feature files location
  paths: ['acceptance/features/**/*.feature'],

  // Load support files (world + hooks) and step definitions
  import: [
    'acceptance/support/world.ts',
    'acceptance/support/hooks.ts',
    'acceptance/steps/**/*.ts',
  ],

  // Output formats
  format: [
    'progress-bar',
    'html:reports/cucumber-report.html',
    'json:reports/cucumber-json/cucumber-report.json',
  ],

  publishQuiet: true,

  // Retry count — set RETRY=1 in .env to re-run failing scenarios once before reporting failure.
  // Useful to guard against transient SSE/network flakiness.
  // Default: 0 (no retry). Set to 0 or leave unset to disable.
  retry: Math.max(0, parseInt(process.env.RETRY ?? '0', 10)),
};
