/**
 * Page Object: LoginPage
 *
 * Covers the Voyix POS login screen — locators and actions for
 * authentication (happy-path and negative-path).
 */

import { PlaywrightUtils, T } from '../helpers/PlaywrightUtils.js';
import { BasePage } from './BasePage.js';

export class LoginPage extends BasePage {

  // ── Locators ──────────────────────────────────────────────────────────────

  get usernameInput() {
    return this.page.getByLabel('Username').or(
      this.page.locator('input[type="text"]').first()
    );
  }

  get passwordInput() {
    return this.page.getByLabel('Password').or(
      this.page.locator('input[type="password"]').first()
    );
  }

  get loginButton() {
    return this.page.locator('button').filter({ hasText: /^Login$|^\u30ed\u30b0\u30a4\u30f3$/ }).first();
  }

  get signInHeading() {
    return this.page
      .getByText(/Sign\s*In|Login|ログイン|サインイン/i, { exact: false })
      .first();
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async goto(url?: string): Promise<void> {
    const target = url ?? process.env.APP_URL;
    if (!target) throw new Error('APP_URL is not set. Add APP_URL=http://... to your .env file.');

    if (process.env.CDP_URL) {
      const currentUrl = this.page.url();
      if (currentUrl === target || currentUrl === target + '/') {
        await this.waitForLoginPage(T[15000]);
        return;
      }
    }

    await PlaywrightUtils.goto(this.page, target);
    await this.waitForLoginPage(T[30000]);
  }

  private async waitForLoginPage(timeout: number): Promise<void> {
    try {
      await this.page.waitForSelector(
        'input[type="text"], input[type="password"]',
        { state: 'visible', timeout }
      );
      return;
    } catch {
      const pageUrl   = this.page.url();
      const pageTitle = await this.page.title().catch(() => '(could not get title)');

      const { mkdirSync } = await import('fs');
      const screenshotPath = `reports/debug-login-page-${Date.now()}.png`;
      try {
        mkdirSync('reports', { recursive: true });
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
        console.error(`[debug] Login page screenshot saved → ${screenshotPath}`);
      } catch { /* ignore screenshot save errors */ }

      throw new Error(
        `Login page not found after ${timeout}ms.\n` +
        `  Current URL  : ${pageUrl}\n` +
        `  Current title: ${pageTitle}\n` +
        `\n` +
        `Possible causes and fixes:\n` +
        `  1. App is NOT running — start the Vite dev server: npm run dev\n` +
        `  2. Using local Electron — launch with --remote-debugging-port=9222\n` +
        `     then set CDP_URL=http://localhost:9222 in your .env\n` +
        `  3. Wrong APP_URL — current value: ${process.env.APP_URL ?? '(not set)'}\n` +
        `  4. App is loading slowly — increase TIMEOUT_SCALE in your .env (e.g. TIMEOUT_SCALE=2)`
      );
    }
  }

  /**
   * Logs in with credentials from .env (POS_USERNAME / POS_PASSWORD).
   * Waits for the home screen play-circle icon to confirm successful login.
   */
  async login(
    username = process.env.POS_USERNAME ?? '',
    password = process.env.POS_PASSWORD ?? '',
  ): Promise<void> {
    await PlaywrightUtils.fillInput(this.usernameInput.first(), username);
    await PlaywrightUtils.fillInput(this.passwordInput.first(), password);
    await PlaywrightUtils.safeClick(this.loginButton);
    // Wait for home screen — confirms login succeeded
    await this.page.waitForSelector('[data-testid="PlayCircleFilledIcon"]', {
      state: 'visible',
      timeout: T[15000],
    });
  }

  /**
   * Fills in deliberately invalid credentials and submits — used for negative-path tests.
   * Does NOT wait for any post-login screen because login is expected to fail.
   */
  async loginWithInvalidCredentials(
    username = 'invalid_user',
    password = 'wrong_password',
  ): Promise<void> {
    await PlaywrightUtils.fillInput(this.usernameInput.first(), username);
    await PlaywrightUtils.fillInput(this.passwordInput.first(), password);
    await PlaywrightUtils.safeClick(this.loginButton);
  }

  /** Returns true when the sign-in screen is still visible — indicates login was rejected. */
  async isLoginFailed(): Promise<boolean> {
    return PlaywrightUtils.isVisible(this.signInHeading, T[3000]);
  }
}
