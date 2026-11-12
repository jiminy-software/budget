import { get, writable } from 'svelte/store'
import database from './database'

const ITEM_TYPE_PREFIX = 't'

export const transactionInProgress = writable({})

export const startNewPendingTransaction = transactionData => {
  const transaction = Object.assign({}, transactionData)
  transactionInProgress.set(transaction)
}

export const getTransactionsForAccount = async (accountId) => {
  const transactions = await listTransactions()
  return transactions.filter(transaction => {
    return transaction.accountId === accountId
  })
}

export const getTransactionsForCategory = async (categoryId) => {
  const transactions = await listTransactions()
  return transactions.filter(transaction => {
    const categoryAmounts = transaction.categoryAmounts || {}
    return categoryAmounts.hasOwnProperty(categoryId)
  })
}

/**
 * Store a transaction entered by hand. Category balances are summed from
 * transactions, so storing it is all that takes the money out.
 */
export const recordTransaction = async (transaction) => addTransaction(transaction)

/**
 * Record a transaction whose ID is fixed by where it came from: a month's
 * refill, or a recurring expense's occurrence. A 409 means it's already recorded, by sync or by a launch
 * that stopped before noting it, so that counts as done.
 */
export const recordFixedTransaction = async (transaction) => {
  try {
    await addTransaction(transaction)
  } catch (error) {
    if (error.status !== 409) {
      throw error
    }
  }
}

/**
 * Delete a transaction, which puts its amounts back in their categories.
 */
export const unrecordTransaction = async (transaction) => deleteTransaction(transaction._id)

export const savePendingTransaction = async () => {
  await recordTransaction(get(transactionInProgress))
  startNewPendingTransaction({})
}

export const updatePendingTransaction = (changes) => {
  const pendingTransaction = get(transactionInProgress)
  const updatedPendingTransaction = Object.assign({}, pendingTransaction, changes)
  transactionInProgress.set(updatedPendingTransaction)
}

export const addTransaction = async (values) => database.insert(ITEM_TYPE_PREFIX, values)

export const deleteTransaction = async (id) => database.deleteItem(id)

export const getTransaction = async (id) => database.get(id)

export const listTransactions = async () => {
  const transactions = await database.list(ITEM_TYPE_PREFIX)
  return transactions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
}

export const updateTransaction = async (id, changes) => {
  const existing = await getTransaction(id)
  const revised = { ...existing, ...changes }
  return database.update(revised)
}
