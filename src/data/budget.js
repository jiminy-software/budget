import { getCategory, listCategories, updateCategory } from './categories'
import { addTransaction } from './transactions'
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
 * Add a month's refill to the category, and record it as a transaction dated
 * the 1st of that month. A refill puts money into the category, so its amount
 * is negative. A category with nothing budgeted gets no transaction.
 *
 * The transaction's ID is fixed by the category and month, so two devices
 * that refill the same month before they sync record the same transaction,
 * not two.
 */
const recordRefill = async (categoryId, budgeted, yearMonth) => {
  // The balance and month are saved in one write, before the transaction and
  // not through recordTransaction, so an interruption can lose only the
  // transaction. A month left unsaved would retry its fixed ID, get a 409,
  // and block every later refill.
  const { remaining } = await getCategory(categoryId)
  await updateCategory(categoryId, {
    remaining: (remaining || 0) + (budgeted || 0),
    refilled: yearMonth,
  })
  if (budgeted) {
    await addTransaction({
      _id: `t-${categoryId}-${yearMonth}`,
      who: 'Monthly refill',
      amountTotal: -budgeted,
      categoryAmounts: { [categoryId]: -budgeted },
      timestamp: getNoonTimestamp(`${yearMonth}-01`),
    })
  }
}

export const addAmountToBudgetCategory = async (categoryId, amountToAdd) => {
  const category = await getCategory(categoryId)
  const oldRemaining = category.remaining || 0
  const newRemaining = oldRemaining + amountToAdd
  await updateCategory(categoryId, { remaining: newRemaining })
}

export const subtractAmountFromBudgetCategory = async (categoryId, amountToSubtract) =>
  addAmountToBudgetCategory(categoryId, -amountToSubtract)
