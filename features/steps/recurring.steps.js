const { Given, When } = require('@cucumber/cucumber');
const { dollarsToCents } = require('../support/conversions');
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
