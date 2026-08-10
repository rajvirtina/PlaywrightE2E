# nvpos-qty-check Specification

## Purpose
Automated tests for the NVPOS-96 Quantity Confirmation (QTY Check) feature.
Covers toolbar button state management, scan-based and line-selection-based
quantity verification, cart integrity during check, all edge cases (deleted items,
items not in cart, mixed carts, identical items, consolidated quantities), Price Check
mode compatibility, and Japanese localization.

Out of scope: AC12 (audible beep second scan), AC15 (PickList), AC20 (core services).

## ADDED Requirements

### Requirement: QTY Check Button State Management
The test suite SHALL verify that the QTY Check toolbar button is disabled when the
cart is empty and enabled when the cart contains at least one active item.

#### Scenario: QTY Check button is disabled when the cart is empty
- GIVEN the user is on the transaction screen with no items in the cart
- THEN the QTY Check button in the bottom toolbar SHALL be disabled or non-interactive

#### Scenario: QTY Check button becomes enabled after an item is added
- GIVEN the user has scanned at least one item
- THEN the QTY Check button SHALL be enabled and interactive

---

### Requirement: QTY Check by Product Scan – Single Item
The test suite SHALL verify that scanning a product barcode inside the QTY Check popup
displays the correct product name and quantity (1) for a single-item cart, with no
price, discount, tax, or promotion metadata shown in the popup.

#### Scenario: Single item – QTY Check by scan shows name and quantity 1
- GIVEN one item is registered in the cart
- WHEN the user opens QTY Check and scans the same item barcode
- THEN the popup SHALL display the product name and quantity 1
- AND the popup SHALL NOT display price, discount, tax, or promotion data

---

### Requirement: QTY Check by Product Line Selection – Single Item
The test suite SHALL verify that selecting a cart line and pressing QTY Check
displays the correct product name and quantity for that line only.

#### Scenario: Single item – QTY Check by line selection shows name and quantity 1
- GIVEN one item is registered in the cart
- WHEN the user selects the product line and presses QTY Check
- THEN the popup SHALL display the selected product name and quantity 1

---

### Requirement: QTY Check – Multiple Identical Items
The test suite SHALL verify that QTY Check correctly aggregates the quantity when
the same product is registered more than once or has a quantity greater than 1.

#### Scenario: Multiple identical items – total quantity shown by QTY Check
- GIVEN the same product is registered 3 times (or quantity set to 3)
- WHEN the user performs QTY Check for that product
- THEN the popup SHALL display the total registered quantity as 3

---

### Requirement: QTY Check – Mixed Product Cart
The test suite SHALL verify that QTY Check for a specific product shows only that
product's quantity and not the overall cart item count.

#### Scenario: Mixed cart – QTY Check shows only the selected product's quantity
- GIVEN the cart contains two different products (A and B)
- WHEN the user performs QTY Check for product A
- THEN the popup SHALL display only the quantity of product A
- AND SHALL NOT display the total cart count unless product A has that quantity

---

### Requirement: QTY Check – Consolidated Quantity Accuracy
The test suite SHALL verify that QTY Check returns the correct total quantity
regardless of whether identical items are consolidated into one line or split
across multiple cart lines.

#### Scenario: Consolidated quantity – QTY Check returns accurate count
- GIVEN the same product appears with quantity 3 on one consolidated line
- WHEN the user performs QTY Check for that product
- THEN the popup SHALL display quantity 3

---

### Requirement: QTY Check – Deleted Item Handling
The test suite SHALL verify that a previously deleted item is not counted in
QTY Check and shows an appropriate "item not found" message when checked.

#### Scenario: Deleted item is not found in QTY Check
- GIVEN an item was registered and then deleted from the cart
- WHEN the user performs QTY Check for the deleted item
- THEN the system SHALL display an item-not-found message
- AND the cart SHALL remain unchanged

---

### Requirement: QTY Check – Item Not in Cart
The test suite SHALL verify that scanning a product not present in the current
cart during QTY Check shows a clear not-found message with no cart changes.

#### Scenario: Item not in cart shows not-found message
- GIVEN the cart contains item A only
- WHEN the user performs QTY Check and scans item B (not in cart)
- THEN the system SHALL display an item-not-found message
- AND no item SHALL be added, removed, or modified

---

### Requirement: Confirm Button Closes Popup and Highlights Cart Line
The test suite SHALL verify that pressing Confirm in the QTY Check popup
closes the popup, optionally highlights the matching cart line, and leaves
all cart data unchanged.

#### Scenario: Confirm closes popup, highlights line, and cart remains unchanged
- GIVEN QTY Check popup is displayed for a valid item
- WHEN the user presses the Confirm button
- THEN the popup SHALL close
- AND the matching cart line SHALL be focused or highlighted where applicable
- AND all cart totals SHALL remain unchanged

---

### Requirement: QTY Check Compatibility with Price Check Mode
The test suite SHALL verify that QTY Check returns the correct quantity when
Price Check mode is active, not 0 and not the total cart count.

#### Scenario: QTY Check works correctly while Price Check mode is active
- GIVEN Price Check mode is enabled and an item is in the cart
- WHEN the user performs QTY Check for that item
- THEN the correct quantity SHALL be displayed
- AND the cart SHALL remain unchanged

---

### Requirement: Japanese Localization of QTY Check UI
The test suite SHALL verify that all QTY Check popup labels, messages, and
confirmation buttons are displayed in Japanese when the POS is configured
for the Japanese locale.

#### Scenario: QTY Check popup displays all labels in Japanese
- GIVEN the POS is running in Japanese locale
- WHEN the QTY Check popup is displayed
- THEN all labels and messages SHALL contain Japanese characters
- AND the Confirm button text SHALL be in Japanese

---

### Requirement: QTY Check for Keyed Item Entry
The test suite SHALL verify that QTY Check works correctly for items entered
via manual numpad item code entry (keyed entry), not only barcode scan.

#### Scenario: QTY Check works for manually keyed item entry
- GIVEN an item was added to the cart via manual numpad code entry
- WHEN the user performs QTY Check for that item
- THEN the correct quantity SHALL be displayed in the popup
