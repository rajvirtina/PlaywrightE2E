@nvpos-screen-orientation @nvpos @cashier-preferences
Feature: Voyix POS - Screen Orientation (Left/Right-Hand Mode)

  Background:
    Given the user opens the POS application

  # NVPOS_209_01 + NVPOS_209_08
  @NVPOS-209-01 @NVPOS-209-08 @smoke @screen-orientation @ac1
  Scenario: Preferences panel shows LEFT and RIGHT options; selecting without Apply discards the change
    When the user logs in with default credentials
    And the user navigates to Cashier Preferences
    Then the screen orientation setting should be visible with selectable LEFT and RIGHT options
    When the user selects the LEFT orientation option
    Then the LEFT option should appear selected and RIGHT should appear deselected
    When the user selects the RIGHT orientation option
    Then the RIGHT option should appear selected and LEFT should appear deselected
    When the user selects the LEFT orientation option but does not press Apply
    And the user closes the Cashier Preferences panel
    Then the cart pane orientation should remain unchanged on the Sale screen

  # NVPOS_209_02 + NVPOS_209_03
  @NVPOS-209-02 @NVPOS-209-03 @smoke @screen-orientation @ac2
  Scenario: Default orientation is RIGHT when no preference has been configured
    When the user logs in with default credentials without visiting Cashier Preferences
    Then the POS should navigate to the Sale screen without error
    And the cart itemization pane should be displayed on the RIGHT side of the screen
    When the user clicks the start transaction button
    And the user scans item "testItemA"
    Then the cart totals should be correct
    And the cart pane should still be on the RIGHT side

  # NVPOS_209_05 + NVPOS_209_06
  @NVPOS-209-05 @NVPOS-209-06 @smoke @screen-orientation @ac3
  Scenario: LEFT orientation places cart on left and RIGHT places cart on right
    When the user logs in with default credentials
    And the user navigates to Cashier Preferences
    And the user selects the LEFT orientation option and presses Apply
    Then the cart itemization pane should be displayed on the LEFT side of the screen
    And the item entry area and function buttons should be on the RIGHT side
    And there should be no overlap or clipping between the panes
    When the user navigates to Cashier Preferences
    And the user selects the RIGHT orientation option and presses Apply
    Then the cart itemization pane should be displayed on the RIGHT side of the screen
    And the layout should match the system default with no overlap

  # NVPOS_209_07
  @NVPOS-209-07 @smoke @screen-orientation @ac3 @no-inversion
  Scenario: Orientation mapping is not inverted across multiple switches
    When the user logs in with default credentials
    And the user navigates to Cashier Preferences
    And the user selects the RIGHT orientation option and presses Apply
    Then the cart itemization pane should be displayed on the RIGHT side of the screen
    When the user navigates to Cashier Preferences
    And the user selects the LEFT orientation option and presses Apply
    Then the cart itemization pane should be displayed on the LEFT side of the screen
    When the user navigates to Cashier Preferences
    And the user selects the RIGHT orientation option and presses Apply
    Then the cart itemization pane should be displayed on the RIGHT side of the screen

  # NVPOS_209_04
  @NVPOS-209-04 @smoke @screen-orientation @ac7 @immediate-apply
  Scenario: Applying a preference updates the orientation immediately without a POS restart
    When the user logs in with default credentials
    And the user navigates to Cashier Preferences
    And the user selects the LEFT orientation option and presses Apply
    Then the cart itemization pane should immediately move to the LEFT side without a page reload
    When the user clicks the start transaction button
    And the user scans item "testItemA"
    Then the cart totals should be correct
    And the cart pane should still be on the LEFT side

  # NVPOS_209_09 + NVPOS_209_10
  @NVPOS-209-09 @NVPOS-209-10 @smoke @screen-orientation @ac4 @persistence
  Scenario: Orientation persists across Sale, Tender, and Return screens in one session
    When the user logs in with default credentials
    And the user navigates to Cashier Preferences
    And the user selects the LEFT orientation option and presses Apply
    Then the cart itemization pane should be displayed on the LEFT side of the screen
    When the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user clicks the proceed to payment button
    Then the cart pane should still be on the LEFT side on the Tender screen
    When the user clicks the gift card payment button
    And the user clicks the confirm payment button
    Then the user should be redirected to the home screen
    When the user clicks the start transaction button
    Then the cart pane should still be on the LEFT side on the Sale screen

  # NVPOS_209_11 + NVPOS_209_12
  @NVPOS-209-11 @NVPOS-209-12 @smoke @screen-orientation @ac4 @no-auto-reset
  Scenario: Orientation does not reset when navigating away or during item entry operations
    When the user logs in with default credentials
    And the user navigates to Cashier Preferences
    And the user selects the LEFT orientation option and presses Apply
    Then the cart itemization pane should be displayed on the LEFT side of the screen
    When the user navigates to a non-Preferences screen and returns to the Sale screen
    Then the cart pane should still be on the LEFT side
    When the user clicks the start transaction button
    And the user scans item "testItemA"
    Then the cart pane should still be on the LEFT side
    When the user changes the item quantity to 3
    Then the cart pane should still be on the LEFT side

  # NVPOS_209_13 + NVPOS_209_14 + NVPOS_209_15
  @NVPOS-209-13 @NVPOS-209-14 @NVPOS-209-15 @smoke @screen-orientation @ac5 @no-overlap
  Scenario: No UI overlap or truncation in LEFT orientation and all action buttons are accessible
    When the user logs in with default credentials
    And the user navigates to Cashier Preferences
    And the user selects the LEFT orientation option and presses Apply
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user scans item "testItemB"
    And the user scans item "testItemC"
    Then the cart pane headers, item rows, and footer totals should all be visible with no clipping
    And all item fields including name, quantity, unit price, and line total should be fully readable
    And the item entry area, keypad, and function keys should be fully visible on the RIGHT side
    And the Total, Tender, Cancel, and Void buttons should be visible and not overlapping the cart pane
    When the user clicks the proceed to payment button
    Then the Tender screen should open with all tender options visible and no overflow
    And the cart pane should still be on the LEFT side on the Tender screen

  # NVPOS_209_16
  @NVPOS-209-16 @screen-orientation @ac5 @scroll
  Scenario: Cart scrolls correctly in LEFT orientation with 15 or more items
    When the user logs in with default credentials
    And the user navigates to Cashier Preferences
    And the user selects the LEFT orientation option and presses Apply
    And the user clicks the start transaction button
    And the user scans 15 items into the cart
    Then a scroll indicator should be visible in the cart pane
    When the user scrolls down to the last item in the cart
    Then all items should be accessible and not hidden behind any UI element
    When the user scrolls back to the top of the cart
    Then the footer totals should still be visible and the cart pane should be on the LEFT side

  # NVPOS_209_18
  @NVPOS-209-18 @screen-orientation @ac6 @no-horizontal-scroll
  Scenario Outline: No horizontal scrollbar in either orientation at supported resolutions
    When the user logs in with default credentials
    And the browser viewport is set to <width> by <height>
    And the user navigates to Cashier Preferences
    And the user selects the <orientation> orientation option and presses Apply
    Then there should be no horizontal scrollbar on the Sale screen

    Examples:
      | width | height | orientation |
      | 1280  | 800    | LEFT        |
      | 1280  | 800    | RIGHT       |
      | 1920  | 1080   | LEFT        |
      | 1920  | 1080   | RIGHT       |

  # NVPOS_209_19 + NVPOS_209_20
  @NVPOS-209-19 @NVPOS-209-20 @smoke @screen-orientation @ac8 @catalog-integrity
  Scenario: Item scan, price, tax, and discount are unaffected by LEFT orientation change
    When the user logs in with default credentials
    And the user navigates to Cashier Preferences
    And the user selects the LEFT orientation option and presses Apply
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    Then the cart totals should be correct
    And the cart pane should still be on the LEFT side
    When the user scans item "testItemB"
    And the user applies a custom amount off of 5 percent
    Then the discounted cart totals should be correct
    And the cart pane should still be on the LEFT side

  # NVPOS_209_21 + NVPOS_209_23
  @NVPOS-209-21 @NVPOS-209-23 @smoke @screen-orientation @ac8 @tender-receipt
  Scenario: Full tender flow and receipt content are correct with LEFT orientation active
    When the user logs in with default credentials
    And the user navigates to Cashier Preferences
    And the user selects the LEFT orientation option and presses Apply
    And the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user scans item "testItemB"
    Then the cart totals should be correct
    And the cart pane should still be on the LEFT side
    When the user clicks the proceed to payment button
    And the user clicks the gift card payment button
    And the user clicks the confirm payment button
    Then the user should be redirected to the home screen
    And the receipt should contain correct item names, quantities, prices, and tax amounts

  # NVPOS_209_25
  @NVPOS-209-25 @screen-orientation @session-isolation
  Scenario: Two cashiers on the same terminal independently maintain their own orientation
    When the user logs in as "cashierA"
    And the user navigates to Cashier Preferences
    And the user selects the LEFT orientation option and presses Apply
    Then the cart pane should be on the LEFT side for cashierA
    When cashierA signs off
    And the user logs in as "cashierB"
    Then the cart itemization pane should be displayed on the RIGHT side of the screen
    When the user navigates to Cashier Preferences
    And the user selects the RIGHT orientation option and presses Apply
    Then the cart pane should be on the RIGHT side for cashierB
    And cashierA's LEFT preference should not have carried over to cashierB

  # NVPOS_209_17 + NVPOS_209_29
  @NVPOS-209-17 @NVPOS-209-29 @screen-orientation @ac5 @rapid-switching @stability
  Scenario: Rapid orientation toggling leaves no ghost panes and POS remains stable
    When the user logs in with default credentials
    And the user navigates to Cashier Preferences and selects LEFT and presses Apply
    And the user navigates to Cashier Preferences and selects RIGHT and presses Apply
    And the user navigates to Cashier Preferences and selects LEFT and presses Apply
    And the user navigates to Cashier Preferences and selects RIGHT and presses Apply
    And the user navigates to Cashier Preferences and selects LEFT and presses Apply
    Then the POS should be responsive with no crash, freeze, or blank screen
    And there should be no ghost or residual panel on either side of the screen
    And the cart pane should be on the LEFT side matching the last selected orientation
    When the user clicks the start transaction button
    And the user scans item "testItemA"
    And the user clicks the proceed to payment button
    And the user clicks the gift card payment button
    And the user clicks the confirm payment button
    Then the user should be redirected to the home screen

  # NVPOS_209_26 + NVPOS_209_27 + NVPOS_209_28 + NVPOS_209_30
  @NVPOS-209-26 @NVPOS-209-27 @NVPOS-209-28 @NVPOS-209-30 @screen-orientation @edge-cases
  Scenario: Edge cases — switch during tender, large cart, idempotent re-apply, and idle cart
    # 30: idle cart switch
    When the user logs in with default credentials
    And the user navigates to Cashier Preferences
    And the user selects the LEFT orientation option and presses Apply
    Then the empty cart pane should render on the LEFT side with no errors
    When the user navigates to Cashier Preferences
    And the user selects the RIGHT orientation option and presses Apply
    Then the empty cart pane should render on the RIGHT side with no errors
    # 28: idempotent re-apply
    When the user navigates to Cashier Preferences
    And the user selects the RIGHT orientation option and presses Apply
    Then the layout should remain on the RIGHT with no flicker, blank pane, or error
    # 27: large cart switch
    When the user clicks the start transaction button
    And the user scans 20 items into the cart
    And the user navigates to Cashier Preferences
    And the user selects the LEFT orientation option and presses Apply
    Then the layout should refresh within 2 seconds with no timeout or freeze
    And all 20 items should be accessible in the cart pane and totals should be unchanged
    # 26: switch during tender
    When the user clicks the proceed to payment button
    And the user selects a payment method on the Tender screen
    And the user navigates to Cashier Preferences and attempts to switch orientation during tender
    Then either the orientation switch completes with tender total unchanged or a restriction message is shown
    And the tender flow should complete successfully without disruption
