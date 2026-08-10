/**
 * Step definitions: Line Item Cancel (Delete)
 *
 * Covers removing scanned/entered items from an active sales transaction with
 * accurate cart recalculation (subtotal, tax, totals) and itemization pane updates.
 * (TC-20051 through TC-20060, ACs 1–5)
 */

import { When, Then } from '@cucumber/cucumber';
import { createRequire } from 'module';
import { AppWorld } from '../support/world.js';

const require = createRequire(import.meta.url);
const transactionData = require('../data/transaction.json');

// ── Delete action visibility ──────────────────────────────────────────────────

Then('the delete item action should be visible', async function (this: AppWorld) {
  // The delete button appears in the action window / toolbar when an item is selected.
  // It may be inside the アクションウィンドウ tab — check both the tab and the button.
  const visible = await this.sale.deleteItemButton.isVisible({ timeout: 5000 }).catch(() => false);
  if (!visible) throw new Error('AC1: Delete item action is not visible — expected it to be displayed when a line item is selected');
  await this.attach('✅ AC1: Delete item action is visible in the UI', 'text/plain');
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
});

// ── Cart row position selectors ───────────────────────────────────────────────

When('the user selects the first cart line item', async function (this: AppWorld) {
  const names = this.cartItems.map(i => i.itemName);
  await this.sale.selectCartLineByPosition('first', names);
  // Rotate world state so the first item ends up last (= currently selected for delete step)
  if (this.cartItems.length > 1) {
    const first = this.cartItems[0];
    this.cartItems = [...this.cartItems.slice(1), first];
  }
  await this.attach('Selected the FIRST cart line item', 'text/plain');
});

When('the user selects the last cart line item', async function (this: AppWorld) {
  const names = this.cartItems.map(i => i.itemName);
  await this.sale.selectCartLineByPosition('last', names);
  // Last item in cartItems[] is already the selected one — no reorder needed.
  await this.attach('Selected the LAST cart line item', 'text/plain');
});

When('the user selects the middle cart line item', async function (this: AppWorld) {
  const names = this.cartItems.map(i => i.itemName);
  await this.sale.selectCartLineByPosition('middle', names);
  // Move middle item to end of cartItems[] so the delete step removes it correctly.
  if (this.cartItems.length >= 3) {
    const midIdx = Math.floor(this.cartItems.length / 2);
    const mid = this.cartItems[midIdx];
    this.cartItems = [
      ...this.cartItems.slice(0, midIdx),
      ...this.cartItems.slice(midIdx + 1),
      mid,
    ];
  }
  await this.attach('Selected the MIDDLE cart line item', 'text/plain');
});

// ── Itemization pane verification ─────────────────────────────────────────────

Then(
  'the deleted item {string} should not appear in the cart',
  async function (this: AppWorld, itemKey: string) {
    const item = transactionData.items[itemKey];
    if (!item) throw new Error(`Unknown item key: "${itemKey}". Valid keys: ${Object.keys(transactionData.items).join(', ')}`);
    const summary = await this.sale.verifyItemNotInCart(item.itemName);
    await this.attach(summary, 'text/plain');
    await this.attach(await this.sale.screenshot(), 'image/jpeg');
  }
);

Then(
  'the item {string} should appear in the cart',
  async function (this: AppWorld, itemKey: string) {
    const item = transactionData.items[itemKey];
    if (!item) throw new Error(`Unknown item key: "${itemKey}". Valid keys: ${Object.keys(transactionData.items).join(', ')}`);
    const summary = await this.sale.verifyItemInCart(item.itemName);
    await this.attach(summary, 'text/plain');
    await this.attach(await this.sale.screenshot(), 'image/jpeg');
  }
);
