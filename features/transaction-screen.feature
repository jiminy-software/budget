Feature: Transaction screen
  As a user
  I want to open one transaction
  So that I can see what it recorded and delete it if it was wrong

  Background:
    Given the app is running

  Scenario: Opening a transaction from the Transactions screen
    Given a $12.34 "Groceries" expense at "Corner Store" from "Checking" dated 2026-03-01
    When I open the Transactions tab
      And I open the $12.34 transaction
    Then it should show a $12.34 "Groceries" expense at "Corner Store" from "Checking" dated 3/1/26

  Scenario: Deleting a transaction
    Given a $12.34 "Groceries" expense from "Checking"
      And a $40.00 "Groceries" expense from "Checking"
    When I open the Transactions tab
      And I open the $12.34 transaction
      And I delete it from the expense menu
    Then I should see a $40.00 transaction
      But I should NOT see a $12.34 transaction
