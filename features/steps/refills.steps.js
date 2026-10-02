const { Given, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const {
  dollarsToCents,
  formatDollars,
  timestampForDay,
} = require('../support/conversions');

// The month is named outright, not counted back from today, because "today
// is" freezes only the browser's clock and not this process's. The category
// starts with its budgeted amount remaining, just as a sensible default.
Given(
  /^a budget category "([^"]*)" with \$([0-9.]+) budgeted per month, last refilled (\d{4}-\d{2})$/,
  async function (name, budgetedDollars, refilled) {
    await this.seedCategory(name, {
      budgeted: dollarsToCents(budgetedDollars),
      remaining: dollarsToCents(budgetedDollars),
      refilled,
    });
  }
);

// Only the transaction: the category's balance is left as the steps before
// it set it.
Given(
  /^an? "([^"]*)" refill of \$([0-9.]+) dated (\d{4}-\d{2}-\d{2})$/,
  async function (name, dollars, day) {
    await this.seedRefill({
      categoryId: await this.ensureCategory(name),
      amount: dollarsToCents(dollars),
      timestamp: timestampForDay(day),
    });
  }
);

// A refill is money into a category, which the list marks with a plus sign.
// The date is the compact form the list shows, e.g. "10/1/26".
Then(
  /^I should see an? \+\$([0-9,.]+) "([^"]*)" transaction dated (\S+)$/,
  async function (dollars, who, date) {
    await this.waitForTransactionRow({
      amount: '+' + formatDollars(dollars),
      who,
      date,
    });
  }
);

Then(
  /^I should NOT see an? "([^"]*)" transaction dated (\S+)$/,
  async function (who, date) {
    await this.assertNoTransactionRow({ who, date });
  }
);

// The transaction screen's counterpart to the expense step "it should show a
// $12.34 ... expense", for a refill: money in, and no account to show.
Then(
  /^it should show an? \+\$([0-9,.]+) "([^"]*)" for "([^"]*)" dated (\S+) with no account$/,
  async function (dollars, who, category, date) {
    const shown = await this.readTransactionDetail();
    assert.strictEqual(shown.amount, '+' + formatDollars(dollars), 'the amount');
    assert.strictEqual(shown.who, who, 'the payee');
    assert.strictEqual(shown.date, date, 'the date');
    assert.strictEqual(shown.account, null, 'the account row');
    assert.ok(
      shown.categories.some((tag) => tag.startsWith(`${category} `)),
      `Expected a "${category}" category tag, but the screen shows ` +
        (shown.categories.length === 0 ? 'none' : shown.categories.join(', '))
    );
  }
);
