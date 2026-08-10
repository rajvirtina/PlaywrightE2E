# Test Project Context

## Purpose
Automated end-to-end and performance test suite for the **Voyix POS** application.
Covers critical POS workflows: login, item scanning, cart management, discounts, payment, and home screen validation.

## Tech Stack
- Cucumber.js (TypeScript) — BDD test runner with Gherkin feature files
- Playwright — browser automation
- Node.js >= 20.19.0
- SpecTest (@speckit/spectest) — spec-driven test planning and management
- Vitest — unit tests for test utilities

## Test Project Conventions

### Test Code Style
- Language: TypeScript (strict mode)
- Feature files: `acceptance/features/<feature>.feature`
- Step definitions: `acceptance/steps/<feature>.steps.ts`
- Page Objects: `acceptance/pages/<Page>.ts` — one class per page, all locators centralised
- Helpers: `acceptance/helpers/` — shared utilities (AppFlows, PlaywrightUtils)
- Test data: stored in `acceptance/data/` as JSON, never hardcoded in step files
- No hardcoded waits — use Playwright's built-in auto-wait

### Test Architecture Patterns
- Page Object Model: `acceptance/pages/NvposPosPage.ts`
- Support files: `acceptance/support/world.ts`, `acceptance/support/hooks.ts`
- Screenshots on failure: auto-captured via hooks
- HTML report: generated in `reports/rich-report/index.html` via `npm run report`

### Tag Strategy
- `@nvpos` — common tag to run all NvPOS feature files at once
- `@nvpos-e2e` — end-to-end transaction flow scenarios only
- `@nvpos-perf` — performance/load scenarios only
- `@smoke` — smoke test subset (quick confidence check)
- `@JIRA-XXXXX` / `@TC-XXXXX` — traceability tags

### Testing Strategy
- Framework: Cucumber.js BDD with Playwright
- Spec format: SpecTest (human-readable test specs in `spectest/`)
- Coverage: POS critical flows — login, scan, cart, discounts, payment, home
- Run all tests: `npm run test:e2e`
- Run by tag: `npm run test:e2e -- --tags "@nvpos"`

### Git Workflow
- Branch: `test/<change-id>` for each SpecTest change (e.g. `test/add-nvpos-login-layout-tests`)
- Commits: Conventional Commits format — `type(scope): subject`
  - `test(nvpos): add cart item removal scenario TC-20003`
  - `fix(nvpos): update payment locator after UI change`
- PR: link to the SpecTest change proposal in the PR description

## Application Under Test
- Base URL: `http://127.0.0.1:5173/`
- Login credentials: username `0000` / password `0000`
- Item barcodes: defined in `acceptance/data/transaction.json`
- Payment methods: defined in `acceptance/data/payment.json`
- UI language: Japanese (button labels in Japanese)
