const { setWorldConstructor } = require('@cucumber/cucumber');
const puppeteer = require('puppeteer');
const { randomUUID } = require('crypto');
const { yearMonthMonthsAgo } = require('./conversions');

const BASE_URL = 'http://localhost:5000';

class CustomWorld {
  constructor() {
    // The accounts and categories seeded so far, by the name the scenario
    // gave them, so a later step can refer to one by that name.
    this.accountIds = {};
    this.categoryIds = {};
  }

  async launch() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      this.page = await this.browser.newPage();

      // Chrome fires this once, early, on any page it judges installable, so
      // the listener has to be in place before the first navigation rather
      // than added by the step that asserts on it.
      await this.page.evaluateOnNewDocument(() => {
        window.__installPromptFired = false;
        window.addEventListener('beforeinstallprompt', () => {
          window.__installPromptFired = true;
        });
      });
    }
  }

  // Fixes the date every page the browser loads from now on believes it is:
  // local noon on the given day. Registered before the app is opened; if it
  // already is, a reload brings the shim into effect.
  async freezeClockAt(dateString) {
    await this.page.evaluateOnNewDocument((date) => {
      const RealDate = Date;
      const fixed = new RealDate(`${date}T12:00:00`).getTime();
      function FrozenDate(...args) {
        if (!(this instanceof FrozenDate)) return String(new RealDate(fixed));
        return args.length ? new RealDate(...args) : new RealDate(fixed);
      }
      FrozenDate.prototype = RealDate.prototype;
      FrozenDate.now = () => fixed;
      FrozenDate.parse = RealDate.parse;
      FrozenDate.UTC = RealDate.UTC;
      window.Date = FrozenDate;
    }, dateString);
    if (this.page.url().startsWith(BASE_URL)) {
      await this.page.reload({ waitUntil: 'networkidle0' });
    }
  }

  // Resolves once the service worker is not just registered but activated and
  // in charge of the page. A worker only becomes a client's controller after
  // it activates, which happens after its install step has finished
  // precaching, so by this point the app shell is on disk and the network can
  // be taken away.
  async waitForServiceWorkerControl() {
    // Poll on a timer rather than waitForFunction's default animation frames,
    // which Chrome throttles heavily on a page that is never visible.
    const controlled = () =>
      this.page.waitForFunction(
        () => navigator.serviceWorker.controller !== null,
        { timeout: 15000, polling: 100 }
      );

    try {
      await controlled();
    } catch (e) {
      // Activated is not the same as in charge: a worker takes over a page
      // that was already open only once it claims clients, and whether that
      // has happened yet is a race. A reload settles it, since an activated
      // worker controls the page it serves.
      await this.page.reload({ waitUntil: 'networkidle0' });
      try {
        await controlled();
      } catch (e2) {
        throw new Error(
          'No service worker took control of the page, even after a reload, ' +
            'so there is nothing to serve the app once the network goes away.'
        );
      }
    }
  }

  async openApp(hashPath) {
    // Changing only the hash is a same-document navigation, so page.goto on
    // its own would leave the already-running app mounted. Every step that
    // opens a path starts a flow there, so always load the app afresh.
    const wasOnApp = this.page.url().startsWith(BASE_URL);
    await this.page.goto(`${BASE_URL}/#${hashPath}`, {
      waitUntil: 'networkidle0',
    });
    if (wasOnApp) {
      await this.page.reload({ waitUntil: 'networkidle0' });
    }
  }

  async ensureAppLoaded() {
    if (!this.page.url().startsWith(BASE_URL)) {
      await this.openApp('/');
    }
    await this.page.waitForFunction(() => window.__budgetDb);
  }

  // Insert a document directly into the app's PouchDB (test seeding).
  async seed(doc) {
    await this.ensureAppLoaded();
    await this.page.evaluate((d) => window.__budgetDb.put(d), doc);
  }

  async seedAccount(name) {
    const id = `a-${randomUUID()}`;
    await this.seed({ _id: id, name });
    this.accountIds[name] = id;
    return id;
  }

  async seedCategory(name, { budgeted, remaining, refilled }) {
    const id = `c-${randomUUID()}`;
    await this.seed({ _id: id, name, budgeted, remaining, refilled });
    this.categoryIds[name] = id;
    return id;
  }

  // The account named, seeded if the scenario has not seeded it itself.
  async ensureAccount(name) {
    return this.accountIds[name] || this.seedAccount(name);
  }

  // As ensureAccount; a category seeded here has $100.00 budgeted and
  // remaining, refilled this month.
  async ensureCategory(name) {
    return (
      this.categoryIds[name] ||
      this.seedCategory(name, {
        budgeted: 10000,
        remaining: 10000,
        refilled: yearMonthMonthsAgo(0),
      })
    );
  }

  async seedTransaction({ who, accountId, categoryId, amountTotal, timestamp }) {
    await this.seed({
      _id: `t-${randomUUID()}`,
      who,
      accountId,
      amountTotal,
      categoryAmounts: { [categoryId]: amountTotal },
      timestamp,
    });
  }

  // A recurring expense already set up before the scenario starts, so a
  // scenario about catching up does not have to walk the expense flow first.
  async seedRecurringTransaction({
    who,
    accountId,
    categoryId,
    amountTotal,
    nextDue,
  }) {
    await this.seed({
      _id: `r-${randomUUID()}`,
      who,
      accountId,
      amountTotal,
      categoryAmounts: { [categoryId]: amountTotal },
      recurs: 'monthly',
      nextDue,
    });
  }

  // How many documents of one type (by _id prefix) the app's database holds.
  async countDocs(prefix) {
    await this.ensureAppLoaded();
    return this.page.evaluate(async (p) => {
      const response = await window.__budgetDb.allDocs({
        startkey: `${p}-`,
        endkey: `${p}-\ufff0`,
      });
      return response.rows.length;
    }, prefix);
  }

  // The bottom bar is part of every screen of the running app, so the app
  // has to be open before a tab can be tapped.
  async openTab(label) {
    await this.ensureAppLoaded();
    await this.page.waitForSelector('#button-row .tab');
    const tabs = await this.page.evaluate(() =>
      [...document.querySelectorAll('#button-row .tab')].map((el) =>
        el.textContent.trim()
      )
    );
    if (!tabs.includes(label)) {
      throw new Error(
        `There is no "${label}" tab in the bottom bar; it has: ${tabs.join(', ')}`
      );
    }
    await this.clickByText('#button-row .tab', label);
  }

  // Buttons rendered by Button.svelte have ids like "button-next".
  async clickNamedButton(name) {
    await this.page.click(`#button-${name}`);
  }

  async clickByText(selector, text) {
    await this.page.waitForFunction(
      (sel, t) =>
        [...document.querySelectorAll(sel)].some(
          (el) => el.textContent.trim() === t
        ),
      {},
      selector,
      text
    );
    await this.page.evaluate(
      (sel, t) => {
        [...document.querySelectorAll(sel)]
          .find((el) => el.textContent.trim() === t)
          .click();
      },
      selector,
      text
    );
  }

  // As clickByText, but with a real mouse click. A handler that opens a
  // prompt() blocks the page's JavaScript until the dialog is answered, which
  // would deadlock the evaluate call that clickByText clicks from.
  async clickElementWithText(selector, text) {
    await this.page.waitForFunction(
      (sel, t) =>
        [...document.querySelectorAll(sel)].some(
          (el) => el.textContent.trim() === t
        ),
      {},
      selector,
      text
    );
    const handle = await this.page.evaluateHandle(
      (sel, t) =>
        [...document.querySelectorAll(sel)].find(
          (el) => el.textContent.trim() === t
        ),
      selector,
      text
    );
    await handle.asElement().click();
  }

  async openCategoryDetails(name) {
    await this.openApp('/budget');
    await this.waitForBudgetOverview();
    await this.clickByText('.category-list .category-name', name);
    await this.waitForHeadingStartingWith(name);
  }

  // The review screen's date is a native date input, so set it directly and
  // fire the change event the screen listens for.
  async setReviewDate(dateString) {
    await this.page.$eval(
      'input[type="date"]',
      (el, value) => {
        el.value = value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      },
      dateString
    );
  }

  async turnOnRepeatsMonthly() {
    try {
      await this.page.waitForSelector('#repeats-monthly', { timeout: 5000 });
    } catch (e) {
      throw new Error('The review screen has no "Repeats monthly" switch.');
    }
    await this.page.click('#repeats-monthly');
  }

  // Renaming is still a browser prompt(), so answer the next one. Register
  // this before the click that opens it.
  answerNextPrompt(text) {
    this.page.once('dialog', (dialog) => dialog.accept(text));
  }

  // The account and category detail views hang their actions off one menu.
  async openDetailMenu() {
    await this.page.click('header button[aria-haspopup="true"]');
    await this.page.waitForSelector('[role="menu"]');
  }

  // The budget overview is headed by the current month rather than by a
  // fixed word, so "we are back on it" is a question about the envelope
  // list rather than about the heading.
  async waitForBudgetOverview() {
    await this.page.waitForSelector('.category-list');
  }

  async waitForHeadingStartingWith(prefix) {
    await this.page.waitForFunction(
      (p) =>
        [...document.querySelectorAll('h2')].some((h) =>
          h.textContent.trim().startsWith(p)
        ),
      {},
      prefix
    );
  }

  // AmountInput builds the amount from typed digits: "50000" shows as 500.00.
  async typeIntoAmountInput(cents) {
    const input = await this.page.waitForSelector('input[type="tel"]');
    await input.click();
    await input.type(String(cents));
  }

  // The date, payee and amount of each row of the transaction list on
  // screen, top to bottom.
  async readTransactionRows() {
    return this.page.evaluate(() =>
      [...document.querySelectorAll('.transaction-row')].map((row) => ({
        date: row.querySelector('.transaction-date').textContent.trim(),
        who: row.querySelector('.transaction-who').textContent.trim(),
        amount: row.querySelector('.transaction-amount').textContent.trim(),
      }))
    );
  }

  // Waits for a row showing the given amount (as the app formats it, e.g.
  // "$1,200.00") and, if given, the given compact date (e.g. "3/1/26").
  async waitForTransactionRow({ amount, date }) {
    try {
      await this.page.waitForFunction(
        (amt, dt) =>
          [...document.querySelectorAll('.transaction-row')].some(
            (row) =>
              row.querySelector('.transaction-amount').textContent.trim() === amt &&
              (!dt || row.querySelector('.transaction-date').textContent.trim() === dt)
          ),
        { timeout: 5000 },
        amount,
        date || null
      );
    } catch (e) {
      const rows = await this.readTransactionRows();
      const shown =
        rows.length === 0
          ? 'no transactions'
          : rows.map((r) => `${r.date} "${r.who}" ${r.amount}`).join(', ');
      throw new Error(
        `Expected a ${amount} transaction${date ? ` dated ${date}` : ''}, ` +
          `but the list shows ${shown}`
      );
    }
  }

  // The opposite of waitForTransactionRow: fails if such a row is on screen.
  // There is nothing to wait for, so this reads the list as it stands, which
  // is safe once a step has waited for the rows that should be there.
  async assertNoTransactionRow({ amount, date }) {
    await this.page.waitForSelector('.transaction-list');
    const rows = await this.readTransactionRows();
    const unwanted = rows.find(
      (row) => row.amount === amount && (!date || row.date === date)
    );
    if (unwanted) {
      throw new Error(
        `Expected no ${amount} transaction${date ? ` dated ${date}` : ''}, ` +
          `but the list shows ${unwanted.date} "${unwanted.who}" ${unwanted.amount}`
      );
    }
  }

  async readRemainingShownFor(categoryName) {
    return this.page.evaluate((name) => {
      const rows = [...document.querySelectorAll('.category-list .category-row')];
      for (const row of rows) {
        const link = row.querySelector('.category-name');
        if (link && link.textContent.trim() === name) {
          return row
            .querySelector('.category-available')
            .textContent.replace(/\s+/g, '');
        }
      }
      return null;
    }, categoryName);
  }

  async waitForRemainingShown(categoryName, formattedDollars) {
    const expected = `$${formattedDollars}`;
    try {
      await this.page.waitForFunction(
        (name, exp) => {
          const rows = [...document.querySelectorAll('.category-list .category-row')];
          return rows.some((row) => {
            const link = row.querySelector('.category-name');
            return (
              link &&
              link.textContent.trim() === name &&
              row
                .querySelector('.category-available')
                .textContent.replace(/\s+/g, '') === exp
            );
          });
        },
        { timeout: 5000 },
        categoryName,
        expected
      );
    } catch (e) {
      const actual = await this.readRemainingShownFor(categoryName);
      throw new Error(
        `Expected budget overview to show "${categoryName}" with ${expected} remaining, ` +
          (actual === null
            ? 'but that category is not shown'
            : `but it shows ${actual}`)
      );
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

setWorldConstructor(CustomWorld);
