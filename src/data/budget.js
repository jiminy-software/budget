import { getCategory, listCategories, updateCategory } from './categories'
import { getCurrentYearMonthString, getMonthAfter, isInPast } from '../helpers/dates'

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

const refillBudgetCategory = async (category) => {
  let {budgeted, remaining, refilled} = category
  for (let i = 0; isInPast(refilled) && (i < 100); i++) {
    remaining += budgeted
    refilled = getMonthAfter(refilled)
  }
  await updateCategory(category._id, { remaining, refilled })
}

export const addAmountToBudgetCategory = async (categoryId, amountToAdd) => {
  const category = await getCategory(categoryId)
  const oldRemaining = category.remaining || 0
  const newRemaining = oldRemaining + amountToAdd
  await updateCategory(categoryId, { remaining: newRemaining })
}

export const subtractAmountFromBudgetCategory = async (categoryId, amountToSubtract) =>
  addAmountToBudgetCategory(categoryId, -amountToSubtract)
