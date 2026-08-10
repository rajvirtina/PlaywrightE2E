/**
 * Page Object: PaymentPage
 *
 * Covers the Voyix POS payment / tender screen — locators and actions for:
 *   - Selecting tender methods (cash, gift card, credit card, etc.)
 *   - Entering payment amounts on the numpad
 *   - Confirming payment
 *   - Navigating back to the sale screen
 *   - Verifying tender screen totals
 */

import { type CartItem, PlaywrightUtils, T } from '../helpers/PlaywrightUtils.js';
import { BasePage } from './BasePage.js';
import { TENDER_LABELS } from '../config/tenderLabels.js';

export class PaymentPage extends BasePage {

  // ── Locators ──────────────────────────────────────────────────────────────

  get giftCardButton() {
    return this.page
      .locator('button, [role="button"]')
      .filter({ hasText: /^ギフトカード$|^Gift Card$/i })
      .first();
  }

  get cashButton() {
    return this.page
      .locator('button, [role="button"]')
      .filter({ hasText: /^現金$|^Cash$/i })
      .first();
  }

  get confirmPaymentButton() {
    return this.page.locator('[data-testid="tender-action-confirm-btn"]').first();
  }

  get backToSaleButton() {
    return this.page
      .locator('button, [role="button"]')
      .filter({ hasText: /^戻る$/ })
      .or(
        this.page.locator(
          '[aria-label="Back"], [aria-label="戻る"], [aria-label="Return"], [aria-label="Cancel"]'
        )
      )
      .or(
        this.page.locator('button, [role="button"]').filter({ hasText: /^Back$|^Cancel$|^キャンセル$/ })
      )
      .first();
  }

  get paymentAmountConfirmButton() {
    return this.page.locator('[data-testid="tender-ten-key"]')
      .locator('button[aria-label="Confirm"], [role="button"][aria-label="Confirm"]')
      .first();
  }

  tenderMethodButton(label: string) {
    return this.page
      .locator('button, [role="button"]')
      .filter({ hasText: new RegExp(`^${label}$`) })
      .first();
  }

  /** Item-code tab — used to confirm we are back on the sale screen after navigating back. */
  private get itemCodeTab() {
    return this.page.getByRole('tab', { name: /商品コード|PRODUCT CODE/i }).or(
      this.page.getByText(/商品コード|PRODUCT CODE/i, { exact: true })
    );
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * Selects a tender method by its JSON key (e.g. 'giftCard', 'cash').
   * Key is mapped to the Japanese UI label via TENDER_LABELS.
   */
  async selectTenderMethod(methodKey: string): Promise<void> {
    const label = TENDER_LABELS[methodKey];
    if (!label) {
      throw new Error(
        `Unknown tender method: "${methodKey}". Valid keys: ${Object.keys(TENDER_LABELS).join(', ')}`
      );
    }
    await PlaywrightUtils.safeClick(this.tenderMethodButton(label), T[15000]);
    await PlaywrightUtils.waitForVisible(this.confirmPaymentButton);
  }

  /**
   * Enters the total amount digit-by-digit on the payment numpad, then clicks 支払確定.
   */
  async clickConfirmPayment(totalAmount: number): Promise<void> {
    for (const digit of String(totalAmount)) {
      const candidates = this.page
        .locator('button, [role="button"]')
        .filter({ hasText: new RegExp(`^${digit}$`) });

      const count = await candidates.count();
      let clicked = false;
      for (let i = 0; i < count; i++) {
        if (await candidates.nth(i).isVisible()) {
          await candidates.nth(i).click();
          clicked = true;
          break;
        }
      }
      if (!clicked) throw new Error(`Payment numpad: no visible button found for digit "${digit}"`);
      await PlaywrightUtils.pause(T[50]);
    }
    await PlaywrightUtils.safeClick(this.confirmPaymentButton, T[15000]);
  }

  /**
   * Navigates from the tender screen back to the sale screen via the 戻る / Back button.
   * Uses force:true because MUI opacity transitions can make the button appear hidden.
   */
  async navigateBackToSale(): Promise<void> {
    const backBtn = this.page.locator('[aria-label="Back"]').first();
    await backBtn.waitFor({ state: 'attached', timeout: T[5000] });
    await backBtn.click({ force: true });
    await PlaywrightUtils.waitForVisible(this.itemCodeTab.first(), T[10000]);
  }

  // ── Verification ──────────────────────────────────────────────────────────

  /**
   * Verifies the tender screen 合計 (TOTAL) equals sum(cartItems) − discountAmount.
   */
  async verifyTenderScreenTotals(items: CartItem[], discountAmount = 0): Promise<string> {
    const { total: baseTotal } = PlaywrightUtils.calculateCartTotals(items);
    const expectedTotal = baseTotal - discountAmount;

    await this.page.waitForFunction(
      (et: number) => {
        const lines = document.body.innerText.split('\n').map(l => l.trim()).filter(Boolean);
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('合計') || lines[i].includes('TOTAL')) {
            const combined = [lines[i], lines[i + 1] ?? ''].join(' ');
            const m = combined.match(/[¥￥]([\d,]+)/);
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
    if (actualTotal === null)
      throw new Error('Tender screen: could not find TOTAL (合計) in page text');
    if (actualTotal !== expectedTotal) {
      throw new Error(
        `Tender screen total mismatch: expected ¥${expectedTotal}` +
        ` (¥${baseTotal} − ¥${discountAmount} discount) but UI shows ¥${actualTotal}`
      );
    }

    const actualTax = this.readAmountFromBodyText(bodyText, '税', 'Tax');
    return [
      `✅ Tender Screen Validation PASSED`,
      `Items          : ${items.map(i => i.itemName).join(', ')}`,
      `Discount       : -¥${discountAmount}`,
      `Expected total : ¥${expectedTotal}`,
      `Actual total   : ¥${actualTotal}`,
      actualTax !== null ? `Tax shown      : ¥${actualTax}` : `Tax label      : not found in page text`,
    ].join('\n');
  }

  /**
   * Verifies that item deletion is NOT available on the tender/payment screen.
   * The Delete button (削除 / [aria-label="Delete"]) must be absent or disabled
   * on the tender screen — edits to the transaction are only allowed on the sale screen.
   */
  async verifyDeleteUnavailableOnTenderScreen(): Promise<string> {
    // The delete button should not exist or should be disabled on the tender screen
    const deleteBtn = this.page
      .locator('[aria-label="Delete"], [aria-label="削除"], button')
      .filter({ hasText: /^(削除|Delete)$/ })
      .first();

    const isVisible = await deleteBtn.isVisible({ timeout: T[2000] }).catch(() => false);
    if (isVisible) {
      const isDisabled = await deleteBtn.evaluate((el: Element) => {
        const btn = el as HTMLButtonElement;
        return btn.disabled || btn.hasAttribute('disabled') ||
               btn.classList.contains('Mui-disabled') ||
               btn.getAttribute('aria-disabled') === 'true';
      }).catch(() => false);
      if (!isDisabled) {
        throw new Error(
          'AC2: Delete/Cancel item button is ACTIVE on the tender screen — ' +
          'item deletion must not be possible during payment'
        );
      }
      return '\u2705 Delete button is visible but disabled on the tender screen — item editing correctly blocked';
    }

    // Button not found at all — also acceptable (it simply does not render on tender screen)
    return '\u2705 Delete/Cancel item action is not available on the tender screen — transaction editing correctly restricted';
  }
}
