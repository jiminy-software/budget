Feature: Recurring transactions
  As a user
  I want expenses that repeat every month to be recorded for me
  So that I do not enter rent by hand each month

  Background:
    Given the app is running

  Scenario: Recording a recurring expense on the day it is due
    Given today is 2026-03-01
    When I record a recurring $1,200.00 "Housing" expense next due 2026-03-01
      And I go to the "Housing" category's details screen
    Then I should see a $1,200.00 transaction dated 3/1/26

  Scenario: Not recording a recurring expense that is not due yet
    Given today is 2026-03-01
      And there are no transactions yet
    When I record a recurring $1,200.00 "Housing" expense next due 2026-04-01
      And I open the Transactions tab
    Then the transactions list should say "No transactions yet"

  Scenario: Recording a recurring expense for each month it was missed
    Given today is 2026-03-01
      And a recurring $1,200.00 "Housing" expense next due 2026-01-10
    When I reopen the app
      And I open the Transactions tab
    Then I should see a $1,200.00 transaction dated 1/10/26
      And I should see a $1,200.00 transaction dated 2/10/26
      But I should NOT see a $1,200.00 transaction dated 3/10/26

  Scenario: Seeing the recurring expenses on the Transactions screen
    Given today is 2026-03-01
      And a recurring $1,200.00 "Housing" expense next due 2026-04-01
    When I open the Transactions tab
      And I choose "Show recurring" from the menu
    Then I should see a $1,200.00 recurring expense next due 4/1/26

  Scenario: Hiding the recurring expenses again
    Given today is 2026-03-01
      And a recurring $1,200.00 "Housing" expense next due 2026-04-01
    When I open the Transactions tab
      And I choose "Show recurring" from the menu
      And I choose "Hide recurring" from the menu
    Then I should NOT see a $1,200.00 recurring expense

  Scenario: Opening a recurring expense from the Transactions screen
    Given today is 2026-03-01
      And a recurring $1,200.00 "Housing" expense next due 2026-04-01
    When I open the Transactions tab
      And I choose "Show recurring" from the menu
      And I open the $1,200.00 recurring expense
    Then it should show a monthly $1,200.00 "Housing" expense next due 4/1/26

  Scenario: Deleting a recurring expense
    Given today is 2026-03-01
      And a recurring $1,200.00 "Housing" expense next due 2026-04-01
    When I open the Transactions tab
      And I choose "Show recurring" from the menu
      And I open the $1,200.00 recurring expense
      And I delete it from the recurring expense menu
      And I choose "Show recurring" from the menu
    Then the recurring list should say "No recurring expenses yet"
