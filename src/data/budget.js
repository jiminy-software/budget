import { getCategory, listCategories, updateCategory } from './categories'
import { recordTransaction } from './transactions'
import { getCurrentYearMonthString, getMonthAfter, getNoonTimestamp, isInPast } from '../helpers/dates'

/**
 * A new category's first fill, recorded as that month's refill.
 */
const fillBudgetCategory = async ({ _id, budgeted }) => {
  const refilled = getCurrentYearMonthString()
  await recordRefill(_id, budgeted, refilled)
  await updateCategory(_id, { refilled })
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
    // Saved after each one, so an interrupted catch-up cannot repeat a month.
    await updateCategory(_id, { refilled })
  }
}

/**
 * Record a month's refill as a transaction dated the 1st of that month. A
 * refill puts money into the category, so its amount is negative. A category
 * with nothing budgeted gets none.
 */
const recordRefill = async (categoryId, budgeted, yearMonth) => {
  if (budgeted) {
    await recordTransaction({
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
