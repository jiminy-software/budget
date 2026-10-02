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
