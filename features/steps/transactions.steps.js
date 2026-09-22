const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const {
  dollarsToCents,
  formatDollars,
  timestampForDay,
} = require('../support/conversions');

const describeRows = (rows) =>
  rows.length === 0
    ? 'no transactions'
    : rows.map((row) => `"${row.who}" ${row.amount}`).join(', ');

// A seeded expense, e.g. a $12.34 "Groceries" expense from "Checking", with
// an optional payee (at "Corner Store") before the account and an optional
// day (dated yesterday, or dated 2026-03-01) after it. An account or category
// the scenario has not seeded is seeded here, the category with $100.00
// budgeted and remaining. A payee left unnamed is "Somewhere", since the app
// shows the payee.
Given(
  /^an? \$([0-9.]+) "([^"]*)" expense(?: at "([^"]*)")? from "([^"]*)"(?: dated (.+))?$/,
  async function (dollars, category, who, account, day) {
    await this.seedTransaction({
      who: who || 'Somewhere',
      accountId: await this.ensureAccount(account),
      categoryId: await this.ensureCategory(category),
      amountTotal: dollarsToCents(dollars),
      timestamp: day ? timestampForDay(day) : Date.now(),
    });
  }
);

// Each scenario starts with an empty database, so this is a check rather
// than a setup: it fails if that ever stops being true.
Given('there are no transactions yet', async function () {
  assert.strictEqual(await this.countDocs('t'), 0);
});

When('I open the Transactions tab', async function () {
  await this.openTab('Transactions');
  await this.waitForHeadingStartingWith('Transactions');
});

// The optional date is the compact form the list shows, e.g. "3/1/26".
Then(
  /^I should see an? \$([0-9,.]+) transaction(?: dated (\S+))?$/,
  async function (dollars, date) {
    await this.waitForTransactionRow({ amount: formatDollars(dollars), date });
  }
);

// The same shape as the step above, negated: no such row is on screen. Put
// it after the steps that wait for the rows that should be there, since it
// reads the list rather than waiting on it.
Then(
  /^I should NOT see an? \$([0-9,.]+) transaction(?: dated (\S+))?$/,
  async function (dollars, date) {
    await this.assertNoTransactionRow({ amount: formatDollars(dollars), date });
  }
);

// "Bakery", then "Farm Stand", then "Corner Store": every row, top to bottom.
Then(
  /^the transactions list should show ("[^"]*"(?:, then "[^"]*")*)$/,
  async function (quotedNames) {
    const expected = [...quotedNames.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
    try {
      await this.page.waitForFunction(
        (names) =>
          JSON.stringify(
            [...document.querySelectorAll('.transaction-row .transaction-who')]
              .map((el) => el.textContent.trim())
          ) === JSON.stringify(names),
        { timeout: 5000 },
        expected
      );
    } catch (e) {
      const rows = await this.readTransactionRows();
      throw new Error(
        `Expected the transactions list to show ${expected.map((n) => `"${n}"`).join(', then ')}, ` +
          `but it shows ${describeRows(rows)}`
      );
    }
  }
);

Then('the transactions list should say {string}', async function (text) {
  try {
    await this.page.waitForFunction(
      (t) =>
        [...document.querySelectorAll('.no-transactions')].some(
          (el) => el.textContent.trim() === t
        ),
      { timeout: 5000 },
      text
    );
  } catch (e) {
    const rows = await this.readTransactionRows();
    const shown = await this.page.evaluate(() => {
      const el = document.querySelector('.no-transactions');
      return el ? el.textContent.trim() : null;
    });
    throw new Error(
      `Expected the transactions list to say "${text}", but ` +
        (shown === null
          ? `it shows ${describeRows(rows)} and no message`
          : `it says "${shown}"`)
    );
  }
});
