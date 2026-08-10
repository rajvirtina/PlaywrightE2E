@nvpos-line-item-delete @nvpos @nvpos-line-delete @nvpos-334 @transaction-workflow
Feature: Voyix POS - Line Item Cancel (Delete) (NVPOS-334)

  # Story: [NVPOS UI] Develop and Integrate the Support of Line Item Cancel (Delete)
  # JIRA: NVPOS-334
  # Covers removing scanned/entered items from an active sales transaction with accurate
  # cart recalculation (subtotal, tax, totals) and itemization pane updates.
  # In scope: AC1–AC5, Functional scenarios 1–8, Discount/Tax scenarios (in-scope subset)
  # Out of scope: Department-entered items, Weighted items, Transaction-level promotions,
  #               Non-taxable item tax recalculation, Loyalty/member discounts

  Background:
    Given the user opens the POS application

  # ── AC1: Delete action visibility ────────────────────────────────────────────

  # TC-20051 — AC1: Delete action is visible when an item is selected in the basket
  @JIRA-20051 @TC-20051 @NVPOS-334 @smoke @ac1 @line-item-delete @delete-visibility
  Scenario: AC1 - Delete action is displayed when a line item is selected in the transaction basket
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    Then the delete item action should be visible

  # ── AC2 / AC4: Delete removes item; itemization pane updates ─────────────────

  # TC-20052 — AC2/AC4/Func1: Delete the FIRST item in a multi-item transaction
  @JIRA-20052 @TC-20052 @NVPOS-334 @smoke @ac2 @ac4 @line-item-delete @delete-first
  Scenario: Func1/AC2/AC4 - Deleting the first item removes it from the cart and itemization pane
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user scans item "testItemB"
    And the user scans item "testItemC"
    And the user selects the first cart line item
    When the user deletes the currently selected item
    Then the cart totals should reflect the remaining items
    And the deleted item "testItemA" should not appear in the cart

  # TC-20053 — AC2/AC4/Func2: Delete the LAST item in a multi-item transaction
  @JIRA-20053 @TC-20053 @NVPOS-334 @smoke @ac2 @ac4 @line-item-delete @delete-last
  Scenario: Func2/AC2/AC4 - Deleting the last item removes it from the cart and itemization pane
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user scans item "testItemB"
    And the user scans item "testItemC"
    And the user selects the last cart line item
    When the user deletes the currently selected item
    Then the cart totals should reflect the remaining items
    And the deleted item "testItemC" should not appear in the cart

  # TC-20054 — AC2/AC4/Func3: Delete a MIDDLE item in a transaction with several items
  @JIRA-20054 @TC-20054 @NVPOS-334 @smoke @ac2 @ac4 @line-item-delete @delete-middle
  Scenario: Func3/AC2/AC4 - Deleting a middle item removes it without affecting surrounding items
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user scans item "testItemB"
    And the user scans item "testItemC"
    And the user selects the middle cart line item
    When the user deletes the currently selected item
    Then the cart totals should reflect the remaining items

  # TC-20055 — AC2/AC3/AC4/Func4: Delete multiple items sequentially in the same transaction
  @JIRA-20055 @TC-20055 @NVPOS-334 @smoke @ac2 @ac3 @ac4 @line-item-delete @delete-multiple
  Scenario: Func4/AC2/AC3/AC4 - Deleting multiple items one after another recalculates totals each time
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user scans item "testItemB"
    And the user scans item "testItemC"
    Then the cart totals should be correct
    When the user deletes the currently selected item
    Then the cart totals should reflect the remaining items
    When the user deletes the currently selected item
    Then the cart totals should reflect the remaining items

  # ── AC5: Last item deletion → empty cart ─────────────────────────────────────

  # TC-20056 — AC5: Deleting the only item returns transaction to empty sale state
  @JIRA-20056 @TC-20056 @NVPOS-334 @smoke @ac5 @line-item-delete @delete-only-item
  Scenario: AC5 - Deleting the only cart item returns the transaction to an empty sale state
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    Then the cart totals should be correct
    When the user deletes the currently selected item
    Then the cart totals should reflect the remaining items

  # ── Func5: Continue scanning after delete ────────────────────────────────────

  # TC-20057 — Func5/AC3: Operator can continue scanning items after a deletion
  @JIRA-20057 @TC-20057 @NVPOS-334 @smoke @ac3 @line-item-delete @continue-after-delete
  Scenario: Func5/AC3 - Scanning new items after a deletion updates the cart correctly
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user scans item "testItemB"
    When the user deletes the currently selected item
    Then the cart totals should reflect the remaining items
    When the user scans item "testItemC"
    Then the cart totals should be correct

  # ── Func8: Delete works for barcode-scanned items ────────────────────────────

  # TC-20058 — Func8/AC2/AC3/AC4: Delete a barcode-scanned item; verify it was registered in
  # the cart before deletion (AC4 — itemization pane shows it), then verify it is removed and
  # totals recalculate correctly after deletion. Uses 3 distinct items scanned one at a time.
  @JIRA-20058 @TC-20058 @NVPOS-334 @smoke @ac2 @ac3 @ac4 @line-item-delete @barcode-scan
  Scenario: Func8/AC2/AC3/AC4 - Barcode-scanned item appears in itemization pane before deletion and is removed with correct total recalculation after
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user scans item "testItemB"
    And the user scans item "testItemD"
    Then the cart totals should be correct
    And the item "testItemD" should appear in the cart
    When the user deletes the currently selected item
    Then the cart totals should reflect the remaining items
    And the deleted item "testItemD" should not appear in the cart

  # ── Discount: Delete discounted item → discount removed ───────────────────────

  # TC-20059 — Discount/AC2/AC3: Delete an item with an item-level discount; totals recalculate
  @JIRA-20059 @TC-20059 @NVPOS-334 @smoke @ac2 @ac3 @line-item-delete @discount @delete-discounted
  Scenario: Discount/AC2/AC3 - Deleting an item with an applied discount removes the item and its discount from totals
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user scans item "testItemB"
    Then the cart totals should be correct
    When the user applies a custom amount off of 5 percent
    Then the discounted cart totals should be correct
    When the user selects the product line for "testItemB" in the cart
    And the user deletes the currently selected item
    Then the cart totals should reflect the remaining items

  # ── Tax & Total: Recalculation after deleting a taxable item ─────────────────

  # TC-20060 — Tax/AC3: Subtotal, tax, and total recalculate immediately after deleting a taxable item
  @JIRA-20060 @TC-20060 @NVPOS-334 @smoke @ac3 @line-item-delete @tax-recalculation
  Scenario: Tax/AC3 - Subtotal, tax, and transaction total update immediately after deleting a taxable item
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user scans item "testItemB"
    And the user scans item "testItemC"
    Then the cart totals should be correct
    When the user deletes the currently selected item
    Then the cart totals should reflect the remaining items

  # ── Tender screen: delete not available ──────────────────────────────────────

  # TC-20061 — AC2: Scan items, delete some on sale screen, proceed to tender screen,
  # verify item deletion is blocked on tender screen, then complete the transaction.
  @JIRA-20061 @TC-20061 @NVPOS-334 @smoke @ac2 @line-item-delete @tender-screen @no-delete-on-tender
  Scenario: AC2 - Item deletion is blocked on the tender screen; transaction completes correctly after sale-screen deletions
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user scans item "testItemB"
    And the user scans item "testItemC"
    Then the cart totals should be correct
    When the user deletes the currently selected item
    Then the cart totals should reflect the remaining items
    When the user deletes the currently selected item
    Then the cart totals should reflect the remaining items
    When the user clicks the proceed to payment button
    Then the tender screen should show the correct total and tax
    And the delete item action should not be available on the tender screen
    When the user pays with cash entering the exact amount manually
    Then the user should be redirected to the home screen
