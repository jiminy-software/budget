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
