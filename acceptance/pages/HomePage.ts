/**
 * Page Object: HomePage
 *
 * Covers the Voyix POS home / dashboard screen — the screen shown after login,
 * with the Play Circle start-transaction button.
 */

import { PlaywrightUtils, T } from '../helpers/PlaywrightUtils.js';
import { BasePage } from './BasePage.js';

export class HomePage extends BasePage {

  // ── Locators ──────────────────────────────────────────────────────────────

  get startTransactionButton() {
    return this.page.locator('button:has([data-testid="PlayCircleFilledIcon"])').first();
  }

  get playCircleIcon() {
    return this.page.locator('[data-testid="PlayCircleFilledIcon"]').first();
  }

  /** Item-code tab — used to detect whether the transaction screen is already active. */
  get itemCodeTab() {
    return this.page.getByRole('tab', { name: /商品コード|PRODUCT CODE/i }).or(
      this.page.getByText(/商品コード|PRODUCT CODE/i, { exact: true })
    );
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * Clicks the Play Circle button to start a new transaction.
   * Skips the click if the transaction screen (item-code tab) is already visible —
   * this handles scenarios where a cancel leaves the sale screen active.
   */
  async clickStartTransaction(): Promise<void> {
    const alreadyOnTransactionScreen = await PlaywrightUtils.isVisible(
      this.itemCodeTab.first(),
      T[1000],
    );
    if (alreadyOnTransactionScreen) return;
    await PlaywrightUtils.safeClick(this.startTransactionButton);
    await PlaywrightUtils.waitForVisible(this.itemCodeTab.first());
  }

  /** Waits for the home screen to be fully visible after a transaction completes. */
  async waitForHomeScreen(): Promise<void> {
    await PlaywrightUtils.waitForVisible(this.playCircleIcon, T[20000]);
    await PlaywrightUtils.waitForVisible(this.startTransactionButton);
  }
}
