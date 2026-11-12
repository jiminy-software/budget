import { listCategories, updateCategory } from './categories'
import { listTransactions, recordFixedTransaction } from './transactions'
import { getCurrentYearMonthString, getMonthAfter, getNoonTimestamp, isInPast } from '../helpers/dates'

/**
 * A new category's first fill, recorded as that month's refill.
 */
const fillBudgetCategory = async ({ _id, budgeted }) => {
  await recordRefill(_id, budgeted, getCurrentYearMonthString())
}

export const refillBudgetCategories = async () => {
  const categories = await listCategories()
  await Promise.allSettled(categories.map(async (category) => {
    if (category.refilled) {
      await refillBudgetCategory(category)
    } else {
      await fillBudgetCategory(category)
    }
  }))
}

/**
 * Refill the category once for each month since it was last refilled.
 */
const refillBudgetCategory = async (category) => {
  const { _id, budgeted } = category
  let refilled = category.refilled
  for (let i = 0; isInPast(refilled) && (i < 100); i++) {
    refilled = getMonthAfter(refilled)
    await recordRefill(_id, budgeted, refilled)
  }
}

/**
 * Record a month's refill of the category as a transaction dated the 1st of
 * that month. A refill puts money into the category, so its amount is
 * negative. A category with nothing budgeted gets no transaction.
 *
 * The transaction's ID is fixed by the category and month, so two devices
 * that refill the same month before they sync record the same transaction,
 * not two. It's recorded before the month is saved, so a launch that stops
 * between the two finishes the month next time instead of skipping it.
 */
const recordRefill = async (categoryId, budgeted, yearMonth) => {
  if (budgeted) {
    await recordFixedTransaction({
      _id: `t-${categoryId}-${yearMonth}`,
      who: 'Monthly refill',
      amountTotal: -budgeted,
      categoryAmounts: { [categoryId]: -budgeted },
      timestamp: getNoonTimestamp(`${yearMonth}-01`),
    })
  }
  await updateCategory(categoryId, { refilled: yearMonth })
}

/**
 * Each category's balance, keyed by its ID: the negated sum of its amounts
 * across all transactions, so expenses lower it and refills raise it. Nothing
 * stores a balance, so two devices' changes can't overwrite each other's.
 */
export const getCategoryBalances = async () => {
  const balances = {}
  for (const { categoryAmounts } of await listTransactions()) {
    for (const [categoryId, amount] of Object.entries(categoryAmounts || {})) {
      balances[categoryId] = (balances[categoryId] || 0) - (amount || 0)
    }
  }
  return balances
}
