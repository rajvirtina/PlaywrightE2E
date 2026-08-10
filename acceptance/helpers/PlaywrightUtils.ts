/**
 * PlaywrightUtils
 *
 * Generic, app-agnostic Playwright helper methods.
 * Use these in Page Objects or AppActions to avoid repeating boilerplate.
 *
 * All methods are static — import and call directly:
 *   import { PlaywrightUtils } from '../helpers/PlaywrightUtils.js';
 *   await PlaywrightUtils.safeClick(locator);
 */

import { type Locator, type Page, expect } from '@playwright/test';
import { T, t } from '../config/timeouts.js';
import { deriveTaxValue } from '../config/taxRates.js';

// Re-export so consumers only need one import
export { T, t };

// Configure Playwright's assertion timeout once, using the environment-scaled
// value. All expect().toBeVisible() / .toContainText() etc. calls inherit this
// unless an explicit timeout is passed as an override.
expect.configure({ timeout: T[10000] });

export interface CartItem {
  itemCode:  string;
  itemName:  string;
  itemPrice: number;  // pre-tax price (外税)
  taxRate:   number;  // tax rate percentage, e.g. 8 or 10 — set per item in transaction.json
}

export interface CartTotals {
  subtotal: number;  // 小計  = sum of (itemPrice - taxValue) for all items
  tax:      number;  // 税     = sum of taxValue for all items
  total:    number;  // 合計  = sum of itemPrice for all items
}

export class PlaywrightUtils {

  // ── Navigation ──────────────────────────────────────────────────────────────

  /** Navigate to a URL and wait for the network to be idle. */
  static async goto(page: Page, url: string, timeout = T[15000]): Promise<void> {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout }).catch(() => {});
  }

  /** Wait until the current URL matches a string or regex. */
  static async waitForUrl(page: Page, pattern: string | RegExp, timeout = T[15000]): Promise<void> {
    await page.waitForURL(pattern, { timeout });
  }

  // ── Waiting ─────────────────────────────────────────────────────────────────

  /** Assert a locator is visible; throws with a clear message on timeout. */
  static async waitForVisible(locator: Locator, timeout?: number): Promise<void> {
    await expect(locator).toBeVisible(timeout !== undefined ? { timeout } : undefined);
  }

  /** Wait for a CSS selector to appear in the DOM and be visible. */
  static async waitForSelector(page: Page, selector: string, timeout = T[10000]): Promise<void> {
    await page.waitForSelector(selector, { state: 'visible', timeout });
  }

  /** Wait until a locator becomes enabled (not disabled). */
  static async waitForEnabled(locator: Locator, timeout = T[5000]): Promise<void> {
    await expect(locator).toBeEnabled({ timeout });
  }

  /** Returns true if the locator is visible within the timeout, false otherwise. */
  static async isVisible(locator: Locator, timeout = T[3000]): Promise<boolean> {
    return locator.isVisible({ timeout }).catch(() => false);
  }

  /** Pause execution for a fixed number of milliseconds (use sparingly). */
  static async pause(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  // ── Interactions ────────────────────────────────────────────────────────────

  /**
   * Wait for a locator to be visible then click it.
   * @param force - bypass actionability checks (use only when element is overlaid)
   */
  static async safeClick(locator: Locator, timeout?: number, force = false): Promise<void> {
    await expect(locator).toBeVisible(timeout !== undefined ? { timeout } : undefined);
    await locator.click({ force });
  }

  /** Clear a field and type a value, waiting for visibility first. */
  static async fillInput(locator: Locator, value: string, timeout?: number): Promise<void> {
    await expect(locator).toBeVisible(timeout !== undefined ? { timeout } : undefined);
    await locator.clear();
    await locator.fill(value);
  }

  /** Select an option in a <select> element by its visible text. */
  static async selectOption(locator: Locator, label: string): Promise<void> {
    await locator.selectOption({ label });
  }

  // ── Assertions ──────────────────────────────────────────────────────────────

  /** Assert that a locator contains the expected text (case-insensitive). */
  static async assertText(locator: Locator, expected: string | RegExp): Promise<void> {
    await expect(locator).toContainText(expected);
  }

  /** Assert a locator is NOT visible. */
  static async assertNotVisible(locator: Locator, timeout?: number): Promise<void> {
    await expect(locator).not.toBeVisible(timeout !== undefined ? { timeout } : undefined);
  }

  /** Assert the page URL matches a pattern. */
  static async assertUrl(page: Page, pattern: string | RegExp): Promise<void> {
    await expect(page).toHaveURL(pattern);
  }

  // ── Screenshots ─────────────────────────────────────────────────────────────

  /** Capture a viewport screenshot and return it as a Buffer. JPEG 15% to keep report size small. */
  static async screenshot(page: Page): Promise<Buffer> {
    return page.screenshot({ type: 'jpeg', quality: 15 });
  }

  /** Capture a screenshot of a specific element. */
  static async screenshotElement(locator: Locator): Promise<Buffer> {
    return locator.screenshot({ type: 'jpeg', quality: 15 });
  }

  // ── Cart calculation ────────────────────────────────────────────────────────

  /**
   * Calculate expected cart totals from an array of CartItems.
   *
   * Tax model: tax-exclusive (外税) — tax is added on top of the item price.
   *   taxValue = deriveTaxValue(itemPrice, taxRate)  [rounding set by TAX_ROUNDING_MODE in taxRates.ts]
   *
   * Formula:
   *   subtotal  = 小計 = Σ(itemPrice)       (pre-tax prices)
   *   tax       = 税   = Σ(taxValue)         (rounded per item)
   *   total     = 合計 = subtotal + tax
   *
   * @example
   *   const totals = PlaywrightUtils.calculateCartTotals([
   *     { itemCode: '...', itemName: 'おにぎり 梅', itemPrice: 111, taxRate: 8 },
   *   ]);
   *   // tax (standard) = round(111 × 8 / 100) = round(8.88) = 9
   *   // totals = { subtotal: 111, tax: 9, total: 120 }
   */
  static calculateCartTotals(items: CartItem[]): CartTotals {
    const subtotal = items.reduce((sum, i) => sum + i.itemPrice, 0);
    const tax      = items.reduce((sum, i) => sum + deriveTaxValue(i.itemPrice, i.taxRate), 0);
    const total    = subtotal + tax;
    return { subtotal, tax, total };
  }
}
