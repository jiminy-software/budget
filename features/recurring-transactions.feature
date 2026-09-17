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
