# Transaction Screen Plan

Goal: let a user open one transaction and delete it, putting what it spent
back into its category.

Status, 2026-09-24: releasable. Scenarios are in
`features/transaction-screen.feature`.

## Done

- Every row of `TransactionList.svelte` (Transactions screen, account and
  category histories) opens `/transaction/:id`, a read-only screen in the
  recurring expense screen's layout.
- "Delete expense" in its header menu, behind a `confirm()`, puts each
  `categoryAmounts` entry back on that category's `remaining`
  (`unrecordTransaction`), then deletes the transaction.

## Not done

- Back, and where a delete lands, is always the Transactions screen, even
  when opened from an account or category history. The fix is to go back
  through browser history, falling back to `#/transactions`.
- A transaction whose category was deleted cannot be deleted: the error
  banner shows and the transaction stays. The app only records single-category
  transactions, but a split one (from sync or import) whose second category
  is gone would have its first paid back on each retry.
- Editing a transaction is still delete and re-enter.
