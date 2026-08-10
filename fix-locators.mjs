/**
 * Fix corrupted Japanese locator strings in SalePage.ts.
 * Each fix targets a specific non-ASCII byte sequence and replaces it with
 * the correct unicode escape so Playwright can match the browser DOM text.
 */
import { readFileSync, writeFileSync } from 'fs';

let c = readFileSync('acceptance/pages/SalePage.ts', 'utf8');
const before = c;

const strFixes = [
  // discountDialogConfirmButton: /^Confirm$|確定/i
  [/\/\^Confirm\$\|[^\x00-\x7F]+\/i/, '/^Confirm$|\\u78ba\\u5b9a/i', 'discountDialogConfirmButton'],
  // discountDialogCancelButton: /cancel|キャンセル|閉じる|close/i
  [/\/cancel\|[^\x00-\x7F]+\|[^\x00-\x7F]+\|close\/i/, '/cancel|\\u30ad\\u30e3\\u30f3\\u30bb\\u30eb|\\u9589\\u3058\\u308b|close/i', 'discountDialogCancelButton'],
  // removeDiscountButton: context-aware match for hasText with non-ASCII in removeDiscountButton
  [/\.filter\(\{ hasText: \/[^\x00-\x7F\/]+\/ \}\)\.first\(\) \/\/ confirm/,
    '.filter({ hasText: /^\\u78ba\\u5b9a$/ }).first() // confirm',
    'itemCodeConfirmButton hasText'],
  // removeDiscountButton inside discountDialog: matches hasText with only non-ASCII
  [/return this\.discountDialog\.locator\('button'\)\.filter\(\{ hasText: \/[^\x00-\x7F\/]+\/ \}\)\.first\(\)/,
    'return this.discountDialog.locator(\'button\').filter({ hasText: /\\u5024\\u5f15\\u53d6\\u6d88/ }).first()',
    'removeDiscountButton'],
  // tenKeyConfirmButton: /non-ascii|confirm/i
  [/getByRole\('button', \{ name: \/[^\x00-\x7F\/]+\|confirm\/i \}\)/,
    'getByRole(\'button\', { name: /\\u78ba\\u5b9a|confirm/i })',
    'tenKeyConfirmButton'],
  // tenKeyConfirmButton: /確定|confirm/i
  [/\/[^\x00-\x7F]{2}\|confirm\/i/, '/\\u78ba\\u5b9a|confirm/i', 'tenKeyConfirmButton'],
  // actionWindowTab: /アクションウィンドウ|Action Window/i (2 occurrences)
  [/\/[^\x00-\x7F]+\|Action Window\/i/g, '/\\u30a2\\u30af\\u30b7\\u30e7\\u30f3\\u30a6\\u30a3\\u30f3\\u30c9\\u30a6|Action Window/i', 'actionWindowTab'],
  // proceedToPayment button text in cancelTransaction wait
  [/includes\('([^\x00-\x7F]{3,8})'\)(.+?)waitForVisible/s,
    null, 'skip-complex'],
];

let changed = 0;
for (const [pattern, replacement, label] of strFixes) {
  if (replacement === null) continue;
  const prev = c;
  c = c.replace(pattern, replacement);
  if (c !== prev) {
    const count = (c.match(pattern) || []).length === 0 ? 'all' : 'partial';
    console.log(`Fixed: ${label}`);
    changed++;
  } else {
    console.log(`No match: ${label}`);
  }
}

if (c !== before) {
  writeFileSync('acceptance/pages/SalePage.ts', c, 'utf8');
  console.log(`Done. Applied ${changed} fix(es).`);
} else {
  console.log('No changes made.');
}
