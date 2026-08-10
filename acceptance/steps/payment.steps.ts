/**
 * Step definitions: Payment / tender screen
 *
 * Covers tender method selection, payment confirmation, tender screen validation,
 * and navigation back to sale screen (TC-20001, TC-20002, TC-20005, TC-20008, TC-20012, TC-20013).
 */

import { When, Then } from '@cucumber/cucumber';
import { createRequire } from 'module';
import { PlaywrightUtils } from '../helpers/PlaywrightUtils.js';
import { AppWorld } from '../support/world.js';

const require = createRequire(import.meta.url);
const paymentData = require('../data/payment.json');

When('the user clicks the proceed to payment button', async function (this: AppWorld) {
  await this.sale.clickProceedToPayment();
});

When('the user clicks the gift card payment button', async function (this: AppWorld) {
  await this.payment.selectTenderMethod(paymentData.selectedTenderMethod);
});

When('the user clicks the confirm payment button', async function (this: AppWorld) {
  const totals = PlaywrightUtils.calculateCartTotals(this.cartItems);
  await this.payment.clickConfirmPayment(totals.total);
  await this.attach(await this.payment.screenshot(), 'image/jpeg');
});

When('the user pays with {string}', async function (this: AppWorld, tenderMethod: string) {
  await this.payment.selectTenderMethod(tenderMethod);
  await this.attach(`💳 Tender method selected: ${tenderMethod}`, 'text/plain');
});

When('the user pays with cash entering the exact amount manually', async function (this: AppWorld) {
  await this.payment.selectTenderMethod('cash');
  const total = PlaywrightUtils.calculateCartTotals(this.cartItems).total;
  await this.payment.clickConfirmPayment(total);
  await this.attach(`💴 Cash payment — entered exact amount ¥${total} manually (No Preset Tender)`, 'text/plain');
  await this.attach(await this.payment.screenshot(), 'image/jpeg');
});

When('the user pays with cash for the combined discounted total', async function (this: AppWorld) {
  await this.payment.selectTenderMethod('cash');
  const base  = PlaywrightUtils.calculateCartTotals(this.cartItems).total;
  const total = base - this.cumulativeDiscountAmount;
  await this.payment.clickConfirmPayment(total);
  await this.attach(
    `💴 Cash payment (discounted) — ¥${total} (¥${base} − ¥${this.cumulativeDiscountAmount} cumulative discount)`,
    'text/plain'
  );
  await this.attach(await this.payment.screenshot(), 'image/jpeg');
});

When('the user navigates back to the sale screen', async function (this: AppWorld) {
  await this.payment.navigateBackToSale();
  await this.attach('⬅ Navigated back to sale screen from tender screen', 'text/plain');
  await this.attach(await this.payment.screenshot(), 'image/jpeg');
});

Then('the tender screen should show the correct total and tax', async function (this: AppWorld) {
  const summary = await this.payment.verifyTenderScreenTotals(this.cartItems, this.cumulativeDiscountAmount);
  await this.attach(summary, 'text/plain');
  await this.attach(await this.payment.screenshot(), 'image/jpeg');
});

Then('the user should be redirected to the home screen', async function (this: AppWorld) {
  await this.home.waitForHomeScreen();
  await this.attach(await this.home.screenshot(), 'image/jpeg');
});

Then('the delete item action should not be available on the tender screen', async function (this: AppWorld) {
  const summary = await this.payment.verifyDeleteUnavailableOnTenderScreen();
  await this.attach(summary, 'text/plain');
  await this.attach(await this.payment.screenshot(), 'image/jpeg');
});
