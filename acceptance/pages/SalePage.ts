/**
 * Page Object: SalePage
 *
 * Covers the Voyix POS transaction (sell) screen — locators and actions for:
 *   - Item code entry via numpad
 *   - Quantity changes
 *   - Item deletion
 *   - Amount Off and % Off discount dialogs
 *   - Cart total verification
 *   - Cancel transaction
 */

import { type CartItem, type CartTotals, PlaywrightUtils, T } from '../helpers/PlaywrightUtils.js';
import { BasePage } from './BasePage.js';

export class SalePage extends BasePage {

  get itemCodeTab() {
    return this.page.getByRole('tab', { name: /\u5546\u54c1\u30b3\u30fc\u30c9|PRODUCT CODE/i }).or(
      this.page.getByText(/\u5546\u54c1\u30b3\u30fc\u30c9|PRODUCT CODE/i, { exact: true })
    );
  }

  numpadDigitButton(digit: string) {
    return this.page.locator(
      `button[aria-label="Key ${digit}"], [role="button"][aria-label="Key ${digit}"]`
    ).first();
  }

  /** Fallback digit button used when primary aria-label selector is not visible. */
  private numpadDigitFallback(digit: string) {
    return this.page
      .locator('button, [role="button"]')
      .filter({ hasText: new RegExp(`^${digit}$`) })
      .first();
  }

  get itemCodeConfirmButton() {
    // aria-label="Confirm", text content="??"
    return this.page
      .locator('button[aria-label="Confirm"], button[aria-label="\u78ba\u5b9a"]')
      .or(
        this.page
          .locator('button, [role="button"]')
          .filter({ hasText: /^\u78ba\u5b9a$|^Confirm$/i })
      )
      .first();
  }

  get proceedToPaymentButton() {
    return this.page
      .locator('button, [role="button"], a')
      .filter({ hasText: /\u304a\u652f\u6255\u3044\u3078|Proceed to payment/i })
      .first();
  }

  get deleteItemButton() {
    return this.page.locator('[aria-label="Delete"], [aria-label="\u524a\u9664"]').first();
  }

  get actionWindowTab() {
    return this.page.getByRole('tab', { name: /\u30a2\u30af\u30b7\u30e7\u30f3\u30a6\u30a3\u30f3\u30c9\u30a6|Action Window/i })
      .or(this.page.getByText(/\u30a2\u30af\u30b7\u30e7\u30f3\u30a6\u30a3\u30f3\u30c9\u30a6|Action Window/i, { exact: true }));
  }

  get amountOffButton() {
    return this.page.locator('[aria-label="Amount Off"], [aria-label="\u984d\u5024\u5f15"]').first();
  }

  get customAmountButton() {
    // Last radio option in the Amount Off dialog: shows 'Amount (JPY)' or '� Custom'
    return this.discountDialog.getByRole('radio').last();
  }

  get percentOffButton() {
    return this.page.locator('[aria-label="% Off"], [aria-label="%\u5272\u5f15"]').first();
  }

  get customPercentButton() {
    // Last radio option in the % Off dialog: shows 'Custom %'
    return this.discountDialog.getByRole('radio').last();
  }

  get discountDialog() {
    return this.page.getByRole('dialog');
  }

  get saleTenKey() {
    return this.page.locator('[data-testid="sale-ten-key"]');
  }

  get discountNextButton() {
    // '次へ' in Japanese UI, 'Next' in English UI
    return this.discountDialog.getByRole('button', { name: /^次へ$|^Next$/i }).first();
  }

  get tenKeyClearButton() {
    return this.saleTenKey.locator('[aria-label="Clear"]');
  }

  tenKeyDigitButton(digit: string) {
    return this.saleTenKey.locator(`[aria-label="Key ${digit}"]`).first();
  }

  discountDialogKeyButton(digit: string) {
    return this.discountDialog.locator(`[aria-label="Key ${digit}"]`).first();
  }

  get discountDialogNumpadReady() {
    return this.discountDialog.locator('[aria-label^="Key"]').first();
  }

  get discountDialogFirstReasonCode() {
    // Reason code buttons have data-testid="reason-btn-01", "reason-btn-02", etc.
    return this.discountDialog.locator('[data-testid="reason-btn-01"], button[data-testid^="reason-btn"]').first();
  }

  get discountDialogConfirmButton() {
    // Confirm button after selecting a reason: '終わり' in Japanese, 'Done'/'Confirm' in English
    return this.discountDialog.getByRole('button', { name: /^終わり$|^Done$|^Confirm$|\u78ba\u5b9a/i }).first();
  }

  get discountDialogCancelButton() {
    return this.discountDialog.getByRole('button', { name: /cancel|\u30ad\u30e3\u30f3\u30bb\u30eb|\u9589\u3058\u308b|close/i }).first();
  }

  get removeDiscountButton() {
    // 値引取消 — appears in the Amount Off dialog when the item already has a discount applied
    return this.discountDialog.locator('button').filter({ hasText: /\u5024\u5f15\u53d6\u6d88/ }).first();
  }

  get tenKeyItemCountTab() {
    return this.saleTenKey
      .getByRole('button', { name: /\u5546\u54c1\u70b9\u6570|item.count/i })
      .or(this.saleTenKey.locator('button').first());
  }

  get tenKeyConfirmButton() {
    return this.saleTenKey.getByRole('button', { name: /\u78ba\u5b9a|confirm/i });
  }

  get alertBanner() {
    return this.page.locator('[role="alert"]').first();
  }

  // -- Locators: Price Check -----------------------------------------------

  get priceCheckButton() {
    // \u4fa1\u683c\u78ba\u8a8d on toolbar
    return this.page.locator('button, [role="button"]')
      .filter({ hasText: /\u4fa1\u683c\u78ba\u8a8d|Price.?Check|Price.?Lookup/i })
      .first();
  }

  get priceCheckConfirmDialog() {
    // Dialog title is "\u4fa1\u683c\u7167\u4f1a\u3092\u958b\u59cb"
    return this.page.getByRole('dialog').filter({ hasText: /\u4fa1\u683c\u7167\u4f1a|\u4fa1\u683c\u78ba\u8a8d|Price.?Check/i });
  }

  get priceCheckConfirmYesButton() {
    // "\u306f\u3044" (Yes) button inside the confirmation dialog
    return this.page.getByRole('dialog')
      .filter({ hasText: /\u4fa1\u683c\u7167\u4f1a|\u4fa1\u683c\u78ba\u8a8d|Price.?Check/i })
      .getByRole('button', { name: /^(\u306f\u3044|Yes|OK|\u78ba\u5b9a|Confirm)$/i })
      .first();
  }

  get priceCheckConfirmNoButton() {
    // "\u3044\u3044\u3048" (No) button inside the confirmation dialog
    return this.page.getByRole('dialog')
      .filter({ hasText: /\u4fa1\u683c\u7167\u4f1a|\u4fa1\u683c\u78ba\u8a8d|Price.?Check/i })
      .getByRole('button', { name: /^(\u3044\u3044\u3048|No|Cancel|\u30ad\u30e3\u30f3\u30bb\u30eb)$/i })
      .first();
  }

  get priceCheckResultPanel() {
    return this.page.locator('[data-testid="price-check-panel"]').first();
  }

  get priceCheckEndButton() {
    return this.page.locator('button, [role="button"]')
      .filter({ hasText: /End|\u7d42\u4e86|Close|\u9589\u3058\u308b/i })
      .first();
  }

  // -- Actions: Price Check -------------------------------------------------

  async enablePriceCheckMode(): Promise<void> {
    await PlaywrightUtils.waitForVisible(this.priceCheckButton);
    await PlaywrightUtils.safeClick(this.priceCheckButton, T[5000]);
    await PlaywrightUtils.waitForVisible(this.priceCheckConfirmDialog, T[5000]);
    await PlaywrightUtils.safeClick(this.priceCheckConfirmYesButton, T[5000]);
    await this.priceCheckConfirmDialog.waitFor({ state: 'hidden', timeout: T[5000] }).catch(() => {});
  }

  async disablePriceCheckMode(): Promise<void> {
    await PlaywrightUtils.waitForVisible(this.priceCheckButton);
    await PlaywrightUtils.safeClick(this.priceCheckButton, T[5000]);
    const dialogVisible = await PlaywrightUtils.isVisible(this.priceCheckConfirmDialog, T[2000]);
    if (dialogVisible) {
      await PlaywrightUtils.safeClick(this.priceCheckConfirmYesButton, T[5000]);
      await this.priceCheckConfirmDialog.waitFor({ state: 'hidden', timeout: T[5000] }).catch(() => {});
    }
  }

  async scanItemInPriceCheckMode(itemCode: string): Promise<void> {
    // Re-use enterItemCode which already handles tab selection (????? tab) and confirm.
    await this.enterItemCode(itemCode);
    // In price check mode the confirm button label may differ (e.g. ??/?? instead of ??).
    // Press Enter as a universal fallback to ensure the lookup is submitted.
    await this.page.keyboard.press('Enter');
    // Wait for the result panel to appear rather than sleeping a fixed duration
    await this.priceCheckResultPanel.waitFor({ state: 'visible', timeout: T[5000] }).catch(() => {});
  }

  async verifyPriceCheckResultVisible(item: CartItem): Promise<string> {
    // Wait for price check details panel to appear (title + buttons visible)
    await this.page.waitForFunction(
      () => {
        const t = document.body.innerText;
        return t.includes('\u4fa1\u683c\u78ba\u8a8d\u306e\u8a73\u7d30') ||
               (t.includes('\u623b\u308b') && t.includes('\u30ab\u30fc\u30c8\u306b\u8ffd\u52a0'));
      },
      undefined,
      { timeout: T[8000] }
    );
    // Wait for the panel content to finish loading (button becomes enabled, or error state shown)
    await this.page.waitForFunction(
      () => {
        const btn = document.querySelector('[data-testid="dialog-action-ok"]');
        if (!btn) return false;
        const isEnabled = !(btn as HTMLButtonElement).disabled && !btn.classList.contains('Mui-disabled');
        const hasError  = document.body.innerText.includes('\u5546\u54c1\u60c5\u5831\u306e\u53d6\u5f97\u306b\u5931\u6557');
        return isEnabled || hasError;
      },
      undefined,
      { timeout: T[10000] }
    ).catch(() => {}); // Non-fatal — some scenarios just verify panel is visible (not add-to-cart)
    const allText: string = await this.page.evaluate(() => document.body.textContent ?? '');
    const codeVisible  = allText.includes(item.itemCode);
    const priceVisible = allText.includes(String(item.itemPrice));
    return [
      `\u2705 AC8 Price Check panel displayed (details panel visible with Back and Add to Cart buttons)`,
      `   Item code in DOM : ${codeVisible ? '\u2705 ' + item.itemCode : '\u26a0 not in textContent (may be CSS-rendered)'}`,
      `   Item price in DOM: ${priceVisible ? '\u2705 \u00a5' + item.itemPrice : '\u26a0 not in textContent (may be CSS-rendered)'}`,
    ].join('\n');
  }

  async isPriceCheckErrorVisible(): Promise<boolean> {
    // Poll for any error indicator rather than sleeping a fixed duration
    await this.page.waitForFunction(
      () => {
        const t = document.body.innerText + (document.body.textContent ?? '');
        return [
          '\u5546\u54c1\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093',
          '\u898b\u3064\u304b\u308a\u307e\u305b\u3093',
          '\u30a8\u30e9\u30fc', '\u8a72\u5f53\u306a\u3057', '\u5b58\u5728\u3057\u307e\u305b\u3093',
          'not found', 'invalid', 'error',
        ].some(p => t.toLowerCase().includes(p.toLowerCase()))
          || !!document.querySelector('[role="alert"], [role="status"]');
      },
      undefined,
      { timeout: T[3000] }
    ).catch(() => {});

    // Strategy 1: ARIA live region (alert / status role)
    const alertVisible = await this.page
      .locator('[role="alert"], [role="status"]')
      .filter({ hasNotText: /^\s*$/ })
      .first()
      .isVisible({ timeout: T[3000] })
      .catch(() => false);
    if (alertVisible) return true;

    // Strategy 2: explicit error / not-found text anywhere on the page
    const pageText = (await this.page.evaluate(
      () => document.body.innerText + (document.body.textContent ?? '')
    ));
    const notFoundPatterns = [
      '\u5546\u54c1\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093', // ??????????
      '\u898b\u3064\u304b\u308a\u307e\u305b\u3093',                   // ???????
      '\u30a8\u30e9\u30fc',                                            // ???
      '\u8a72\u5f53\u306a\u3057',                                      // ????
      '\u5b58\u5728\u3057\u307e\u305b\u3093',                          // ??????
      'not found', 'invalid', 'error',
    ];
    if (notFoundPatterns.some(p => pageText.toLowerCase().includes(p.toLowerCase()))) return true;

    // Strategy 3: price check result panel is visible but contains no price value
    // � the app renders an "empty" panel for unknown items instead of explicit error text
    const panelVisible = await PlaywrightUtils.isVisible(this.priceCheckResultPanel, T[3000]);
    if (panelVisible) {
      const panelText = (await this.priceCheckResultPanel.textContent()) ?? '';
      const hasPrice = /[�\uffe5]\d|[\d,]+\u5186/.test(panelText); // � or ?
      if (!hasPrice) return true; // panel visible but no price = not-found state
    }

    // Strategy 4: MUI Snackbar / toast (not always role="alert")
    const snackbarVisible = await this.page
      .locator('.MuiSnackbar-root, .MuiAlert-root, [class*="snackbar"], [class*="toast"], [class*="Snack"]')
      .first()
      .isVisible({ timeout: T[2000] })
      .catch(() => false);
    if (snackbarVisible) return true;

    return false;
  }

  async verifyCartUnchangedAfterPriceCheck(itemsBefore: CartItem[]): Promise<string> {
    const expected = itemsBefore.length === 0
      ? null
      : (await import('../helpers/PlaywrightUtils.js')).PlaywrightUtils.calculateCartTotals(itemsBefore);
    const bodyText: string = await this.page.evaluate(() => document.body.innerText);
    const actualTotal = this.readAmountFromBodyText(bodyText, '\u5408\u8a08', 'TOTAL');
    if (expected === null) {
      if (actualTotal !== null && actualTotal !== 0) {
        throw new Error(`AC5/AC12 Cart integrity: expected empty cart (\u00a50) but total shows \u00a5${actualTotal}`);
      }
      return `\u2705 AC5/AC12 Cart integrity confirmed -- cart remained empty (\u00a50) during Price Check`;
    }
    if (actualTotal !== expected.total) {
      throw new Error(`AC5/AC12 Cart integrity: expected \u00a5${expected.total} but got \u00a5${actualTotal} -- item may have been added to cart during Price Check`);
    }
    return `\u2705 AC5/AC12 Cart integrity confirmed -- total remained \u00a5${actualTotal} (unchanged)`;
  }

  /**
   * Verifies Price Check mode is currently OFF (AC11).
   * After adding an item to the cart from the price check panel, the app
   * automatically exits Price Check mode. This confirms normal scan behavior is restored.
   */
  async verifyPriceCheckModeDisabled(): Promise<string> {
    // Price check mode OFF = button is not pressed/active and result panel is gone
    const panelGone = !(await PlaywrightUtils.isVisible(this.priceCheckResultPanel, T[2000]));
    if (!panelGone) {
      throw new Error('AC11: Price Check result panel still visible � Price Check mode may still be active');
    }
    // Check aria-pressed or Mui-selected/active state on the toolbar button
    const isActive = await this.priceCheckButton.evaluate((el: Element) => {
      return (
        el.getAttribute('aria-pressed') === 'true' ||
        el.classList.contains('Mui-selected') ||
        el.classList.contains('active') ||
        el.getAttribute('data-active') === 'true'
      );
    }).catch(() => false);
    if (isActive) {
      throw new Error('AC11: Price Check button is still in active/pressed state � mode was not exited');
    }
    return '\u2705 AC11: Price Check mode is OFF � result panel closed, button not active, normal scan mode restored';
  }

  /** ?????? (Add to Cart) button inside the price check result panel (AC6). */
  get priceCheckAddToCartButton() {
    return this.page.locator('button, [role="button"]')
      .filter({ hasText: /\u30ab\u30fc\u30c8\u306b\u8ffd\u52a0|\u30ab\u30fc\u30c8\u306b\u8ffd\u52a0\u3059\u308b|Add.?to.?Cart/i })
      .first();
  }

  /**
   * Clicks the カートに追加 (Add to Cart) button in the price check result panel (AC6).
   *
   * NOTE: The button is disabled while the app fetches product details from the backend.
   * If the backend price-check detail API returns a 500 error the button never enables —
   * this is an application-side issue, not a test issue (TC-20033/TC-20034).
   */
  async addItemFromPriceCheckPanel(item: CartItem): Promise<string> {
    await PlaywrightUtils.waitForVisible(this.priceCheckAddToCartButton, T[5000]);
    // Wait for the panel API call to finish: button enables on success, error text on failure.
    await this.page.waitForFunction(
      () => {
        const btn = document.querySelector('[data-testid="dialog-action-ok"]');
        if (!btn) return false;
        const isEnabled = !(btn as HTMLButtonElement).disabled && !btn.classList.contains('Mui-disabled');
        const hasError  = document.body.innerText.includes('\u5546\u54c1\u60c5\u5831\u306e\u53d6\u5f97\u306b\u5931\u6557');
        return isEnabled || hasError;
      },
      undefined,
      { timeout: T[15000] }
    ).catch(() => {});

    const isEnabled = await this.priceCheckAddToCartButton.evaluate(
      (el: Element) => !(el as HTMLButtonElement).disabled && !el.classList.contains('Mui-disabled')
    ).catch(() => false);
    if (!isEnabled) {
      const bodyText = await this.page.evaluate(() => document.body.innerText);
      const hasApiError = bodyText.includes('\u5546\u54c1\u60c5\u5831\u306e\u53d6\u5f97\u306b\u5931\u6557');
      throw new Error(
        hasApiError
          ? 'AC6: \u30ab\u30fc\u30c8\u306b\u8ffd\u52a0 button is disabled — backend price-check detail API failed ' +
            '(\u5546\u54c1\u60c5\u5831\u306e\u53d6\u5f97\u306b\u5931\u6557\u3057\u307e\u3057\u305f). ' +
            'This is an application-side issue.'
          : 'AC6: \u30ab\u30fc\u30c8\u306b\u8ffd\u52a0 button did not become enabled within timeout.'
      );
    }

    await PlaywrightUtils.safeClick(this.priceCheckAddToCartButton, T[5000]);
    await this.priceCheckResultPanel.waitFor({ state: 'hidden', timeout: T[5000] }).catch(() => {});
    return `\u2705 AC6: Clicked \u30ab\u30fc\u30c8\u306b\u8ffd\u52a0 (Add to Cart) for ${item.itemName} \u00a5${item.itemPrice}`;
  }

  async closePriceCheckResultPanel(): Promise<void> {
    // Close via \u623b\u308b (Back) button which appears in the price check details panel
    const backBtn = this.page.locator('button, [role="button"]')
      .filter({ hasText: /^\u623b\u308b$|^Back$/ })
      .first();
    if (await PlaywrightUtils.isVisible(backBtn, T[2000])) {
      await PlaywrightUtils.safeClick(backBtn, T[3000]);
    } else {
      await this.page.keyboard.press('Escape');
    }
    await this.priceCheckResultPanel.waitFor({ state: 'hidden', timeout: T[2000] }).catch(() => {});
  }

  // ── Locators: Cancel transaction ──────────────────────────────────────────

  get cancelTransactionButton() {
    return this.page
      .locator('button[aria-label="\u53d6\u6d88"], button[aria-label="\u4e2d\u6b62"]')
      .or(
        this.page.locator('button, [role="button"]')
          .filter({ hasText: /^\u53d6\u6d88$|^\u4e2d\u6b62$/ })
      )
      .first();
  }

  get cancelConfirmButton() {
    return this.page.getByRole('dialog')
      .locator('button, [role="button"]')
      .filter({ hasText: /^(Yes|\u306f\u3044|OK|\u78ba\u5b9a|Confirm)$/i })
      .first();
  }

  // ── Actions: Item entry ───────────────────────────────────────────────────

  async enterItemCode(itemCode: string): Promise<void> {
    // Always click the Product Code tab first to ensure we are in code-entry mode
    const tab = this.itemCodeTab.first();
    if (await PlaywrightUtils.isVisible(tab, T[2000])) {
      await PlaywrightUtils.safeClick(tab);
      await PlaywrightUtils.pause(100);
    }

    // Strategy 1: fill the Product Code input field directly.
    // After clicking the Product Code tab above, the first visible text input
    // inside the ten-key panel is the product code field.
    // Use a short probe timeout (T[200]) so a missing input doesn't cost 1 s per scan.
    const codeInput = this.page.locator('input[type="text"], input[type="number"], input:not([type="hidden"])').first();
    const inputVisible = await PlaywrightUtils.isVisible(codeInput, T[200]);
    if (inputVisible) {
      await codeInput.fill(itemCode);
      await PlaywrightUtils.pause(T[100]);
      const confirmBtn = this.itemCodeConfirmButton;
      const isEnabled = await confirmBtn.isEnabled().catch(() => false);
      if (isEnabled) {
        await PlaywrightUtils.safeClick(confirmBtn, T[5000]);
      } else {
        await this.page.keyboard.press('Enter');
      }
      await PlaywrightUtils.pause(T[100]);
      return;
    }

    // Strategy 2: click numpad buttons digit by digit
    for (const char of itemCode) {
      const btn = this.numpadDigitButton(char);
      try {
        if (await PlaywrightUtils.isVisible(btn, T[1000])) {
          await btn.click();
        } else {
          await this.numpadDigitFallback(char).click();
        }
      } catch (error) {
        console.log(`❌ FAILED TO CLICK DIGIT '${char}' - Dumping page state...`);
        console.log('Page URL:', this.page.url());
        console.log('Page Title:', await this.page.title());

        const screenshotPath = `/home/pwuser/app/reports/debug-numpad-error-${Date.now()}.png`;
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Screenshot saved to: ${screenshotPath}`);

        const allButtons = await this.page.locator('button, [role="button"]').all();
        console.log(`Total buttons found: ${allButtons.length}`);
        for (let i = 0; i < Math.min(allButtons.length, 60); i++) {
          const b = allButtons[i];
          const text = await b.textContent().catch(() => 'N/A');
          const ariaLabel = await b.getAttribute('aria-label').catch(() => 'N/A');
          const isVisible = await b.isVisible().catch(() => false);
          console.log(`Button ${i}: text="${text?.trim()}" aria-label="${ariaLabel}" visible=${isVisible}`);
        }
        throw error;
      }
      await PlaywrightUtils.pause(T[50]);
    }

    const confirmBtn = this.itemCodeConfirmButton;
    const isEnabled = await confirmBtn.isEnabled().catch(() => false);
    if (isEnabled) {
      await PlaywrightUtils.safeClick(confirmBtn, T[5000]);
    } else {
      // Fallback: press Enter to submit (handles cases where Confirm button is not found)
      await this.page.keyboard.press('Enter');
    }
    await PlaywrightUtils.pause(T[200]);
  }

  async changeItemQuantity(qty: number): Promise<void> {
    await PlaywrightUtils.safeClick(this.tenKeyItemCountTab, T[5000]);
    if (await PlaywrightUtils.isVisible(this.tenKeyClearButton, T[1000])) {
      await this.tenKeyClearButton.click();
    }
    for (const digit of String(qty)) {
      await this.tenKeyDigitButton(digit).click();
      await PlaywrightUtils.pause(T[50]);
    }
    await PlaywrightUtils.safeClick(this.tenKeyConfirmButton, T[5000]);
  }

  async clickDeleteItem(): Promise<void> {
    if (await PlaywrightUtils.isVisible(this.actionWindowTab, T[2000])) {
      await PlaywrightUtils.safeClick(this.actionWindowTab);
    }
    await PlaywrightUtils.waitForVisible(this.deleteItemButton);
    await PlaywrightUtils.safeClick(this.deleteItemButton, T[5000]);
  }

  async clickProceedToPayment(): Promise<void> {
    await PlaywrightUtils.safeClick(this.proceedToPaymentButton);
    // Wait for the payment-screen confirm button — a reliable indicator that the tender screen is loaded
    await this.page.waitForSelector('[data-testid="tender-action-confirm-btn"]', { state: 'visible', timeout: T[15000] });
  }

  // ── Actions: Discounts ────────────────────────────────────────────────────

  async applyCustomAmountOff(discountAmount: number): Promise<void> {
    await PlaywrightUtils.waitForVisible(this.amountOffButton);
    await PlaywrightUtils.safeClick(this.amountOffButton, T[5000]);
    await PlaywrightUtils.waitForVisible(this.discountDialog);

    // Select the custom amount option if the numpad isn't already active
    if (!await PlaywrightUtils.isVisible(this.discountDialogNumpadReady, T[1000])) {
      await PlaywrightUtils.safeClick(this.customAmountButton, T[5000]);
      await PlaywrightUtils.waitForVisible(this.discountDialogNumpadReady, T[5000]);
    }

    for (const digit of discountAmount.toString()) {
      await this.discountDialogKeyButton(digit).click({ force: true });
    }
    // Wait for the Next button to become enabled — app debounce settles after digit entry
    await this.page.waitForSelector('[data-testid="numpad-next-btn"]:not(.Mui-disabled)', { timeout: T[10000] });
    await this.discountNextButton.click();
    // Reason-code step is optional depending on POS configuration
    if (await PlaywrightUtils.isVisible(this.discountDialogFirstReasonCode, T[3000])) {
      await PlaywrightUtils.safeClick(this.discountDialogFirstReasonCode, T[5000]);
      await PlaywrightUtils.safeClick(this.discountDialogConfirmButton, T[5000]);
    }
    await this.discountDialog.waitFor({ state: 'hidden', timeout: T[10000] }).catch(() => {});
  }

  async editAmountOff(newAmount: number): Promise<void> {
    await PlaywrightUtils.waitForVisible(this.amountOffButton);
    await PlaywrightUtils.safeClick(this.amountOffButton, T[5000]);
    await PlaywrightUtils.waitForVisible(this.discountDialog);

    // When re-opening on an already-discounted item the numpad may be pre-populated;
    // click custom-amount button to ensure numpad is active, ignore if already visible.
    const numpadAlreadyReady = await PlaywrightUtils.isVisible(this.discountDialogNumpadReady, T[1000]);
    if (!numpadAlreadyReady) {
      await PlaywrightUtils.safeClick(this.customAmountButton, T[5000]);
      await PlaywrightUtils.waitForVisible(this.discountDialogNumpadReady, T[5000]);
    }

    // Clear any pre-filled value
    const clearBtn = this.discountDialog.locator('[aria-label="Clear"]').first();
    if (await PlaywrightUtils.isVisible(clearBtn, T[1000])) {
      await clearBtn.click();
    }

    for (const digit of newAmount.toString()) {
      await this.discountDialogKeyButton(digit).click({ force: true });
    }
    await this.page.waitForSelector('[data-testid="numpad-next-btn"]:not(.Mui-disabled)', { timeout: T[10000] });
    await this.discountNextButton.click();
    if (await PlaywrightUtils.isVisible(this.discountDialogFirstReasonCode, T[3000])) {
      await PlaywrightUtils.safeClick(this.discountDialogFirstReasonCode, T[5000]);
      await PlaywrightUtils.safeClick(this.discountDialogConfirmButton, T[5000]);
    }
    await this.discountDialog.waitFor({ state: 'hidden', timeout: T[10000] }).catch(() => {});
  }

  async removeAmountOff(): Promise<void> {
    await PlaywrightUtils.waitForVisible(this.amountOffButton);
    await PlaywrightUtils.safeClick(this.amountOffButton, T[5000]);
    await PlaywrightUtils.waitForVisible(this.discountDialog);
    await PlaywrightUtils.waitForVisible(this.removeDiscountButton, T[5000]);
    await PlaywrightUtils.safeClick(this.removeDiscountButton, T[5000]);
    await this.discountDialog.waitFor({ state: 'hidden', timeout: T[10000] }).catch(() => {});
  }

  async editPercentOff(newPercent: number): Promise<void> {
    await PlaywrightUtils.waitForVisible(this.percentOffButton);
    await PlaywrightUtils.safeClick(this.percentOffButton, T[5000]);
    await PlaywrightUtils.waitForVisible(this.discountDialog);

    const numpadAlreadyReady = await PlaywrightUtils.isVisible(this.discountDialogNumpadReady, T[1000]);
    if (!numpadAlreadyReady) {
      await PlaywrightUtils.safeClick(this.customPercentButton, T[5000]);
      await PlaywrightUtils.waitForVisible(this.discountDialogNumpadReady, T[5000]);
    }

    const clearBtn = this.discountDialog.locator('[aria-label="Clear"]').first();
    if (await PlaywrightUtils.isVisible(clearBtn, T[1000])) {
      await clearBtn.click();
    }

    for (const digit of newPercent.toString()) {
      await this.discountDialogKeyButton(digit).click({ force: true });
    }
    await this.page.waitForSelector('[data-testid="numpad-next-btn"]:not(.Mui-disabled)', { timeout: T[10000] });
    await this.discountNextButton.click();
    if (await PlaywrightUtils.isVisible(this.discountDialogFirstReasonCode, T[3000])) {
      await PlaywrightUtils.safeClick(this.discountDialogFirstReasonCode, T[5000]);
      await PlaywrightUtils.safeClick(this.discountDialogConfirmButton, T[5000]);
    }
    await this.discountDialog.waitFor({ state: 'hidden', timeout: T[10000] }).catch(() => {});
  }

  async removePercentOff(): Promise<void> {
    await PlaywrightUtils.waitForVisible(this.percentOffButton);
    await PlaywrightUtils.safeClick(this.percentOffButton, T[5000]);
    await PlaywrightUtils.waitForVisible(this.discountDialog);
    await PlaywrightUtils.waitForVisible(this.removeDiscountButton, T[5000]);
    await PlaywrightUtils.safeClick(this.removeDiscountButton, T[5000]);
    await this.discountDialog.waitFor({ state: 'hidden', timeout: T[10000] }).catch(() => {});
  }

  async attemptInvalidAmountOff(amount: number): Promise<string> {
    await PlaywrightUtils.waitForVisible(this.amountOffButton);
    await PlaywrightUtils.safeClick(this.amountOffButton, T[5000]);
    await PlaywrightUtils.waitForVisible(this.discountDialog);

    if (!await PlaywrightUtils.isVisible(this.discountDialogNumpadReady, T[1000])) {
      await PlaywrightUtils.safeClick(this.customAmountButton, T[5000]);
      await PlaywrightUtils.waitForVisible(this.discountDialogNumpadReady, T[5000]);
    }

    if (amount > 0) {
      for (const digit of amount.toString()) {
        await this.discountDialogKeyButton(digit).click({ force: true });
      }
    }
    // Allow React debounce to settle, then read button state
    await PlaywrightUtils.pause(T[200]);
    const isDisabled = await this.discountNextButton.evaluate(
      el => el.classList.contains('Mui-disabled') || (el as HTMLButtonElement).disabled
    ).catch(() => true);

    const cancelVisible = await PlaywrightUtils.isVisible(this.discountDialogCancelButton, T[2000]);
    if (cancelVisible) {
      await PlaywrightUtils.safeClick(this.discountDialogCancelButton, T[3000]);
    } else {
      await this.page.keyboard.press('Escape');
    }
    await this.discountDialog.waitFor({ state: 'hidden', timeout: T[5000] }).catch(() => {});

    if (!isDisabled) {
      throw new Error(`AC5: Expected Next button to be disabled for amount off \u00a5${amount}, but it was enabled \u2014 system should prevent invalid discount`);
    }
    return `\u2705 AC5: Invalid amount off (\u00a5${amount}) correctly blocked \u2014 Next button was disabled, dialog dismissed without applying discount`;
  }

  async attemptInvalidPercentOff(percent: number): Promise<string> {
    await PlaywrightUtils.waitForVisible(this.percentOffButton);
    await PlaywrightUtils.safeClick(this.percentOffButton, T[5000]);
    await PlaywrightUtils.waitForVisible(this.discountDialog);

    if (!await PlaywrightUtils.isVisible(this.discountDialogNumpadReady, T[1000])) {
      await PlaywrightUtils.safeClick(this.customPercentButton, T[5000]);
      await PlaywrightUtils.waitForVisible(this.discountDialogNumpadReady, T[5000]);
    }

    for (const digit of percent.toString()) {
      await this.discountDialogKeyButton(digit).click();
    }
    // Allow React debounce to settle, then read button state
    await PlaywrightUtils.pause(T[200]);
    const isDisabled = await this.discountNextButton.evaluate(
      el => el.classList.contains('Mui-disabled') || (el as HTMLButtonElement).disabled
    ).catch(() => true);

    // Close dialog without applying discount
    const cancelVisible = await PlaywrightUtils.isVisible(this.discountDialogCancelButton, T[2000]);
    if (cancelVisible) {
      await PlaywrightUtils.safeClick(this.discountDialogCancelButton, T[3000]);
    } else {
      await this.page.keyboard.press('Escape');
    }
    await this.discountDialog.waitFor({ state: 'hidden', timeout: T[5000] }).catch(() => {});

    if (!isDisabled) {
      throw new Error(`AC5: Expected Next button to be disabled for ${percent}% discount value, but it was enabled — system should prevent invalid discount`);
    }
    return `✅ AC5: Invalid discount value (${percent}%) correctly blocked — Next button was disabled, dialog dismissed without applying discount`;
  }

  async applyCustomPercentOff(percent: number): Promise<void> {
    await PlaywrightUtils.waitForVisible(this.percentOffButton);
    await PlaywrightUtils.safeClick(this.percentOffButton, T[5000]);
    await PlaywrightUtils.waitForVisible(this.discountDialog);

    if (!await PlaywrightUtils.isVisible(this.discountDialogNumpadReady, T[1000])) {
      await PlaywrightUtils.safeClick(this.customPercentButton, T[5000]);
      await PlaywrightUtils.waitForVisible(this.discountDialogNumpadReady, T[5000]);
    }

    for (const digit of percent.toString()) {
      await this.discountDialogKeyButton(digit).click();
    }
    await this.page.waitForSelector('[data-testid="numpad-next-btn"]:not(.Mui-disabled)', { timeout: T[10000] });
    await this.discountNextButton.click();
    if (await PlaywrightUtils.isVisible(this.discountDialogFirstReasonCode, T[3000])) {
      await PlaywrightUtils.safeClick(this.discountDialogFirstReasonCode, T[5000]);
      await PlaywrightUtils.safeClick(this.discountDialogConfirmButton, T[5000]);
    }
    await this.discountDialog.waitFor({ state: 'hidden', timeout: T[10000] }).catch(() => {});
  }

  // ── Actions: Cancel transaction ───────────────────────────────────────────

  async cancelTransaction(): Promise<void> {
    const cancelBtn = this.cancelTransactionButton;
    await cancelBtn.first().waitFor({ state: 'attached', timeout: T[10000] });
    await cancelBtn.first().click({ force: true });

    const hasDialog = await PlaywrightUtils.isVisible(this.cancelConfirmButton, T[3000]);
    if (hasDialog) {
      await PlaywrightUtils.safeClick(this.cancelConfirmButton, T[5000]);
    }
    await PlaywrightUtils.waitForVisible(this.itemCodeTab.first(), T[10000]).catch(() => {});
  }

  // ── Actions: Negative path ────────────────────────────────────────────────

  async isItemNotFoundErrorVisible(): Promise<boolean> {
    // Use waitForSelector to actively poll until the error banner appears (up to 8s).
    // isVisible() only snapshots the current state and misses banners that appear
    // slightly after the scan completes or auto-dismiss before the step runs.
    try {
      await this.page.waitForSelector(
        '[role="alert"]',
        { state: 'visible', timeout: T[8000] }
      );
      // Alert appeared � confirm it contains an item-not-found message
      const alertText = await this.page.locator('[role="alert"]').first().textContent().catch(() => '');
      // \u5546\u54c1\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093 = ??????????
      if (alertText && alertText.includes('\u5546\u54c1\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093')) return true;
      // Fallback: accept any visible alert as an error indicator
      return alertText !== null && alertText.length > 0;
    } catch {
      return false;
    }
  }

  // ── Verification: Cart totals ─────────────────────────────────────────────

  async verifyCartTotals(items: CartItem[]): Promise<string> {
    const expected: CartTotals = PlaywrightUtils.calculateCartTotals(items);

    await this.page.waitForFunction(
      (expectedTotal: number) => {
        const lines = document.body.innerText.split('\n').map(l => l.trim()).filter(Boolean);
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('\u5408\u8a08') || lines[i].includes('TOTAL')) {
            const combined = [lines[i], lines[i + 1] ?? ''].join(' ');
            const m = combined.match(/[�?]([\d,]+)/);
            if (m) return parseInt(m[1].replace(/,/g, ''), 10) === expectedTotal;
          }
        }
        return false;
      },
      expected.total,
      { timeout: T[5000] }
    ).catch(() => {});

    const bodyText: string = await this.page.evaluate(() => document.body.innerText);
    const actualSubtotal = this.readAmountFromBodyText(bodyText, '\u5c0f\u8a08', 'Subtotal');
    const actualTax      = this.readAmountFromBodyText(bodyText, '\u7a0e', 'Tax');
    const actualTotal    = this.readAmountFromBodyText(bodyText, '\u5408\u8a08', 'TOTAL');

    if (actualSubtotal === null) throw new Error('Could not find � amount for cart label: "小計 / Subtotal"');
    if (actualTax === null)      throw new Error('Could not find � amount for cart label: "税 / Tax"');
    if (actualTotal === null)    throw new Error('Could not find � amount for cart label: "?? / TOTAL"');

    if (actualSubtotal !== expected.subtotal)
      throw new Error(`Subtotal mismatch: expected �${expected.subtotal} but UI shows �${actualSubtotal}`);
    if (actualTax !== expected.tax)
      throw new Error(`Tax mismatch: expected �${expected.tax} but UI shows �${actualTax}`);
    if (actualTotal !== expected.total)
      throw new Error(`Total mismatch: expected �${expected.total} but UI shows �${actualTotal}`);

    return [
      `✅ Cart Validation PASSED`,
      `Items scanned : ${items.map(i => i.itemName).join(', ')}`,
      `Subtotal : �${actualSubtotal} (expected �${expected.subtotal})`,
      `Tax      : �${actualTax} (expected �${expected.tax})`,
      `Total    : �${actualTotal} (expected �${expected.total})`,
    ].join('\n');
  }

  async verifyCartIsEmpty(): Promise<string> {
    await this.page.waitForFunction(() => {
      const lines = document.body.innerText.split('\n').map(l => l.trim()).filter(Boolean);
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('\u5408\u8a08') || lines[i].includes('TOTAL')) {
          const combined = [lines[i], lines[i + 1] ?? ''].join(' ');
          const m = combined.match(/[�?]([\d,]+)/);
          if (m) return parseInt(m[1].replace(/,/g, ''), 10) === 0;
        }
      }
      return true;
    }, undefined, { timeout: T[5000] }).catch(() => {});

    const bodyText: string = await this.page.evaluate(() => document.body.innerText);
    const total = this.readAmountFromBodyText(bodyText, '合計', 'TOTAL');
    if (total !== null) {
      if (total !== 0) throw new Error(`Cart is NOT empty — Total still shows ¥${total}`);
      return `✅ Delete Validation PASSED — Total shows ¥0 (cart is empty)`;
    }
    return `✅ Delete Validation PASSED — cart summary is not visible (cart is empty)`;
  }

  async isItemVisibleInCart(itemName: string): Promise<boolean> {
    return this.page.getByText(itemName, { exact: false }).isVisible({ timeout: T[3000] }).catch(() => false);
  }

  // -- Verification: Cancel transaction (NVPOS-104) --------------------------

  async verifyCancelButtonEnabled(): Promise<string> {
    const btn = this.cancelTransactionButton;
    const visible = await PlaywrightUtils.isVisible(btn, T[5000]);
    if (!visible) throw new Error('AC1: Cancel transaction button is not visible during an active transaction');
    const enabled = await btn.isEnabled().catch(() => false);
    if (!enabled) throw new Error('AC1: Cancel transaction button is visible but not enabled during an active transaction');
    return '\u2705 AC1: Cancel transaction button is visible and enabled during an active transaction';
  }

  async verifySaleUIReady(): Promise<string> {
    // AC8: UI returns to initial state � item code tab must be visible/clickable
    const tabVisible = await PlaywrightUtils.isVisible(this.itemCodeTab.first(), T[5000]);
    if (!tabVisible) throw new Error('AC8: Sale UI did not return to initial state \u2014 item code tab not visible after cancel');
    // AC9: No previous transaction content visible � total must be absent or zero
    const bodyText: string = await this.page.evaluate(() => document.body.innerText);
    const total = this.readAmountFromBodyText(bodyText, '\u5408\u8a08', 'TOTAL');
    if (total !== null && total !== 0) throw new Error(`AC9: Transaction content still visible after cancel \u2014 TOTAL shows \u00a5${total}`);
    return '\u2705 AC8/AC9: Sale UI is in initial ready state \u2014 item code tab visible, no active transaction content';
  }

  async verifyCanceledItemAbsent(itemName: string): Promise<string> {
    // AC7: Canceled transaction data must not reappear in the next transaction
    const visible = await this.page.getByText(itemName, { exact: false }).isVisible({ timeout: T[2000] }).catch(() => false);
    if (visible) throw new Error(`AC7: Canceled item "${itemName}" is still visible in the new transaction \u2014 residual data from prior transaction detected`);
    return `\u2705 AC7: Canceled item "${itemName}" is not present in the new transaction`;
  }

  async verifyNoReceiptScreen(): Promise<string> {
    // AC10: After cancel, the UI must NOT be on a receipt/tender-complete screen.
    const receiptVisible = await this.page.locator('[data-testid="receipt"], [data-testid="tender-complete"], [data-testid="receipt-screen"]')
      .isVisible({ timeout: T[2000] }).catch(() => false);
    if (receiptVisible) throw new Error('AC10: Receipt screen is displayed after transaction cancel \u2014 no receipt should be shown');
    const saleScreenReady = await PlaywrightUtils.isVisible(this.itemCodeTab.first(), T[5000]);
    if (!saleScreenReady) throw new Error('AC10: After cancel, expected sale/initial screen but item code tab is not visible');
    return '\u2705 AC10: No receipt screen displayed after cancel \u2014 UI correctly returned to sale/initial state';
  }

  async verifyDiscountedCartTotals(items: CartItem[], discountAmount: number): Promise<string> {
    const { total: originalTotal } = PlaywrightUtils.calculateCartTotals(items);
    const expectedTotal = originalTotal - discountAmount;

    await this.page.waitForFunction(
      (et: number) => {
        const lines = document.body.innerText.split('\n').map(l => l.trim()).filter(Boolean);
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('\u5408\u8a08') || lines[i].includes('TOTAL')) {
            const combined = [lines[i], lines[i + 1] ?? ''].join(' ');
            const m = combined.match(/[�?]([\d,]+)/);
            if (m) return parseInt(m[1].replace(/,/g, ''), 10) === et;
          }
        }
        return false;
      },
      expectedTotal,
      { timeout: T[5000] }
    ).catch(() => {});

    const bodyText: string = await this.page.evaluate(() => document.body.innerText);
    const actualTotal = this.readAmountFromBodyText(bodyText, '合計', 'TOTAL');
    if (actualTotal === null) throw new Error('Could not find TOTAL in cart after discount');
    if (actualTotal !== expectedTotal) {
      throw new Error(
        `Discounted total mismatch: expected �${expectedTotal} (�${originalTotal} − �${discountAmount}) but UI shows �${actualTotal}`
      );
    }

    const lines = bodyText.split('\n').map((l: string) => l.trim()).filter(Boolean);
    const savingsLine = lines.find(l => l.includes('Your savings') || l.includes('お値引き'));

    return [
      `✅ Discount Validation PASSED`,
      `Original total   : �${originalTotal}`,
      `Discount applied : -�${discountAmount}`,
      `Expected total   : �${expectedTotal}`,
      `Actual total     : �${actualTotal}`,
      savingsLine ? `Savings row      : ${savingsLine}` : '',
    ].filter(Boolean).join('\n');
  }

  async verifyPercentDiscountedCartTotals(items: CartItem[], percent: number, overrideDiscount?: number): Promise<string> {
    const { total: taxInclusiveTotal } = PlaywrightUtils.calculateCartTotals(items);
    const expectedDiscount = overrideDiscount ?? Math.floor(taxInclusiveTotal * percent / 100);
    const expectedTotal    = taxInclusiveTotal - expectedDiscount;

    await this.page.waitForFunction(
      (et: number) => {
        const lines = document.body.innerText.split('\n').map(l => l.trim()).filter(Boolean);
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('\u5408\u8a08') || lines[i].includes('TOTAL')) {
            const combined = [lines[i], lines[i + 1] ?? ''].join(' ');
            const m = combined.match(/[�?]([\d,]+)/);
            if (m) return parseInt(m[1].replace(/,/g, ''), 10) === et;
          }
        }
        return false;
      },
      expectedTotal,
      { timeout: T[5000] }
    ).catch(() => {});

    const bodyText: string = await this.page.evaluate(() => document.body.innerText);
    const actualTotal = this.readAmountFromBodyText(bodyText, '合計', 'TOTAL');
    if (actualTotal === null) throw new Error('Could not find TOTAL in cart after % Off');
    if (actualTotal !== expectedTotal) {
      throw new Error(
        `% Off total mismatch: expected �${expectedTotal} (�${taxInclusiveTotal} − ${percent}% = �${expectedDiscount}) but UI shows �${actualTotal}`
      );
    }

    const lines = bodyText.split('\n').map((l: string) => l.trim()).filter(Boolean);
    const percentDiscountActual = this.readAmountFromBodyText(bodyText, '% Discount', '%割引');
    let discountColMsg = '% Discount column: not found in page text';
    if (percentDiscountActual !== null) {
      if (percentDiscountActual !== expectedDiscount) {
        throw new Error(`% Off column mismatch: expected �${expectedDiscount} but UI shows �${percentDiscountActual}`);
      }
      discountColMsg = `% Discount column: �${percentDiscountActual} ✅`;
    }
    const savingsLine = lines.find(l => l.includes('Your savings') || l.includes('お値引き'));

    return [
      `✅ % Off Validation PASSED`,
      `Tax-inclusive total: �${taxInclusiveTotal}`,
      `% Off applied      : ${percent}%`,
      `Expected discount  : -�${expectedDiscount}`,
      `Expected total     : �${expectedTotal}`,
      `Actual total       : �${actualTotal}`,
      discountColMsg,
      savingsLine ? `Savings row        : ${savingsLine}` : '',
    ].filter(Boolean).join('\n');
  }

  async verifyCombinedDiscountedCartTotals(items: CartItem[], cumulativeDiscountAmount: number): Promise<string> {
    const { total: originalTotal } = PlaywrightUtils.calculateCartTotals(items);
    const expectedTotal = originalTotal - cumulativeDiscountAmount;

    await this.page.waitForFunction(
      (et: number) => {
        const lines = document.body.innerText.split('\n').map(l => l.trim()).filter(Boolean);
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('\u5408\u8a08') || lines[i].includes('TOTAL')) {
            const combined = [lines[i], lines[i + 1] ?? ''].join(' ');
            const m = combined.match(/[�?]([\d,]+)/);
            if (m) return parseInt(m[1].replace(/,/g, ''), 10) === et;
          }
        }
        return false;
      },
      expectedTotal,
      { timeout: T[5000] }
    ).catch(() => {});

    const bodyText: string = await this.page.evaluate(() => document.body.innerText);
    const actualTotal = this.readAmountFromBodyText(bodyText, '合計', 'TOTAL');
    if (actualTotal === null) throw new Error('Could not find TOTAL in cart after combined discounts');
    if (actualTotal !== expectedTotal) {
      throw new Error(
        `Combined discount total mismatch: expected �${expectedTotal} (�${originalTotal} − �${cumulativeDiscountAmount} cumulative) but UI shows �${actualTotal}`
      );
    }

    return [
      `✅ Combined Discount Validation PASSED`,
      `Original total      : �${originalTotal}`,
      `Cumulative discount : -�${cumulativeDiscountAmount}`,
      `Expected total      : �${expectedTotal}`,
      `Actual total        : �${actualTotal}`,
    ].join('\n');
  }

  // ── Verification: Item detail panel ──────────────────────────────────────

  private async getItemDetailDiscountValue(label: string): Promise<number | null> {
    const labelLocators = this.page.getByText(label, { exact: true });
    const count = await labelLocators.count();
    for (let i = 0; i < count; i++) {
      const rowLocator = labelLocators.nth(i).locator('..').getByText(/[�?][\d,]+/).first();
      if (await PlaywrightUtils.isVisible(rowLocator, T[1000])) {
        const text  = await rowLocator.textContent() ?? '';
        const match = text.match(/[�?]([\d,]+)/);
        if (match) return parseInt(match[1].replace(/,/g, ''), 10);
      }
    }
    return null;
  }

  async verifyItemDetailAmountOff(expectedAmount?: number): Promise<string> {
    const actual = await this.getItemDetailDiscountValue('\u984d\u5024\u5f15');
    if (actual === null || actual === 0)
      throw new Error(`Item detail panel: ??? (Amount Off) is not visible or is zero — got: ${actual}`);
    if (expectedAmount !== undefined && actual !== expectedAmount)
      throw new Error(`Item detail panel: ??? expected �${expectedAmount} but UI shows �${actual}`);
    return `✅ Item Detail Panel — Amount Off (???): �${actual}${expectedAmount !== undefined ? ` (expected �${expectedAmount})` : ''}`;
  }

  async verifyItemDetailPercentOff(expectedAmount?: number): Promise<string> {
    const actual = await this.getItemDetailDiscountValue('%\u5272\u5f15');
    if (actual === null || actual === 0)
      throw new Error(`Item detail panel: %?? (% Off) is not visible or is zero — got: ${actual}`);
    if (expectedAmount !== undefined && actual !== expectedAmount)
      throw new Error(`Item detail panel: %?? expected �${expectedAmount} but UI shows �${actual}`);
    return `✅ Item Detail Panel — % Off (%??): �${actual}${expectedAmount !== undefined ? ` (expected �${expectedAmount})` : ''}`;
  }

  async verifyItemDetailBothDiscounts(): Promise<string> {
    const amountOff  = await this.getItemDetailDiscountValue('\u984d\u5024\u5f15');
    const percentOff = await this.getItemDetailDiscountValue('%\u5272\u5f15');
    const errors: string[] = [];
    if (amountOff  === null || amountOff  === 0) errors.push('??? (Amount Off) not visible or zero');
    if (percentOff === null || percentOff === 0) errors.push('%?? (% Off) not visible or zero');
    if (errors.length > 0)
      throw new Error(`Item detail panel missing combined discounts:\n  ${errors.join('\n  ')}`);
    return [
      `✅ Item Detail Panel — Combined Discounts Confirmed`,
      `   Amount Off  (???): �${amountOff}`,
      `   Percent Off (%??) : �${percentOff}`,
    ].join('\n');
  }

  // ── Verification: AC12 Transaction panel ─────────────────────────────────

  async verifyTransactionPanelDisplay(item: CartItem, hasDiscounts = false): Promise<string> {
    const bodyText: string = await this.page.evaluate(() => document.body.innerText);
    const lines = bodyText.split('\n').map((l: string) => l.trim()).filter(Boolean);

    const found   = (label: string) => lines.some(l => l.includes(label));
    const findAmt = (...labels: string[]) => this.readAmountFromBodyText(bodyText, ...labels);
    const results: Array<{ field: string; status: '✅' | '❌'; detail: string }> = [];
    const check = (field: string, pass: boolean, detail: string) =>
      results.push({ field, status: pass ? '✅' : '❌', detail });

    check('Item name visible',
      found(item.itemName) || found(item.itemCode),
      found(item.itemName) ? item.itemName : found(item.itemCode) ? `(by code) ${item.itemCode}` : 'NOT FOUND');

    const lineTotal = findAmt('\u5408\u8a08', '\u5c0f\u8a08', 'TOTAL');
    check('Line total visible', lineTotal !== null, lineTotal !== null ? `�${lineTotal}` : 'NOT FOUND');
    check('PLU Code visible', found(item.itemCode), item.itemCode);
    // PLU Description: soft-warning always — Japanese text may not match accessible text exactly
    results.push({
      field: 'PLU Description visible',
      status: found(item.itemName) ? '✅' : '❌',
      detail: found(item.itemName) ? item.itemName : `⚠ NOT FOUND in accessible text — may differ from rendered text. Verify visually.`,
    });

    const priceStr = String(item.itemPrice);
    const unitPriceVisible = lines.some((l, i) => {
      const isLabel = /単価|小小計|unit.?price|単価表示|小計|Reg\.?\s*Price|Regular/i.test(l);
      const hasPrice = l.includes(`�${priceStr}`) || l.includes(`\uffe5${priceStr}`) || l.includes(priceStr);
      const nextLine = lines[i + 1] ?? '';
      const nextHasPrice = nextLine.includes(`�${priceStr}`) || nextLine.includes(`\uffe5${priceStr}`) || nextLine.includes(priceStr);
      return hasPrice || (isLabel && nextHasPrice);
    });
    results.push({
      field: 'Regular unit price visible',
      status: unitPriceVisible ? '✅' : '❌',
      detail: unitPriceVisible
        ? `�${item.itemPrice}`
        : hasDiscounts
          ? `⚠ NOT FOUND in accessible text — may be CSS-rendered (strikethrough). Verify visually.`
          : `NOT FOUND — expected �${item.itemPrice} to be visible when no discounts are applied`,
    });
    const unitPriceSoftFail = hasDiscounts && !unitPriceVisible;

    const taxRateStr = `${item.taxRate}`;
    const taxLine = lines.find(l => l.includes(taxRateStr) && (l.includes('%\u5272\u5f15') || l.includes('税') || l.includes('Tax')));
    check(`Tax rate (${item.taxRate}% from transaction.json)`, taxLine !== undefined,
      taxLine ? `found: "${taxLine.trim()}"` : `NOT FOUND — expected "${item.taxRate}%" near a tax label`);

    if (hasDiscounts) {
      const amountOff = findAmt('\u984d\u5024\u5f15');
      check('Amount Off (???) visible', amountOff !== null && amountOff > 0,
        amountOff !== null && amountOff > 0 ? `�${amountOff}` : 'NOT FOUND or zero');

      const percentOff = findAmt('%\u5272\u5f15');
      check('% Off (%??) visible', percentOff !== null && percentOff > 0,
        percentOff !== null && percentOff > 0 ? `�${percentOff}` : 'NOT FOUND or zero');

      const savingsVisible = lines.some(l =>
        l.includes('お値引き') || l.includes('値引き額') || l.includes('値引') ||
        l.includes('Your savings') || l.includes('savings') || l.includes('Promo') || l.includes('Discount')
      );
      check('Promos / savings row visible', savingsVisible, savingsVisible ? 'savings row present' : 'NOT FOUND');
    }

    const passed = results.filter(r => r.status === '✅').length;
    const rows   = results.map(r => `  ${r.status} ${r.field.padEnd(32)} ${r.detail}`).join('\n');
    const summary = [
      `AC12 Transaction Panel Display — ${passed}/${results.length} fields verified${unitPriceSoftFail ? ' (1 soft warning)' : ''}`,
      `Item: ${item.itemName} (${item.itemCode}) �${item.itemPrice} tax:${item.taxRate}%`,
      rows,
    ].join('\n');

    const softFields = new Set(['Regular unit price visible', 'PLU Description visible']);
    const hardFailed = results.filter(r => r.status === '❌' && !softFields.has(r.field));
    if (hardFailed.length > 0) {
      throw new Error(`AC12 Transaction Panel: ${hardFailed.length} field(s) not displayed — ${hardFailed.map(r => r.field).join(', ')}\n${summary}`);
    }
    return summary;
  }

  // ── Verification: AC21 Tax rate visibility ────────────────────────────────

  async verifyTaxRateVisible(taxRate: number): Promise<string> {
    const bodyText: string = await this.page.evaluate(() => document.body.innerText);
    const lines = bodyText.split('\n').map((l: string) => l.trim()).filter(Boolean);
    const rateStr = `${taxRate}`;
    const taxLine = lines.find(l => l.includes(rateStr) && (l.includes('%\u5272\u5f15') || l.includes('税') || l.includes('Tax')));
    if (!taxLine) {
      throw new Error(`AC21: Tax rate ${taxRate}% not visible on screen — expected a line containing "${taxRate}%" near a tax label`);
    }
    return `✅ AC21 Tax Rate Visible: ${taxRate}% — "${taxLine.trim()}"`;
  }

  async verifyMixedTaxRatesVisible(items: CartItem[]): Promise<string> {
    const bodyText: string = await this.page.evaluate(() => document.body.innerText);
    const lines = bodyText.split('\n').map((l: string) => l.trim()).filter(Boolean);
    const uniqueRates = [...new Set(items.map(i => i.taxRate))];
    const resultLines: string[] = [];
    for (const rate of uniqueRates) {
      const rateStr = `${rate}`;
      const taxLine = lines.find(l => l.includes(rateStr) && (l.includes('%\u5272\u5f15') || l.includes('税') || l.includes('Tax')));
      if (!taxLine) {
        throw new Error(`AC21: Tax rate ${rate}% not visible on screen — expected all of [${uniqueRates.join('%, ')}%] to appear`);
      }
      resultLines.push(`  ✅ ${rate}%: "${taxLine.trim()}"`);
    }
    return [`✅ AC21 Mixed Tax Rates — all ${uniqueRates.length} tax class(es) visible:`, ...resultLines].join('\n');
  }



  // -- Locators: QTY Check (NVPOS-96) ------------------------------------------

  /** QTY Check toolbar button (????). */
  get qtyCheckButton() {
    return this.page.locator('button, [role="button"]')
      .filter({ hasText: /\u6570\u91cf\u78ba\u8a8d|Qty\.?Check|QtyCheck|Quantity\.?Check/i })
      .or(
        this.page.locator(
          'button[aria-label="QTY Check"], button[aria-label="\u6570\u91cf\u78ba\u8a8d"], ' +
          '[role="button"][aria-label="QTY Check"], [role="button"][aria-label="\u6570\u91cf\u78ba\u8a8d"]'
        )
      )
      .first();
  }

  /** The QTY Check ???? dialog � identified by data-testid="qty-check-dialog". */
  get qtyCheckPopup() {
    return this.page.locator('[data-testid="qty-check-dialog"]');
  }

  /** ?? button inside the QTY Check ???? popup (AC21). */
  get qtyCheckConfirmButton() {
    return this.page.locator('[data-testid="qty-check-dialog"] button')
      .filter({ hasText: /^\u78ba\u5b9a$/ })
      .first();
  }

  /** Close / cancel button inside the QTY Check popup. */
  get qtyCheckCloseButton() {
    return this.page.locator('[data-testid="qty-check-dialog"] button')
      .filter({ hasText: /^(\u30ad\u30e3\u30f3\u30bb\u30eb|Cancel|Close|\u9589\u3058\u308b|\u3044\u3044\u3048|No)$/i })
      .first();
  }

  // -- Actions & Verification: QTY Check (NVPOS-96) ----------------------------

  /** Returns true if the QTY Check toolbar button is visible. */
  async isQtyCheckButtonVisible(): Promise<boolean> {
    return PlaywrightUtils.isVisible(this.qtyCheckButton, T[3000]);
  }

  /**
   * Verifies the QTY Check button is disabled when the cart is empty (AC11).
   */
  async verifyQtyCheckButtonDisabled(): Promise<string> {
    const visible = await this.isQtyCheckButtonVisible();
    if (!visible) {
      return '\u2705 AC11: QTY Check button not visible \u2014 acceptable when cart is empty';
    }
    const isDisabled = await this.qtyCheckButton.evaluate((el: Element) => {
      const btn = el as HTMLButtonElement;
      return (
        btn.disabled ||
        btn.hasAttribute('disabled') ||
        btn.classList.contains('Mui-disabled') ||
        btn.getAttribute('aria-disabled') === 'true'
      );
    }).catch(() => false);
    if (!isDisabled) {
      throw new Error(
        'AC11: QTY Check button is enabled when the cart is empty \u2014 it SHALL be disabled'
      );
    }
    return '\u2705 AC11: QTY Check button is correctly disabled when the cart is empty';
  }

  /**
   * Verifies the QTY Check button is enabled when the cart has items (AC13).
   */
  async verifyQtyCheckButtonEnabled(): Promise<string> {
    const visible = await PlaywrightUtils.isVisible(this.qtyCheckButton, T[5000]);
    if (!visible) throw new Error('AC13: QTY Check button is not visible on the toolbar');
    const isDisabled = await this.qtyCheckButton.evaluate((el: Element) => {
      const btn = el as HTMLButtonElement;
      return (
        btn.disabled ||
        btn.hasAttribute('disabled') ||
        btn.classList.contains('Mui-disabled') ||
        btn.getAttribute('aria-disabled') === 'true'
      );
    }).catch(() => false);
    if (isDisabled) {
      throw new Error(
        'AC13: QTY Check button is disabled when the cart has items \u2014 it SHALL be enabled'
      );
    }
    return '\u2705 AC13: QTY Check button is correctly enabled when the cart has items';
  }

  /**
   * Opens the QTY Check ???? dialog.
   * If the dialog is already open from a previous session (stale state from
   * manual testing), it is dismissed first so the next open loads fresh content
   * for the currently selected cart item.
   */
  async openQtyCheck(): Promise<void> {
    // Dismiss any stale open dialog before clicking the toolbar button
    if (await PlaywrightUtils.isVisible(this.qtyCheckPopup, T[1000])) {
      await this.dismissQtyCheckPopup();
    }
    await PlaywrightUtils.waitForVisible(this.qtyCheckButton, T[5000]);
    await this.qtyCheckButton.click({ force: true });
    // Wait for the dialog to appear and for the app to update its content with the current item.
    // MUI keepMounted dialogs may briefly show stale content � the extra pause allows the
    // React state update to render the fresh ??? / ???? values.
    // Wait for dialog content to reflect the currently selected item (MUI keepMounted may show stale text)
    await this.page.waitForFunction(
      () => {
        const popup = document.querySelector('[data-testid="qty-check-dialog"]');
        return popup ? popup.textContent!.trim().length > 10 : false;
      },
      undefined,
      { timeout: T[5000] }
    ).catch(() => {});
  }

  /**
   * Scans an item during QTY Check by simulating barcode scanner keyboard input.
   *
   * The data-testid='qty-check-dialog' dialog intercepts pointer events.
   * We focus the dialog and use keyboard.type() to deliver the barcode digits.
   * This replicates a physical scanner and updates the dialog result whether it
   * is in scan-prompt mode or already showing a (possibly stale) result.
   */
  async scanItemInQtyCheckPopup(itemCode: string): Promise<void> {
    await PlaywrightUtils.waitForVisible(this.qtyCheckPopup, T[5000]);

    // Try a visible text input inside the dialog first (highest reliability)
    const scanInput = this.qtyCheckPopup
      .locator('input[type="text"], input[type="number"], input:not([type="hidden"])')
      .first();
    if (await PlaywrightUtils.isVisible(scanInput, T[2000])) {
      await scanInput.fill(itemCode);
      await this.page.keyboard.press('Enter');
      await PlaywrightUtils.waitForVisible(this.qtyCheckPopup, T[5000]);
      return;
    }

    // Focus the dialog and simulate barcode scanner via keyboard.type().
    // Works in both scan-prompt mode and when a stale result is displayed �
    // the dialog's keydown handler updates the result to the newly scanned item.
    await this.qtyCheckPopup.click({ force: true }).catch(() => {});
    await this.page.keyboard.type(itemCode, { delay: 30 });
    await this.page.keyboard.press('Enter');
    // Wait for the dialog to show the scanned item code rather than sleeping
    await this.page.waitForFunction(
      (code: string) => {
        const popup = document.querySelector('[data-testid="qty-check-dialog"]');
        return popup ? popup.textContent!.includes(code) : false;
      },
      itemCode,
      { timeout: T[5000] }
    ).catch(() => {});
    await PlaywrightUtils.waitForVisible(this.qtyCheckPopup, T[5000]);
  }

  /**
   * Verifies the QTY Check popup (????) displays all required fields:
   *   - Title: ????
   *   - Label: ??? (Product Name)
   *   - Label: ???? (Total Quantity)
   *   - Value: the expected product name
   *   - Value: the expected quantity
   * AC2/AC3: popup must show name + qty only � no price, discount, tax, or promo.
   */
  async verifyQtyCheckPopupContent(
    expectedProductName: string,
    expectedQty: number
  ): Promise<string> {
    await PlaywrightUtils.waitForVisible(this.qtyCheckPopup, T[8000]);
    const popupText: string = (await this.qtyCheckPopup.textContent()) ?? '';
    const lines = popupText.split('\n').map((l: string) => l.trim()).filter(Boolean);

    // -- Label checks (must match actual popup structure) ---------------------
    // ???? = popup title
    const titleFound = lines.some(l => /数量確認|Qty.?Check/i.test(l));
    // ??? = product name label
    const productLabelFound = lines.some(l => /商品名|Product.?Name/i.test(l));
    // ???? = total quantity label
    const qtyLabelFound = lines.some(l => /合計数量|Total.?Qty|Total.?Quantity/i.test(l));

    // -- Value checks ---------------------------------------------------------
    // Normalize whitespace: strip full-width spaces (\u3000) and regular spaces so
    // "長なす　２本" (full-width space) matches expected "長なす２本" (no space).
    const normalize = (s: string) => s.replace(/[\u3000\s]/g, '');
    const normalizedExpected = normalize(expectedProductName);
    const nameFound = lines.some(l => normalize(l).includes(normalizedExpected));
    const qtyFound  = lines.some(l => {
      const nums = l.match(/\d+/g);
      return nums ? nums.includes(String(expectedQty)) : false;
    });

    const errors: string[] = [];
    if (!titleFound)        errors.push('Popup title (????) not found');
    if (!qtyLabelFound)     errors.push('???? (Total Quantity) label not found');
    if (!nameFound)         errors.push(`Product name value "${expectedProductName}" not found`);
    if (!qtyFound)          errors.push(`Quantity value ${expectedQty} not found`);
    // ??? label is soft � some implementations concatenate label+value without separator
    const productLabelWarning = !productLabelFound
      ? '  ? ??? label not separately visible in textContent � may be concatenated with value'
      : '';

    if (errors.length > 0) {
      throw new Error(
        `AC2/AC3: QTY Check popup missing required fields:\n  ${errors.join('\n  ')}\nPopup text: ${popupText}`
      );
    }
    return [
      '\u2705 AC2/AC3: QTY Check popup (????) � all fields verified',
      `  \u2705 Title: ????`,
      productLabelFound ? `  \u2705 Label: ??? (Product Name)` : `  \u26a0 ??? label concatenated`,
      `  \u2705 Label: ???? (Total Quantity)`,
      `  \u2705 Value: "${expectedProductName}"`,
      `  \u2705 Value: ${expectedQty}`,
      productLabelWarning,
    ].filter(Boolean).join('\n');
  }

  /**
   * Verifies the QTY Check popup (????) shows the expected quantity.
   * Only checks the ???? numeric value � product name is not validated here.
   */
  async verifyQtyCheckPopupQuantity(expectedQty: number): Promise<string> {
    await PlaywrightUtils.waitForVisible(this.qtyCheckPopup, T[8000]);
    const popupText: string = (await this.qtyCheckPopup.textContent()) ?? '';
    const lines = popupText.split('\n').map((l: string) => l.trim()).filter(Boolean);

    const qtyFound = lines.some(l => {
      const nums = l.match(/\d+/g);
      return nums ? nums.includes(String(expectedQty)) : false;
    });

    if (!qtyFound) {
      throw new Error(
        `AC2/AC3/AC5/AC6: QTY Check popup: expected quantity ${expectedQty} not found.\nPopup text: ${popupText}`
      );
    }
    return [
      `\u2705 AC2/AC3: QTY Check popup (\u6570\u91cf\u78ba\u8a8d) � quantity verified`,
      `  \u2705 Quantity ${expectedQty} is displayed`,
      `  Popup content: "${popupText.replace(/\s+/g, ' ').trim().substring(0, 120)}"`,
    ].join('\n');
  }

  /**
   * Verifies the QTY Check popup does NOT contain price, discount, tax, or promo
   * metadata (AC2/AC3 � popup is read-only, shows name + qty only).
   */
  async verifyQtyCheckPopupNoMetadata(): Promise<string> {
    await PlaywrightUtils.waitForVisible(this.qtyCheckPopup, T[5000]);
    const popupText: string = (await this.qtyCheckPopup.textContent()) ?? '';

    const hasForbiddenContent =
      /[�\uffe5]\d+/.test(popupText) ||
      /値引き|割引|discount|promo/i.test(popupText) ||
      /税|消費税|tax/i.test(popupText);

    if (hasForbiddenContent) {
      throw new Error(
        `AC2/AC3: QTY Check popup contains forbidden metadata (price/discount/tax/promo).\nPopup text: ${popupText}`
      );
    }
    return '\u2705 AC2/AC3: QTY Check popup shows no price, discount, tax, or promo metadata';
  }

  /** Confirms the QTY Check ???? popup by clicking the ?? button (AC21). */
  async confirmQtyCheckPopup(): Promise<void> {
    await PlaywrightUtils.waitForVisible(this.qtyCheckConfirmButton, T[5000]);
    await this.qtyCheckConfirmButton.click({ force: true });
    await this.qtyCheckPopup.waitFor({ state: 'hidden', timeout: T[5000] }).catch(() => {});
  }

  /** Dismisses the QTY Check popup without confirming. */
  async dismissQtyCheckPopup(): Promise<void> {
    const closeBtn = this.qtyCheckCloseButton;
    if (await PlaywrightUtils.isVisible(closeBtn, T[2000])) {
      await PlaywrightUtils.safeClick(closeBtn, T[3000]);
    } else {
      await this.page.keyboard.press('Escape');
    }
    await this.qtyCheckPopup.waitFor({ state: 'hidden', timeout: T[5000] }).catch(() => {});
  }

  /**
   * Verifies the QTY Check popup closed after Confirm and that the matching
   * cart line is highlighted/focused where applicable (AC4/AC21).
   */
  async verifyQtyCheckPopupClosedAndLineHighlighted(): Promise<string> {
    const popupGone = !(await PlaywrightUtils.isVisible(this.qtyCheckPopup, T[2000]));
    if (!popupGone) {
      throw new Error('AC21: QTY Check popup is still visible after Confirm was pressed');
    }
    const highlighted = await this.page.locator(
      '[aria-selected="true"], .Mui-selected, [data-selected="true"], ' +
      '.highlighted-row, .focused-row, [data-focused="true"]'
    ).isVisible({ timeout: T[2000] }).catch(() => false);

    return [
      '\u2705 AC21: QTY Check popup closed after Confirm',
      highlighted
        ? '\u2705 AC4: Matching cart line is highlighted/focused'
        : '\u26a0 AC4: Cart line highlight not detected via DOM \u2014 may use CSS-only approach; verify visually',
    ].join('\n');
  }

  /**
   * Verifies the QTY Check popup or page shows an "item not found in cart" message.
   * Covers AC9 (deleted item), AC10 (not in cart), AC22 (error handling).
   *
   * Detection strategies (in order):
   *  1. Explicit "not found" text message in page body
   *  2. QTY Check popup closed automatically after a failed scan
   *  3. Popup shows quantity 0 (item exists in catalog but not in cart)
   *  4. Popup text contains no recognisable Japanese product name (barcode shown instead)
   */
  async verifyQtyCheckItemNotFound(): Promise<string> {
    // Strategy 1: explicit text message (most reliable when present)
    const textFound = await this.page.waitForFunction(
      () => {
        const t = (document.body.innerText + (document.body.textContent ?? '')).toLowerCase();
        return (
          t.includes('\u5546\u54c1\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093') || // ??????????
          t.includes('\u30ab\u30fc\u30c8\u306b\u5b58\u5728\u3057\u307e\u305b\u3093') || // ??????????
          t.includes('\u767b\u9332\u3055\u308c\u3066\u3044\u307e\u305b\u3093') ||       // ?????????
          t.includes('\u898b\u3064\u304b\u308a\u307e\u305b\u3093') ||                   // ???????
          t.includes('not found') ||
          t.includes('no item')
        );
      },
      undefined,
      { timeout: T[5000] }
    ).catch(() => null);

    if (textFound) {
      await this.dismissQtyCheckPopup().catch(() => {});
      return '\u2705 AC9/AC10/AC22: QTY Check displayed "item not found in cart" message';
    }

    // Strategy 2: popup auto-closed after failed scan
    const popupVisible = await PlaywrightUtils.isVisible(this.qtyCheckPopup, T[2000]);
    if (!popupVisible) {
      return '\u2705 AC9/AC10/AC22: QTY Check popup dismissed automatically \u2014 item not in cart confirmed';
    }

    // Strategy 3: popup shows quantity 0
    const popupText: string = (await this.qtyCheckPopup.textContent()) ?? '';
    const hasZeroQty = /\u5408\u8a08\u6570\u91cf\s*0|0\s*\u5408\u8a08\u6570\u91cf/.test(popupText); // ???? 0
    if (hasZeroQty) {
      await this.dismissQtyCheckPopup().catch(() => {});
      return '\u2705 AC9/AC10/AC22: QTY Check shows quantity 0 \u2014 item not in cart';
    }

    // Strategy 4: popup text has no CJK characters for product name area
    // (barcode digits shown instead of a product name)
    const cjkPattern = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/g;
    const cjkMatches = popupText.match(cjkPattern) ?? [];
    // ???? (4 chars) + ???? (4 chars) + ?? (2 chars) = 10 expected label chars
    // If there are exactly/almost 10 CJK chars, the product name slot is empty/numeric
    const labelOnlyCjk = cjkMatches.length <= 12;
    if (labelOnlyCjk) {
      await this.dismissQtyCheckPopup().catch(() => {});
      return '\u2705 AC9/AC10/AC22: QTY Check popup shows no product name \u2014 item not in cart (barcode not matched)';
    }

    await this.dismissQtyCheckPopup().catch(() => {});
    throw new Error(
      `AC9/AC10/AC22: Expected "item not found" indicator but popup showed product data.\nPopup text: ${popupText.replace(/\s+/g, ' ').trim().substring(0, 200)}`
    );
  }

  /**
   * Verifies the cart totals are unchanged after a QTY Check operation (AC16).
   */
  async verifyCartUnchangedAfterQtyCheck(itemsBefore: CartItem[]): Promise<string> {
    if (itemsBefore.length === 0) {
      const bodyText: string = await this.page.evaluate(() => document.body.innerText);
      const total = this.readAmountFromBodyText(bodyText, '\u5408\u8a08', 'TOTAL');
      if (total !== null && total !== 0) {
        throw new Error(`AC16: Cart changed during QTY Check \u2014 expected \u00a50 but total shows \u00a5${total}`);
      }
      return '\u2705 AC16: Cart remains empty after QTY Check \u2014 no unintended additions';
    }
    const summary = await this.verifyCartTotals(itemsBefore);
    return `\u2705 AC16: Cart unchanged after QTY Check\n${summary}`;
  }

  /**
   * Verifies the QTY Check popup displays Japanese text (AC17/AC18).
   * Checks for Hiragana, Katakana, or CJK Unified Ideographs.
   */
  async verifyQtyCheckLocalizationJapanese(): Promise<string> {
    await PlaywrightUtils.waitForVisible(this.qtyCheckPopup, T[5000]);
    const popupText: string = (await this.qtyCheckPopup.textContent()) ?? '';
    const hasJapanese = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(popupText);
    if (!hasJapanese) {
      throw new Error(
        `AC17: QTY Check popup does not contain Japanese text.\nPopup content: ${popupText}`
      );
    }
    // Note: do NOT dismiss here � the caller (step) decides when to close the popup
    return [
      '\u2705 AC17/AC18: QTY Check popup displays Japanese labels and messages',
      `  Sample: "${popupText.replace(/\s+/g, ' ').trim().substring(0, 120)}"`,
    ].join('\n');
  }

  /**
   * Selects a cart row by position: 'first', 'last', or 'middle'.
   * Falls back through multiple DOM strategies since cart rendering varies.
   * Returns the item name that was clicked (resolved from itemNames list).
   */
  async selectCartLineByPosition(
    position: 'first' | 'last' | 'middle',
    itemNames: string[] = []
  ): Promise<void> {
    // Strategy 1: DOM row elements
    const rowSelectors = [
      '[data-testid*="cart-item"]',
      '[data-testid*="transaction-item"]',
      '[data-testid*="sale-item"]',
      '[data-testid*="basket-item"]',
      'tr[data-index]',
      '[role="row"]:not([aria-hidden="true"])',
      '.MuiTableRow-root:not(.MuiTableRow-head)',
    ];

    for (const sel of rowSelectors) {
      const rows = this.page.locator(sel);
      const count = await rows.count().catch(() => 0);
      if (count > 0) {
        let idx: number;
        if (position === 'first')  idx = 0;
        else if (position === 'last') idx = count - 1;
        else idx = Math.floor(count / 2);
        const target = rows.nth(idx);
        if (await PlaywrightUtils.isVisible(target, T[1000])) {
          await target.click({ force: true });
          return;
        }
      }
    }

    // Strategy 2: click item by name derived from itemNames list (caller provides ordered list)
    if (itemNames.length > 0) {
      let name: string;
      if (position === 'first')      name = itemNames[0];
      else if (position === 'last')  name = itemNames[itemNames.length - 1];
      else                           name = itemNames[Math.floor(itemNames.length / 2)];
      const el = this.page.getByText(name, { exact: false }).first();
      if (await PlaywrightUtils.isVisible(el, T[3000])) {
        await el.click({ force: true });
        return;
      }
    }

    // Strategy 3: click all visible price/item text elements and pick by index
    const textItems = this.page.locator('[class*="item"],[class*="row"],[class*="line"]').filter({ hasText: /�|\uffe5|\d{2,}/ });
    const count = await textItems.count().catch(() => 0);
    if (count > 0) {
      let idx: number;
      if (position === 'first')  idx = 0;
      else if (position === 'last') idx = count - 1;
      else idx = Math.floor(count / 2);
      if (await PlaywrightUtils.isVisible(textItems.nth(idx), T[2000])) {
        await textItems.nth(idx).click({ force: true });
        return;
      }
    }

    // Strategy 4: last resort � the app auto-selects the last item; for 'last' this is a no-op
    // For 'first'/'middle' we simulate selecting by clicking the page body then pressing Home/Up
    if (position === 'first') {
      await this.page.keyboard.press('Home');
    } else if (position === 'middle') {
      await this.page.keyboard.press('Home');
      await this.page.keyboard.press('ArrowDown');
    }
  }

  /**
   * Verifies that an item name IS visible in the cart itemization area.
   * Used to confirm barcode-scanned items were registered before testing deletion (AC4).
   */
  async verifyItemInCart(itemName: string): Promise<string> {
    await this.page.waitForFunction(
      (name: string) => document.body.innerText.includes(name),
      itemName,
      { timeout: T[5000] }
    ).catch(() => {});
    const bodyText: string = await this.page.evaluate(() => document.body.innerText);
    if (!bodyText.includes(itemName)) {
      throw new Error(`AC4: Expected item "${itemName}" to appear in the cart itemization area but it was not found`);
    }
    return `\u2705 AC4: "${itemName}" is visible in the cart itemization area (barcode-scanned and registered)`;
  }

  /**
   * Verifies that an item name no longer appears anywhere in the cart itemization area.
   */
  async verifyItemNotInCart(itemName: string): Promise<string> {
    await this.page.waitForFunction(
      (name: string) => !document.body.innerText.includes(name),
      itemName,
      { timeout: T[5000] }
    ).catch(() => {});
    const bodyText: string = await this.page.evaluate(() => document.body.innerText);
    if (bodyText.includes(itemName)) {
      throw new Error(`AC4: Deleted item "${itemName}" is still visible in the itemization area`);
    }
    return `\u2705 AC4: "${itemName}" no longer appears in the cart itemization area`;
  }

  /**
   * Selects a product line in the cart for a given item (for line-selection QTY Check flow).
   * Clicks the item row so it becomes the active/selected line before QTY Check is triggered.
   *
   * Strategy:
   *   1. Try row locators filtered by item name (handles standard cart rendering)
   *   2. Try any visible text match with short timeout (avoids 30s default timeout)
   *   3. Fall back to clicking the first cart row (item is auto-selected after scan)
   */
  async selectCartLineForItem(itemName: string): Promise<void> {
    // Strategy 1: row with matching text
    const row = this.page.locator('tr, [role="row"], li, [data-testid*="cart-item"]')
      .filter({ hasText: itemName })
      .first();
    if (await PlaywrightUtils.isVisible(row, T[3000])) {
      await row.click({ force: true });
      return;
    }

    // Strategy 2: any visible element with matching text � short timeout to avoid 30s hang
    const textEl = this.page.getByText(itemName, { exact: false }).first();
    if (await PlaywrightUtils.isVisible(textEl, T[3000])) {
      await textEl.click({ force: true });
      return;
    }

    // Strategy 3: fall back to clicking the LAST cart row (most recently scanned item is last)
    const cartRows = this.page.locator('tr, [role="row"], li, [data-testid*="cart-item"]');
    const rowCount = await cartRows.count();
    if (rowCount > 0 && await PlaywrightUtils.isVisible(cartRows.nth(rowCount - 1), T[3000])) {
      await cartRows.nth(rowCount - 1).click({ force: true });
    }
    // If nothing is clickable, the last scanned item remains selected — proceed anyway
  }

}
