@nvpos-perf @nvpos @performance
Feature: Voyix POS - High-Volume Transaction Performance

  Background:
    Given the user opens the POS application

  @JIRA-30001 @TC-30001 @perf-bulk @perf-discount @perf-combined-discount @perf-delete
  Scenario: High-volume 24-item transaction covering delete, amount off, percent off, both discounts on same item, quantity change, and payment
    When the user logs in with default credentials
    And the user clicks the start transaction button
    And the performance timer starts
    # ── Phase 1: Bulk scan 20 items cycling A/B/C/D × 5 ──────────────────
    And the user scans 20 items cycling through the catalog
    Then the scan throughput should be recorded
    And the average item scan time should be within SLO
    And the cart totals should be correct
    # ── Delete: testItemD is the last item selected after 20 cycling scans ─
    When the user deletes the currently selected item
    Then the cart totals should reflect the remaining items
    # ── Item 21: scan testItemA → apply amount off (額値引 in center panel) ─
    When the user scans item "testItemA"
    And the user applies a custom amount off of 5 percent
    # Total check omitted here: app has a known bug where discount auto-applies to ALL
    # occurrences of the same item in the cart (not just the selected one).
    # TC-20004 covers single-item amount-off correctness. This scenario tests throughput.
    Then the item detail panel should show the amount off discount
    And the discount dialog response time should be within SLO
    # ── Same testItemA → % off: center panel must show 額値引 + %割引 together
    When the user applies a custom percent off of 5 percent
    # Total check omitted: same known app bug — % off also auto-applies to all same items.
    Then the item detail panel should show both amount off and percent off discounts
    And the discount dialog response time should be within SLO
    # ── Item 22: scan testItemB → % off on a different item ───────────────
    When the user scans item "testItemB"
    And the user applies a custom percent off of 5 percent
    # Total check omitted: known app bug. TC-20005 covers single-item % off correctness.
    Then the item detail panel should show the percent off discount
    And the discount dialog response time should be within SLO
    # ── Item 23 → qty 3: scan testItemD fresh (deleted earlier) ───────────
    When the user scans item "testItemD"
    And the user changes the item quantity to 3
    # No total check here — discounts from earlier steps affect the UI total (known app bug).
    # Correctness is covered by the e2e discount scenarios (TC-20004/TC-20005).
    When the user clicks the proceed to payment button
    And the user clicks the gift card payment button
    And the user clicks the confirm payment button
    Then the user should be redirected to the home screen
    And the total transaction time should be within SLO

    



