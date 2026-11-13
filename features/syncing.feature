Feature: Syncing
  As a user with more than one device
  I want each device's changes to reach the others
  So that every device shows the same budget

  Background:
    Given the app is running

  Scenario: Seeing an expense from another device
    Given a $12.34 "Groceries" expense from "Checking"
      And a second device
    When both devices sync
    Then the second device should show a $12.34 transaction

  Scenario: Counting expenses that two devices record before syncing
    Given the "Groceries" category has $100.00 remaining
      And an account named "Checking"
      And a second device synced with this one
    When I record a $20.00 "Groceries" expense from "Checking"
      And the second device records a $30.00 "Groceries" expense from "Checking"
      And both devices sync
    Then each device's budget overview should show "Groceries" with $50.00 remaining

  Scenario: Signing in to sync
    Given a $12.34 "Groceries" expense from "Checking"
      And a second device
    When both devices sign in to sync
    Then the second device should show a $12.34 transaction

  Scenario: Signing in with the wrong password
    When I sign in to sync with the wrong password
    Then I should see the error "Could not sign in"
