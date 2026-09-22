# Transaction Screen Plan

Goal: let a user open one transaction and delete it, putting what it spent
back into the categories it came out of.

Status, 2026-09-22: nothing built yet; this plan is the first slice.

Decisions to settle:

- Every row of `TransactionList.svelte` opens `/transaction/:id`, so the
  Transactions screen, an account's history and a category's history all lead
  there. The rows become links, as the recurring rows already are.
- The screen is the Review screen's layout, read-only: payee, total, category
  tags, then Account / Date / Note rows. `RecurringView.svelte` is that screen
  for a recurring expense, so this is the same with Date in place of Next due
  and no Repeats row.
- Editing stays out of scope, as it does there: payee, account, amount and
  category are steps of a flow that only moves forward, so changing a
  transaction is delete and re-enter.
- Delete sits in the header menu behind a `confirm()`, like the recurring
  screen's.
- Deleting gives the money back: each `categoryAmounts` entry is added to that
  category's `remaining`, the reverse of `subtractAmountFromBudgetCategory`.
  The `refilled` month is not touched.
- Back, and where a delete lands, follow the browser's history, since three
  screens lead here.
- A transaction a recurring expense recorded is an ordinary transaction, so it
  deletes like any other and the recurring expense keeps going.

## Behavior

- The screen shows what the transaction stored: payee, total, its category
  tags, the account's name, the date in the compact form the lists use, and
  the note if it has one.
- A transaction that is not there shows `MissingScreen`, as on the recurring
  screen.
- Deleting adds each of the transaction's `categoryAmounts` back to that
  category's `remaining`, one at a time, then deletes the document. A category
  that no longer exists is skipped: there is nowhere to put its share back,
  and nothing that still exists loses it.
- Back and the push after a delete go back one history entry, so deleting from
  a category's history returns to that history rather than to the Transactions
  screen. Every list re-reads itself when it mounts, so the deleted row is
  gone on arrival. Falls back to `#/transactions` when the screen was opened
  cold by URL and there is nothing to go back to. The alternative, a `from=`
  parameter on every row's link, puts routing state in the URL of every row to
  save that fallback.

## Data

Nothing new. Transaction and category documents keep their shapes, so the
budget-data spec is unchanged and stays at 2.1.0.

## Phase 1: test scenarios to consider, adding some

Gherkin first, approved verbatim, then the step definitions, run red.

- [ ] Opening a transaction from the Transactions screen shows what it
      recorded.
- [ ] Deleting it takes it off the transactions list.
- [ ] Deleting it puts its amount back on the category's remaining.
- [ ] Opening one from a category's history and deleting it returns there,
      with the row gone: the shared list and the way back, in one scenario.

Considered, not scheduled: cancelling the confirm, and a transaction that is
not there, neither of which the recurring screen has a scenario for either; a
transaction split across two categories, which is the same loop twice, and
which `seedTransaction` would have to learn to make.

## Phase 2: the screen

- `/transaction/:id` and `src/views/TransactionView.svelte`.
- `TransactionList.svelte`'s rows become links to it.
- `DetailHeader`: an optional back handler, so the chevron can go back through
  history instead of to a fixed URL.

## Phase 3: deleting

- `addAmountToBudgetCategory` in `src/data/budget.js`, beside its opposite.
- `unrecordTransaction` in `src/data/transactions.js`, the reverse of
  `recordTransaction`, over the `deleteTransaction` already there and unused.
- Delete in the header menu, behind `confirm()`, then back the way the user
  came.

## Phase 4: docs

- README: a roadmap line for deleting a transaction.

## Known limits

- Changing a transaction is still delete and re-enter.
- Deleting one occurrence of a recurring expense does not stop the recurring
  expense; its own screen is where that is done.
- A `/transaction/:id` opened cold, by bookmark or by a reload on that screen,
  has no history to go back to, so back and delete land on the Transactions
  screen.
