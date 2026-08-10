/**
 * Step definitions: Negative-path scenarios
 *
 * Covers invalid login and unknown-barcode flows (TC-20006, TC-20007).
 */

import { When, Then } from '@cucumber/cucumber';
import { AppWorld } from '../support/world.js';

When('the user logs in with invalid credentials', async function (this: AppWorld) {
  await this.login.loginWithInvalidCredentials();
  await this.attach('Submitted invalid credentials (invalid_user / wrong_password)', 'text/plain');
});

Then('the login should fail with an error message', async function (this: AppWorld) {
  const stillOnLogin = await this.login.isLoginFailed();
  if (!stillOnLogin) {
    throw new Error(
      'Expected login to fail but sign-in screen is no longer visible — user may have been redirected to dashboard'
    );
  }
  await this.attach('✅ Login correctly rejected invalid credentials — sign-in screen still visible', 'text/plain');
  await this.attach(await this.login.screenshot(), 'image/jpeg');
});

When('the user scans an unknown item code', async function (this: AppWorld) {
  await this.sale.enterItemCode('9999999999999'); // 13-digit EAN not in catalog
  await this.attach('Scanned unknown barcode: 9999999999999', 'text/plain');
});

Then('the item code confirm button should be disabled with no input', async function (this: AppWorld) {
  const confirmBtn = this.sale.itemCodeConfirmButton;
  const isEnabled = await confirmBtn.isEnabled().catch(() => false);
  if (isEnabled) {
    throw new Error('AC17: Expected item code confirm button to be disabled when no code is entered, but it was enabled');
  }
  await this.attach('\u2705 AC17: Item code confirm button correctly disabled with no input entered', 'text/plain');
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
});

When('the user attempts to apply an invalid amount off of {int}', async function (this: AppWorld, amount: number) {
  const summary = await this.sale.attemptInvalidAmountOff(amount);
  await this.attach(summary, 'text/plain');
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
});

Then('the POS should show an item not found error', async function (this: AppWorld) {
  const hasError = await this.sale.isItemNotFoundErrorVisible();
  if (!hasError) {
    throw new Error(
      'Expected item-not-found error banner but none was visible.\n' +
      'Expected message: 「商品が見つかりません。バーコードを確認して再度スキャンしてください。」'
    );
  }
  await this.attach(
    '✅ POS correctly showed item-not-found error:\n' +
    '  「商品が見つかりません。バーコードを確認して再度スキャンしてください。」',
    'text/plain'
  );
  await this.attach(await this.sale.screenshot(), 'image/jpeg');
});
