Feature: Transactions tab
  As a user
  I want to see all of my transactions in one list
  So that I can review my spending as a whole

  Background:
    Given the app is running

  Scenario: See all transactions (not filtered by account or category) in the transactions list
    Given a $12.34 "Groceries" expense from "Checking"
      And a $40.00 "Fuel" expense from "Credit Card"
    When I open the Transactions tab
    Then I should see a $12.34 transaction
      And I should see a $40.00 transaction

  Scenario: List transactions newest first
    Given today is 2026-10-15
      And a $12.34 "Groceries" expense at "Corner Store" from "Checking" dated 2026-10-13
      And a $20.00 "Groceries" expense at "Farm Stand" from "Checking" dated 2026-10-14
      And an $8.00 "Groceries" expense at "Bakery" from "Checking" dated 2026-10-15
    When I open the Transactions tab
    Then the transactions list should show "Bakery", then "Farm Stand", then "Corner Store"

  Scenario: See that there are no transactions yet
    Given there are no transactions yet
    When I open the Transactions tab
    Then the transactions list should say "No transactions yet"
