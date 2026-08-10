@nvpos-price-check @nvpos @nvpos-95 @transaction-workflow
Feature: Voyix POS - Price Check Feature Integration with Each Item Entry (NVPOS-95)

  # Story: [NVPOS UI] Develop and Integrate the Support of Price Check Feature Integration
  # JIRA: NVPOS-95
  # Cashier initiates Price Check mode, scans barcodes for price lookup without adding items
  # to the cart. Normal item entry resumes when Price Check mode is disabled.
  # In scope: AC1–AC13

  Background:
    Given the user opens the POS application

  # TC-20025 — AC1/AC2: Price Check button available and triggers confirmation popup
  @JIRA-20025 @TC-20025 @NVPOS-95 @smoke @ac1 @ac2 @price-check
  Scenario: AC1/AC2 - Price Check button is visible and clicking it shows confirmation popup
    When the user logs in with default credentials
    And the user clicks the start transaction button
    Then the price check button should be visible on the toolbar
    When the user clicks the price check button
    Then the price check confirmation popup should be displayed

  # TC-20026 — AC3/AC4/AC8/AC13: Enable Price Check, scan valid item, details displayed via workflow
  @JIRA-20026 @TC-20026 @NVPOS-95 @smoke @ac3 @ac4 @ac8 @ac13 @price-check
  Scenario: AC3/AC4/AC8 - Enable Price Check mode and scan a valid item to view details
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user enables price check mode
    And the user scans item "testItemA" in price check mode
    Then the price check panel should display item details for "testItemA"

  # TC-20027 — AC5/AC12: Item not added to cart and totals unchanged during Price Check
  @JIRA-20027 @TC-20027 @NVPOS-95 @smoke @ac5 @ac12 @price-check @cart-integrity
  Scenario: AC5/AC12 - Cart remains unchanged when scanning an item in Price Check mode
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user enables price check mode
    And the user scans item "testItemA" in price check mode
    Then the price check panel should display item details for "testItemA"
    And the cart should remain unchanged after price check

  # TC-20028 — AC5/AC12: Cart with existing items stays intact during Price Check
  @JIRA-20028 @TC-20028 @NVPOS-95 @smoke @ac5 @ac12 @price-check @cart-integrity
  Scenario: AC5/AC12 - Existing cart items and totals are preserved when Price Check is used
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    Then the cart totals should be correct
    When the user enables price check mode
    And the user scans item "testItemB" in price check mode
    Then the price check panel should display item details for "testItemB"
    And the cart should remain unchanged after price check

  # TC-20029 — AC9: Invalid barcode in Price Check mode shows error and cart unchanged
  @JIRA-20029 @TC-20029 @NVPOS-95 @smoke @ac9 @price-check @negative
  Scenario: AC9 - Scanning an unknown barcode in Price Check mode shows error without cart update
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user enables price check mode
    When the user scans an unknown item code in price check mode
    Then the price check should show an item not found error
    And the cart should remain unchanged after price check

  # TC-20030 — AC11/AC7: Toggle Price Check OFF returns to normal item entry
  @JIRA-20030 @TC-20030 @NVPOS-95 @smoke @ac7 @ac11 @price-check
  Scenario: AC11/AC7 - Disabling Price Check mode restores normal scan behavior
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user enables price check mode
    And the user disables price check mode
    And the user scans item "testItemA"
    Then the cart totals should be correct

  # TC-20031 — AC10: Scans while Price Check confirmation popup is open do not update the cart
  @JIRA-20031 @TC-20031 @NVPOS-95 @smoke @ac10 @price-check @popup-control
  Scenario: AC10 - Cart is not updated while the Price Check confirmation popup is displayed
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    Then the cart totals should be correct
    When the user clicks the price check button
    Then the price check confirmation popup should be displayed
    And the cart should remain unchanged after price check

  # TC-20032 — AC13: Price Check workflow integration — different item lookup works end-to-end
  # Verifies that Price Check mode routes through the correct workflows for mode detection,
  # toggle, dialog, and item input routing (catalog / NGL / NVL integration).
  @JIRA-20032 @TC-20032 @NVPOS-95 @smoke @ac13 @price-check @workflow
  Scenario: AC13 - Price Check correctly routes through price-check workflow for each item scanned
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    Then the cart totals should be correct
    When the user enables price check mode
    And the user scans item "testItemB" in price check mode
    Then the price check panel should display item details for "testItemB"
    And the cart should remain unchanged after price check

  # TC-20033 — AC6/AC11: Add to Cart from Price Check panel (empty cart); Price Check exits; transaction completes
  @JIRA-20033 @TC-20033 @NVPOS-95 @smoke @ac6 @ac11 @price-check @add-to-cart
  Scenario: AC6/AC11 - Item added from Price Check panel is the only cart item; Price Check mode exits; transaction completes successfully
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user enables price check mode
    And the user scans item "testItemA" in price check mode
    Then the price check panel should display item details for "testItemA"
    When the user adds the price check item to the cart
    Then price check mode should be disabled
    And the cart totals should be correct
    When the user clicks the proceed to payment button
    And the user pays with cash entering the exact amount manually
    Then the user should be redirected to the home screen

  # TC-20034 — AC6/AC11: Add to Cart from Price Check panel (with existing items); Price Check exits; transaction completes
  @JIRA-20034 @TC-20034 @NVPOS-95 @smoke @ac6 @ac11 @price-check @add-to-cart @cart-integrity
  Scenario: AC6/AC11 - Item added from Price Check panel is appended to existing cart items; Price Check mode exits; transaction completes successfully
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemB"
    Then the cart totals should be correct
    When the user enables price check mode
    And the user scans item "testItemA" in price check mode
    Then the price check panel should display item details for "testItemA"
    When the user adds the price check item to the cart
    Then price check mode should be disabled
    And the cart totals should be correct
    When the user clicks the proceed to payment button
    And the user pays with cash entering the exact amount manually
    Then the user should be redirected to the home screen
