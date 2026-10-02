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

  Scenario: Deleting a refill takes its amount back out of its category
    Given today is 2026-10-05
      And a budget category "Utilities" with $100.00 budgeted per month, last refilled 2026-10
      And a "Utilities" refill of $100.00 dated 2026-10-01
      And the "Utilities" category has $130.00 remaining
    When I go to the "Utilities" category's details screen
      And I open the +$100.00 transaction
      And I delete it from the transaction menu
    Then the budget overview should show "Utilities" with $30.00 remaining

  Scenario: Opening a refill
    Given a "Utilities" refill of $100.00 dated 2026-10-01
    When I open the Transactions tab
      And I open the +$100.00 transaction
    Then it should show a +$100.00 "Monthly refill" for "Utilities" dated 10/1/26 with no account

  Scenario: Recording a new category's first fill as a refill
    Given today is 2026-10-15
    When I go to the new category page
      And I name the category "Groceries"
      And I set its monthly amount to $500.00
      And I open the Transactions tab
    Then I should see a +$500.00 "Monthly refill" transaction dated 10/1/26
