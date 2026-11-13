const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const { dollarsToCents, formatDollars } = require('../support/conversions');
const { recordExpense } = require('../support/expense-flow');

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

// Recorded before "both devices sync", so neither device has the other's
// expense yet, as if each were offline.
When(
  /^(I record|the second device records) an? \$([0-9.]+) "([^"]*)" expense from "([^"]*)"$/,
  async function (device, dollars, category, account) {
    const record = () =>
      recordExpense(this, {
        who: 'Somewhere',
        account,
        cents: dollarsToCents(dollars),
        category,
      });
    await (device === 'I record' ? record() : this.onSecondDevice(record));
  }
);

When('both devices sync', async function () {
  await this.syncDevices();
});

// Both sign in as the same family, and the app syncs from then on.
When('both devices sign in to sync', async function () {
  const user = await this.ensureSyncUser();
  await this.onEachDevice(async () => {
    await this.signInToSync(user);
    await this.waitForBudgetOverview();
  });
  await this.waitForDevicesToMatch();
});

When('I sign in to sync with the wrong password', async function () {
  const { name } = await this.ensureSyncUser();
  await this.signInToSync({ name, password: 'not-the-password' });
});

Then('I should see the error {string}', async function (title) {
  await this.waitForError(title);
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

// The transaction is named by its payee ("Monthly refill") or its amount
// ($80.00).
Then(
  /^each device should show just one (?:"([^"]*)"|\$([0-9,.]+)) transaction dated (\S+)$/,
  async function (who, dollars, date) {
    const amount = dollars && formatDollars(dollars);
    const described = who ? `"${who}"` : amount;
    await this.onEachDevice(async () => {
      await this.openTab('Transactions');
      await this.waitForHeadingStartingWith('Transactions');
      await this.waitForTransactionRow({ who, amount, date });
      const matching = (await this.readTransactionRows()).filter(
        (row) =>
          (!who || row.who === who) &&
          (!amount || row.amount === amount) &&
          row.date === date
      );
      assert.strictEqual(
        matching.length,
        1,
        `Expected one ${described} transaction dated ${date}, but the list shows ` +
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
