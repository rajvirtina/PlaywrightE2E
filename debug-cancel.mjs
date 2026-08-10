import { chromium } from '@playwright/test';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf-8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);

const appUrl = env.APP_URL || 'http://127.0.0.1:5173';
const username = env.POS_USERNAME || '0000';
const password = env.POS_PASSWORD || '0000';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(appUrl);

// Login
await page.waitForSelector('input[type=text]', { timeout: 15000 });
await page.fill('input[type=text]', username);
await page.fill('input[type=password]', password);
await page.locator('button').filter({ hasText: /Login|ログイン/ }).first().click();

// Start transaction
await page.waitForSelector('[data-testid=PlayCircleFilledIcon]', { timeout: 15000 });
await page.locator('button:has([data-testid=PlayCircleFilledIcon])').first().click();
await page.waitForTimeout(2000);

// Scan an item first via the barcode input
const barcodeInput = page.locator('input[type=text],input[placeholder],input').first();
const found = await barcodeInput.count();
console.log('Barcode inputs found:', found);
// Try entering barcode in any visible text input
const allInputs = await page.locator('input').all();
for (const inp of allInputs) {
  const visible = await inp.isVisible();
  const type = await inp.getAttribute('type');
  const placeholder = await inp.getAttribute('placeholder');
  console.log(`INPUT type=${type} placeholder=${placeholder} visible=${visible}`);
}
// Use keyboard to type barcode + Enter
await page.keyboard.type('4901234000001');
await page.keyboard.press('Enter');
await page.waitForTimeout(1500);
console.log('Item count after scan:', await page.locator('[data-testid=cart],[class*=cart],[class*=Cart]').count());

// Click 中止 and see what happens
console.log('=== CLICKING 中止 ===');
const chushi = await page.locator('button[aria-label="中止"]').first();
console.log('中止 visible=', await chushi.isVisible());
await chushi.click();
await page.waitForTimeout(1500);

console.log('=== BUTTONS AFTER 中止 CLICK ===');
const btns = await page.locator('button,[role=button]').all();
for (const btn of btns) {
  const text = (await btn.textContent())?.trim() ?? '';
  const visible = await btn.isVisible();
  const hidden = await btn.isHidden();
  const enabled = await btn.isEnabled();
  if (text) {
    console.log(`TEXT="${text}" visible=${visible} hidden=${hidden} enabled=${enabled}`);
  }
}

console.log('\n=== PAGE URL AFTER 中止 ===', page.url());

console.log('\n=== ALL ARIA-LABEL BUTTONS ===');
const ariabtns = await page.locator('[aria-label]').all();
for (const btn of ariabtns) {
  const aria = await btn.getAttribute('aria-label');
  const tag = await btn.evaluate(el => el.tagName);
  const visible = await btn.isVisible();
  if (aria) console.log(`TAG=${tag} aria-label="${aria}" visible=${visible}`);
}

await browser.close();
