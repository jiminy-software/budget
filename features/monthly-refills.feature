Feature: Monthly refills
  As a user
  I want each monthly refill recorded as a transaction
  So that I can see where a category's money came from

  Background:
    Given the app is running

  Scenario: Recording a refill as a transaction
    Given today is 2026-10-15
      And a budget category "Utilities" with $100.00 budgeted per month, last refilled 2026-09
    When I reopen the app
      And I open the Transactions tab
    Then I should see a +$100.00 "Monthly refill" transaction dated 10/1/26

  Scenario: Recording a refill for each month missed
    Given today is 2026-10-15
      And a budget category "Utilities" with $100.00 budgeted per month, last refilled 2026-08
    When I reopen the app
      And I open the Transactions tab
    Then I should see a +$100.00 "Monthly refill" transaction dated 9/1/26
      And I should see a +$100.00 "Monthly refill" transaction dated 10/1/26

  Scenario: Not recording a refill for a category with nothing budgeted
    Given today is 2026-10-15
      And a budget category "Savings" with $0.00 budgeted per month, last refilled 2026-09
    When I reopen the app
      And I go to the "Savings" category's details screen
    Then I should NOT see a "Monthly refill" transaction dated 10/1/26
