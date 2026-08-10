import { readFileSync, writeFileSync } from 'fs';

let c = readFileSync('acceptance/pages/SalePage.ts', 'utf8');

const fixes = [
  // itemCodeTab - 商品コード
  [/\/[^\u0000-\u007F]+\|PRODUCT CODE\/i/g, '/\\u5546\\u54c1\\u30b3\\u30fc\\u30c9|PRODUCT CODE/i'],
  // actionWindowTab - アクションウィンドウ
  [/\/[^\u0000-\u007F]+\|Action Window\/i/g, '/\\u30a2\\u30af\\u30b7\\u30e7\\u30f3\\u30a6\\u30a3\\u30f3\\u30c9\\u30a6|Action Window/i'],
  // deleteItemButton - Delete/削除
  [/\[aria-label="[^\u0000-\u007F]+"\], \[aria-label="Delete"\]/g, '[aria-label="Delete"], [aria-label="\\u524a\\u9664"]'],
  [/\[aria-label="Delete"\], \[aria-label="[^\u0000-\u007F]+"\]/g, '[aria-label="Delete"], [aria-label="\\u524a\\u9664"]'],
  // cancelTransactionButton - 取消/中止
  [/button\[aria-label="[^\u0000-\u007F]{2}"\], button\[aria-label="[^\u0000-\u007F]{2}"\]/g, 'button[aria-label="\\u53d6\\u6d88"], button[aria-label="\\u4e2d\\u6b62"]'],
  // itemCodeConfirmButton - 確定
  [/hasText: \/\^[^\u0000-\u007F]+\$\/ \}\)\.first\(\) \/\/ confirm/g, 'hasText: /^\\u78ba\\u5b9a$/ }).first() // confirm'],
];

let changed = 0;
for (const [pattern, replacement] of fixes) {
  const before = c;
  c = c.replace(pattern, replacement);
  if (c !== before) {
    console.log(`Fixed: ${pattern}`);
    changed++;
  }
}

// Specifically fix the two itemCodeTab lines (most critical)
const badTab = readFileSync('acceptance/pages/SalePage.ts', 'utf8');
const lines = badTab.split('\n');
let fixedLines = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('PRODUCT CODE') && lines[i].includes('getByRole') && /[^\x00-\x7F]/.test(lines[i])) {
    lines[i] = "    return this.page.getByRole('tab', { name: /\\u5546\\u54c1\\u30b3\\u30fc\\u30c9|PRODUCT CODE/i }).or(";
    fixedLines++;
    console.log(`Fixed line ${i+1}: itemCodeTab getByRole`);
  } else if (lines[i].includes('PRODUCT CODE') && lines[i].includes('getByText') && /[^\x00-\x7F]/.test(lines[i])) {
    lines[i] = "      this.page.getByText(/\\u5546\\u54c1\\u30b3\\u30fc\\u30c9|PRODUCT CODE/i, { exact: true })";
    fixedLines++;
    console.log(`Fixed line ${i+1}: itemCodeTab getByText`);
  }
}

const result = lines.join('\n');
writeFileSync('acceptance/pages/SalePage.ts', result, 'utf8');
console.log(`Done. Fixed ${fixedLines} itemCodeTab lines.`);
