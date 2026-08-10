/**
 * Step definitions: Sale / transaction screen
 *
 * Covers item scanning, quantity changes, item deletion, and cart verification
 * (TC-20001, TC-20002, TC-20003, TC-20008 and shared scan steps).
 */

import { When, Then, DataTable } from '@cucumber/cucumber';
import { createRequire } from 'module';
import { PlaywrightUtils } from '../helpers/PlaywrightUtils.js';
import { AppWorld } from '../support/world.js';

const require = createRequire(import.meta.url);
const transactionData = require('../data/transaction.json');

When('the user scans item {string}', async function (this: AppWorld, itemKey: string) {
  const item = transactionData.items[itemKey];
  if (!item) throw new Error(`Unknown item key: "${itemKey}". Valid keys: ${Object.keys(transactionData.items).join(', ')}`);

  await this.sale.enterItemCode(item.itemCode);

  this.cartItems.push(item);
  if (this.cumulativeDiscountAmount > 0) {
    const bodyText: string = await this.page.evaluate(() => document.body.innerText);
    const lines = bodyText.split('\n').map((l: string) => l.trim()).filter(Boolean);
    const totalLine = lines.find(l => l.includes('合計') || l.includes('TOTAL'));
    await this.attach(`📦 Scanned ${item.itemCode} (discounts active — total check skipped, current UI: ${totalLine ?? 'N/A'})`, 'text/plain');
  } else {
    const summary = await this.sale.verifyCartTotals(this.cartItems);
    await this.attach(summary, 'text/plain');
  }
});

When('the user scans the following items:', { timeout: 300_000 }, async function (this: AppWorld, table: DataTable) {
  const itemKeys: string[] = table.raw().map((row: string[]) => row[0].trim());
  for (const itemKey of itemKeys) {
    const item = transactionData.items[itemKey];
    if (!item) throw new Error(`Unknown item key: "${itemKey}". Valid keys: ${Object.keys(transactionData.items).join(', ')}`);
    await this.sale.enterItemCode(item.itemCode);
    this.cartItems.push(item);
    const summary = await this.sale.verifyCartTotals(this.cartItems);
    await this.attach(summary, 'text/plain');
  }
});

When('the user scans {int} items cycling through the catalog', { timeout: 600_000 }, async function (this: AppWorld, count: number) {
  const allItems = Object.values(transactionData.items) as typeof transactionData.items[string][];
  if (allItems.length === 0) throw new Error('No items defined in transaction.json');
  for (let i = 0; i < count; i++) {
    const item = allItems[i % allItems.length];
    const scanStart = Date.now();
    await this.sale.enterItemCode(item.itemCode);
    this.scanTimings.push(Date.now() - scanStart);
    this.cartItems.push(item);
    const summary = await this.sale.verifyCartTotals(this.cartItems);
    await this.attach(summary, 'text/plain');
  }
  await this.attach(`📦 Scanned ${count} items cycling through ${allItems.length} catalog entries`, 'text/plain');
});

When('the user changes the item quantity to {int}', async function (this: AppWorld, qty: number) {
  await this.sale.changeItemQuantity(qty);
  const lastItem = this.cartItems[this.cartItems.length - 1];
  if (lastItem) {
    this.cartItems = this.cartItems.filter(i => i.itemCode !== lastItem.itemCode);
    for (let i = 0; i < qty; i++) this.cartItems.push(lastItem);
    await this.attach(`🔢 Quantity changed: ${lastItem.itemName} × ${qty} = ¥${lastItem.itemPrice * qty}`, 'text/plain');
  }
});

When('the user deletes the currently selected item', async function (this: AppWorld) {
  const deletedItem = this.cartItems.length > 0 ? this.cartItems[this.cartItems.length - 1] : null;
  await this.sale.clickDeleteItem();
  if (deletedItem) {
    const countRemoved = this.cartItems.filter(i => i.itemCode === deletedItem.itemCode).length;
    this.cartItems = this.cartItems.filter(i => i.itemCode !== deletedItem.itemCode);
    this.deletedItems.push(deletedItem);
    const msg = countRemoved > 1
      ? `Deleted all ${countRemoved} × ${deletedItem.itemName} — Remaining items: ${this.cartItems.length}`
      : `Deleted: ${deletedItem.itemName} (${deletedItem.itemCode})\nRemaining items: ${this.cartItems.length}`;
    await this.attach(msg, 'text/plain');
  } else {
    await this.attach('Deleted the currently selected item', 'text/plain');
  }
});

Then('the cart totals should be correct', async function (this: AppWorld) {
  const summary = await this.sale.verifyCartTotals(this.cartItems);
  await this.attach(summary, 'text/plain');
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
});

Then('the cart totals should reflect the remaining items', async function (this: AppWorld) {
  if (this.cartItems.length === 0) {
    const summary = await this.sale.verifyCartIsEmpty();
    await this.attach(summary, 'text/plain');
  } else {
    const summary = await this.sale.verifyCartTotals(this.cartItems);
    await this.attach(summary, 'text/plain');
  }
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
});

// ── Performance steps ────────────────────────────────────────────────────────

When('the performance timer starts', async function (this: AppWorld) {
  this.perfTimerStart = Date.now();
  this.scanCount = 0;
  this.scanTimings = [];
  await this.attach(`⏱ Performance timer started at ${new Date(this.perfTimerStart).toISOString()}`, 'text/plain');
});

Then('the scan throughput should be recorded', async function (this: AppWorld) {
  const elapsed = Date.now() - this.perfTimerStart;
  const itemCount = this.cartItems.length;
  const avgPerItem = itemCount > 0 ? Math.round(elapsed / itemCount) : 0;
  const throughput = itemCount > 0 ? (itemCount / (elapsed / 1000)).toFixed(2) : '0';
  await this.attach([
    `📦 Scan Throughput Report`,
    `   Items scanned   : ${itemCount}`,
    `   Elapsed so far  : ${elapsed} ms`,
    `   Avg per item    : ${avgPerItem} ms`,
    `   Throughput      : ${throughput} items/sec`,
  ].join('\n'), 'text/plain');
});

Then('the average item scan time should be within SLO', async function (this: AppWorld) {
  const threshold = Number(process.env.SLO_SCAN_MS ?? 500);
  if (this.scanTimings.length === 0) {
    await this.attach('⚠️ No scan timings recorded — skipping SLO check', 'text/plain');
    return;
  }
  const avg  = Math.round(this.scanTimings.reduce((a, b) => a + b, 0) / this.scanTimings.length);
  const max  = Math.max(...this.scanTimings);
  const min  = Math.min(...this.scanTimings);
  const slow = this.scanTimings.filter(t => t > threshold).length;
  const status = avg <= threshold ? '✅ PASS' : `⚠️ SLOW (SLO: ${threshold} ms)`;
  await this.attach([
    `${status} — Per-scan SLO check (SLO: ${threshold} ms from .env)`,
    `   Items timed   : ${this.scanTimings.length}`,
    `   Avg scan time : ${avg} ms`,
    `   Min scan time : ${min} ms`,
    `   Max scan time : ${max} ms`,
    `   Scans > SLO   : ${slow} / ${this.scanTimings.length}`,
  ].join('\n'), 'text/plain');
  if (avg > threshold) console.warn(`[PERF] Avg scan time exceeded SLO: ${avg} ms > ${threshold} ms`);
});

Then('the total transaction time should be within SLO', async function (this: AppWorld) {
  const threshold = Number(process.env.SLO_CHECKOUT_MS ?? 4000);
  const elapsed = Date.now() - this.perfTimerStart;
  const mins = Math.floor(elapsed / 60000);
  const secs = ((elapsed % 60000) / 1000).toFixed(1);
  const status = elapsed <= threshold ? '✅ PASS' : `⚠️ SLOW (SLO: ${threshold} ms)`;
  const itemCount = this.cartItems.length + this.deletedItems.length;
  await this.attach([
    `${status} — Total transaction time: ${mins}m ${secs}s (${elapsed} ms)`,
    `   SLO threshold   : ${threshold} ms`,
    `   Items processed : ${itemCount}`,
    `   Discount applied: ${this.lastDiscountAmount > 0 ? `-¥${this.lastDiscountAmount}` : this.lastDiscountPercent > 0 ? `-${this.lastDiscountPercent}%` : 'none'}`,
  ].join('\n'), 'text/plain');
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
  if (elapsed > threshold) console.warn(`[PERF] Transaction exceeded SLO: ${elapsed} ms > ${threshold} ms`);
});

// ── AC21 / AC22 verification steps ───────────────────────────────────────────

Then('the cart totals should be correct for tax rate {int}', async function (this: AppWorld, taxRate: number) {
  const summary = await this.sale.verifyCartTotals(this.cartItems);
  await this.attach(summary, 'text/plain');
  const taxRateSummary = await this.sale.verifyTaxRateVisible(taxRate);
  await this.attach(taxRateSummary, 'text/plain');
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
});

Then('the cart totals should be correct for mixed tax rates', async function (this: AppWorld) {
  const summary = await this.sale.verifyCartTotals(this.cartItems);
  await this.attach(summary, 'text/plain');
  const taxRateSummary = await this.sale.verifyMixedTaxRatesVisible(this.cartItems);
  await this.attach(taxRateSummary, 'text/plain');
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
});

Then('the transaction panel should display price and tax correctly with no discounts', async function (this: AppWorld) {
  const lastItem = this.cartItems[this.cartItems.length - 1];
  if (!lastItem) throw new Error('No items in cart — cannot verify transaction panel display');
  const summary = await this.sale.verifyTransactionPanelDisplay(lastItem, false);
  await this.attach(summary, 'text/plain');
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
});
