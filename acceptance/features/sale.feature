@nvpos-sale @nvpos @transaction-workflow
Feature: Voyix POS - Sale / Transaction Workflows

  Background:
    Given the user opens the POS application

  # TC-20001
  @JIRA-20001 @TC-20001 @smoke @full-transaction-flow
  Scenario: Complete a full transaction from login to payment confirmation
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user changes the item quantity to 4
    Then the cart totals should be correct
    When the user clicks the proceed to payment button
    And the user clicks the gift card payment button
    And the user clicks the confirm payment button
    Then the user should be redirected to the home screen

  # TC-20002
  @JIRA-20002 @TC-20002 @smoke @multi-item-cart
  Scenario: Add multiple items and validate cart totals
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans the following items:
      | testItemA |
      | testItemC |
    Then the cart totals should be correct
    When the user clicks the proceed to payment button
    And the user clicks the gift card payment button
    And the user clicks the confirm payment button
    Then the user should be redirected to the home screen

  # TC-20003
  @JIRA-20003 @TC-20003 @smoke @cart-item-removal
  Scenario: Add items to cart, delete the selected item, and verify the remaining cart
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user scans item "testItemB"
    And the user deletes the currently selected item
    Then the cart totals should reflect the remaining items

  # TC-20008
  @JIRA-20008 @TC-20008 @smoke @cash-payment
  Scenario: Complete a full transaction using cash payment
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    Then the cart totals should be correct
    When the user clicks the proceed to payment button
    And the user pays with "cash"
    And the user clicks the confirm payment button
    Then the user should be redirected to the home screen

  # TC-20015 — AC22: Display reflects configured price and tax (no discount)
  @JIRA-20015 @TC-20015 @smoke @ac22 @price-display
  Scenario: AC22 - Transaction panel displays configured price and tax with no discounts applied
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    Then the transaction panel should display price and tax correctly with no discounts
