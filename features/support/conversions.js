// Turns the words a scenario uses into the values a document stores, or the
// text the screen shows. Shared by every step file.

// Amounts in a scenario may carry thousands separators: "$1,200.00".
const parseDollars = (dollars) => Number(String(dollars).replace(/,/g, ''));

const dollarsToCents = (dollars) => Math.round(parseDollars(dollars) * 100);

// How the app formats an amount of cents: "$1,234.56".
const formatDollars = (dollars) =>
  '$' +
  parseDollars(dollars).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const numberWords = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

const wordToNumber = (word) => numberWords[word] ?? Number(word);

// "today", "yesterday" or "<n> days ago".
const daysAgoFromPhrase = (phrase) => {
  if (phrase === 'today') return 0;
  if (phrase === 'yesterday') return 1;
  const match = /^(\w+) days? ago$/.exec(phrase);
  if (!match) throw new Error(`Unrecognized day: "${phrase}"`);
  return wordToNumber(match[1]);
};

// Category refill months are "yyyy-mm" strings (see src/helpers/dates.js).
const yearMonthMonthsAgo = (monthsAgo) => {
  const now = new Date();
  const then = new Date(now.getFullYear(), now.getMonth() - monthsAgo);
  const month = String(then.getMonth() + 1).padStart(2, '0');
  return `${then.getFullYear()}-${month}`;
};

// Local noon, as the review screen dates a transaction whose date was edited,
// so a day stays that day whatever the timezone does.
const timestampDaysAgo = (daysAgo) => {
  const when = new Date();
  when.setHours(12, 0, 0, 0);
  when.setDate(when.getDate() - daysAgo);
  return when.getTime();
};

module.exports = {
  daysAgoFromPhrase,
  dollarsToCents,
  formatDollars,
  timestampDaysAgo,
  wordToNumber,
  yearMonthMonthsAgo,
};
