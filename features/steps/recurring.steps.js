const { Given, Then, When } = require('@cucumber/cucumber');
const assert = require('assert');
const { dollarsToCents, formatDollars } = require('../support/conversions');
const {
  chooseAccount,
  completeReview,
  enterAmount,
  putFullAmountInCategory,
  sayItWasPaidTo,
  startExpense,
} = require('../support/expense-flow');

// Put this first in a scenario: it fixes the date that every page the browser
// loads from now on believes it is.
Given(/^today is (\d{4}-\d{2}-\d{2})$/, async function (date) {
  await this.freezeClockAt(date);
});

// Drives the expense flow with the payee and account left to defaults, since
// the scenario names neither, and turns the repeat on at the review.
When(
  /^I record a recurring \$([0-9,.]+) "([^"]*)" expense next due (\d{4}-\d{2}-\d{2})$/,
  async function (dollars, category, nextDue) {
    await this.ensureAccount('Checking');
    await this.ensureCategory(category);
    await startExpense(this);
    await sayItWasPaidTo(this, 'Somewhere');
    await chooseAccount(this, 'Checking');
    await enterAmount(this, dollarsToCents(dollars));
    await putFullAmountInCategory(this, category);
    await this.setReviewDate(nextDue);
    await this.turnOnRepeatsMonthly();
    await completeReview(this);
  }
);

// The Given twin of the step above: a recurring expense already set up,
// seeded straight into the database, with the payee and account the scenario
// leaves unnamed.
Given(
  /^a recurring \$([0-9,.]+) "([^"]*)" expense next due (\d{4}-\d{2}-\d{2})$/,
  async function (dollars, category, nextDue) {
    await this.seedRecurringTransaction({
      who: 'Somewhere',
      accountId: await this.ensureAccount('Checking'),
      categoryId: await this.ensureCategory(category),
      amountTotal: dollarsToCents(dollars),
      nextDue,
    });
  }
);

// A fresh load, which is when the app records whatever has fallen due. The
// heading is the router's, so waiting for it waits out the start-up the
// router is held behind.
When('I reopen the app', async function () {
  await this.openApp('/');
  await this.page.waitForSelector('h2');
});

When(/^I go to the "([^"]*)" category's details screen$/, async function (name) {
  await this.openCategoryDetails(name);
});

// The recurring list shows the next due date in the same compact form the
// transaction list shows a date, e.g. "4/1/26".
Then(
  /^I should see a \$([0-9,.]+) recurring expense next due (\S+)$/,
  async function (dollars, nextDue) {
    await this.waitForRecurringRow({ amount: formatDollars(dollars), nextDue });
  }
);

Then(
  /^I should NOT see a \$([0-9,.]+) recurring expense$/,
  async function (dollars) {
    await this.waitForNoRecurringRow({ amount: formatDollars(dollars) });
  }
);

When(/^I open the \$([0-9,.]+) recurring expense$/, async function (dollars) {
  await this.openRecurringExpense(formatDollars(dollars));
  await this.waitForHeadingStartingWith('Recurring expense');
});

// One step for the whole screen, since each part of it is only worth reading
// together with the rest: this much, from this envelope, on this date.
Then(
  /^it should show a monthly \$([0-9,.]+) "([^"]*)" expense next due (\S+)$/,
  async function (dollars, category, nextDue) {
    const amount = formatDollars(dollars);
    const shown = await this.readRecurringDetail();
    assert.strictEqual(shown.repeats, 'Monthly', 'how often it repeats');
    assert.strictEqual(shown.amount, amount, 'the amount');
    assert.strictEqual(shown.nextDue, nextDue, 'the next due date');
    assert.ok(
      shown.categories.some((tag) => tag.startsWith(`${category} `)),
      `Expected a "${category}" category tag, but the screen shows ` +
        (shown.categories.length === 0
          ? 'none'
          : shown.categories.join(', '))
    );
  }
);

// Delete opens a confirm(), as the account and category screens do.
When('I delete it from the recurring expense menu', async function () {
  await this.openDetailMenu();
  this.acceptNextConfirm();
  await this.clickElementWithText('[role="menuitem"]', 'Delete recurring expense');
  await this.waitForHeadingStartingWith('Transactions');
});

Then('the recurring list should say {string}', async function (text) {
  await this.page.waitForFunction(
    (expected) => {
      const message = document.querySelector('.no-recurring');
      return message && message.textContent.trim() === expected;
    },
    { timeout: 5000 },
    text
  );
});
