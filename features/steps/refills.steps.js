const { Given, Then } = require('@cucumber/cucumber');
const { dollarsToCents, formatDollars } = require('../support/conversions');

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
