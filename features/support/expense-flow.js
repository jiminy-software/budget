// One function per screen of the expense flow, so the scenario that walks it
// a step at a time and the ones that record an expense in a single step drive
// the app through exactly the same sequence. Each takes the World.

const startExpense = async (world) => {
  await world.openApp('/expense/new');
  await world.page.waitForSelector('#who');
};

const sayItWasPaidTo = async (world, who) => {
  await world.page.type('#who', who);
  await world.clickNamedButton('next');
  await world.waitForHeadingStartingWith('Paid using');
};

const chooseAccount = async (world, name) => {
  await world.clickByText('.picker-row', name);
  await world.waitForHeadingStartingWith('Amount');
};

const enterAmount = async (world, cents) => {
  await world.typeIntoAmountInput(cents);
  await world.clickNamedButton('next');
  await world.waitForHeadingStartingWith('Category');
};

const putFullAmountInCategory = async (world, name) => {
  await world.clickByText('.picker-row', name);
  await world.waitForHeadingStartingWith('Review');
};

const completeReview = async (world) => {
  await world.clickNamedButton('done');
  await world.waitForBudgetOverview();
};

// The whole flow, for a scenario that records an expense in a single step.
const recordExpense = async (world, { who, account, cents, category }) => {
  await startExpense(world);
  await sayItWasPaidTo(world, who);
  await chooseAccount(world, account);
  await enterAmount(world, cents);
  await putFullAmountInCategory(world, category);
  await completeReview(world);
};

module.exports = {
  chooseAccount,
  completeReview,
  enterAmount,
  putFullAmountInCategory,
  recordExpense,
  sayItWasPaidTo,
  startExpense,
};
