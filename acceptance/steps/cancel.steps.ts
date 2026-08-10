/**
 * Step definitions: Cancel transaction
 *
 * Covers AC16 cancel-from-sale and cancel-from-tender scenarios (TC-20011).
 * Also covers NVPOS-104 ACs: AC1, AC5, AC7, AC8, AC9, AC10, AC15 (TC-20031–TC-20034).
 */

import { When, Then } from '@cucumber/cucumber';
import { createRequire } from 'module';
import { AppWorld } from '../support/world.js';

const require = createRequire(import.meta.url);
const transactionData = require('../data/transaction.json');

When('the user cancels the transaction', async function (this: AppWorld) {
  await this.sale.cancelTransaction();
  this.cartItems = [];
  await this.attach('🔴 Transaction cancelled — app stays on sale screen, cart should be empty', 'text/plain');
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
});

Then('the cart should be empty after cancellation', async function (this: AppWorld) {
  const summary = await this.sale.verifyCartIsEmpty();
  await this.attach(summary, 'text/plain');
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
});

// ── NVPOS-104 steps ──────────────────────────────────────────────────────────

Then('the cancel transaction button should be visible and enabled', async function (this: AppWorld) {
  const summary = await this.sale.verifyCancelButtonEnabled();
  await this.attach(summary, 'text/plain');
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
});

Then('the sale UI should be in the initial ready state', async function (this: AppWorld) {
  const summary = await this.sale.verifySaleUIReady();
  await this.attach(summary, 'text/plain');
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
});

Then('the canceled item {string} should not appear in the new transaction', async function (this: AppWorld, itemKey: string) {
  const item = transactionData.items[itemKey];
  if (!item) throw new Error(`Unknown item key: "${itemKey}"`);
  const summary = await this.sale.verifyCanceledItemAbsent(item.itemName);
  await this.attach(summary, 'text/plain');
});

Then('no receipt screen should be displayed after cancellation', async function (this: AppWorld) {
  const summary = await this.sale.verifyNoReceiptScreen();
  await this.attach(summary, 'text/plain');
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
});
