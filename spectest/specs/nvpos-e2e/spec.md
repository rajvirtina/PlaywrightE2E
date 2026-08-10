# nvpos-e2e Specification

## Purpose
Automated end-to-end transaction flow tests for the NvPOS (Voyix POS Japan) application.
Covers the complete staff journey: login → item scan → cart validation → payment → home screen.
## Requirements
### Requirement: Step2 End to End POS Transaction Flow
The test suite SHALL automate the complete end-to-end transaction journey on the
Voyix POS Japan (nvPOS) application without any manual intervention.

---

#### Scenario: Login screen is displayed on app launch
- GIVEN the user navigates to `http://127.0.0.1:5173/`
- THEN the Sign In screen SHALL be visible with Username and Password fields

#### Scenario: User can log in with valid credentials
- GIVEN the login screen is visible
- WHEN the user enters username `0000` and password `0000`
- AND the user clicks the Login button
- THEN the POS home dashboard SHALL be displayed
- AND the Start Transaction button (PlayCircleFilledIcon) SHALL be visible

#### Scenario: User can start a transaction
- GIVEN the user is on the POS home dashboard
- WHEN the user clicks the Start Transaction button
- THEN the transaction screen SHALL open with the on-screen numpad visible

#### Scenario: User can add an item by barcode
- GIVEN the transaction screen is open
- WHEN the user enters item code `4901234000002` digit by digit on the numpad
- THEN the item SHALL be automatically added to the cart (no confirm button needed)
- AND the cart total SHALL reflect the item price

#### Scenario: User can proceed to payment
- GIVEN at least one item is in the cart
- WHEN the user clicks the お支払いへ (Proceed to Payment) button
- THEN the payment/tender method screen SHALL be displayed
- AND all tender buttons (現金, クレジットカード, 電子マネー, QRコード, ギフトカード, その他支払) SHALL be visible

#### Scenario: User can pay by Gift Card
- GIVEN the payment screen is displayed
- WHEN the user clicks the ギフトカード (Gift Card) tender button
- THEN the Gift Card payment SHALL be selected

#### Scenario: Payment is confirmed and user returns to home screen
- GIVEN a tender method has been selected
- WHEN the user clicks the 支払確定 (Confirm Payment) button
- THEN the transaction SHALL be completed
- AND the application SHALL navigate back to the POS home dashboard
- AND the Start Transaction button (PlayCircleFilledIcon) SHALL be visible
- AND a full-page screenshot SHALL be attached to the test report as evidence

