# Tasks: Add QTY Check Feature Tests – NVPOS-96

## 1. Planning
- [x] 1.1 Audit existing suite — confirmed zero QTY Check coverage
- [x] 1.2 Map all ACs to test scenarios TC-20039–TC-20050
- [x] 1.3 Identify out-of-scope ACs: AC12, AC15, AC20

## 2. Spec Delta
- [x] 2.1 Create `spectest/changes/add-nvpos-qty-check-nvpos96/specs/nvpos-qty-check/spec.md`

## 3. Page Object
- [x] 3.1 Add QTY Check locators to `acceptance/pages/SalePage.ts`:
      qtyCheckButton, qtyCheckPopup, qtyCheckConfirmButton, qtyCheckCloseButton
- [x] 3.2 Add verification methods:
      verifyQtyCheckButtonDisabled, verifyQtyCheckButtonEnabled,
      openQtyCheck, scanItemInQtyCheckPopup, verifyQtyCheckPopupContent,
      confirmQtyCheckPopup, dismissQtyCheckPopup,
      verifyQtyCheckPopupClosedAndLineHighlighted,
      verifyQtyCheckItemNotFound, verifyQtyCheckLocalizationJapanese

## 4. Feature file
- [x] 4.1 Create `acceptance/features/qty-check.feature`
      TC-20039: Button disabled/enabled based on cart state (AC11/AC13)
      TC-20040: Single item — QTY Check by scan (AC1/AC2/AC5)
      TC-20041: Single item — QTY Check by line selection (AC1/AC3/AC5)
      TC-20042: Multiple identical items — total qty by scan (AC6)
      TC-20043: Mixed cart — only scanned product qty shown (AC7)
      TC-20044: Consolidated qty accuracy (AC8)
      TC-20045: Deleted item shows not found (AC9/AC22)
      TC-20046: Item not in cart shows not found (AC10/AC22)
      TC-20047: Confirm closes popup, highlights line, cart intact (AC4/AC16/AC21)
      TC-20048: QTY Check works with Price Check mode active (AC14)
      TC-20049: Japanese localization of popup labels (AC17/AC18)
      TC-20050: Keyed item entry QTY Check (AC19)

## 5. Step definitions
- [x] 5.1 Create `acceptance/steps/qty-check.steps.ts`

## 6. Validation
- [ ] 6.1 TypeScript compile check
- [ ] 6.2 No duplicate step definitions
- [ ] 6.3 Run tests once app supports QTY Check
