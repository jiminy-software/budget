
/**
 * Format the given timestamp as a compact date, e.g. "9/18/26". The detail
 * views give the date a fixed 62px column, which a four-digit year overflows.
 *
 * @param timestamp
 * @returns {string}
 */
export const formatDateCompact = timestamp =>
  (new Date(timestamp)).toLocaleDateString(undefined, {
    year: '2-digit',
    month: 'numeric',
    day: 'numeric',
  })

/**
 * Format the given timestamp as a yyyy-mm-dd date, per ISO-8601. If no
 * timestamp is given, returns an empty string.
 *
 * @param timestamp
 * @returns {string}
 */
export const formatDateISO8601 = timestamp => {
  if (timestamp) {
    let date = new Date(timestamp)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()

    const monthString = String(month).padStart(2, '0')
    const dayString = String(day).padStart(2, '0')
    return `${year}-${monthString}-${dayString}`
  } else {
    return ''
  }
}

export const getCurrentYearMonthString = () => {
  return getYearMonthStringForMonthsBefore(0, new Date())
}

export const getMonthAfter = yearMonthString => {
  const [givenYear, givenMonth] = yearMonthString.split('-')
  let desiredMonth = Number(givenMonth) + 1
  let desiredYear = Number(givenYear)
  if (desiredMonth > 12) {
    desiredYear++
    desiredMonth = 1
  }
  let desiredMonthString = String(desiredMonth)
  if (desiredMonthString.length < 2) {
    desiredMonthString = '0' + desiredMonthString
  }
  return `${desiredYear}-${desiredMonthString}`
}

const getYearMonthStringForMonthsBefore = (numMonthsAgo, when) => {
  var currentYear = when.getFullYear()
  var currentMonth = when.getMonth() // 0 to 11
  var desiredDate = new Date(currentYear, currentMonth - numMonthsAgo)
  var fullYear = desiredDate.getFullYear()
  var desiredMonth = (desiredDate.getMonth() + 1) // 1 to 12
  return fullYear + '-' + String('0' + desiredMonth).slice(-2)
}

export const isInPast = yearMonthString => yearMonthString < getCurrentYearMonthString()

const getDaysInMonth = when => new Date(when.getFullYear(), when.getMonth() + 1, 0).getDate()

/**
 * Format the given date as its month and year, e.g. "August 2026".
 *
 * @param when
 * @returns {string}
 */
export const formatMonthAndYear = (when = new Date()) =>
  when.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

/**
 * How far through its month the given date is: the percentage of the month
 * already gone, and the number of days still to come. The budget overview
 * compares that percentage against how much of a category is left, so a
 * category is on pace whenever more of it remains than of the month.
 *
 * @param when
 * @returns {{elapsedPercent: number, daysLeft: number}}
 */
export const getMonthProgress = (when = new Date()) => {
  const daysInMonth = getDaysInMonth(when)
  return {
    elapsedPercent: (when.getDate() / daysInMonth) * 100,
    daysLeft: daysInMonth - when.getDate(),
  }
}

export const getTodayISO8601 = () => formatDateISO8601(Date.now())

/**
 * The timestamp for local noon on the given yyyy-mm-dd date. Noon rather than
 * midnight, so a shift of a few hours either way cannot move the date to
 * another day.
 *
 * @param isoDate
 * @returns {number}
 */
export const getNoonTimestamp = isoDate => new Date(`${isoDate} 12:00:00`).getTime()

/**
 * The same day of the following month, or that month's last day if it has no
 * such day: 2026-01-31 gives 2026-02-28. The clamped day is what a later call
 * sees, so it carries forward (then 2026-03-28).
 *
 * @param isoDate
 * @returns {string}
 */
export const getSameDayNextMonth = isoDate => {
  const [year, month, day] = isoDate.split('-').map(Number)
  // Date months are 0-based, so `month` is already the index of the next one.
  const daysInNextMonth = new Date(year, month + 1, 0).getDate()
  return formatDateISO8601(new Date(year, month, Math.min(day, daysInNextMonth)).getTime())
}
