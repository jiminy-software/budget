const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const { formatDollars } = require('../support/conversions');

// It starts with nothing until it syncs, like a device just signed in.
Given('a second device', async function () {
  await this.addSecondDevice();
});

Given('a second device synced with this one', async function () {
  await this.addSecondDevice();
  await this.syncDevices();
});

// The app does not sync on its own yet, so until it does, reopening before
// "both devices sync" is as good as reopening offline. Once it syncs at
// launch, this has to take both devices offline first.
When('I reopen the app on both devices', async function () {
  await this.onEachDevice(async () => {
    await this.openApp('/');
    await this.page.waitForSelector('h2');
  });
});

When('both devices sync', async function () {
  await this.syncDevices();
});

Then(
  /^the second device should show an? \$([0-9,.]+) transaction$/,
  async function (dollars) {
    await this.onSecondDevice(async () => {
      await this.openTab('Transactions');
      await this.waitForHeadingStartingWith('Transactions');
      await this.waitForTransactionRow({ amount: formatDollars(dollars) });
    });
  }
);

Then(
  /^each device should show just one "([^"]*)" transaction dated (\S+)$/,
  async function (who, date) {
    await this.onEachDevice(async () => {
      await this.openTab('Transactions');
      await this.waitForHeadingStartingWith('Transactions');
      await this.waitForTransactionRow({ who, date });
      const matching = (await this.readTransactionRows()).filter(
        (row) => row.who === who && row.date === date
      );
      assert.strictEqual(
        matching.length,
        1,
        `Expected one "${who}" transaction dated ${date}, but the list shows ` +
          matching.length
      );
    });
  }
);

Then(
  /^each device's budget overview should show "([^"]*)" with \$([0-9.]+) remaining$/,
  async function (name, dollars) {
    await this.onEachDevice(async () => {
      await this.openApp('/budget');
      await this.waitForBudgetOverview();
      await this.waitForRemainingShown(name, Number(dollars).toFixed(2));
    });
  }
);
