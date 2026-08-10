import { World, IWorldOptions, setWorldConstructor } from '@cucumber/cucumber';
import { type Browser, type BrowserContext, type Page } from '@playwright/test';
import { type CartItem } from '../helpers/PlaywrightUtils.js';
import { NvposPosPage } from '../pages/NvposPosPage.js';
import { LoginPage } from '../pages/LoginPage.js';
import { HomePage } from '../pages/HomePage.js';
import { SalePage } from '../pages/SalePage.js';
import { PaymentPage } from '../pages/PaymentPage.js';
import { ScreenOrientationPage } from '../pages/ScreenOrientationPage.js';
import { AppFlows } from '../helpers/AppFlows.js';

// APP_URL must be set in .env — no hardcoded default so environment is always explicit.
if (!process.env.APP_URL) throw new Error('APP_URL is not set. Add APP_URL=http://... to your .env file.');
const BASE_URL = process.env.APP_URL;

// Auto-detect environment.
// Set SLOW_MO=0 in .env to disable slowMo for performance test runs.
// Always runs in headed mode (HEADLESS=false) — works for both Electron and Tauri.
// Override by setting HEADLESS=true in .env if headless is explicitly needed (e.g. CI without display).
export const IS_LINUX = process.platform === 'linux';
export const HEADLESS  = process.env.HEADLESS === 'true';
export const SLOW_MO   = process.env.SLOW_MO !== undefined
  ? Number(process.env.SLOW_MO)
  : IS_LINUX ? 0 : 80;

export class AppWorld extends World {
  context!: BrowserContext;
  page!: Page;
  readonly baseUrl: string = BASE_URL;

  /** Legacy monolithic page object — kept for AppFlows backward compatibility. */
  pos!: NvposPosPage;

  /** Domain-specific page objects — use these in new step definitions. */
  login!: LoginPage;
  home!: HomePage;
  sale!: SalePage;
  payment!: PaymentPage;
  orientation!: ScreenOrientationPage;

  /** High-level app flows shared across all steps in a scenario. */
  flows!: AppFlows;

  /** Accumulates items scanned in the current scenario for cart total validation. */
  cartItems: CartItem[] = [];

  /** Items removed via the Delete action — used by the Then step to assert absence from cart. */
  deletedItems: CartItem[] = [];

  /** Last item scanned in Price Check mode — not added to cartItems, used for panel verification. */
  lastPriceCheckItem: CartItem | null = null;

  /** Discount amount (in ¥) applied in the current scenario — used by the discounted totals step. */
  lastDiscountAmount: number = 0;

  /** Percentage discount applied in the current scenario — used by the percent-off totals step. */
  lastDiscountPercent: number = 0;

  /** Sum of all discounts applied in the current scenario — used by combined discount verification. */
  cumulativeDiscountAmount: number = 0;

  // ── Performance timing ──────────────────────────────────────────────────

  /** Timestamp (ms) when the performance timer was started via "the performance timer starts". */
  perfTimerStart: number = 0;

  /** Timestamp (ms) captured just before the discount dialog is triggered. */
  discountDialogStart: number = 0;

  /** Timestamp (ms) captured just after the discount dialog is confirmed. */
  discountDialogEnd: number = 0;

  /** Total number of items scanned in this scenario (for throughput calculation). */
  scanCount: number = 0;

  /** Per-scan timings (ms) — one entry per enterItemCode call in the cycling scan step. */
  scanTimings: number[] = [];

  constructor(options: IWorldOptions) {
    super(options);
  }

  /**
   * Creates an isolated browser context and page for this scenario.
   * The shared browser instance is provided by the BeforeAll hook.
   */
  async init(browser: Browser) {
    this.context = await browser.newContext({
      viewport: null,
      locale: 'ja-JP',
      // TLS errors are not suppressed — a certificate issue must be investigated,
      // not silently ignored during test runs.
    });
    this.page    = await this.context.newPage();
    this.pos         = new NvposPosPage(this.page);
    this.login       = new LoginPage(this.page);
    this.home        = new HomePage(this.page);
    this.sale        = new SalePage(this.page);
    this.payment     = new PaymentPage(this.page);
    this.orientation = new ScreenOrientationPage(this.page);
    this.flows       = new AppFlows(this.page);
  }

  /**
   * CDP mode: attach to an already-running Electron app.
   * Reuses the first existing page instead of opening a new context.
   * The Electron app must be launched with --remote-debugging-port=<PORT>.
   *
   * Hardware: set CDP_URL in deployment .env (already configured).
   * Local dev: run Electron with --remote-debugging-port=9222, set CDP_URL=http://localhost:9222.
   */
  async initCdp(browser: Browser) {
    // connectOverCDP returns the browser's default context
    const contexts = browser.contexts();
    this.context   = contexts[0] ?? await browser.newContext();
    const pages    = this.context.pages();
    this.page      = pages[0] ?? await this.context.newPage();
    this.pos         = new NvposPosPage(this.page);
    this.login       = new LoginPage(this.page);
    this.home        = new HomePage(this.page);
    this.sale        = new SalePage(this.page);
    this.payment     = new PaymentPage(this.page);
    this.orientation = new ScreenOrientationPage(this.page);
    this.flows       = new AppFlows(this.page);
    // In CDP mode (Electron), do NOT navigate — the app is already showing the correct page.
    // Navigating causes unnecessary page reloads that make elements unavailable.
    // The page object is already attached to the existing Electron browser page.
  }

  /** Closes the scenario's browser context — the shared browser stays alive. */
  async teardown() {
    if (process.env.CDP_URL) {
      // CDP mode: do NOT close the context — it belongs to the real Electron browser.
      // Clear auth tokens from storage so the app returns to the LOGIN screen after
      // reload, not the home screen (which happens when the session is still active).
      await this.page.evaluate(() => {
        try { localStorage.clear(); } catch {}
        try { sessionStorage.clear(); } catch {}
      }).catch(() => {});
      await this.page.reload({ timeout: 15000 }).catch(() => {});
    } else {
      await this.context.close();
    }
  }
}

setWorldConstructor(AppWorld);
