const { Given, When, Then } = require('@cucumber/cucumber');
const { formatDollars } = require('../support/conversions');

// It starts with nothing until it syncs, like a device just signed in.
Given('a second device', async function () {
  await this.addSecondDevice();
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
