# Proposal: step2-end-to-end-flow

## Summary
Add a fully automated end-to-end Cucumber scenario that covers the complete cash
transaction journey on the Voyix POS Japan (nvPOS) application — from login through
to payment confirmation and home-screen validation.

## Jira Reference
- Test Case: **TC-20001**
- Jira: **JIRA-20001**
- Feature: Step2 End to End flow
- Type: E2E / Smoke

## Why
The core transaction flow (login → scan item → pay → receipt → home) is the highest
business-critical path in the POS system. Automating it ensures:
- Regressions in the login, transaction, or payment screens are caught immediately
- No manual tester is needed for every build
- Evidence screenshots are automatically captured in the HTML report

## What Changes
- New feature file: `e2e/features/step2-end-to-end-flow.feature`
- New Page Object: `e2e/pages/NvposPosPage.ts` — centralises all locators
- New step definitions: `e2e/steps/step2-end-to-end-flow.steps.ts` — uses Page Object
- New spec delta: `spectest/changes/step2-end-to-end-flow/specs/step2-e2e/spec.md`
- Rich HTML report: `multiple-cucumber-html-reporter` added to dev dependencies

## Scope

### In Scope
- Navigate to `http://127.0.0.1:5173/`
- Login with username `0000` / password `0000`
- Click Start Transaction button (PlayCircleFilledIcon)
- Enter item barcode `4901234000002` via on-screen numpad
- Proceed to payment screen (お支払いへ)
- Select Gift Card tender (ギフトカード)
- Confirm payment (支払確定)
- Validate return to home dashboard (PlayCircleFilledIcon visible)
- Capture screenshots at key steps for report evidence

### Out of Scope
- Cash / Credit Card / E-Money / QR Code tender flows
- Item return / cancel transaction
- Customer registration
- Multiple items in a single transaction

## Pre-conditions
- The nvPOS app is running at `http://127.0.0.1:5173/`
- Login credentials: username `0000`, password `0000`

## Impact
- New files only — no changes to existing tests
- Browser launches maximised (no viewport constraint)
- No manual intervention required — fully headless-capable
- Run with: `npm run test:e2e -- --tags "@step2-e2e"`
- Report: `reports/cucumber-report.html` and `reports/rich-report/index.html`
