# Recurring Transactions Plan

Goal: let a user set up an expense that repeats every month (rent, a mortgage
payment) so the app records it each month instead of the user entering it by
hand.

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
        "note": "*optional textual comment about this transaction*",
        "recurs": "*how often it repeats; only 'monthly' so far*",
        "who": "*name of payee*"
      },
      *...*
    ]

Transactions are unchanged. A recorded recurring expense is an ordinary
transaction and shows in the account and category histories like any other.

## Prerequisite: the Transactions screen

Built first, separately (now done). What this feature needs from it:

- A Transactions tab in the bottom bar (`src/components/ButtonRow.svelte`
  already anticipates one) and the screen it opens.
- A way to see the recurring expenses there, each opening `/recurring/:id`.
  Without that, a recurring expense could be set up but never seen or
  stopped, so this feature does not ship before it.

## Phase 1: scenarios

Gherkin first, approved verbatim, then the step definitions, run red.

- [ ] Scenarios for: setting one up from the expense flow; one due today is
  recorded at load and shows in the category balance and the account history;
  one due in the future is not; one missed for two months is recorded for
  each; a day the next month lacks; deleting one stops it.
- [ ] Dates in scenarios: relative ("due yesterday"), matching the refill
  scenario, or absolute with the browser's clock frozen for that scenario,
  the only way to pin a calendar case like Jan 31 to Feb 28. Decide when
  writing them.
- [ ] Test support: seeding steps that remember ids by name, so a recurring
  expense can be seeded against a named account and category; a recurring
  seed step; assertions on history rows. The history assertion also closes
  the item the modernization plan deferred from its Phase 0.

## Phase 2: recording

- [ ] `src/data/recurringTransactions.js`: the CRUD shape of
  `transactions.js` over prefix `r`, plus `recordDueRecurringTransactions()`.
- [ ] Pull the insert-and-subtract half of `savePendingTransaction()` out
  into a function both it and the recurring run call, so a recorded recurring
  expense takes exactly the path a hand-entered one does.
- [ ] Date helpers in `src/helpers/dates.js`: today as `YYYY-MM-DD`, the same
  day next month (clamped), and `YYYY-MM-DD` to a local-noon timestamp.
- [ ] Run it in `startUp` after the refill, and after saving a recurring
  expense.
- [ ] The Review screen's "Repeats monthly" switch, and the save path that
  branches on it.

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
