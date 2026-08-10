/**
 * Step definitions: QTY Check (NVPOS-96)
 *
 * Covers Check Item Quantity in Cart Itemization:
 * - QTY Check button state (disabled/enabled)
 * - QTY Check by product scan
 * - QTY Check by product line selection
 * - Multiple identical items / mixed cart / consolidated quantity
 * - Deleted item and item-not-in-cart handling
 * - Confirm popup behavior and cart integrity
 * - Price Check mode compatibility
 * - Japanese localization
 * - Keyed item entry
 *
 * TC-20039 – TC-20050  |  ACs: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 16, 17, 18, 19, 21, 22
 */

import { When, Then } from '@cucumber/cucumber';
import { createRequire } from 'module';
import { AppWorld } from '../support/world.js';

const require = createRequire(import.meta.url);
const transactionData = require('../data/transaction.json');

// ── Button state ──────────────────────────────────────────────────────────────

Then('the qty check button should be disabled on the toolbar', async function (this: AppWorld) {
  const summary = await this.sale.verifyQtyCheckButtonDisabled();
  await this.attach(summary, 'text/plain');
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
});

Then('the qty check button should be enabled on the toolbar', async function (this: AppWorld) {
  const summary = await this.sale.verifyQtyCheckButtonEnabled();
  await this.attach(summary, 'text/plain');
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
});

// ── Open QTY Check mode ───────────────────────────────────────────────────────

When('the user opens qty check mode', async function (this: AppWorld) {
  await this.sale.openQtyCheck();
  await this.attach('Clicked QTY Check toolbar button — scan popup should be active', 'text/plain');
});

// ── Scan inside QTY Check popup ───────────────────────────────────────────────

When(
  'the user scans item {string} in the qty check popup',
  async function (this: AppWorld, itemKey: string) {
    const item = transactionData.items[itemKey];
    if (!item) {
      throw new Error(
        `Unknown item key: "${itemKey}". Valid keys: ${Object.keys(transactionData.items).join(', ')}`
      );
    }
    await this.sale.scanItemInQtyCheckPopup(item.itemCode);
    await this.attach(
      `Scanned ${item.itemCode} (${item.itemName}) inside QTY Check popup`,
      'text/plain'
    );
  }
);

// ── Product line selection ────────────────────────────────────────────────────

When(
  'the user selects the product line for {string} in the cart',
  async function (this: AppWorld, itemKey: string) {
    const item = transactionData.items[itemKey];
    if (!item) {
      throw new Error(
        `Unknown item key: "${itemKey}". Valid keys: ${Object.keys(transactionData.items).join(', ')}`
      );
    }
    await this.sale.selectCartLineForItem(item.itemName);
    await this.attach(`Selected cart line for: ${item.itemName}`, 'text/plain');
  }
);

// ── Popup content assertions ──────────────────────────────────────────────────

Then(
  'the qty check popup should display {string} with quantity {int}',
  async function (this: AppWorld, itemKey: string, expectedQty: number) {
    const item = transactionData.items[itemKey];
    if (!item) {
      throw new Error(
        `Unknown item key: "${itemKey}". Valid keys: ${Object.keys(transactionData.items).join(', ')}`
      );
    }
    const summary = await this.sale.verifyQtyCheckPopupContent(item.itemName, expectedQty);
    await this.attach(summary, 'text/plain');
    await this.attach(await this.sale.screenshot(), 'image/jpeg');
  }
);

Then(
  'the qty check popup should show quantity {int}',
  async function (this: AppWorld, expectedQty: number) {
    const summary = await this.sale.verifyQtyCheckPopupQuantity(expectedQty);
    await this.attach(summary, 'text/plain');
    await this.attach(await this.sale.screenshot(), 'image/jpeg');
  }
);

Then(
  'the qty check popup should not contain price or discount metadata',
  async function (this: AppWorld) {
    const summary = await this.sale.verifyQtyCheckPopupNoMetadata();
    await this.attach(summary, 'text/plain');
  }
);

// ── Confirm / dismiss popup ───────────────────────────────────────────────────

When('the user confirms the qty check popup', async function (this: AppWorld) {
  await this.sale.confirmQtyCheckPopup();
  await this.attach('Clicked Confirm in QTY Check popup', 'text/plain');
});

Then(
  'the qty check popup should be closed and the matching line highlighted',
  async function (this: AppWorld) {
    const summary = await this.sale.verifyQtyCheckPopupClosedAndLineHighlighted();
    await this.attach(summary, 'text/plain');
    await this.attach(await this.sale.screenshot(), 'image/jpeg');
  }
);

// ── Not-found assertions ──────────────────────────────────────────────────────

Then('the qty check should show item not found in cart', async function (this: AppWorld) {
  const summary = await this.sale.verifyQtyCheckItemNotFound();
  await this.attach(summary, 'text/plain');
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
});

// ── Cart integrity after QTY Check ───────────────────────────────────────────

Then('the cart should remain unchanged after qty check', async function (this: AppWorld) {
  const summary = await this.sale.verifyCartUnchangedAfterQtyCheck(this.cartItems);
  await this.attach(summary, 'text/plain');
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
});

// ── Localization ──────────────────────────────────────────────────────────────

Then(
  'the qty check popup should display labels and buttons in Japanese',
  async function (this: AppWorld) {
    const summary = await this.sale.verifyQtyCheckLocalizationJapanese();
    await this.attach(summary, 'text/plain');
    await this.attach(await this.sale.screenshot(), 'image/jpeg');
  }
);
