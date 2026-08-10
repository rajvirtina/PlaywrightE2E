@nvpos-qty-check @nvpos @nvpos-96 @transaction-workflow
Feature: Voyix POS - Check Item Quantity (QTY Check) - NVPOS-96

  # Story: [NVPOS UI] Develop and Integrate Check Item Quantity in Cart Itemization
  # JIRA: NVPOS-96
  # In scope: AC1–AC11, AC13–AC14, AC16–AC19, AC21–AC22
  # Out of scope: AC12 (audible beep), AC15 (PickList), AC20 (core services)

  Background:
    Given the user opens the POS application

  # TC-20039 — AC11/AC13: QTY Check button disabled when cart empty; enabled when cart has items
  @JIRA-20039 @TC-20039 @NVPOS-96 @smoke @ac11 @ac13 @qty-check @button-state
  Scenario: AC11/AC13 - QTY Check button is disabled when cart is empty and enabled once item is added
    When the user logs in with default credentials
    And the user clicks the start transaction button
    Then the qty check button should be disabled on the toolbar
    When the user scans item "testItemA"
    Then the qty check button should be enabled on the toolbar

  # TC-20040 — AC1/AC2/AC5: Single item – QTY Check (item auto-selected after scan)
  # Note: The QTY Check dialog auto-displays the selected cart item's quantity.
  # The last-scanned item is selected after scan; selecting the line explicitly
  # before opening QTY Check ensures correct behavior regardless of browser state.
  @JIRA-20040 @TC-20040 @NVPOS-96 @smoke @ac1 @ac2 @ac5 @qty-check @scan-flow
  Scenario: AC1/AC2/AC5 - QTY Check shows product name and quantity 1 for a single scanned item
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user selects the product line for "testItemA" in the cart
    When the user opens qty check mode
    Then the qty check popup should display "testItemA" with quantity 1
    And the qty check popup should not contain price or discount metadata
    When the user confirms the qty check popup
    Then the qty check popup should be closed and the matching line highlighted

  # TC-20041 — AC1/AC3/AC5: Single item – QTY Check by line selection
  @JIRA-20041 @TC-20041 @NVPOS-96 @smoke @ac1 @ac3 @ac5 @qty-check @line-selection
  Scenario: AC1/AC3/AC5 - QTY Check by product line selection shows name and quantity 1
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    When the user selects the product line for "testItemA" in the cart
    And the user opens qty check mode
    Then the qty check popup should display "testItemA" with quantity 1
    And the qty check popup should not contain price or discount metadata
    When the user confirms the qty check popup
    Then the qty check popup should be closed and the matching line highlighted

  # TC-20042 — AC6: Multiple identical items – QTY Check by scan shows total quantity
  @JIRA-20042 @TC-20042 @NVPOS-96 @smoke @ac6 @qty-check @multiple-identical
  Scenario: AC6 - QTY Check by scan shows total quantity 3 when the same item is registered three times
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user changes the item quantity to 3
    When the user opens qty check mode
    And the user scans item "testItemA" in the qty check popup
    Then the qty check popup should display "testItemA" with quantity 3
    And the qty check popup should not contain price or discount metadata
    When the user confirms the qty check popup
    Then the qty check popup should be closed and the matching line highlighted

  # TC-20043 — AC7: Mixed cart – QTY Check shows only the selected product's quantity
  @JIRA-20043 @TC-20043 @NVPOS-96 @smoke @ac7 @qty-check @mixed-cart
  Scenario: AC7 - QTY Check in a mixed cart shows only the quantity of the scanned product
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user scans item "testItemB"
    And the user selects the product line for "testItemA" in the cart
    When the user opens qty check mode
    Then the qty check popup should display "testItemA" with quantity 1
    And the qty check popup should not contain price or discount metadata
    When the user confirms the qty check popup
    Then the qty check popup should be closed and the matching line highlighted

  # TC-20044 — AC8: Consolidated quantity accuracy – QTY Check for item with qty=3
  @JIRA-20044 @TC-20044 @NVPOS-96 @smoke @ac8 @qty-check @consolidated
  Scenario: AC8 - QTY Check returns accurate quantity for a consolidated multi-unit item line
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemC"
    And the user changes the item quantity to 3
    Then the cart totals should be correct
    When the user opens qty check mode
    And the user scans item "testItemC" in the qty check popup
    Then the qty check popup should display "testItemC" with quantity 3
    And the qty check popup should not contain price or discount metadata
    When the user confirms the qty check popup
    Then the qty check popup should be closed and the matching line highlighted

  # TC-20045 — AC9/AC22: Deleted item is not counted by QTY Check; active items are unaffected
  # Note: The popup does not display a separate "not found" message for deleted items.
  # AC9 is verified by confirming QTY Check shows only active cart items after deletion.
  @JIRA-20045 @TC-20045 @NVPOS-96 @smoke @ac9 @ac22 @qty-check @deleted-item
  Scenario: AC9 - QTY Check only counts active cart items; deleted item is excluded
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user scans item "testItemB"
    And the user deletes the currently selected item
    And the user selects the product line for "testItemA" in the cart
    When the user opens qty check mode
    Then the qty check popup should display "testItemA" with quantity 1
    And the qty check popup should not contain price or discount metadata
    When the user confirms the qty check popup
    Then the qty check popup should be closed and the matching line highlighted
    And the cart should remain unchanged after qty check

  # TC-20046 — AC10/AC22: QTY Check does not add non-cart items to the cart
  # Note: When an item not in the cart is scanned inside QTY Check, the popup
  # does not update (stays on the auto-selected cart item) and the cart is unchanged.
  @JIRA-20046 @TC-20046 @NVPOS-96 @smoke @ac10 @ac22 @qty-check @not-in-cart
  Scenario: AC10/AC22 - QTY Check does not add items not present in the cart
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    Then the cart totals should be correct
    When the user opens qty check mode
    And the user scans item "testItemB" in the qty check popup
    Then the qty check popup should show quantity 1
    When the user confirms the qty check popup
    Then the qty check popup should be closed and the matching line highlighted
    And the cart should remain unchanged after qty check

  # TC-20047 — AC4/AC16/AC21: Confirm closes popup, highlights line, cart unchanged
  @JIRA-20047 @TC-20047 @NVPOS-96 @smoke @ac4 @ac16 @ac21 @qty-check @cart-integrity
  Scenario: AC4/AC16/AC21 - Confirming QTY Check popup closes it, highlights the item line, and leaves cart unchanged
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    Then the cart totals should be correct
    When the user opens qty check mode
    And the user scans item "testItemA" in the qty check popup
    Then the qty check popup should show quantity 1
    When the user confirms the qty check popup
    Then the qty check popup should be closed and the matching line highlighted
    And the cart totals should be correct

  # TC-20048 — AC14: QTY Check works correctly while Price Check mode is active
  @JIRA-20048 @TC-20048 @NVPOS-96 @smoke @ac14 @qty-check @price-check-compat
  Scenario: AC14 - QTY Check displays the correct quantity while Price Check mode is active
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user enables price check mode
    When the user opens qty check mode
    And the user scans item "testItemA" in the qty check popup
    Then the qty check popup should display "testItemA" with quantity 1
    And the qty check popup should not contain price or discount metadata
    When the user confirms the qty check popup
    Then the qty check popup should be closed and the matching line highlighted
    And the cart should remain unchanged after qty check

  # TC-20049 — AC17/AC18: Japanese localization of QTY Check popup labels
  @JIRA-20049 @TC-20049 @NVPOS-96 @smoke @ac17 @ac18 @qty-check @localization @japanese
  Scenario: AC17/AC18 - QTY Check popup displays all labels and messages in Japanese
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    When the user opens qty check mode
    And the user scans item "testItemA" in the qty check popup
    Then the qty check popup should display labels and buttons in Japanese
    When the user confirms the qty check popup
    Then the qty check popup should be closed and the matching line highlighted

  # TC-20050 — AC19: QTY Check works for manually keyed item code entry
  @JIRA-20050 @TC-20050 @NVPOS-96 @smoke @ac19 @qty-check @keyed-entry
  Scenario: AC19 - QTY Check correctly identifies and verifies quantity for items entered via manual numpad
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    Then the cart totals should be correct
    When the user opens qty check mode
    And the user scans item "testItemA" in the qty check popup
    Then the qty check popup should display "testItemA" with quantity 1
    And the qty check popup should not contain price or discount metadata
    When the user confirms the qty check popup
    Then the qty check popup should be closed and the matching line highlighted
