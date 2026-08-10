@nvpos-payment @nvpos @combined-flow
Feature: Voyix POS - Payment / Tender Screen Flows

  Background:
    Given the user opens the POS application

  # TC-20013
  @JIRA-20013 @TC-20013 @smoke @tender-navigation
  Scenario: Scan 3 items, apply combined discounts, validate tender screen, navigate back, add item, verify total and pay with cash
    When the user logs in with default credentials
    And the user clicks the start transaction button
    # Step 1: Add 3 items
    And the user scans the following items:
      | testItemA |
      | testItemB |
      | testItemC |
    # Step 2: Apply amount off (額値引) then % off (%割引) on last item
    And the user applies a custom amount off of 5 percent
    And the user applies a custom percent off of 3 percent
    # Step 3: Verify all AC12 transaction panel fields + discounted totals
    Then the transaction panel should display all required item fields
    And the combined discounted cart totals should be correct
    # Step 4: Go to tender screen — validate total and tax
    When the user clicks the proceed to payment button
    Then the tender screen should show the correct total and tax
    # Step 5: Navigate back to sale screen and add a 4th item
    When the user navigates back to the sale screen
    And the user scans item "testItemD"
    Then the combined discounted cart totals should be correct
