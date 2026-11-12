const { Given, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const { dollarsToCents, formatDollars } = require('../support/conversions');

// The month is named outright, not counted back from today, because "today
// is" freezes only the browser's clock and not this process's. The category
// starts with that month's refill, just as a sensible default.
Given(
  /^a budget category "([^"]*)" with \$([0-9.]+) budgeted per month, last refilled (\d{4}-\d{2})$/,
  async function (name, budgetedDollars, refilled) {
    await this.seedRefilledCategory(name, {
      budgeted: dollarsToCents(budgetedDollars),
      refilled,
    });
  }
);

// A category whose amount was just set, before its first fill.
Given(
  /^a budget category "([^"]*)" with \$([0-9.]+) budgeted per month, never refilled$/,
  async function (name, budgetedDollars) {
    await this.seedCategory(name, { budgeted: dollarsToCents(budgetedDollars) });
  }
);

// What a first fill leaves when the app stops between its two writes: the
// refill transaction for the named month, the latest one on or before today,
// with no `refilled` month saved.
Given(
  /^its first fill was recorded in (\w+), without saving its last-refilled month$/,
  async function (monthName) {
    const categoryId = this.lastCategoryId;
    const { budgeted } = await this.readDoc(categoryId);
    const [year, month] = this.frozenDate.split('-').map(Number);
    for (let monthsAgo = 0; monthsAgo < 12; monthsAgo++) {
      const day = new Date(year, month - 1 - monthsAgo, 1);
      if (day.toLocaleString('en-US', { month: 'long' }) === monthName) {
        const mm = String(day.getMonth() + 1).padStart(2, '0');
        await this.seedRefill({
          categoryId,
          amount: budgeted,
          day: `${day.getFullYear()}-${mm}-01`,
        });
        return;
      }
    }
    throw new Error(`Unrecognized month: "${monthName}"`);
  }
);

// Recording a refill takes two writes, the transaction and the category's
// last-refilled month. This stops the app after the first, whichever that is,
// by failing every later write to the category's documents during one launch.
Given(
  /^the app stops after its first write while recording (\w+)'s refill$/,
  async function (monthName) {
    const categoryId = this.lastCategoryId;
    const { refilled } = await this.readDoc(categoryId);
    const [year, month] = refilled.split('-').map(Number);
    assert.strictEqual(
      new Date(year, month, 1).toLocaleString('en-US', { month: 'long' }),
      monthName,
      `The month after ${refilled}`
    );
    await this.launchStoppingAfterFirstWrite(categoryId);
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
