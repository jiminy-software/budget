# Budget

A simple way to budget your money and reconcile your statements, built using Svelte.

## Try it out

You can try it out (alpha) here:
https://jiminy-software.github.io/budget/

## Goals

- A budget app that can truly be productively used for free
- An affordable way for people to use features that inherently incur a cost
- A simple enough way to provide those cost-features that the income is worth
  the time/effort it takes to do so

## Roadmap

- [x] See list of categories with budgeted amounts
- [x] Add a category
- [x] Edit a category
- [x] Add a financial account
- [x] Add nicer buttons (with icons)
- [x] Edit a financial account
- [x] Record an expense
- [x] Create separate repo to document data structure versions
- [x] Subtract the transaction amount from a category's budget upon completion
      of recording an expense
- [x] Move assembly of new transaction to separate local variable (to simplify
      process of updating remaining amounts for budget categories, both for
      when creating a new transaction and when editing an existing transaction)
- [x] Enable seeing a category's transactions
- [ ] Update Category view to show both budgeted and remaining amounts
- [x] Add "next" buttons to allow progressing through record-an-expense using
      a mouse
- [x] Autofocus the appropriate input (where applicable) on arrival at each
      page
- [x] Allow adding a comment/note on each transaction
- [ ] Handle page reloads in the middle of the add-expense process (which
      loses the timestamp, for example)
- [ ] Add a data-breadcrumb trail as they enter data for a new transaction
- [x] Setup collaborator
- [ ] Synchronize data between devices/browsers. Options:
  * [ ] Custom server-side API
    - PHP
    - NodeJS
  * [ ] AWS Amplify
  * [ ] Dropbox API
  * [ ] Simple JSON import/export
- [x] Auto-refill categories each month
- [x] Record recurring expenses (rent, mortgage) automatically each month
- [ ] Enable adding category during new-transaction workflow
- [ ] Enable adding account during new-transaction workflow
- [x] Add done and cancel buttons when adding an account
- [x] Add next and cancel buttons when adding a category
- [ ] Add a good overall visual design to the app
- [ ] ...

## Data Structure

This application aims to comply with version 2.1.0 of the
https://github.com/forevermatt/budget-data specification.

## Development

### Icons

The list of icons available in the library I'm using can be found here:
https://fontawesome.com/icons?d=gallery&s=solid&m=free
