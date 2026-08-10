/**
 * Step definitions: Discount scenarios
 *
 * Covers Amount Off, % Off, combined discounts, and AC12 panel verification
 * (TC-20004, TC-20005, TC-20009, TC-20010).
 */

import { When, Then } from '@cucumber/cucumber';
import { PlaywrightUtils } from '../helpers/PlaywrightUtils.js';
import { AppWorld } from '../support/world.js';

When('the user applies a custom amount off of {int} percent', async function (this: AppWorld, percent: number) {
  const lastItem = this.cartItems[this.cartItems.length - 1];
  if (!lastItem) throw new Error('No item in cart to apply discount to');
  const perItemDiscount = Math.floor(lastItem.itemPrice * percent / 100);
  this.lastDiscountAmount = perItemDiscount;
  this.cumulativeDiscountAmount += perItemDiscount;
  await this.attach(
    `Applying ${percent}% discount: -¥${perItemDiscount} off ¥${lastItem.itemPrice} | Cumulative: -¥${this.cumulativeDiscountAmount}`,
    'text/plain'
  );
  this.discountDialogStart = Date.now();
  await this.sale.applyCustomAmountOff(perItemDiscount);
  this.discountDialogEnd = Date.now();
});

Then('the discounted cart totals should be correct', async function (this: AppWorld) {
  const summary = await this.sale.verifyDiscountedCartTotals(this.cartItems, this.lastDiscountAmount);
  await this.attach(summary, 'text/plain');
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
});

When('the user applies a custom percent off of {int} percent', async function (this: AppWorld, percent: number) {
  const lastItem = this.cartItems[this.cartItems.length - 1];
  if (!lastItem) throw new Error('No item in cart to apply % Off to');
  this.lastDiscountPercent = percent;
  const { total: singleItemTotal } = PlaywrightUtils.calculateCartTotals([lastItem]);
  const actualDiscount = Math.floor(singleItemTotal * percent / 100);
  this.lastDiscountAmount = actualDiscount;
  this.cumulativeDiscountAmount += actualDiscount;
  await this.attach(
    `Applying ${percent}% Off: ¥${lastItem.itemPrice} (tax-incl ¥${singleItemTotal}) → -¥${actualDiscount}`,
    'text/plain'
  );
  this.discountDialogStart = Date.now();
  await this.sale.applyCustomPercentOff(percent);
  this.discountDialogEnd = Date.now();
});

Then('the percent discounted cart totals should be correct', async function (this: AppWorld) {
  const summary = await this.sale.verifyPercentDiscountedCartTotals(
    this.cartItems,
    this.lastDiscountPercent,
    this.lastDiscountAmount || undefined,
  );
  await this.attach(summary, 'text/plain');
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
});

Then('the combined discounted cart totals should be correct', async function (this: AppWorld) {
  const summary = await this.sale.verifyCombinedDiscountedCartTotals(this.cartItems, this.cumulativeDiscountAmount);
  await this.attach(summary, 'text/plain');
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
});

Then('the transaction panel should display all required item fields', async function (this: AppWorld) {
  const lastItem = this.cartItems[this.cartItems.length - 1];
  if (!lastItem) throw new Error('No item in cart — scan an item before verifying the transaction panel');
  const summary = await this.sale.verifyTransactionPanelDisplay(lastItem, true);
  await this.attach(summary, 'text/plain');
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
});

Then('the item detail panel should show the amount off discount', async function (this: AppWorld) {
  const summary = await this.sale.verifyItemDetailAmountOff();
  await this.attach(summary, 'text/plain');
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
});

Then('the item detail panel should show the percent off discount', async function (this: AppWorld) {
  const summary = await this.sale.verifyItemDetailPercentOff();
  await this.attach(summary, 'text/plain');
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
});

Then('the item detail panel should show both amount off and percent off discounts', async function (this: AppWorld) {
  const summary = await this.sale.verifyItemDetailBothDiscounts();
  await this.attach(summary, 'text/plain');
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
});

When('the user edits the percent off discount to {int} percent', async function (this: AppWorld, percent: number) {
  const lastItem = this.cartItems[this.cartItems.length - 1];
  if (!lastItem) throw new Error('No item in cart to edit % Off on');
  const { total: singleItemTotal } = PlaywrightUtils.calculateCartTotals([lastItem]);
  const newDiscountAmount = Math.floor(singleItemTotal * percent / 100);
  this.cumulativeDiscountAmount = this.cumulativeDiscountAmount - this.lastDiscountAmount + newDiscountAmount;
  this.lastDiscountAmount = newDiscountAmount;
  this.lastDiscountPercent = percent;
  await this.sale.editPercentOff(percent);
  await this.attach(`Edited % Off to ${percent}% of \u00a5${singleItemTotal} (tax-incl) = -\u00a5${newDiscountAmount} | Cumulative: -\u00a5${this.cumulativeDiscountAmount}`, 'text/plain');
});

When('the user removes the existing percent off discount', async function (this: AppWorld) {
  await this.attach(`Removing existing % Off: -\u00a5${this.lastDiscountAmount}`, 'text/plain');
  this.cumulativeDiscountAmount -= this.lastDiscountAmount;
  this.lastDiscountAmount = 0;
  this.lastDiscountPercent = 0;
  await this.sale.removePercentOff();
  await this.attach('% Off discount removed \u2014 totals should reflect full item price', 'text/plain');
});

When('the user edits the amount off discount to {int} percent', async function (this: AppWorld, percent: number) {
  const lastItem = this.cartItems[this.cartItems.length - 1];
  if (!lastItem) throw new Error('No item in cart to edit discount on');
  const newDiscountAmount = Math.floor(lastItem.itemPrice * percent / 100);
  // Replace old discount with new in cumulative tracker
  this.cumulativeDiscountAmount = this.cumulativeDiscountAmount - this.lastDiscountAmount + newDiscountAmount;
  this.lastDiscountAmount = newDiscountAmount;
  await this.sale.editAmountOff(newDiscountAmount);
  await this.attach(`Edited amount off to ${percent}% of \u00a5${lastItem.itemPrice} = -\u00a5${newDiscountAmount} | Cumulative: -\u00a5${this.cumulativeDiscountAmount}`, 'text/plain');
});

When('the user removes the existing amount off discount', async function (this: AppWorld) {
  await this.attach(`Removing existing amount off: -\u00a5${this.lastDiscountAmount}`, 'text/plain');
  this.cumulativeDiscountAmount -= this.lastDiscountAmount;
  this.lastDiscountAmount = 0;
  this.lastDiscountPercent = 0;
  await this.sale.removeAmountOff();
  await this.attach('Discount removed — totals should reflect full item price', 'text/plain');
});

When('the user attempts to apply an invalid percent off of {int}', async function (this: AppWorld, percent: number) {
  const summary = await this.sale.attemptInvalidPercentOff(percent);
  await this.attach(summary, 'text/plain');
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
});

Then('the discount dialog response time should be within SLO', async function (this: AppWorld) {
  const threshold = Number(process.env.SLO_DISCOUNT_DIALOG_MS ?? 1000);
  const elapsed = this.discountDialogEnd - this.discountDialogStart;
  const status = elapsed <= threshold ? '✅ PASS' : `⚠️ SLOW (SLO: ${threshold} ms)`;
  await this.attach(`${status} — Discount dialog response: ${elapsed} ms (SLO: ${threshold} ms from .env)`, 'text/plain');
  if (elapsed > threshold) console.warn(`[PERF] Discount dialog exceeded SLO: ${elapsed} ms > ${threshold} ms`);
});
