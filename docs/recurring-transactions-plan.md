# Recurring Transactions Plan

Goal: let a user set up an expense that repeats every month (rent, a mortgage
payment) so the app records it each month instead of the user entering it by
hand.

Status, 2026-09-18: Phase 2 and the first Phase 1 scenario are done on
`feature/recurring-transactions`, suite green. **Not releasable yet**: the
switch is live, so a recurring expense can be set up, but nothing lists or
deletes one until Phase 3. The inert part (everything but the switch and its
scenario) could ship alone if a smaller PR is wanted.

Decisions settled on 2026-09-14:

- Recorded automatically when due, at app load, catching up any months the
  app was not opened in. The monthly refill already works this way and is the
  template.
- Monthly only for now. The document carries `recurs: "monthly"`, so weekly
  and yearly are an additive change later.
- Created from the existing expense flow: a "Repeats monthly" switch on the
  Review screen, likely to become a no/weekly/monthly/yearly choice later. The
  Review screen's Date is the first occurrence.
- Seen and stopped from the Transactions screen. The detail screen is the Review
  screen showing the stored recurring expense.
- A new document type, not a flag on transactions: every transaction field
  except `timestamp`, plus `recurs` and `nextDue` (`YYYY-MM-DD`). No
  `dayOfMonth`, since it could disagree with `nextDue`, and no back-reference
  from a recorded transaction to what recorded it.
- The screen says "recurring expense"; the data says recurring transaction,
  matching the app's existing expense/transaction split.

Settled since:

- The Review screen's Date row keeps the label "Date" with the switch on.
- Recurring expenses are recorded one at a time, not in parallel like the
  refill: two of them in one category would race on its `remaining`.
- The recurring list is reached from a triple-dot menu on the Transactions
  screen with a "Show recurring" / "Hide recurring" item, like the account
  and category detail menus.
- Scenarios freeze the browser's clock (`Given today is 2026-03-01`, always
  the scenario's first step) rather than using relative dates, so calendar
  cases can name real dates.

## Behavior

- Due means `nextDue` is today or earlier, by the local date.
- At app load, after the refill and before the router mounts (both wait on
  `startUp` in `src/App.svelte`): for each recurring expense, while it is
  due, record an ordinary transaction from its fields, dated `nextDue` at
  local noon (how the Review screen dates a transaction, so a timezone shift
  cannot move it a day), subtract its category amounts, and move `nextDue` to
  the same day of the next month. Save `nextDue` after each one rather than
  at the end, so an interrupted catch-up cannot record a month twice. Cap the
  loop at 100, like the refill.
- Refill first, then recurring, so the envelope is full before the rent comes
  out. Several months caught up at once still net out, since both are sums.
- The same run happens right after a recurring expense is saved, so one whose
  first date is today or earlier is recorded at once.
- With the switch on, Done saves the recurring expense instead of an ordinary
  transaction, not as well as one; the run that follows records the first
  occurrence if it is due. So nothing is recorded twice, and a future first
  date records nothing until it arrives.
- Each recurring expense is recorded independently: one that fails (its
  category was deleted, say) neither blocks the rest nor stops the app; the
  failure goes to the error banner.
- Deleting a recurring expense stops future recording; what it already
  recorded stays.
- A day the next month lacks falls on that month's last day, and that day
  then carries forward: Jan 31, Feb 28, Mar 28. Only storing the intended day
  would prevent the drift, and that is the field decided against. It changes
  nothing in the budget math, which is monthly; it shows only as the date on
  the recorded transaction. If it ever matters, the least redundant fix is a
  `firstDue` date, a fact rather than a derivation, to take the day from.

## Data

A new list, `_id` prefix `r`, to go into the budget-data spec as 2.1.0:

```json
[
  {
    "id": "*recurring transaction id*",
    "accountId": "*account id*",
    "amountTotal": *transaction total, in cents*,
    "categoryAmounts": {
      "*category id*": *amount from this category, in cents*,
      *...*
    },
    "nextDue": "*YYYY-MM-DD, the next date this is to be recorded*",
    "note": "*optional textual comment about this transaction, to be included on each transaction created from this recurring transaction*",
    "recurs": "*how often it repeats; only 'monthly' so far*",
    "who": "*name of payee*"
  },
  *...*
]
```

Transactions are unchanged. A recorded recurring expense is an ordinary
transaction and shows in the account and category histories like any other.

## Prerequisite: the Transactions screen

Built first, separately (now done). What this feature needs from it:

- [x] A Transactions tab in the bottom bar and the screen it opens.
- [ ] A way to see the recurring expenses there, each opening `/recurring/:id`
  (Phase 3). Without that, a recurring expense could be set up but never seen
  or stopped, so this feature does not ship before it.

## Phase 1: test scenarios to consider, adding some

Gherkin first, approved verbatim, then the step definitions, run red.

- [x] Recording one from the expense flow whose first date is today; it
  shows on the category's details screen
  (`features/recurring-transactions.feature`).
- [x] One due in the future is not recorded. This is the scenario that
  proves the switch took the recurring path rather than saving an ordinary
  expense dated today, which the first scenario cannot tell apart.
- [x] One missed for two months is recorded for each month.
- [ ] A day the next month lacks: Jan 31 recorded, then Feb 28.
- [ ] Seeing recurring expenses on the Transactions screen; deleting one
  stops it (with Phase 3).
- [x] Dates in scenarios: the browser's clock is frozen per scenario.
- [x] Test support: `ensureAccount` / `ensureCategory` seed by name on first
  use; `setReviewDate`, `turnOnRepeatsMonthly` and `waitForTransactionRow`
  (amount, optional date) in `features/support/world.js`; the expense-flow
  helpers moved to `features/support/expense-flow.js`;
  `seedRecurringTransaction` seeds one directly, for the catch-up and
  calendar scenarios.

## Phase 2: recording

**Done.**

- [x] `src/data/recurringTransactions.js`: the CRUD shape of
  `transactions.js` over prefix `r`, plus `recordDueRecurringTransactions()`
  and `savePendingRecurringTransaction()`.
- [x] `recordTransaction()` pulled out of `savePendingTransaction()`, so a
  recorded recurring expense takes exactly the path a hand-entered one does.
- [x] Date helpers in `src/helpers/dates.js`: `getTodayISO8601`,
  `getSameDayNextMonth` (clamped), `getNoonTimestamp`.
- [x] Runs in `startUp` after the refill, and after saving a recurring
  expense.
- [x] The Review screen's "Repeats monthly" switch (`#repeats-monthly`), and
  the save path that branches on it.

## Phase 3: seeing and stopping

- [ ] The recurring list on the Transactions screen.
- [ ] `/recurring/:id`: the Review screen showing a stored recurring expense,
  with Delete in the header menu. Open: read-only, or editable? Date (here
  the next due date) and Note are already inputs on the Review screen, so
  they can save in place. Payee, account, amount and category are links into
  the flow's steps, which only move forward, so editing those means teaching
  the steps to return to the Review, a change that would also unlock editing
  ordinary transactions. Until then, changing those is delete and recreate.

## Phase 4: spec and docs

- [ ] The list above as a 2.1.0 addition to
  https://github.com/forevermatt/budget-data, a separate repo with its own
  PR.
- [ ] README: the Data Structure section names 2.1.0, and a roadmap line.

## Known limits, shared with the refill

- Runs at load only, not while the app sits open past midnight.
- Two devices that both open the app before syncing would each record it,
  the same pre-existing risk as a double refill, for the sync phase.
