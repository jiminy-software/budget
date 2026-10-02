import { getCategory, listCategories, updateCategory } from './categories'
import { recordTransaction } from './transactions'
import { getCurrentYearMonthString, getMonthAfter, getNoonTimestamp, isInPast } from '../helpers/dates'

const fillBudgetCategory = async (category) => {
  let budgeted = category.budgeted || 0
  let remaining = category.remaining || 0
  remaining += budgeted
  let refilled = getCurrentYearMonthString()
  await updateCategory(category._id, { remaining, refilled })
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
 * Refill the category once for each month since it was last refilled, each
 * one recorded as a transaction dated the 1st of its month. A refill puts
 * money into the category, so its amount is negative. A category with
 * nothing budgeted advances without one.
 */
const refillBudgetCategory = async (category) => {
  const { _id, budgeted } = category
  let refilled = category.refilled
  for (let i = 0; isInPast(refilled) && (i < 100); i++) {
    refilled = getMonthAfter(refilled)
    if (budgeted) {
      await recordTransaction({
        who: 'Monthly refill',
        amountTotal: -budgeted,
        categoryAmounts: { [_id]: -budgeted },
        timestamp: getNoonTimestamp(`${refilled}-01`),
      })
    }
    // Saved after each one, so an interrupted catch-up cannot repeat a month.
    await updateCategory(_id, { refilled })
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
