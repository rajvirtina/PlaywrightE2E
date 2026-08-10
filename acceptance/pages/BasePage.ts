import { type Page } from '@playwright/test';
import { PlaywrightUtils } from '../helpers/PlaywrightUtils.js';

/**
 * Abstract base class shared by all page objects.
 * Provides the page reference, screenshot utility, and the
 * readAmountFromBodyText helper used by all verification methods.
 */
export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async screenshot(): Promise<Buffer> {
    return PlaywrightUtils.screenshot(this.page);
  }

  /**
   * Scans body text lines for a label, then extracts the adjacent ¥ amount.
   * The amount may be on the same line or the immediately following line.
   * Returns null when no match is found.
   */
  protected readAmountFromBodyText(bodyText: string, ...labels: string[]): number | null {
    const lines = bodyText.split('\n').map((l: string) => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      if (labels.some(label => lines[i].includes(label))) {
        const combined = [lines[i], lines[i + 1] ?? ''].join(' ');
        const match = combined.match(/[¥￥]([\d,]+)/);
        if (match) return parseInt(match[1].replace(/,/g, ''), 10);
      }
    }
    return null;
  }
}
