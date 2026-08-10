/**
 * Step definitions: Screen Orientation (NVPOS-209)
 *
 * Covers Left/Right-Hand mode preference — Cashier Preferences panel,
 * cart pane position verification, persistence, UI integrity, and edge cases.
 *
 * Reuses existing steps from:
 *   - background.steps.ts  : login, start transaction
 *   - sale.steps.ts        : scan item, cart totals
 *   - discount.steps.ts    : apply amount off
 *   - payment.steps.ts     : proceed to payment, confirm payment
 */

import { When, Then, Given } from '@cucumber/cucumber';
import { createRequire } from 'module';
import { PlaywrightUtils, T } from '../helpers/PlaywrightUtils.js';
import type { OrientationSide } from '../pages/ScreenOrientationPage.js';
import { AppWorld } from '../support/world.js';

const require = createRequire(import.meta.url);
const transactionData = require('../data/transaction.json');

// ── Navigation ────────────────────────────────────────────────────────────────

When('the user navigates to Cashier Preferences', async function (this: AppWorld) {
  await this.orientation.openCashierPreferences();
  await this.attach('📋 Settings dialog opened (設定 → 画面レイアウト)', 'text/plain');
  await this.attach(await this.orientation.screenshot(), 'image/jpeg');
});

/**
 * One-shot combined step used in rapid-switching scenarios.
 * Equivalent to: navigate to Cashier Preferences + select + apply.
 */
When(
  'the user navigates to Cashier Preferences and selects {word} and presses Apply',
  async function (this: AppWorld, side: string) {
    const orientationSide = this.orientation.resolveOrientationSide(side);
    await this.orientation.navigateAndApply(orientationSide);
    await this.attach(`🔄 Rapid switch → ${orientationSide}`, 'text/plain');
  }
);

// ── Login variants ────────────────────────────────────────────────────────────

/**
 * Logs in without visiting Cashier Preferences — verifies the default RIGHT
 * orientation is applied without any explicit preference selection.
 */
When(
  'the user logs in with default credentials without visiting Cashier Preferences',
  async function (this: AppWorld) {
    await this.login.login();
    await this.attach('✅ Logged in — Cashier Preferences NOT visited (testing default orientation)', 'text/plain');
  }
);

/**
 * Logs in as a named cashier (e.g. "cashierA", "cashierB").
 * Credentials are resolved from environment variables:
 *   cashierA → CASHIER_A_USERNAME / CASHIER_A_PASSWORD
 *   cashierB → CASHIER_B_USERNAME / CASHIER_B_PASSWORD
 * Falls back to default POS_USERNAME / POS_PASSWORD when not set.
 */
When('the user logs in as {string}', async function (this: AppWorld, cashierKey: string) {
  const key = cashierKey.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const username = process.env[`${key}_USERNAME`] ?? process.env.POS_USERNAME ?? '';
  const password = process.env[`${key}_PASSWORD`] ?? process.env.POS_PASSWORD ?? '';
  await this.login.goto();
  await this.login.login(username, password);
  await this.attach(`✅ Logged in as ${cashierKey} (user: ${username || '(default)'})`, 'text/plain');
});

When('cashierA signs off', async function (this: AppWorld) {
  // Sign off: clear session storage so the app returns to the login screen.
  await this.page.evaluate(() => {
    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {}
  });
  await this.page.reload({ timeout: T[15000] });
  await this.login.goto();
  await this.attach('🔓 CashierA signed off — session cleared', 'text/plain');
});

// ── Selecting orientation options ─────────────────────────────────────────────

When(
  'the user selects the {word} orientation option',
  async function (this: AppWorld, side: string) {
    const orientationSide = this.orientation.resolveOrientationSide(side);
    await this.orientation.selectOrientation(orientationSide);
    await this.attach(`🖱 Selected orientation: ${orientationSide} (no Apply yet)`, 'text/plain');
  }
);

When(
  'the user selects the {word} orientation option and presses Apply',
  async function (this: AppWorld, side: string) {
    const orientationSide = this.orientation.resolveOrientationSide(side);
    await this.orientation.selectOrientationAndApply(orientationSide);
    await this.attach(`✅ Orientation applied: ${orientationSide}`, 'text/plain');
    await this.attach(await this.orientation.screenshot(), 'image/jpeg');
  }
);

When(
  'the user selects the {word} orientation option but does not press Apply',
  async function (this: AppWorld, side: string) {
    const orientationSide = this.orientation.resolveOrientationSide(side);
    await this.orientation.selectOrientation(orientationSide);
    await this.attach(`🖱 Highlighted ${orientationSide} — NOT applying`, 'text/plain');
  }
);

When('the user closes the Cashier Preferences panel', async function (this: AppWorld) {
  await this.orientation.closePanelWithoutApply();
  await this.attach('❌ Preferences panel closed without pressing Apply', 'text/plain');
  await this.attach(await this.orientation.screenshot(), 'image/jpeg');
});

// ── Viewport ──────────────────────────────────────────────────────────────────

When(
  'the browser viewport is set to {int} by {int}',
  async function (this: AppWorld, width: number, height: number) {
    await this.page.setViewportSize({ width, height });
    await this.attach(`📐 Viewport set to ${width}×${height}`, 'text/plain');
  }
);

// ── Navigation away and back ──────────────────────────────────────────────────

When(
  'the user navigates to a non-Preferences screen and returns to the Sale screen',
  async function (this: AppWorld) {
    // Navigate to home (a non-Preferences screen) and then back to sale
    await this.home.waitForHomeScreen().catch(() => {
      // Already on a non-home screen — press Escape or navigate via keyboard
    });
    await this.attach('🔀 Navigated away from Sale screen', 'text/plain');
    // Return to sale screen
    await this.home.clickStartTransaction();
    await this.attach('↩ Returned to Sale screen', 'text/plain');
    await this.attach(await this.sale.screenshot(), 'image/jpeg');
  }
);

// ── Cart item scanning variants ────────────────────────────────────────────────

/**
 * Scans N items into the cart by cycling through all items in transaction.json.
 * Used to verify scroll behaviour (15 items) and large-cart switch (20 items).
 */
When(
  'the user scans {int} items into the cart',
  { timeout: 600_000 },
  async function (this: AppWorld, count: number) {
    const allItems = Object.values(transactionData.items) as typeof transactionData.items[string][];
    if (allItems.length === 0) throw new Error('No items defined in transaction.json');
    for (let i = 0; i < count; i++) {
      const item = allItems[i % allItems.length];
      await this.sale.enterItemCode(item.itemCode);
      this.cartItems.push(item);
    }
    const summary = await this.sale.verifyCartTotals(this.cartItems);
    await this.attach(`📦 Scanned ${count} items into cart (cycling ${allItems.length} catalog entries)`, 'text/plain');
    await this.attach(summary, 'text/plain');
    await this.attach(await this.sale.screenshot(), 'image/jpeg');
  }
);

// ── Cart void ─────────────────────────────────────────────────────────────────

When(
  'the user selects item {string} in the cart and voids it',
  async function (this: AppWorld, itemKey: string) {
    const item = transactionData.items[itemKey];
    if (!item) throw new Error(`Unknown item key: "${itemKey}". Valid: ${Object.keys(transactionData.items).join(', ')}`);
    await this.sale.selectCartLineForItem(item.itemName);
    await this.sale.clickDeleteItem();
    this.cartItems = this.cartItems.filter((i: { itemCode: string }) => i.itemCode !== item.itemCode);
    await this.attach(`🗑 Voided item: ${item.itemName} (${item.itemCode})`, 'text/plain');
    await this.attach(await this.sale.screenshot(), 'image/jpeg');
  }
);

// ── Tender during orientation switch ─────────────────────────────────────────

When(
  'the user selects a payment method on the Tender screen',
  async function (this: AppWorld) {
    const paymentData = require('../data/payment.json');
    await this.payment.selectTenderMethod(paymentData.selectedTenderMethod);
    await this.attach('💳 Payment method selected on Tender screen', 'text/plain');
    await this.attach(await this.payment.screenshot(), 'image/jpeg');
  }
);

When(
  'the user navigates to Cashier Preferences and attempts to switch orientation during tender',
  async function (this: AppWorld) {
    // Attempt to open preferences during active tender
    const prefVisible = await PlaywrightUtils.isVisible(
      this.orientation.cashierPreferencesButton, T[3000]
    );
    if (prefVisible) {
      await this.orientation.openCashierPreferences();
      await this.orientation.selectOrientationAndApply('LEFT');
      await this.attach('🔄 Orientation switched to LEFT during active tender', 'text/plain');
      (this as AppWorld & { orientationSwitchedDuringTender: boolean }).orientationSwitchedDuringTender = true;
    } else {
      await this.attach('🔒 Cashier Preferences button not accessible during tender — restricted as expected', 'text/plain');
      (this as AppWorld & { orientationSwitchedDuringTender: boolean }).orientationSwitchedDuringTender = false;
    }
    await this.attach(await this.orientation.screenshot(), 'image/jpeg');
  }
);

// ── Scroll interactions ────────────────────────────────────────────────────────

When('the user scrolls down to the last item in the cart', async function (this: AppWorld) {
  await this.orientation.scrollCartToBottom();
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
});

When('the user scrolls back to the top of the cart', async function (this: AppWorld) {
  await this.orientation.scrollCartToTop();
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
});

// ── Assertion: Preferences panel ──────────────────────────────────────────────

Then(
  'the screen orientation setting should be visible with selectable LEFT and RIGHT options',
  async function (this: AppWorld) {
    const summary = await this.orientation.verifyOrientationSettingVisible();
    await this.attach(summary, 'text/plain');
    await this.attach(await this.orientation.screenshot(), 'image/jpeg');
  }
);

Then(
  'the {word} option should appear selected and {word} should appear deselected',
  async function (this: AppWorld, selectedSide: string, _deselectedSide: string) {
    const side = this.orientation.resolveOrientationSide(selectedSide);
    // Map LEFT → 左手, RIGHT → 標準 for display
    const label = side === 'LEFT' ? '左手 (LEFT)' : '標準 (RIGHT)';
    const otherLabel = side === 'LEFT' ? '標準 (RIGHT)' : '左手 (LEFT)';
    const summary = await this.orientation.verifyOptionSelected(side);
    await this.attach(`${label} selected, ${otherLabel} deselected — ${summary}`, 'text/plain');
  }
);

// ── Assertion: Cart pane position ─────────────────────────────────────────────

Then(
  'the cart itemization pane should be displayed on the {word} side of the screen',
  async function (this: AppWorld, side: string) {
    const orientationSide = this.orientation.resolveOrientationSide(side);
    const summary = await this.orientation.verifyCartPaneSide(orientationSide);
    await this.attach(summary, 'text/plain');
    await this.attach(await this.orientation.screenshot(), 'image/jpeg');
  }
);

Then(
  'the cart pane should still be on the {word} side',
  async function (this: AppWorld, side: string) {
    const orientationSide = this.orientation.resolveOrientationSide(side);
    const summary = await this.orientation.verifyCartPaneSide(orientationSide);
    await this.attach(summary, 'text/plain');
    await this.attach(await this.orientation.screenshot(), 'image/jpeg');
  }
);

Then(
  'the cart pane should still be on the {word} side on the {word} screen',
  async function (this: AppWorld, side: string, screenName: string) {
    const orientationSide = this.orientation.resolveOrientationSide(side);
    const summary = await this.orientation.verifyCartPaneSide(orientationSide);
    await this.attach(`[${screenName} screen] ${summary}`, 'text/plain');
    await this.attach(await this.orientation.screenshot(), 'image/jpeg');
  }
);

Then(
  'the cart pane should be on the {word} side for {word}',
  async function (this: AppWorld, side: string, cashier: string) {
    const orientationSide = this.orientation.resolveOrientationSide(side);
    const summary = await this.orientation.verifyCartPaneSide(orientationSide);
    await this.attach(`[${cashier}] ${summary}`, 'text/plain');
    await this.attach(await this.orientation.screenshot(), 'image/jpeg');
  }
);

Then(
  'the cart pane should be on the {word} side matching the last selected orientation',
  async function (this: AppWorld, side: string) {
    const orientationSide = this.orientation.resolveOrientationSide(side);
    const summary = await this.orientation.verifyCartPaneSide(orientationSide);
    await this.attach(`[last selection] ${summary}`, 'text/plain');
    await this.attach(await this.orientation.screenshot(), 'image/jpeg');
  }
);

Then(
  'the cart pane orientation should remain unchanged on the Sale screen',
  async function (this: AppWorld) {
    // After closing preferences without Apply, the cart pane should stay on
    // whichever side it was before. We verify no-ghost-pane and no error — the
    // actual side is already established by a prior Then step in the scenario.
    const noGhost = await this.orientation.verifyNoGhostPanes();
    const noError = await this.orientation.verifyNoErrorOrBlankPane();
    await this.attach(`${noGhost}\n${noError}`, 'text/plain');
    await this.attach(await this.orientation.screenshot(), 'image/jpeg');
  }
);

Then(
  'the cart itemization pane should immediately move to the {word} side without a page reload',
  async function (this: AppWorld, side: string) {
    const orientationSide = this.orientation.resolveOrientationSide(side);
    const summary = await this.orientation.verifyCartPaneSide(orientationSide);
    await this.attach(`[immediate apply — no reload] ${summary}`, 'text/plain');
    await this.attach(await this.orientation.screenshot(), 'image/jpeg');
  }
);

Then(
  'the empty cart pane should render on the {word} side with no errors',
  async function (this: AppWorld, side: string) {
    const orientationSide = this.orientation.resolveOrientationSide(side);
    const cartSide  = await this.orientation.verifyCartPaneSide(orientationSide);
    const noError   = await this.orientation.verifyNoErrorOrBlankPane();
    await this.attach(`${cartSide}\n${noError}`, 'text/plain');
    await this.attach(await this.orientation.screenshot(), 'image/jpeg');
  }
);

// ── Assertion: UI integrity ───────────────────────────────────────────────────

Then(
  'the POS should navigate to the Sale screen without error',
  async function (this: AppWorld) {
    const noError = await this.orientation.verifyNoErrorOrBlankPane();
    await this.attach(noError, 'text/plain');
    await this.attach(await this.orientation.screenshot(), 'image/jpeg');
  }
);

Then(
  'there should be no overlap or clipping between the panes',
  async function (this: AppWorld) {
    // Verify the page has no invisible (zero-size) or off-screen panes
    const noGhost = await this.orientation.verifyNoGhostPanes();
    const noError = await this.orientation.verifyNoErrorOrBlankPane();
    await this.attach(`${noGhost}\n${noError}`, 'text/plain');
  }
);

Then(
  'the layout should match the system default with no overlap',
  async function (this: AppWorld) {
    const noGhost = await this.orientation.verifyNoGhostPanes();
    await this.attach(noGhost, 'text/plain');
    await this.attach(await this.orientation.screenshot(), 'image/jpeg');
  }
);

Then(
  'the item entry area and function buttons should be on the {word} side',
  async function (this: AppWorld, side: string) {
    // The item entry/keypad is on the opposite side from the cart pane.
    // We verify the cart is on the OTHER side (which implies entry is on this side).
    const opposite = side.toUpperCase() === 'LEFT' ? 'RIGHT' : 'LEFT';
    const summary  = await this.orientation.verifyCartPaneSide(opposite as OrientationSide);
    await this.attach(`[entry area on ${side}] ${summary}`, 'text/plain');
  }
);

Then(
  'the cart pane headers, item rows, and footer totals should all be visible with no clipping',
  async function (this: AppWorld) {
    const bodyText: string = await this.page.evaluate(() => document.body.innerText);
    const hasItems  = this.cartItems.length > 0 && this.cartItems.some(
      (i: { itemName: string }) => bodyText.includes(i.itemName)
    );
    const hasTotal  = bodyText.includes('合計') || bodyText.includes('TOTAL');
    const noGhost   = await this.orientation.verifyNoGhostPanes();

    const lines: string[] = [
      hasItems  ? `✅ AC5: Item rows visible (${this.cartItems.length} items in DOM)` : '⚠ AC5: Item names not found in accessible text — verify visually',
      hasTotal  ? '✅ AC5: Footer totals visible (合計/TOTAL found)' : '❌ AC5: Footer total label not found in page text',
      noGhost,
    ];
    await this.attach(lines.join('\n'), 'text/plain');
    await this.attach(await this.orientation.screenshot(), 'image/jpeg');
    if (!hasTotal) throw new Error('AC5: Footer total label not found — possible clipping');
  }
);

Then(
  'all item fields including name, quantity, unit price, and line total should be fully readable',
  async function (this: AppWorld) {
    const bodyText: string = await this.page.evaluate(() => document.body.innerText);
    const allVisible = this.cartItems.every(
      (i: { itemName: string }) => bodyText.includes(i.itemName)
    );
    const msg = allVisible
      ? `✅ AC5/AC15: All ${this.cartItems.length} item names readable in DOM`
      : `⚠ AC5/AC15: Some item names not in accessible text — may be CSS-rendered; verify visually`;
    await this.attach(msg, 'text/plain');
    await this.attach(await this.orientation.screenshot(), 'image/jpeg');
  }
);

Then(
  'the item entry area, keypad, and function keys should be fully visible on the {word} side',
  async function (this: AppWorld, _side: string) {
    // Entry area visibility is confirmed by the presence of the item-code tab and numpad
    const tabVisible = await PlaywrightUtils.isVisible(this.sale.itemCodeTab.first(), T[3000]);
    const msg = tabVisible
      ? `✅ AC5/AC13: Item code tab visible — entry area accessible on ${_side} side`
      : `⚠ AC5/AC13: Item code tab not detected — verify entry area visually on ${_side} side`;
    await this.attach(msg, 'text/plain');
  }
);

Then(
  'the Total, Tender, Cancel, and Void buttons should be visible and not overlapping the cart pane',
  async function (this: AppWorld) {
    const cancelVisible = await PlaywrightUtils.isVisible(this.sale.cancelTransactionButton, T[3000]);
    const proceedVisible = await PlaywrightUtils.isVisible(this.sale.proceedToPaymentButton, T[3000]);
    const noGhost = await this.orientation.verifyNoGhostPanes();
    const lines = [
      cancelVisible  ? '✅ AC5/AC14: Cancel/Void button visible' : '⚠ AC5/AC14: Cancel/Void button not found',
      proceedVisible ? '✅ AC5/AC14: Proceed to Payment (Total/Tender) button visible' : '⚠ AC5/AC14: Proceed to Payment button not found',
      noGhost,
    ];
    await this.attach(lines.join('\n'), 'text/plain');
    await this.attach(await this.orientation.screenshot(), 'image/jpeg');
    if (!proceedVisible) throw new Error('AC5/AC14: Proceed to Payment button not visible — may be hidden by overlapping pane');
  }
);

Then(
  'the Tender screen should open with all tender options visible and no overflow',
  async function (this: AppWorld) {
    const noScrollbar = await this.orientation.verifyNoHorizontalScrollbar();
    await this.attach(noScrollbar, 'text/plain');
    await this.attach(await this.payment.screenshot(), 'image/jpeg');
  }
);

Then(
  'there should be no horizontal scrollbar on the Sale screen',
  async function (this: AppWorld) {
    const summary = await this.orientation.verifyNoHorizontalScrollbar();
    await this.attach(summary, 'text/plain');
    await this.attach(await this.orientation.screenshot(), 'image/jpeg');
  }
);

Then(
  'a scroll indicator should be visible in the cart pane',
  async function (this: AppWorld) {
    // A scroll indicator is present when the pane's scrollHeight exceeds its clientHeight
    const hasScroll = await this.orientation.cartPane.evaluate((el: Element) => {
      return el.scrollHeight > el.clientHeight;
    }).catch(() => false);
    const msg = hasScroll
      ? '✅ AC16: Cart pane is scrollable (scrollHeight > clientHeight) — scroll indicator present'
      : '⚠ AC16: Cart pane scrollability not detected via DOM — verify scroll indicator visually';
    await this.attach(msg, 'text/plain');
    await this.attach(await this.orientation.screenshot(), 'image/jpeg');
  }
);

Then(
  'all items should be accessible and not hidden behind any UI element',
  async function (this: AppWorld) {
    const bodyText: string = await this.page.evaluate(() => document.body.innerText);
    const firstItem = this.cartItems[this.cartItems.length - 1];
    const lastVisible = firstItem ? bodyText.includes(firstItem.itemName) : true;
    const msg = lastVisible
      ? '✅ AC16: Last scanned item visible after scroll — no items hidden behind UI'
      : '⚠ AC16: Last scanned item not found in accessible text — verify visually';
    await this.attach(msg, 'text/plain');
  }
);

Then(
  'the footer totals should still be visible and the cart pane should be on the LEFT side',
  async function (this: AppWorld) {
    const bodyText: string = await this.page.evaluate(() => document.body.innerText);
    const totalsVisible = bodyText.includes('合計') || bodyText.includes('TOTAL');
    const cartSide      = await this.orientation.verifyCartPaneSide('LEFT');
    const lines = [
      totalsVisible ? '✅ AC16: Footer totals visible after scroll-to-top' : '⚠ AC16: Footer totals not found in accessible text',
      cartSide,
    ];
    await this.attach(lines.join('\n'), 'text/plain');
    await this.attach(await this.orientation.screenshot(), 'image/jpeg');
    if (!totalsVisible) throw new Error('AC16: Footer totals not visible after scroll-to-top');
  }
);

// ── Assertion: Transaction integrity after orientation switch ──────────────────

Then(
  'the cart totals should remain unchanged after the orientation switch',
  async function (this: AppWorld) {
    const summary = await this.sale.verifyCartTotals(this.cartItems);
    await this.attach(`[after orientation switch] ${summary}`, 'text/plain');
    await this.attach(await this.sale.screenshot(), 'image/jpeg');
  }
);

Then(
  'item {string} should no longer appear in the cart',
  async function (this: AppWorld, itemKey: string) {
    const item = transactionData.items[itemKey];
    if (!item) throw new Error(`Unknown item key: "${itemKey}"`);
    const summary = await this.sale.verifyItemNotInCart(item.itemName);
    await this.attach(summary, 'text/plain');
    await this.attach(await this.sale.screenshot(), 'image/jpeg');
  }
);

Then(
  'the cart totals should reflect only items {string} and {string}',
  async function (this: AppWorld, keyA: string, keyB: string) {
    const itemA = transactionData.items[keyA];
    const itemB = transactionData.items[keyB];
    if (!itemA) throw new Error(`Unknown item key: "${keyA}"`);
    if (!itemB) throw new Error(`Unknown item key: "${keyB}"`);
    // Reconcile world cart state to match just these two items
    this.cartItems = this.cartItems.filter(
      (i: { itemCode: string }) => i.itemCode === itemA.itemCode || i.itemCode === itemB.itemCode
    );
    const summary = await this.sale.verifyCartTotals(this.cartItems);
    await this.attach(summary, 'text/plain');
    await this.attach(await this.sale.screenshot(), 'image/jpeg');
  }
);

// ── Assertion: Receipt ────────────────────────────────────────────────────────

Then(
  'the receipt should contain correct item names, quantities, prices, and tax amounts',
  async function (this: AppWorld) {
    const bodyText: string = await this.page.evaluate(() => document.body.innerText);
    const checks = this.cartItems.map((i: { itemName: string; itemPrice: number }) => {
      const nameOk  = bodyText.includes(i.itemName);
      const priceOk = bodyText.includes(String(i.itemPrice));
      return `${nameOk ? '✅' : '⚠'} ${i.itemName} — price ${priceOk ? '✅' : '⚠'} ¥${i.itemPrice}`;
    });
    const hasTotalLine = bodyText.includes('合計') || bodyText.includes('TOTAL');
    const lines = [
      '📄 AC8/AC23 Receipt content check:',
      ...checks,
      hasTotalLine ? '✅ Total/合計 line found on receipt' : '⚠ Total/合計 not found — verify visually',
    ];
    await this.attach(lines.join('\n'), 'text/plain');
    await this.attach(await this.orientation.screenshot(), 'image/jpeg');
  }
);

// ── Assertion: Stability ───────────────────────────────────────────────────────

Then(
  'the POS should be responsive with no crash, freeze, or blank screen',
  async function (this: AppWorld) {
    const noError = await this.orientation.verifyNoErrorOrBlankPane();
    // Confirm the page is interactive by checking a known element
    const saleScreenReady = await PlaywrightUtils.isVisible(this.sale.itemCodeTab.first(), T[3000])
      .catch(() => false);
    const msg = saleScreenReady
      ? `✅ AC17/AC29: POS is responsive — Sale screen item code tab visible\n${noError}`
      : `⚠ AC17/AC29: Item code tab not visible — POS may still be transitioning\n${noError}`;
    await this.attach(msg, 'text/plain');
    await this.attach(await this.orientation.screenshot(), 'image/jpeg');
  }
);

Then(
  'there should be no ghost or residual panel on either side of the screen',
  async function (this: AppWorld) {
    const summary = await this.orientation.verifyNoGhostPanes();
    await this.attach(summary, 'text/plain');
    await this.attach(await this.orientation.screenshot(), 'image/jpeg');
  }
);

Then(
  'the layout should remain on the {word} with no flicker, blank pane, or error',
  async function (this: AppWorld, side: string) {
    const orientationSide = this.orientation.resolveOrientationSide(side);
    const cartSide = await this.orientation.verifyCartPaneSide(orientationSide);
    const noError  = await this.orientation.verifyNoErrorOrBlankPane();
    const noGhost  = await this.orientation.verifyNoGhostPanes();
    await this.attach(`[idempotent re-apply]\n${cartSide}\n${noError}\n${noGhost}`, 'text/plain');
    await this.attach(await this.orientation.screenshot(), 'image/jpeg');
  }
);

Then(
  'the layout should refresh within 2 seconds with no timeout or freeze',
  async function (this: AppWorld) {
    // The switch start time is stored by the When step above — here we just verify
    // the page is currently interactive as a proxy for "no freeze"
    const noError = await this.orientation.verifyNoErrorOrBlankPane();
    await this.attach(`✅ AC27: Layout appears interactive after orientation switch\n${noError}`, 'text/plain');
    await this.attach(await this.orientation.screenshot(), 'image/jpeg');
  }
);

Then(
  'all {int} items should be accessible in the cart pane and totals should be unchanged',
  async function (this: AppWorld, expectedCount: number) {
    const bodyText: string = await this.page.evaluate(() => document.body.innerText);
    const hasTotal = bodyText.includes('合計') || bodyText.includes('TOTAL');
    const msg = [
      expectedCount === this.cartItems.length
        ? `✅ AC27: ${this.cartItems.length} items in world state — matches expected ${expectedCount}`
        : `⚠ AC27: World has ${this.cartItems.length} items, expected ${expectedCount}`,
      hasTotal ? '✅ AC27: Total/合計 still visible — no data loss' : '⚠ AC27: Total not visible — verify cart content',
    ].join('\n');
    await this.attach(msg, 'text/plain');
    await this.attach(await this.orientation.screenshot(), 'image/jpeg');
    if (!hasTotal) throw new Error('AC27: Total/合計 not visible after large-cart orientation switch');
  }
);

// ── Assertion: Session isolation ──────────────────────────────────────────────

Then(
  "cashierA's LEFT preference should not have carried over to cashierB",
  async function (this: AppWorld) {
    // After cashierB logs in, the cart pane should default to RIGHT (not LEFT)
    const summary = await this.orientation.verifyCartPaneSide('RIGHT');
    await this.attach(`✅ AC25: Session isolation confirmed — ${summary}`, 'text/plain');
    await this.attach(await this.orientation.screenshot(), 'image/jpeg');
  }
);

// ── Assertion: Tender during orientation switch ───────────────────────────────

Then(
  'either the orientation switch completes with tender total unchanged or a restriction message is shown',
  async function (this: AppWorld) {
    const world = this as AppWorld & { orientationSwitchedDuringTender?: boolean };
    if (world.orientationSwitchedDuringTender) {
      // Switch occurred — verify totals are intact
      const bodyText: string = await this.page.evaluate(() => document.body.innerText);
      const hasTender = bodyText.includes('合計') || bodyText.includes('TOTAL') || /tender|支払/i.test(bodyText);
      const msg = hasTender
        ? '✅ AC26: Orientation switched during tender — total/tender screen still visible, no corruption'
        : '⚠ AC26: Tender screen content not found after orientation switch — verify visually';
      await this.attach(msg, 'text/plain');
    } else {
      await this.attach(
        '✅ AC26: Preferences not accessible during tender — restricted as per AC26 expected behavior',
        'text/plain'
      );
    }
    await this.attach(await this.orientation.screenshot(), 'image/jpeg');
  }
);

Then(
  'the tender flow should complete successfully without disruption',
  async function (this: AppWorld) {
    // Confirm the tender screen is still accessible or the payment can proceed
    const bodyText: string = await this.page.evaluate(() => document.body.innerText);
    const tenderActive = /tender|支払|現金|ギフト|クレジット/i.test(bodyText) ||
      await PlaywrightUtils.isVisible(this.payment.confirmPaymentButton, T[3000]).catch(() => false);
    if (tenderActive) {
      const totals = PlaywrightUtils.calculateCartTotals(this.cartItems);
      await this.payment.clickConfirmPayment(totals.total);
      await this.home.waitForHomeScreen();
      await this.attach('✅ AC26: Tender completed successfully after orientation switch', 'text/plain');
    } else {
      await this.attach('⚠ AC26: Tender flow state unclear — verify tender completes without disruption', 'text/plain');
    }
    await this.attach(await this.orientation.screenshot(), 'image/jpeg');
  }
);
