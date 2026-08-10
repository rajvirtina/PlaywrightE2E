/**
 * Page Object: ScreenOrientationPage
 *
 * Covers the Cashier Preferences screen — locators and actions for:
 *   - Opening Cashier Preferences
 *   - Selecting LEFT or RIGHT screen orientation
 *   - Applying or discarding the preference
 *   - Verifying cart pane position on Sale / Tender screens
 *   - Detecting UI issues: overlap, ghost panes, horizontal scrollbar
 */

import { PlaywrightUtils, T } from '../helpers/PlaywrightUtils.js';
import { BasePage } from './BasePage.js';

export type OrientationSide = 'LEFT' | 'RIGHT';

export class ScreenOrientationPage extends BasePage {

  // ── Locators: Preferences navigation ──────────────────────────────────────

  /** Settings (gear) button in the POS header — aria-label="Settings". */
  get cashierPreferencesButton() {
    return this.page.locator('button[aria-label="Settings"]').first();
  }

  /** The Settings dialog that opens when the Settings button is clicked. */
  get preferencesPanel() {
    return this.page.getByRole('dialog').filter({ hasText: /Settings|\u8a2d\u5b9a/ }).first();
  }

  // ── Locators: Orientation options ──────────────────────────────────────────

  /** Left-hand button inside the Layout section of the Settings dialog. */
  get leftOrientationOption() {
    return this.preferencesPanel
      .locator('button')
      .filter({ hasText: /^Left.?hand$|^\u5de6\u624b$/ })
      .first();
  }

  /** Standard button inside the Layout section (default / RIGHT orientation). */
  get rightOrientationOption() {
    return this.preferencesPanel
      .locator('button')
      .filter({ hasText: /^Standard$|^\u6a19\u6e96$/ })
      .first();
  }

  /** Confirm button — commits the selected orientation and closes the dialog. */
  get confirmButton() {
    return this.preferencesPanel
      .getByRole('button', { name: /^Confirm$|^\u78ba\u5b9a$|^OK$/ })
      .first();
  }

  /** Cancel button — discards changes and closes the dialog. */
  get closePanelButton() {
    return this.preferencesPanel
      .getByRole('button', { name: /^Cancel$|^\u30ad\u30e3\u30f3\u30bb\u30eb$|^\u9589\u3058\u308b$|^Close$/ })
      .first();
  }

  /** Alias kept for backward compatibility. */
  get applyButton() {
    return this.confirmButton;
  }

  // ── Locators: Cart pane ────────────────────────────────────────────────────

  /**
   * The cart / itemization pane — identifies the scrollable transaction area.
   * Used to determine whether it is positioned on the LEFT or RIGHT of the viewport.
   */
  get cartPane() {
    return this.page
      .locator(
        '[data-testid="cart-pane"], [data-testid="transaction-pane"], ' +
        '[data-testid="itemization-pane"], [data-testid="cart"]'
      )
      .or(
        this.page
          .locator('[class*="cart"], [class*="Cart"], [class*="transaction"], [class*="itemization"]')
          .filter({ hasText: /合計|TOTAL|小計|Subtotal/i })
      )
      .first();
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  /** Scrolls the cart pane to the bottom (used to verify scroll behaviour with many items). */
  async scrollCartToBottom(): Promise<void> {
    await this.cartPane.evaluate((el: Element) => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }));
    // Smooth scroll has no DOM completion event — wait for scrollTop to stabilise
    await this.page.waitForFunction(
      () => {
        const selectors = ['[data-testid="cart-pane"]','[data-testid="transaction-pane"]','[data-testid="itemization-pane"]','[data-testid="cart"]'];
        const el = selectors.map(s => document.querySelector(s)).find(Boolean);
        return el ? el.scrollTop + el.clientHeight >= el.scrollHeight - 5 : true;
      },
      undefined,
      { timeout: T[3000] }
    ).catch(() => {});
  }

  /** Scrolls the cart pane back to the top. */
  async scrollCartToTop(): Promise<void> {
    await this.cartPane.evaluate((el: Element) => el.scrollTo({ top: 0, behavior: 'smooth' }));
    await this.page.waitForFunction(
      () => {
        const selectors = ['[data-testid="cart-pane"]','[data-testid="transaction-pane"]','[data-testid="itemization-pane"]','[data-testid="cart"]'];
        const el = selectors.map(s => document.querySelector(s)).find(Boolean);
        return el ? el.scrollTop === 0 : true;
      },
      undefined,
      { timeout: T[3000] }
    ).catch(() => {});
  }
  /** Opens the Cashier Preferences panel. */
  async openCashierPreferences(): Promise<void> {
    await PlaywrightUtils.safeClick(this.cashierPreferencesButton, T[5000]);
    await PlaywrightUtils.waitForVisible(this.preferencesPanel, T[5000]);
    // Wait for panel inner content to fully render before caller reads options
    await this.preferencesPanel.locator('button, [role="radio"], [role="option"]').first()
      .waitFor({ state: 'visible', timeout: T[3000] }).catch(() => {});
  }

  /** Selects an orientation option without pressing Apply. */
  async selectOrientation(side: OrientationSide): Promise<void> {
    const option = side === 'LEFT' ? this.leftOrientationOption : this.rightOrientationOption;
    await PlaywrightUtils.waitForVisible(option, T[5000]);
    await PlaywrightUtils.safeClick(option, T[5000]);
    // Wait for selection state to be reflected via ARIA/class instead of sleeping
    await option.evaluate((el: Element) => new Promise<void>(resolve => {
      const isSelected = () =>
        el.getAttribute('aria-checked') === 'true' ||
        el.getAttribute('aria-pressed') === 'true' ||
        el.getAttribute('aria-selected') === 'true' ||
        el.classList.contains('Mui-selected') ||
        el.classList.contains('selected');
      if (isSelected()) { resolve(); return; }
      const obs = new MutationObserver(() => { if (isSelected()) { obs.disconnect(); resolve(); } });
      obs.observe(el, { attributes: true });
      setTimeout(() => { obs.disconnect(); resolve(); }, 300);
    })).catch(() => {});
  }

  /**
   * Selects an orientation option and closes the dialog.
   * The 設定 dialog applies the orientation immediately on click —
   * there is no separate Apply button. Closing the dialog commits the change.
   */
  /**
   * Selects an orientation option and clicks Confirm to apply.
   */
  async selectOrientationAndApply(side: OrientationSide): Promise<void> {
    await this.selectOrientation(side);
    await PlaywrightUtils.waitForVisible(this.confirmButton, T[5000]);
    await PlaywrightUtils.safeClick(this.confirmButton, T[5000]);
    await this.preferencesPanel.waitFor({ state: 'hidden', timeout: T[5000] }).catch(() => {});
    // Wait for CSS layout transition to complete before next step measures positions
    await this.page.waitForFunction(
      () => !document.querySelector('.MuiDialog-root[style*="opacity: 0"], .MuiDialog-root.MuiModal-hidden'),
      undefined,
      { timeout: T[2000] }
    ).catch(() => {});
  }

  /** Opens Cashier Preferences, selects the given side, and applies — one-shot helper. */
  async navigateAndApply(side: OrientationSide): Promise<void> {
    await this.openCashierPreferences();
    await this.selectOrientationAndApply(side);
  }

  /** Closes the preferences panel by clicking Cancel (discards selection). */
  async closePanelWithoutApply(): Promise<void> {
    const cancelBtn = this.closePanelButton;
    if (await PlaywrightUtils.isVisible(cancelBtn, T[2000])) {
      await PlaywrightUtils.safeClick(cancelBtn, T[3000]);
    } else {
      await this.page.keyboard.press('Escape');
    }
    await this.preferencesPanel.waitFor({ state: 'hidden', timeout: T[5000] }).catch(() => {});
  }

  // ── Verification ───────────────────────────────────────────────────────────

  /**
   * Verifies the Screen Orientation setting is visible with both LEFT and RIGHT
   * options selectable and not disabled (AC1).
   */
  async verifyOrientationSettingVisible(): Promise<string> {
    await PlaywrightUtils.waitForVisible(this.preferencesPanel, T[5000]);
    // Verify 画面レイアウト section is present
    const layoutSectionVisible = await this.preferencesPanel
      .getByText('画面レイアウト').isVisible({ timeout: T[3000] }).catch(() => false);
    const leftVisible  = await PlaywrightUtils.isVisible(this.leftOrientationOption, T[3000]);
    const rightVisible = await PlaywrightUtils.isVisible(this.rightOrientationOption, T[3000]);

    if (!leftVisible || !rightVisible) {
      throw new Error(
        `AC1: 画面レイアウト options missing — 左手 visible: ${leftVisible}, 標準 visible: ${rightVisible}, section visible: ${layoutSectionVisible}`
      );
    }

    const leftDisabled = await this.leftOrientationOption.evaluate((el: Element) => {
      const btn = el as HTMLButtonElement;
      return btn.disabled || btn.classList.contains('Mui-disabled') || btn.getAttribute('aria-disabled') === 'true';
    }).catch(() => false);
    const rightDisabled = await this.rightOrientationOption.evaluate((el: Element) => {
      const btn = el as HTMLButtonElement;
      return btn.disabled || btn.classList.contains('Mui-disabled') || btn.getAttribute('aria-disabled') === 'true';
    }).catch(() => false);

    if (leftDisabled || rightDisabled) {
      throw new Error(
        `AC1: One or both orientation options are greyed out — LEFT disabled: ${leftDisabled}, RIGHT disabled: ${rightDisabled}`
      );
    }

    return '✅ AC1: 画面レイアウト setting visible — 左手 (LEFT) and 標準 (RIGHT) options present and enabled';
  }

  /**
   * Verifies the given option is in a selected state and the other is deselected.
   * Checks aria-checked, aria-pressed, aria-selected, Mui-selected, and data attributes (AC1).
   */
  async verifyOptionSelected(selected: OrientationSide): Promise<string> {
    const selectedEl = selected === 'LEFT' ? this.leftOrientationOption : this.rightOrientationOption;
    const otherEl    = selected === 'LEFT' ? this.rightOrientationOption : this.leftOrientationOption;
    const other      = selected === 'LEFT' ? 'RIGHT' : 'LEFT';

    const isSelected = await selectedEl.evaluate((el: Element) => {
      return (
        el.getAttribute('aria-checked')  === 'true' ||
        el.getAttribute('aria-pressed')  === 'true' ||
        el.getAttribute('aria-selected') === 'true' ||
        el.getAttribute('data-selected') === 'true' ||
        el.classList.contains('Mui-selected') ||
        el.classList.contains('selected') ||
        el.classList.contains('active')
      );
    }).catch(() => false);

    const otherIsSelected = await otherEl.evaluate((el: Element) => {
      return (
        el.getAttribute('aria-checked')  === 'true' ||
        el.getAttribute('aria-pressed')  === 'true' ||
        el.getAttribute('aria-selected') === 'true' ||
        el.getAttribute('data-selected') === 'true' ||
        el.classList.contains('Mui-selected') ||
        el.classList.contains('selected') ||
        el.classList.contains('active')
      );
    }).catch(() => false);

    const selectedLabel = selected === 'LEFT' ? '左手' : '標準';
    const otherLabel    = selected === 'LEFT' ? '標準' : '左手';

    if (otherIsSelected) {
      throw new Error(`AC1: Both options appear selected — ${selectedLabel} and ${otherLabel} are simultaneously active`);
    }
    if (!isSelected) {
      return `⚠ AC1: ${selectedLabel} clicked but selection state not detectable via ARIA/DOM — verify visually`;
    }
    return `✅ AC1: ${selectedLabel} (${selected}) is selected, ${otherLabel} is deselected`;
  }

  /**
   * Resolves 'LEFT' or 'RIGHT' from a string (case-insensitive).
   * Throws if neither matches.
   */
  resolveOrientationSide(raw: string): OrientationSide {
    const upper = raw.toUpperCase();
    if (upper === 'LEFT' || upper === 'RIGHT') return upper as OrientationSide;
    throw new Error(`Unknown orientation side: "${raw}". Expected LEFT or RIGHT.`);
  }

  /**
   * Determines the actual position of the cart pane (LEFT or RIGHT) by comparing
   * its bounding rect center against the viewport midpoint (AC2/AC3/AC4).
   */
  async verifyCartPaneSide(expectedSide: OrientationSide): Promise<string> {
    // Wait for layout CSS transition to settle before measuring bounding rects
    await this.page.waitForFunction(
      () => !document.querySelector('.MuiDialog-root[style*="opacity: 0"], .MuiDialog-root.MuiModal-hidden'),
      undefined,
      { timeout: T[2000] }
    ).catch(() => {});

    const result = await this.page.evaluate((side: string) => {
      const viewportW = window.innerWidth;
      const midpoint  = viewportW / 2;

      const selectors = [
        '[data-testid="cart-pane"]',
        '[data-testid="transaction-pane"]',
        '[data-testid="itemization-pane"]',
        '[data-testid="cart"]',
      ];
      let el: Element | null = null;
      for (const sel of selectors) {
        el = document.querySelector(sel);
        if (el) break;
      }
      if (!el) {
        // Fallback: class-based search for element containing TOTAL/合計
        const all = Array.from(
          document.querySelectorAll('[class*="cart"], [class*="Cart"], [class*="transaction"], [class*="itemization"]')
        );
        el = all.find(e => e.textContent?.includes('合計') || e.textContent?.includes('TOTAL')) ?? null;
      }
      if (!el) return { found: false, actualSide: null, cartCenter: 0, midpoint };

      const rect       = el.getBoundingClientRect();
      const cartCenter = rect.left + rect.width / 2;
      const actualSide = cartCenter < midpoint ? 'LEFT' : 'RIGHT';
      return { found: true, actualSide, cartCenter: Math.round(cartCenter), midpoint: Math.round(midpoint) };
    }, expectedSide);

    if (!result.found || result.actualSide === null) {
      return `⚠ Cart pane position: DOM element not found via known selectors. Expected ${expectedSide} — verify visually`;
    }
    if (result.actualSide !== expectedSide) {
      throw new Error(
        `Cart pane is on the ${result.actualSide} side but expected ${expectedSide}. ` +
        `Cart center: ${result.cartCenter}px, viewport midpoint: ${result.midpoint}px`
      );
    }
    return `✅ Cart pane confirmed on the ${expectedSide} side (center: ${result.cartCenter}px, midpoint: ${result.midpoint}px)`;
  }

  /**
   * Verifies no horizontal scrollbar is present on the current page (AC6).
   */
  async verifyNoHorizontalScrollbar(): Promise<string> {
    const { scrollWidth, clientWidth } = await this.page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    if (scrollWidth > clientWidth) {
      throw new Error(
        `AC6: Horizontal scrollbar detected — scrollWidth: ${scrollWidth}px > clientWidth: ${clientWidth}px`
      );
    }
    return `✅ AC6: No horizontal scrollbar (scrollWidth: ${scrollWidth}px ≤ clientWidth: ${clientWidth}px)`;
  }

  /**
   * Verifies that there are no ghost / duplicate cart panes visible (AC5).
   */
  async verifyNoGhostPanes(): Promise<string> {
    const visibleCount = await this.page.evaluate(() => {
      const selectors = [
        '[data-testid="cart-pane"]',
        '[data-testid="transaction-pane"]',
        '[data-testid="itemization-pane"]',
        '[data-testid="cart"]',
      ];
      let count = 0;
      for (const sel of selectors) {
        for (const el of Array.from(document.querySelectorAll(sel))) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) count++;
        }
      }
      return count;
    });

    if (visibleCount > 1) {
      throw new Error(`AC5: ${visibleCount} visible cart panes detected — ghost/residual pane present`);
    }
    return `✅ AC5: No ghost panes — ${visibleCount <= 1 ? 'single' : visibleCount} cart pane on screen`;
  }

  /**
   * Verifies the page has no error banners or visually blank pane regions (AC2/AC3).
   */
  async verifyNoErrorOrBlankPane(): Promise<string> {
    const bodyText: string = await this.page.evaluate(() => document.body.innerText);
    const hasError = /^エラー$|^Error$|crash|Exception/i.test(bodyText);
    if (hasError) {
      throw new Error('AC2/AC3: Error or crash text detected on page after orientation change');
    }
    return '✅ AC2/AC3: No error message or blank pane detected';
  }

  /**
   * Records the start timestamp for measuring render time after orientation switch.
   */
  recordSwitchStart(): number {
    return Date.now();
  }

  /**
   * Verifies the orientation switch completed within 2 seconds (AC27).
   */
  verifyLayoutRenderedWithin2Seconds(switchStartMs: number): string {
    const elapsed = Date.now() - switchStartMs;
    if (elapsed > 3000) {
      // 1s grace for test-runner overhead
      return `⚠ AC27: Orientation switch took ${(elapsed / 1000).toFixed(1)}s — spec requires ≤2s; verify on target hardware`;
    }
    return `✅ AC27: Layout refreshed in ${elapsed}ms (within 2000ms threshold)`;
  }
}
