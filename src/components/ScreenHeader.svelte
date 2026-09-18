<script>
import ErrorMessage from './ErrorMessage.svelte'
import Icon from './Icon.svelte'
import { faEllipsisH } from '@fortawesome/free-solid-svg-icons'

// The header of a top-level list screen: a title, plus the triple-dot menu if
// the screen fills the menu slot. Detail screens use DetailHeader, which has
// the same menu with a back arrow beside it, and the budget overview draws
// its own.
export let title = ''
export let menuLabel = '' // Names the menu for a screen reader, e.g. "Transaction actions".

let menuOpen = false

const toggleMenu = () => menuOpen = !menuOpen
const closeMenu = () => menuOpen = false
const onKeydown = ({ key }) => {
  if (key === 'Escape') {
    closeMenu()
  }
}
</script>

<style>
/* As on the budget overview, the header runs edge to edge and so has to escape
   the padding and top margin of the app-wide container. It also anchors the
   menu, which hangs below it. */
.screen-header {
  align-items: center;
  background: var(--primary);
  color: var(--on-primary);
  display: flex;
  margin: -1rem calc(var(--bs-gutter-x) * -0.5) 0;
  padding: 18px 20px;
  position: relative;
}

/* The 44px touch target of the menu button is taller than the title, so a
   header carrying one keeps its height with less padding of its own. */
.screen-header.has-menu {
  padding: 12px 12px 12px 20px;
}

.screen-header h2 {
  flex: 1;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0;
}

/* Icon.svelte draws at 1em, so the icon is sized by its font-size. The 44px
   box is the touch target, not the glyph. */
.menu-button {
  align-items: center;
  background: none;
  border: 0;
  border-radius: 12px;
  color: inherit;
  display: flex;
  flex: 0 0 auto;
  font-size: 24px;
  height: 44px;
  justify-content: center;
  line-height: 1;
  padding: 0;
  width: 44px;
}

.menu-button.open {
  background: rgba(255, 255, 255, 0.16);
}

.screen-menu {
  background: var(--surface-container-lowest);
  border-radius: 18px;
  box-shadow: 0 16px 40px var(--menu-shadow);
  overflow: hidden;
  padding: 6px 0;
  position: absolute;
  right: 14px;
  top: 62px;
  width: 244px;
  z-index: 3;
}
</style>

<svelte:window on:click={closeMenu} on:keydown={onKeydown} />

<header class="screen-header" class:has-menu={$$slots.menu}>
  <h2>{ title }</h2>
  {#if $$slots.menu}
    <!-- Stops the opening click reaching the window handler that closes it.
         Clicks on the items themselves are left to bubble, so choosing one
         closes the menu. -->
    <button class="menu-button" class:open={menuOpen} type="button"
            aria-label={menuLabel} aria-haspopup="true" aria-expanded={menuOpen}
            on:click|stopPropagation={toggleMenu}>
      <Icon icon={faEllipsisH} />
    </button>
    {#if menuOpen}
      <div class="screen-menu" role="menu">
        <slot name="menu" />
      </div>
    {/if}
  {/if}
</header>

<ErrorMessage />
