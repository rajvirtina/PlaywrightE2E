@nvpos-login @nvpos
Feature: Voyix POS - Login

  Background:
    Given the user opens the POS application

  # TC-20006
  @JIRA-20006 @TC-20006 @negative @invalid-login
  Scenario: Login fails with incorrect credentials
    When the user logs in with invalid credentials
    Then the login should fail with an error message
