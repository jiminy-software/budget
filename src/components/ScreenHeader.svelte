<script>
import ErrorMessage from './ErrorMessage.svelte'

// The header of a top-level list screen: a title and nothing more. Detail
// screens use DetailHeader, and the budget overview draws its own.
export let title = ''
</script>

<style>
/* As on the budget overview, the header runs edge to edge and so has to escape
   the padding and top margin of the app-wide container. */
.screen-header {
  background: var(--primary);
  color: var(--on-primary);
  margin: -1rem calc(var(--bs-gutter-x) * -0.5) 0;
  padding: 18px 20px;
}

.screen-header h2 {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0;
}
</style>

<header class="screen-header">
  <h2>{ title }</h2>
</header>

<ErrorMessage />
