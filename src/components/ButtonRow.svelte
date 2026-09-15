<script>
import Icon from './Icon.svelte'
import { faEnvelope, faExchangeAlt, faListUl } from '@fortawesome/free-solid-svg-icons'
import { router } from 'svelte-spa-router'

// Each tab stands for a whole area of the app, so it lights up for the screens
// under it as well as for its own list.
const isUnder = (location, paths) =>
  paths.some(path => (location === path) || location.startsWith(`${ path }/`))

$: onAccounts = isUnder(router.location, ['/accounts', '/account'])
$: onBudget = isUnder(router.location, ['/', '/budget', '/category'])
$: onTransactions = isUnder(router.location, ['/transactions'])
</script>

<style>
#button-row {
  align-items: center;
  background: var(--on-primary);
  border-top: 1px solid var(--surface-container);
  bottom: 0;
  display: flex;
  gap: 4px;
  left: 0;
  padding: 8px 14px calc(16px + env(safe-area-inset-bottom, 0px));
  position: fixed;
  right: 0;
}

#button-row-spacer {
  height: calc(89px + env(safe-area-inset-bottom, 0px));
}

.tab {
  align-items: center;
  color: var(--outline);
  display: flex;
  flex: 1;
  flex-direction: column;
  font-size: 12px;
  font-weight: 500;
  gap: 4px;
  padding: 6px 0;
  text-decoration: none;
}

/* Icon.svelte draws at 1em, so the icon is sized by its own font-size rather
   than by the label's. */
.tab-icon {
  font-size: 22px;
  line-height: 1;
}

.tab.active {
  color: var(--primary);
  font-weight: 700;
}

/* The expense flow's pickers advance on tap and so have no action button. The
   space stays reserved, so the tabs do not shift from step to step. */
.action-placeholder {
  flex: 0 0 56px;
  height: 56px;
  margin-left: 4px;
}
</style>

<div id="button-row-spacer"></div>
<nav id="button-row">
  <a class="tab" class:active={onAccounts} href="#/accounts"
     aria-current={onAccounts ? 'page' : undefined}>
    <span class="tab-icon"><Icon icon={faListUl} /></span>
    <span>Accounts</span>
  </a>
  <a class="tab" class:active={onBudget} href="#/budget"
     aria-current={onBudget ? 'page' : undefined}>
    <span class="tab-icon"><Icon icon={faEnvelope} /></span>
    <span>Budget</span>
  </a>
  <a class="tab" class:active={onTransactions} href="#/transactions"
     aria-current={onTransactions ? 'page' : undefined}>
    <span class="tab-icon"><Icon icon={faExchangeAlt} /></span>
    <span>Transactions</span>
  </a>
  {#if $$slots.default}
    <slot />
  {:else}
    <div class="action-placeholder"></div>
  {/if}
</nav>
