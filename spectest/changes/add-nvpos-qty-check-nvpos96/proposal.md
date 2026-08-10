# Change: Add QTY Check Feature Tests – NVPOS-96

## Why
The NVPOS-96 story introduces the Quantity Confirmation (QTY Check) feature.
No test coverage exists today. This change adds a full Cucumber/Playwright
test suite covering all in-scope ACs: button state, scan-based and
line-selection-based quantity verification, cart integrity, edge cases
(deleted item, item not in cart, mixed cart, identical items, consolidated
quantities, Price Check compatibility), and Japanese localization.

## What Changes
- **NEW** test capability `nvpos-qty-check` with 12 scenarios (TC-20039–TC-20050)
- **NEW** `acceptance/features/qty-check.feature`
- **NEW** `acceptance/steps/qty-check.steps.ts`
- **MODIFIED** `acceptance/pages/SalePage.ts` — added QTY Check locators and
  verification methods

## Impact
- Affected specs: `nvpos-qty-check` (new)
- Affected code: `acceptance/pages/SalePage.ts`, new feature + steps files
- Out of scope (per story): AC12 (audible beep second scan),
  AC15 (PickList support), AC20 (core services integration internals)
