@nvpos-negative @nvpos
Feature: Voyix POS - Negative Path Scenarios

  Background:
    Given the user opens the POS application

  # TC-20007
  @JIRA-20007 @TC-20007 @negative @unknown-barcode
  Scenario: Scanning an unknown barcode shows an item not found error
    When the user logs in with default credentials
    And the user clicks the start transaction button
    When the user scans an unknown item code
    Then the POS should show an item not found error

  # TC-20022 — AC17 (NVPOS-59): Empty item code entry is blocked
  @JIRA-20022 @TC-20022 @negative @ac17 @empty-item-code
  Scenario: AC17 - Confirm button is disabled when no item code is entered
    When the user logs in with default credentials
    And the user clicks the start transaction button
    Then the item code confirm button should be disabled with no input

  # TC-20023 — AC5 (NVPOS-88): Zero amount off is blocked
  @JIRA-20023 @TC-20023 @negative @ac5 @discount-validation
  Scenario: AC5 - System blocks applying a zero-value amount off discount
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    When the user attempts to apply an invalid amount off of 0

  # TC-20024 — AC5 (NVPOS-88): Amount off exceeding item price is blocked
  @JIRA-20024 @TC-20024 @negative @ac5 @discount-validation
  Scenario: AC5 - System blocks applying an amount off discount that exceeds the item price
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    When the user attempts to apply an invalid amount off of 300
