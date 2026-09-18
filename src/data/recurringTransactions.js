import { get } from 'svelte/store'
import database from './database'
import { setError } from './errors'
import { recordTransaction, startNewPendingTransaction, transactionInProgress } from './transactions'
import { formatDateISO8601, getNoonTimestamp, getSameDayNextMonth, getTodayISO8601 } from '../helpers/dates'

const ITEM_TYPE_PREFIX = 'r'

export const addRecurringTransaction = async (values) => database.insert(ITEM_TYPE_PREFIX, values)

export const deleteRecurringTransaction = async (id) => database.deleteItem(id)

export const getRecurringTransaction = async (id) => database.get(id)

export const listRecurringTransactions = async () => {
  const recurringTransactions = await database.list(ITEM_TYPE_PREFIX)
  return recurringTransactions.sort((a, b) => a.nextDue.localeCompare(b.nextDue))
}

export const updateRecurringTransaction = async (id, changes) => {
  const existing = await getRecurringTransaction(id)
  const revised = { ...existing, ...changes }
  return database.update(revised)
}

/**
 * Save the expense being reviewed as a recurring one instead of an ordinary
 * transaction, first due on the date it was given, then record whatever that
 * makes due. So one dated today is recorded at once, and one dated later is
 * not recorded until that day.
 */
export const savePendingRecurringTransaction = async () => {
  const { who, accountId, amountTotal, categoryAmounts, note, recurs, timestamp } =
    get(transactionInProgress)
  await addRecurringTransaction({
    who,
    accountId,
    amountTotal,
    categoryAmounts,
    note,
    recurs,
    nextDue: formatDateISO8601(timestamp),
  })
  startNewPendingTransaction({})
  await recordDueRecurringTransactions()
}

/**
 * Record every recurring transaction that is due, once for each date up to
 * today that it has not been recorded for. Runs at app load, after the
 * refill, and after a recurring transaction is saved. One at a time, since
 * two of them may draw on the same category.
 */
export const recordDueRecurringTransactions = async () => {
  const today = getTodayISO8601()
  for (const recurringTransaction of await listRecurringTransactions()) {
    try {
      await recordWhileDue(recurringTransaction, today)
    } catch (error) {
      // The others still get recorded, and the app still starts.
      setError(`Could not record the recurring expense for ${recurringTransaction.who}`, error.message)
    }
  }
}

const recordWhileDue = async (recurringTransaction, today) => {
  const { _id, who, accountId, amountTotal, categoryAmounts, note } = recurringTransaction
  let nextDue = recurringTransaction.nextDue
  for (let i = 0; (nextDue <= today) && (i < 100); i++) {
    await recordTransaction({
      who,
      accountId,
      amountTotal,
      categoryAmounts,
      note,
      timestamp: getNoonTimestamp(nextDue),
    })
    // Saved after each one, so an interrupted catch-up cannot repeat a month.
    nextDue = getSameDayNextMonth(nextDue)
    await updateRecurringTransaction(_id, { nextDue })
  }
}
