<script>
import { refillBudgetCategories } from './data/budget'
import { recordDueRecurringTransactions } from './data/recurringTransactions'
import { checkLocalStorageForData } from './data/migration'
import { setError } from './data/errors'
import Router from 'svelte-spa-router'
import routes from './views/routes'
import database from './data/database'

const startUp = async () => {
  try {
    await refillBudgetCategories()
    await recordDueRecurringTransactions()
    await checkLocalStorageForData()
  } catch (error) {
    setError('The app could not start cleanly', error.message)
  }

  // // Attempt to start sync from saved settings (if present)
  // const server = localStorage.getItem('sync.server')
  // const username = localStorage.getItem('sync.username')
  // const password = localStorage.getItem('sync.password')
  // if (server && username && password) {
  //   await database.configureSync(server, username, password)
  // }
}

// The refill, and the recurring expenses it makes room for, have to finish
// before anything renders: views read category balances as they mount, and a
// child mounts before its parent, so a view rendered alongside this would
// show pre-refill amounts.
const startedUp = startUp()
</script>

<div class="container-xl my-3">
  {#await startedUp then}
    <Router {routes}/>
  {/await}
</div>
