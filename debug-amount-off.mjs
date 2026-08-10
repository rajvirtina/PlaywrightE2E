import { chromium } from 'playwright';
const b = await chromium.launch({ headless: false, slowMo: 200 });
const p = await b.newPage();
await p.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle', timeout: 15000 });
await p.waitForSelector('input[type="text"]', { timeout: 10000 });
await p.locator('input[type="text"]').fill('0000');
await p.locator('input[type="password"]').fill('0000');
await p.locator('button').filter({ hasText: /^ログイン$/ }).first().click();
await p.waitForSelector('[data-testid="PlayCircleFilledIcon"]', { timeout: 10000 });
await p.locator('button:has([data-testid="PlayCircleFilledIcon"])').first().click();
await p.waitForTimeout(1500);

// Scan testItemA (4901234000001)
const itemCode = '4901234000001';
for (const digit of itemCode) {
  const btn = p.locator(`button[aria-label="Key ${digit}"], [role="button"][aria-label="Key ${digit}"]`).first();
  if (await btn.isVisible()) await btn.click();
  await p.waitForTimeout(100);
}
// Click item code confirm (first 確定 without aria-label)
const confirmBtn = p.locator('button, [role="button"]').filter({ hasText: /^確定$/ }).first();
if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) await confirmBtn.click();
await p.waitForTimeout(1000);

// Open action window and click Amount Off
const actionTab = p.getByRole('tab', { name: /アクションウィンドウ|Action Window/i });
if (await actionTab.isVisible({ timeout: 2000 }).catch(() => false)) await actionTab.click();
await p.waitForTimeout(500);

const amountOffBtn = p.locator('[aria-label="Amount Off"], [aria-label="額値引"]').first();
await amountOffBtn.click();
await p.waitForTimeout(1000);

// Click Custom ¥
const customBtn = p.locator('[data-testid="custom-amount-btn"]').first();
await customBtn.click();
await p.waitForTimeout(1000);

// Dump ALL inputs and buttons in the dialog
const dialog = p.getByRole('dialog');
const inputs = await dialog.locator('input').evaluateAll(els =>
  els.map(e => ({ type: e.type, value: e.value, placeholder: e.placeholder, 'aria-label': e.getAttribute('aria-label'), min: e.min, visible: e.offsetParent !== null }))
);
console.log('Dialog inputs:', JSON.stringify(inputs));

const buttons = await dialog.locator('button, [role="button"]').evaluateAll(els =>
  els.filter(e => e.offsetParent !== null).map(e => ({
    text: e.textContent?.trim().substring(0, 20),
    aria: e.getAttribute('aria-label'),
    testid: e.getAttribute('data-testid'),
    disabled: e.disabled
  }))
);
console.log('Dialog visible buttons:', JSON.stringify(buttons));

await p.screenshot({ path: 'reports/debug-amount-off-dialog.png', fullPage: true });
console.log('Screenshot saved to reports/debug-amount-off-dialog.png');

// Try entering 5 and check next-btn state
const key5 = dialog.locator('[aria-label="Key 5"]').first();
console.log('Key 5 visible:', await key5.isVisible().catch(() => false));
await key5.click().catch(e => console.log('Key 5 click error:', e.message));
await p.waitForTimeout(500);

const nextBtn = p.locator('[data-testid="next-btn"]').first();
const isDisabled = await nextBtn.evaluate(el => el.disabled).catch(() => 'error');
const inputNow = await dialog.locator('input').evaluateAll(els => els.map(e => ({ value: e.value })));
console.log('After entering 5 — next-btn disabled:', isDisabled, '| input values:', JSON.stringify(inputNow));

await b.close();
