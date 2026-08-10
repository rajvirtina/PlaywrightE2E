@nvpos-discount @nvpos @transaction-workflow
Feature: Voyix POS - Discount Scenarios

  Background:
    Given the user opens the POS application

  # TC-20004
  @JIRA-20004 @TC-20004 @smoke @amount-discount
  Scenario: Apply custom amount off discount and verify discounted totals
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user applies a custom amount off of 5 percent
    Then the discounted cart totals should be correct
    When the user clicks the proceed to payment button
    And the user clicks the gift card payment button
    And the user clicks the confirm payment button
    Then the user should be redirected to the home screen

  # TC-20005
  @JIRA-20005 @TC-20005 @smoke @percent-discount
  Scenario: Apply custom percentage off discount and verify discounted totals
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user applies a custom percent off of 5 percent
    Then the percent discounted cart totals should be correct
    When the user clicks the proceed to payment button
    And the user clicks the gift card payment button
    And the user clicks the confirm payment button
    Then the user should be redirected to the home screen

  # TC-20009
  @JIRA-20009 @TC-20009 @smoke @percent-discount @duplicate-item-discount
  Scenario: Apply 7 percent discount to one item then add the same item twice and verify behavior
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user applies a custom percent off of 7 percent
    Then the percent discounted cart totals should be correct
    When the user scans item "testItemA"
    And the user scans item "testItemA"
    Then the discounted cart totals should be correct
    When the user clicks the proceed to payment button
    And the user clicks the gift card payment button
    And the user clicks the confirm payment button
    Then the user should be redirected to the home screen

  # TC-20010
  @JIRA-20010 @TC-20010 @smoke @ac12 @transaction-display
  Scenario: AC12 - Transaction panel displays all required fields after scan with amount off and percent off discounts
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user applies a custom amount off of 9 percent
    And the user applies a custom percent off of 3 percent
    Then the transaction panel should display all required item fields
    When the user clicks the proceed to payment button
    And the user clicks the gift card payment button
    And the user clicks the confirm payment button
    Then the user should be redirected to the home screen

  # TC-20016 — AC5: Invalid discount values are rejected
  @JIRA-20016 @TC-20016 @smoke @ac5 @discount-validation
  Scenario: AC5 - System blocks applying a zero-value percent off discount
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    When the user attempts to apply an invalid percent off of 0

  # TC-20017 — AC7: Discount on one item does not affect other items
  @JIRA-20017 @TC-20017 @smoke @ac7 @discount-isolation
  Scenario: AC7 - Manual discount on one item does not affect other items in the cart
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user applies a custom amount off of 5 percent
    And the user scans item "testItemB"
    Then the discounted cart totals should be correct
    When the user clicks the proceed to payment button
    And the user clicks the gift card payment button
    And the user clicks the confirm payment button
    Then the user should be redirected to the home screen

      # TC-20018 — AC8a: Edit an existing item-level manual discount
  @JIRA-20018 @TC-20018 @smoke @ac8 @edit-discount
  Scenario: AC8a - Edit an applied amount off discount and verify recalculated totals
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user applies a custom amount off of 5 percent
    Then the discounted cart totals should be correct
    When the user edits the amount off discount to 10 percent
    Then the discounted cart totals should be correct
    When the user clicks the proceed to payment button
    And the user clicks the gift card payment button
    And the user clicks the confirm payment button
    Then the user should be redirected to the home screen

  # TC-20019 — AC8b: Remove an existing item-level manual discount
  @JIRA-20019 @TC-20019 @smoke @ac8 @remove-discount
  Scenario: AC8b - Remove an applied amount off discount and verify totals return to original
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user applies a custom amount off of 5 percent
    Then the discounted cart totals should be correct
    When the user removes the existing amount off discount
    Then the cart totals should be correct
    When the user clicks the proceed to payment button
    And the user clicks the gift card payment button
    And the user clicks the confirm payment button
    Then the user should be redirected to the home screen

  # TC-20020 — AC8c: Edit an existing % off discount
  @JIRA-20020 @TC-20020 @smoke @ac8 @edit-discount @percent-discount
  Scenario: AC8c - Edit an applied percent off discount and verify recalculated totals
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user applies a custom percent off of 19 percent
    Then the percent discounted cart totals should be correct
    When the user edits the percent off discount to 12 percent
    Then the percent discounted cart totals should be correct
    When the user clicks the proceed to payment button
    And the user clicks the gift card payment button
    And the user clicks the confirm payment button
    Then the user should be redirected to the home screen

  # TC-20021 — AC8d: Remove an existing % off discount
  @JIRA-20021 @TC-20021 @smoke @ac8 @remove-discount @percent-discount
  Scenario: AC8d - Remove an applied percent off discount and verify totals return to original
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user applies a custom percent off of 11 percent
    Then the percent discounted cart totals should be correct
    When the user removes the existing percent off discount
    Then the cart totals should be correct
    When the user clicks the proceed to payment button
    And the user clicks the gift card payment button
    And the user clicks the confirm payment button
    Then the user should be redirected to the home screen
