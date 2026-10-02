
export const formatAmount = amount => formatAmountWithPrecision(amount, 2)

export const formatAmountAsWholeNumber = amount => formatAmountWithPrecision(amount, 0)

const formatAmountWithPrecision = (amount, precision) => {
  if (amount == undefined) {
    amount = 0
  }
  return (Number(amount) / 100).toFixed(precision)
}

/**
 * Format an amount of cents as dollars, with a currency symbol and thousands
 * separators: 187660 becomes "$1,876.60" and -1840 becomes "-$18.40".
 *
 * @param amount
 * @returns {string}
 */
export const formatMoney = amount => formatMoneyWithPrecision(amount, 2)

/**
 * Format an amount moved, such as a transaction's: money out shows as a plain
 * amount, and money in (a negative amount, such as a refill) shows with a
 * plus sign instead: 1840 becomes "$18.40" and -10000 becomes "+$100.00".
 *
 * @param amount
 * @returns {string}
 */
export const formatMoneyMoved = amount =>
  amount < 0 ? '+' + formatMoney(-amount) : formatMoney(amount)

/**
 * As formatMoney, but rounded to whole dollars: 60000 becomes "$600".
 *
 * @param amount
 * @returns {string}
 */
export const formatMoneyAsWholeNumber = amount => formatMoneyWithPrecision(amount, 0)

const formatMoneyWithPrecision = (amount, precision) => {
  const dollars = Number(amount || 0) / 100
  const digits = Math.abs(dollars)
    .toFixed(precision)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return (dollars < 0 ? '-$' : '$') + digits
}
