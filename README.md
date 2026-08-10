# Voyix POS Test Automation

Automated end-to-end and performance test suite for the **Voyix POS** application. Covers critical POS workflows: login, item scanning, cart management, discounts, payment, and home screen validation.

---

## Quick Start — First Time Setup

Follow these steps exactly after cloning the repository for the first time.

### Windows — One-click setup (recommended)

If you are on **Windows**, run the included setup script — it handles steps 1–4 automatically:

```bat
setup.bat
```

Double-click `setup.bat` in File Explorer, or run it from a Command Prompt / PowerShell terminal in the project root. It will:

- Verify Node.js v20+ is installed (and tell you where to download it if not)
- Run `npm install` to install all packages
- Run `npx playwright install chromium` to download the Chromium browser
- Copy `.env.example` → `.env` if `.env` does not already exist
- Create the `reports/` and `reports/traces/` directories

Once `setup.bat` completes, skip to [step 5](#5-start-the-voyix-pos-application) below.

---

### Manual setup (Mac / Linux / Windows)

### 1. Check Node.js version

```bash
node --version
```

Must be **>= 20.19.0**. If not, download it from [nodejs.org](https://nodejs.org).

### 2. Install dependencies

```bash
npm install
```

This installs Cucumber, Playwright, TypeScript, and all other dependencies from `package.json`.

### 3. Install Playwright browsers

```bash
npx playwright install chromium
```

Playwright needs its own bundled browser. This step is required on every fresh machine.

### 4. Verify the `.env` file exists

The `.env` file is committed in this repo (it contains only test defaults — no real secrets).
After cloning it should already be present. Check:

```bash
# Windows
dir .env

# Mac/Linux
ls -la .env
```

If it is missing for any reason, copy from the example:

```bash
cp .env.example .env
```

The defaults in `.env` work out of the box for local development — no changes needed unless your app runs on a different port.

### 5. Start the Voyix POS application

The tests run against a **locally running** instance of the app. Start it before running tests:

```
Base URL: http://127.0.0.1:5173/
Login:    username 0000  /  password 0000
```

> If you are running on CX7 hardware, the app URL is the same — the framework auto-detects Linux and runs headless.

### 6. Run the tests

```bash
# Run the full test suite
npm run test:e2e -- --tags "@nvpos"
```

The browser will open, you will see Playwright driving the POS UI, and results will print in the terminal. A rich HTML report is generated automatically at `reports/rich-report/index.html`.

### 7. Open the report

```bash
# Re-generate the report any time from the last test run
npm run report
```

Then open `reports/rich-report/index.html` in your browser.

---

## Tech Stack

- **Cucumber.js** (TypeScript) — BDD test runner with Gherkin feature files
- **Playwright** — browser automation
- **Node.js** >= 20.19.0
- **SpecTest** (`@speckit/spectest`) — spec-driven test planning and management

---

## Running Tests

```bash
# Run all NvPOS tests
npm run test:e2e -- --tags "@nvpos"

# Run end-to-end tests only
npm run test:e2e -- --tags "@nvpos-e2e"

# Run performance tests only
npm run test:e2e -- --tags "@nvpos-perf"

# Run smoke tests only
npm run test:e2e -- --tags "@smoke"

# Run a specific test case by Jira/TC tag
npm run test:e2e -- --tags "@TC-20001"

# Re-generate the HTML report from the last run (no tests re-run)
npm run report
```

Reports are generated at `reports/rich-report/index.html`.

> **Email notification:** Set `SEND_EMAIL=true` in your `.env` file to automatically email the HTML report after each run. See [Email Notification](#email-notification) for configuration.

---

## Running on CX7 Hardware

When running tests on the CX7 Linux device, use the `.env.hardware` file. The `setup-hardware.sh` script creates it automatically on the device.

Edit `.env.hardware` and uncomment **one** of the two options depending on which app is installed:

### Electron app (current)

```env
CDP_URL=http://localhost:9222   # ← uncomment this
# BROWSER=webkit                # ← keep this commented out
```

Playwright connects directly to the running Electron binary. The Electron app must be started with `--remote-debugging-port=9222` before running tests.

### Tauri app (WebKit)

```env
# CDP_URL=http://localhost:9222  # ← keep this commented out
BROWSER=webkit                   # ← uncomment this
```

Playwright launches its own WebKit browser and navigates to `APP_URL`. The Tauri app must be running and serving on the port set in `APP_URL`.

### Run tests on hardware

```bash
npm run test:hardware
```

---

## Project Structure

```
acceptance/
├── features/       # Gherkin feature files (.feature)
├── steps/          # Step definitions (TypeScript)
├── pages/          # Page Object Model — all locators live here
├── helpers/        # AppFlows (multi-step flows) + PlaywrightUtils (generic helpers)
├── data/           # Test data: items, payment methods (JSON)
└── support/        # Hooks (browser lifecycle, CPU metrics) and World (shared state)
spectest/
├── specs/          # Source of truth — current test coverage specs
├── changes/        # Active test change proposals
│   └── archive/    # Completed and archived changes
└── project.md      # Project conventions
reports/
├── rich-report/    # Full HTML report with charts (index.html)
├── cucumber-json/  # Raw Cucumber JSON (input to report generator)
└── metrics/        # CPU + memory metrics JSON
```

---

## Application Under Test

- **Base URL:** `http://127.0.0.1:5173/`
- **Login:** username `0000` / password `0000`
- **UI language:** Japanese

---

## Tax Rate Configuration

Tax amounts are derived at runtime from the category defined in `acceptance/config/taxRates.ts` — never hardcoded in test data.

| Category | Rate | Applies to |
|---|---|---|
| `taxable` | 8% | Food and non-alcoholic beverages (軽減税率) |

**Formula** (tax-exclusive pricing / 外税 — tax added on top of item price):
```
taxValue = Math.round(itemPrice × rate / 100)
total    = itemPrice + taxValue
```

**To change the rate:** edit the number in `acceptance/config/taxRates.ts`:
```ts
export const TAX_RATES = {
  taxable: 8,  // ← change this value only
};
```
All test assertions recalculate automatically — no other files need updating.

---

## Adding New Tests

1. Write the Gherkin scenario in the relevant `.feature` file under `acceptance/features/`
2. Tag it with `@nvpos` and any traceability tags (e.g. `@TC-20010`)
3. Ask GitHub Copilot: *"Generate step definitions for the new steps in [feature file]"*
4. Copilot will write the TypeScript step definitions following existing patterns

For larger changes involving multiple scenarios or new test capabilities, use the SpecTest workflow:
```bash
spectest list          # View active changes
spectest list --specs  # View existing specs
spectest validate      # Validate spec formatting
```

> **SpecTest CLI:** Install with `npm install -g @speckit/spectest@latest`

---

## Local Setup (for each developer)

### Email Notification

To receive an email with the HTML report attached after each test run, configure the following in your `.env` file:

```env
SEND_EMAIL=true                          # Set to false to disable
EMAIL_HOST=smtp.gmail.com                # SMTP server
EMAIL_PORT=587                           # SMTP port (587 = TLS, 465 = SSL)
EMAIL_SECURE=false                       # true only if port is 465
EMAIL_USER=your-email@gmail.com          # SMTP login
EMAIL_PASS=your-app-password             # App password (not your account password)
EMAIL_FROM=your-email@gmail.com          # Sender address
EMAIL_TO=teammate1@company.com,teammate2@company.com  # Comma-separated recipients
EMAIL_SUBJECT=NvPOS E2E Test Results     # Email subject prefix
```

> **Gmail users:** Use an [App Password](https://myaccount.google.com/apppasswords) — not your Google account password. Enable 2FA first, then generate the app password.

The email includes a pass/fail summary table and the full HTML report as an attachment.

### Jira Integration (GitHub Copilot)

To enable Copilot to fetch Jira tickets by ID:

1. Copy the template:
   ```bash
   cp .vscode/mcp.json.example .vscode/mcp.json
   ```
2. Edit `.vscode/mcp.json` with your own credentials:
   - `JIRA_URL` — your Jira base URL (e.g. `https://yourcompany.atlassian.net/`)
   - `JIRA_EMAIL` — your Jira login email
   - `JIRA_API_TOKEN` — generate at [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
3. Reload VS Code (`Ctrl+Shift+P` → **Reload Window**).

> ⚠️ `.vscode/mcp.json` is gitignored — never commit your token.

Once set up, you can ask Copilot: *"Create tests for TC-20010"* and it will fetch the ticket and generate the feature file and step definitions automatically.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| **Windows:** quickest way to install everything | Run `setup.bat` from the project root |
| `Cannot find name 'process'` | Run `npm install` — `@types/node` must be installed |
| `browserType.launch: Executable doesn't exist` | Run `npx playwright install chromium` (or `webkit` for WebKit mode) |
| `Error: connect ECONNREFUSED 127.0.0.1:5173` | The POS app is not running — start it first |
| `Error: connect ECONNREFUSED` on CDP_URL port | Electron app not running, or wrong port — check `--remote-debugging-port` matches `CDP_URL` |
| WebKit won't launch on Linux | Run `npx playwright install-deps webkit` to install required system packages |
| Tests pass but no report opens | Run `npm run report` then open `reports/rich-report/index.html` manually |
| Slow scan timings on first run | Normal — JIT warm-up. Run twice; second run timings are representative |


## Conventions

- Page Objects: one class per page, all locators centralised in `acceptance/pages/`
- Test data: stored as JSON in `acceptance/data/`, never hardcoded in steps
- No hardcoded waits — use Playwright's built-in auto-wait
- Screenshots on failure: auto-captured via hooks
- Tags: `@nvpos` (all), `@nvpos-e2e`, `@nvpos-perf`, `@smoke`, `@TC-XXXXX`, `@JIRA-XXXXX`
- Branch naming: `test/<change-id>` (e.g. `test/add-discount-tests`)
- Commits: Conventional Commits — `test(nvpos): add cart item removal scenario TC-20003`
