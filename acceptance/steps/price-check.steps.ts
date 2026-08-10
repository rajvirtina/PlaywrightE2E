/**
 * Step definitions: Price Check scenarios (NVPOS-95)
 *
 * Covers Price Check mode — button visibility, enable/disable, valid scan lookup,
 * cart integrity, invalid barcode handling, popup input control, workflow integration.
 * (TC-20025 through TC-20033, NVPOS-95 ACs 1–13)
 */

import { When, Then } from '@cucumber/cucumber';
import { createRequire } from 'module';
import { AppWorld } from '../support/world.js';

const require = createRequire(import.meta.url);
const transactionData = require('../data/transaction.json');

// ── Price Check mode ──────────────────────────────────────────────────────────

Then('the price check button should be visible on the toolbar', async function (this: AppWorld) {
  const visible = await this.sale.priceCheckButton.isVisible({ timeout: 5000 }).catch(() => false);
  if (!visible) throw new Error('AC1: Price Check button not visible on toolbar');
  await this.attach('✅ AC1: Price Check button visible on toolbar', 'text/plain');
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
});

When('the user clicks the price check button', async function (this: AppWorld) {
  await this.sale.priceCheckButton.click();
  await this.attach('Clicked Price Check button', 'text/plain');
});

Then('the price check confirmation popup should be displayed', async function (this: AppWorld) {
  const visible = await this.sale.priceCheckConfirmDialog.isVisible({ timeout: 5000 }).catch(() => false);
  if (!visible) throw new Error('AC2: Price Check confirmation popup did not appear after clicking the button');
  await this.attach('✅ AC2: Price Check confirmation popup displayed', 'text/plain');
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
  // Dismiss without enabling (test only checks popup presence)
  await this.sale.priceCheckConfirmNoButton.click().catch(() => this.page.keyboard.press('Escape'));
});

When('the user enables price check mode', async function (this: AppWorld) {
  await this.sale.enablePriceCheckMode();
  await this.attach('✅ AC3: Price Check mode enabled', 'text/plain');
});

When('the user disables price check mode', async function (this: AppWorld) {
  await this.sale.disablePriceCheckMode();
  await this.attach('Price Check mode disabled — returning to normal item entry', 'text/plain');
});

When('the user scans item {string} in price check mode', async function (this: AppWorld, itemKey: string) {
  const item = transactionData.items[itemKey];
  if (!item) throw new Error(`Unknown item key: "${itemKey}". Valid keys: ${Object.keys(transactionData.items).join(', ')}`);
  await this.sale.scanItemInPriceCheckMode(item.itemCode);
  // Store the item for panel verification but do NOT push to cartItems (Price Check must not add to cart)
  this.lastPriceCheckItem = item;
  await this.attach(`Scanned ${item.itemCode} (${item.itemName}) in Price Check mode`, 'text/plain');
});

When('the user scans an unknown item code in price check mode', async function (this: AppWorld) {
  await this.sale.scanItemInPriceCheckMode('9999999999999');
  await this.attach('Scanned unknown barcode 9999999999999 in Price Check mode', 'text/plain');
});

Then('the price check panel should display item details for {string}', async function (this: AppWorld, itemKey: string) {
  const item = transactionData.items[itemKey];
  if (!item) throw new Error(`Unknown item key: "${itemKey}"`);
  const summary = await this.sale.verifyPriceCheckResultVisible(item);
  await this.attach(summary, 'text/plain');
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
  // Panel is intentionally left open here — the next step may add the item to cart (TC-20033, TC-20034).
  // Scenarios that don't add to cart end here; each scenario starts with a fresh page.
});

Then('the price check should show an item not found error', async function (this: AppWorld) {
  const hasError = await this.sale.isPriceCheckErrorVisible();
  if (!hasError) {
    throw new Error('AC9: Expected item-not-found error in Price Check mode but none was visible');
  }
  await this.attach('✅ AC9: Price Check correctly showed item-not-found error without updating cart', 'text/plain');
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
  await this.sale.closePriceCheckResultPanel();
});

Then('the cart should remain unchanged after price check', async function (this: AppWorld) {
  const summary = await this.sale.verifyCartUnchangedAfterPriceCheck(this.cartItems);
  await this.attach(summary, 'text/plain');
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
});

Then('price check mode should be disabled', async function (this: AppWorld) {
  const summary = await this.sale.verifyPriceCheckModeDisabled();
  await this.attach(summary, 'text/plain');
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
});

When('the user adds the price check item to the cart', async function (this: AppWorld) {
  if (!this.lastPriceCheckItem) throw new Error('No price check item recorded — scan an item in price check mode first');
  const summary = await this.sale.addItemFromPriceCheckPanel(this.lastPriceCheckItem);
  // Item is now in cart — push to cartItems so totals can be verified
  this.cartItems.push(this.lastPriceCheckItem);
  await this.attach(summary, 'text/plain');
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
});
