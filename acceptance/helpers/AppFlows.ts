/**
 * AppFlows
 *
 * Reusable multi-step business flows for the Voyix POS Japan (nvPOS) application.
 * These methods compose multiple Page Object actions into named application journeys
 * that can be shared across ANY feature file — avoiding duplication between step files.
 *
 * Architecture:
 *   Steps  →  AppFlows (multi-step reusable flows)  →  NvposPosPage (locators + single actions)
 *                                                    →  PlaywrightUtils (generic browser utils)
 *
 * When to add a method here:
 *   - The same sequence of steps appears (or will appear) in more than one feature
 *   - The flow spans more than one screen
 *   - You want to describe a business action by name, not by mechanical clicks
 *
 * Usage example in a step file:
 *   import { AppFlows } from '../helpers/AppFlows.js';
 *   const flows = new AppFlows(this.page);
 *   await flows.loginToDashboard();
 *   await flows.completeTransaction('4901234000002', 'giftCard');
 */

import { type Page } from '@playwright/test';
import { NvposPosPage } from '../pages/NvposPosPage.js';

export class AppFlows {
  private readonly pos: NvposPosPage;

  constructor(page: Page) {
    this.pos = new NvposPosPage(page);
  }

  // ── Authentication flows ─────────────────────────────────────────────────────

  /**
   * Open the POS app and log in.
   * Reuse this as a Background step in any feature that starts on the dashboard.
   *
   * Credentials and URL are read from .env automatically.
   */
  async loginToDashboard(): Promise<void> {
    await this.pos.goto();
    await this.pos.login();
  }

  // ── Transaction flows ────────────────────────────────────────────────────────

  /**
   * Start a new transaction and scan an item barcode.
   * Reuse whenever a feature needs an item in the cart before its own steps begin.
   *
   * @param itemCode - barcode from transaction.json or any other source
   */
  async startTransactionWithItem(itemCode: string): Promise<void> {
    await this.pos.clickStartTransaction();
    await this.pos.enterItemCode(itemCode);
  }

  /**
   * Complete the payment flow: proceed to tender screen → select method → enter total → confirm.
   *
   * @param tenderMethodKey - key from payment.json (e.g. 'giftCard', 'cash', 'creditCard')
   * @param totalAmount     - cart total in ¥ to enter on the payment numpad
   */
  async completePayment(tenderMethodKey: string, totalAmount: number): Promise<void> {
    await this.pos.clickProceedToPayment();
    await this.pos.selectTenderMethod(tenderMethodKey);
    await this.pos.clickConfirmPayment(totalAmount);
  }

  /**
   * Full end-to-end transaction from an already-logged-in dashboard state:
   *   Start transaction → scan item → proceed to payment → select tender → confirm.
   *
   * Reuse in any scenario that needs a completed transaction as a precondition.
   *
   * @param itemCode        - barcode (e.g. '4901234000002')
   * @param tenderMethodKey - key (e.g. 'giftCard', 'cash')
   */
  /**
   * Full end-to-end transaction from an already-logged-in dashboard state.
   *
   * @param itemCode        - barcode (e.g. '4901234000002')
   * @param tenderMethodKey - key (e.g. 'giftCard', 'cash')
   * @param totalAmount     - cart total in ¥ to enter on the payment numpad
   */
  async completeTransaction(itemCode: string, tenderMethodKey: string, totalAmount: number): Promise<void> {
    await this.startTransactionWithItem(itemCode);
    await this.completePayment(tenderMethodKey, totalAmount);
  }

  /**
   * Full journey from app launch to completed transaction and home screen.
   */
  async fullTransactionJourney(itemCode: string, tenderMethodKey: string, totalAmount: number): Promise<void> {
    await this.loginToDashboard();
    await this.completeTransaction(itemCode, tenderMethodKey, totalAmount);
    await this.pos.waitForHomeScreen();
  }

  // ── Assertion helpers ────────────────────────────────────────────────────────

  /** Assert the user is back on the POS home dashboard. */
  async assertOnHomeScreen(): Promise<void> {
    await this.pos.waitForHomeScreen();
  }

  // ── Evidence ────────────────────────────────────────────────────────────────

  /** Capture a full-page screenshot for report evidence. */
  async screenshot(): Promise<Buffer> {
    return this.pos.screenshot();
  }
}
