/**
 * Step definitions: Background / shared setup steps
 *
 * These steps appear in the Background of every feature file and in
 * several shared When steps that span multiple domains.
 */

import { Given, When } from '@cucumber/cucumber';
import { AppWorld } from '../support/world.js';

Given('the user opens the POS application', async function (this: AppWorld) {
  this.page.on('console', msg => {
    if (msg.type() === 'error') console.error('BROWSER ERROR:', msg.text());
  });
  this.page.on('pageerror', err => console.error('PAGE ERROR:', err.message));
  await this.login.goto();
});

Given('the user is logged in to the POS', async function (this: AppWorld) {
  await this.flows.loginToDashboard();
  await this.attach('✅ Logged in via AppFlows.loginToDashboard()', 'text/plain');
});

When('the user logs in with default credentials', async function (this: AppWorld) {
  await this.login.login();
});

When('the user clicks the start transaction button', async function (this: AppWorld) {
  await this.home.clickStartTransaction();
});
