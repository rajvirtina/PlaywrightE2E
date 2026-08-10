@nvpos-cancel @nvpos @ac16 @nvpos-104
Feature: Voyix POS - Cancel Transaction

  Background:
    Given the user opens the POS application

  # TC-20011
  @JIRA-20011 @TC-20011 @smoke @cancel-transaction
  Scenario: AC16 - Cancel transaction from both sale screen and tender screen clears all items from the cart
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user scans item "testItemB"
    Then the cart totals should be correct
    # Cancel from sale screen (取消 in the bottom action bar)
    When the user cancels the transaction
    Then the cart should be empty after cancellation
    # Start a fresh transaction and cancel from the tender screen
    When the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user scans item "testItemB"
    Then the cart totals should be correct
    When the user clicks the proceed to payment button
    And the user cancels the transaction
    Then the cart should be empty after cancellation

  # TC-20012
  @JIRA-20012 @TC-20012 @smoke @no-preset-tender
  Scenario: AC16 - Cash payment with no preset tender by manually entering exact amount
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user scans item "testItemB"
    Then the cart totals should be correct
    When the user clicks the proceed to payment button
    And the user pays with cash entering the exact amount manually
    Then the user should be redirected to the home screen

  # ─── NVPOS-104 scenarios ────────────────────────────────────────────────────

  # TC-20031 — AC1: Cancel action is available during an active in-progress transaction
  @JIRA-20031 @TC-20031 @smoke @ac1 @nvpos-104
  Scenario: AC1 - Cancel button is visible and enabled once a transaction is in progress
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    Then the cancel transaction button should be visible and enabled

  # TC-20032 — AC5/AC8/AC9: Cancel clears all data and UI returns to initial ready state
  @JIRA-20032 @TC-20032 @smoke @ac5 @ac8 @ac9 @nvpos-104
  Scenario: AC5/AC8/AC9 - Cancelling a transaction clears all items and restores the initial UI state
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user scans item "testItemB"
    Then the cart totals should be correct
    When the user cancels the transaction
    Then the cart should be empty after cancellation
    And the sale UI should be in the initial ready state

  # TC-20033 — AC7/AC15: After cancel, next transaction starts clean with no residual data
  @JIRA-20033 @TC-20033 @smoke @ac7 @ac15 @nvpos-104
  Scenario: AC7/AC15 - After cancel, the next transaction starts clean and completes successfully
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user scans item "testItemB"
    When the user cancels the transaction
    Then the cart should be empty after cancellation
    # Start fresh transaction — only testItemC should appear (no residual from prior transaction)
    When the user clicks the start transaction button
    And the user scans item "testItemC"
    Then the cart totals should be correct
    And the canceled item "testItemA" should not appear in the new transaction

  # TC-20034 — AC10: No receipt is shown after cancellation (UI stays on sale/initial screen)
  @JIRA-20034 @TC-20034 @smoke @ac10 @nvpos-104
  Scenario: AC10 - No receipt screen is presented after a transaction is cancelled
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    When the user cancels the transaction
    Then no receipt screen should be displayed after cancellation
    And the sale UI should be in the initial ready state
