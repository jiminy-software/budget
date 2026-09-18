const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const {
  dollarsToCents,
  wordToNumber,
  yearMonthMonthsAgo,
} = require('../support/conversions');
const {
  chooseAccount,
  completeReview,
  enterAmount,
  putFullAmountInCategory,
  sayItWasPaidTo,
  startExpense,
} = require('../support/expense-flow');

Given('the app is running', async function () {
  await this.launch();
});

When('I go to the home page', async function () {
  await this.openApp('/');
});

Then('I should see the current month as the heading', async function () {
  await this.page.waitForSelector('h2');
  const heading = await this.page.$eval('h2', (el) => el.textContent.trim());
  const expected = new Date().toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  assert.strictEqual(heading, expected);
});

When('I go to the new category page', async function () {
  await this.openApp('/category/new');
  await this.page.waitForSelector('#new-category-name');
});

When('I name the category {string}', async function (name) {
  await this.page.type('#new-category-name', name);
  await this.clickNamedButton('next');
  await this.waitForHeadingStartingWith('Monthly amount for');
});

When(/^I set its monthly amount to \$([0-9.]+)$/, async function (dollars) {
  await this.typeIntoAmountInput(dollarsToCents(dollars));
  await this.clickNamedButton('save');
  await this.waitForBudgetOverview();
});

Then(
  /^the budget overview should show "([^"]*)" with \$([0-9.]+) remaining$/,
  async function (name, dollars) {
    await this.openApp('/budget');
    await this.waitForBudgetOverview();
    await this.waitForRemainingShown(name, Number(dollars).toFixed(2));
  }
);

When('I go to the new account page', async function () {
  await this.openApp('/account/new');
  await this.page.waitForSelector('#new-account-name');
});

When('I name the account {string}', async function (name) {
  await this.page.type('#new-account-name', name);
  await this.clickNamedButton('done');
  await this.waitForHeadingStartingWith('Accounts');
});

Then('the accounts list should show {string}', async function (name) {
  await this.openApp('/accounts');
  await this.page.waitForFunction(
    (n) =>
      [...document.querySelectorAll('a[href^="#/account/"]')].some(
        (a) => a.textContent.trim() === n
      ),
    {},
    name
  );
});

Given(
  /^a budget category "([^"]*)" with \$([0-9.]+) budgeted and remaining$/,
  async function (name, dollars) {
    const cents = dollarsToCents(dollars);
    await this.seedCategory(name, {
      budgeted: cents,
      remaining: cents,
      refilled: yearMonthMonthsAgo(0),
    });
  }
);

Given('an account named {string}', async function (name) {
  await this.seedAccount(name);
});

Given(
  /^a budget category "([^"]*)" with \$([0-9.]+) budgeted per month, \$([0-9.]+) remaining, last refilled (\w+) months? ago$/,
  async function (name, budgetedDollars, remainingDollars, monthsAgoWord) {
    await this.seedCategory(name, {
      budgeted: dollarsToCents(budgetedDollars),
      remaining: dollarsToCents(remainingDollars),
      refilled: yearMonthMonthsAgo(wordToNumber(monthsAgoWord)),
    });
  }
);

When('I start a new expense', async function () {
  await startExpense(this);
});

When('I say it was paid to {string}', async function (who) {
  await sayItWasPaidTo(this, who);
});

When('I choose the {string} account', async function (name) {
  await chooseAccount(this, name);
});

When(/^I enter \$([0-9.]+) as the amount$/, async function (dollars) {
  await enterAmount(this, dollarsToCents(dollars));
});

When(
  'I put the full amount in the {string} category',
  async function (name) {
    await putFullAmountInCategory(this, name);
  }
);

When('I complete the review step', async function () {
  await completeReview(this);
});

When(
  /^I record a \$([0-9.]+) "([^"]*)" expense at "([^"]*)" from "([^"]*)"$/,
  async function (dollars, category, who, account) {
    await startExpense(this);
    await sayItWasPaidTo(this, who);
    await chooseAccount(this, account);
    await enterAmount(this, dollarsToCents(dollars));
    await putFullAmountInCategory(this, category);
    await completeReview(this);
  }
);

When('I open {string} from the budget overview', async function (name) {
  await this.openCategoryDetails(name);
});

Then('I should see the category view for {string}', async function (name) {
  await this.waitForHeadingStartingWith(name);
});

When('I open {string} from the accounts list', async function (name) {
  await this.openApp('/accounts');
  await this.waitForHeadingStartingWith('Accounts');
  await this.clickByText('a[href^="#/account/"]', name);
});

Then('I should see the account view for {string}', async function (name) {
  await this.waitForHeadingStartingWith(name);
});

// Both detail views rename the same way: open the one menu, choose the rename
// item, answer the prompt it opens.
const renameFromDetailMenu = async (world, item, newName) => {
  await world.openDetailMenu();
  world.answerNextPrompt(newName);
  await world.clickElementWithText('[role="menuitem"]', item);
  await world.waitForHeadingStartingWith(newName);
};

When('I rename it to {string} from the account menu', async function (name) {
  await renameFromDetailMenu(this, 'Rename account', name);
});

When('I rename it to {string} from the category menu', async function (name) {
  await renameFromDetailMenu(this, 'Rename category', name);
});

// Any screen whose header carries the triple-dot menu.
When('I choose {string} from the menu', async function (item) {
  await this.openDetailMenu();
  await this.clickElementWithText('[role="menuitem"]', item);
});

Given('I have already visited the app once', async function () {
  await this.openApp('/');
  await this.waitForServiceWorkerControl();
});

When('I lose my network connection', async function () {
  await this.page.setOfflineMode(true);
});

Then('the browser should consider the app installable', async function () {
  try {
    await this.page.waitForFunction(() => window.__installPromptFired, {
      timeout: 10000,
    });
  } catch (e) {
    throw new Error(
      'The browser never offered to install the app. It only offers once the ' +
        'manifest, an icon of at least 192px and an active service worker are ' +
        'all in place, so one of those is missing or broken.'
    );
  }
});
