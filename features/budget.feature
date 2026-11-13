Feature: Budget management
  As a user
  I want to track my budget categories, accounts, and expenses
  So that I can manage my money

  Background:
    Given the app is running

  Scenario: Visit the home page and see which month is being budgeted
    When I go to the home page
    Then I should see the current month as the heading

  Scenario: Create a budget category with a monthly amount
    When I go to the new category page
    And I name the category "Groceries"
    And I set its monthly amount to $500.00
    Then the budget overview should show "Groceries" with $500.00 remaining

  Scenario: Create an account
    When I go to the new account page
    And I name the account "Checking"
    Then the accounts list should show "Checking"

  Scenario: Record an expense
    Given a budget category "Groceries" with $500.00 budgeted and remaining
    And an account named "Checking"
    When I start a new expense
    And I say it was paid to "Corner Store"
    And I choose the "Checking" account
    And I enter $12.34 as the amount
    And I put the full amount in the "Groceries" category
    And I complete the review step
    Then the budget overview should show "Groceries" with $487.66 remaining

  Scenario: Monthly budget refill on app load
    Given a budget category "Utilities" with $100.00 budgeted per month, $40.00 remaining, last refilled two months ago
    When I go to the home page
    Then the budget overview should show "Utilities" with $240.00 remaining

  Scenario: View a category's details
    Given a budget category "Groceries" with $500.00 budgeted and remaining
    When I open "Groceries" from the budget overview
    Then I should see the category view for "Groceries"

  Scenario: View an account's details
    Given an account named "Checking"
    When I open "Checking" from the accounts list
    Then I should see the account view for "Checking"

  Scenario: Rename an account from its detail view
    Given an account named "Checking"
    When I open "Checking" from the accounts list
    And I rename it to "Everyday Checking" from the account menu
    Then I should see the account view for "Everyday Checking"
    And the accounts list should show "Everyday Checking"

  Scenario: Rename a category from its detail view
    Given a budget category "Groceries" with $500.00 budgeted and remaining
    When I open "Groceries" from the budget overview
    And I rename it to "Food" from the category menu
    Then the budget overview should show "Food" with $500.00 remaining

  Scenario: Open the app with no network connection
    Given a budget category "Groceries" with $500.00 budgeted and remaining
    And I have already visited the app once
    When I lose my network connection
    And I go to the home page
    Then the budget overview should show "Groceries" with $500.00 remaining

  Scenario: Record an expense with no network connection
    Given a budget category "Groceries" with $500.00 budgeted and remaining
    And an account named "Checking"
    And I have already visited the app once
    When I lose my network connection
    And I record a $12.34 "Groceries" expense at "Corner Store" from "Checking"
    Then the budget overview should show "Groceries" with $487.66 remaining

  Scenario: Offer the app for installation
    When I go to the home page
    Then the browser should consider the app installable
