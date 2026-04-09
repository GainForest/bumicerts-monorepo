Feature: Edit Organization

  As an organization owner
  I want to edit my organization profile
  So that I can keep my information up to date

  Background:
    Given the application is healthy

  @auth
  Scenario: Authenticated user can view upload dashboard
    Given I am logged in as the test user
    When the user navigates to "/upload"
    Then the page should be loaded
    And the page URL should contain "/upload"

  @auth
  Scenario: User can enter edit mode
    Given I am logged in as the test user
    When the user navigates to "/upload"
    And the user clicks the edit button
    Then the page URL should contain "mode=edit"
    And the edit bar should be visible

  @auth
  Scenario: User can cancel edit mode
    Given I am logged in as the test user
    When the user navigates to "/upload?mode=edit"
    And the user clicks the cancel button
    Then the page URL should not contain "mode=edit"
    And the edit bar should not be visible

  @auth @smoke
  Scenario: User can save organization edits
    Given I am logged in as the test user
    When the user navigates to "/upload?mode=edit"
    And the user modifies the organization description
    And the user clicks the save button
    Then the save operation should complete successfully
    And the page URL should not contain "mode=edit"
