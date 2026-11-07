import database from './database'
import { listCategories } from './categories'

/**
 * Delete the balance that versions before budget-data 4.0.0 stored on each
 * category as `remaining`. Balances are summed from transactions now, so
 * nothing reads it.
 */
export const removeStoredBalances = async () => {
  const categories = await listCategories()
  for (const { remaining, ...category } of categories) {
    if (remaining !== undefined) {
      await database.update(category)
    }
  }
}

export const checkLocalStorageForData = async () => {
  const budgetFromLocalStorage = localStorage.getItem('budget');
  if (budgetFromLocalStorage) {
    const announcedOldData = localStorage.getItem('announcedOldData');
    if (!announcedOldData) {
      alert(
        'Whoops! It looks like you had data in the old version of this app. Contact me if you want help restoring it.'
      )
      localStorage.setItem('announcedOldData', Date.now().toString())
    }
  }
}
