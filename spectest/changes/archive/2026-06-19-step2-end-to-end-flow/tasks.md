# Tasks: step2-end-to-end-flow

## 1. Planning
- [x] 1.1 Identify the app URL and login credentials (`http://127.0.0.1:5173/`, user `0000` / pw `0000`)
- [x] 1.2 Map the full transaction journey: login → start tx → scan item → payment → home
- [x] 1.3 Identify all UI elements and their Japanese/English labels
- [x] 1.4 Write proposal.md and spec delta

## 2. Implementation
- [x] 2.1 Create feature file: `e2e/features/step2-end-to-end-flow.feature`
      - Background: navigate to `http://127.0.0.1:5173/`
      - Scenario: 12 steps covering login → payment → home validation
- [x] 2.2 Create Page Object: `e2e/pages/NvposPosPage.ts`
      - Centralises all locators (login, dashboard, transaction, payment screens)
- [x] 2.3 Create step definitions: `e2e/steps/step2-end-to-end-flow.steps.ts`
      - Uses NvposPosPage for all element interactions
      - No locators embedded in step code
- [x] 2.4 Configure `multiple-cucumber-html-reporter` for rich HTML reports
- [x] 2.5 Update `cucumber.js` to emit JSON output for the rich reporter
- [x] 2.6 Add `generate-report.js` script

## 3. Execution & Verification
- [x] 3.1 Verified all 12 steps pass: `npm run test:e2e -- --tags "@step2-e2e"`
- [x] 3.2 Browser launches maximised — no manual intervention required
- [x] 3.3 Screenshots captured at: gift card click and home screen validation
- [x] 3.4 Rich HTML report generated at `reports/rich-report/index.html`

## 4. Wrap Up
- [x] 4.1 Locators extracted to Page Object (`e2e/pages/NvposPosPage.ts`)
- [x] 4.2 Spec delta written at `spectest/changes/step2-end-to-end-flow/specs/step2-e2e/spec.md`
- [ ] 4.3 Commit: `test(step2-e2e): add end-to-end transaction flow TC-20001`
- [ ] 4.4 Archive: `spectest archive step2-end-to-end-flow --yes`
