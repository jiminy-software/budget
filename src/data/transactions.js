import { get, writable } from 'svelte/store'
import { addAmountToBudgetCategory, subtractAmountFromBudgetCategory } from './budget'
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
 * Store a transaction and take its amounts out of the budget categories. The
 * one path by which an expense becomes real, whether entered by hand or
 * recorded from a recurring transaction.
 */
export const recordTransaction = async (transaction) => {
  await addTransaction(transaction)

  const categoryAmounts = transaction.categoryAmounts || {}
  for (const categoryId in categoryAmounts) {
    const categoryAmount = categoryAmounts[categoryId] || 0
    await subtractAmountFromBudgetCategory(categoryId, categoryAmount)
  }
}

/**
 * Put a transaction's amounts back in the budget categories they came out of,
 * then delete it: recordTransaction in reverse.
 */
export const unrecordTransaction = async (transaction) => {
  const categoryAmounts = transaction.categoryAmounts || {}
  for (const categoryId in categoryAmounts) {
    const categoryAmount = categoryAmounts[categoryId] || 0
    await addAmountToBudgetCategory(categoryId, categoryAmount)
  }

  await deleteTransaction(transaction._id)
}

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
