<script>
import { getCategory } from '../data/categories'
import { formatMoneyMoved } from '../helpers/numbers'

export let amount = 0
export let categoryId = ''

let name = ''

$: loadCategory(categoryId)

const loadCategory = async (categoryId) => {
  if (categoryId) {
    let category = await getCategory(categoryId)
	name = category.name || ''
  }
}
</script>

<style>
/* Reuses the envelope's on-pace fill: the tag says which envelope this expense
   comes out of, so it is the one place outside the budget overview that color
   belongs. */
.category-tag {
  background: var(--on-pace-fill);
  border-radius: 999px;
  color: var(--primary);
  font-size: 14px;
  font-weight: 600;
  padding: 7px 14px;
}
</style>

<span class="category-tag">{ name } &middot; { formatMoneyMoved(amount) }</span>
