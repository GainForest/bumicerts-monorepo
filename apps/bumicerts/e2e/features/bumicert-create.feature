Feature: Create Bumicert

  As an organization owner
  I want to create bumicerts
  So that I can certify my environmental impact

  Background:
    Given the application is healthy

  @auth
  Scenario: User can start a new bumicert
    Given I am logged in as the test user
    When the user navigates to "/bumicert/create"
    And the user clicks "Get Started"
    Then the page URL should contain "/bumicert/create/0"
    And the user should be on step 1

  @auth
  Scenario: User can navigate between steps
    Given I am logged in as the test user
    And I am on step 1 of bumicert creation
    When the user fills step 1 title field
    And the user clicks "Continue"
    Then the user should be on step 2
    When the user clicks the back button
    Then the user should be on step 1

  @auth
  Scenario: User can save and resume a draft
    Given I am logged in as the test user
    And I am on step 1 of bumicert creation
    When the user enters bumicert title "Draft Test {timestamp}"
    And the user saves the draft
    And the user navigates to "/bumicert/create"
    Then the user should see their draft in the list
    When the user clicks on their first draft
    Then the bumicert title should contain "Draft Test"

  @auth @smoke
  Scenario: User can create and publish a bumicert (full flow)
    Given I am logged in as the test user
    And I start a new bumicert
    # Step 1: Cover Details
    When the user uploads a cover image
    And the user enters bumicert title "E2E Bumicert {timestamp}"
    # Date range has valid defaults (Jan 1 - today), no need to change
    And the user marks the project as ongoing
    And the user selects work type "Agroforestry"
    And the user clicks "Continue"
    # Step 2: Impact Story
    And the user enters impact story "This is a comprehensive E2E test impact story describing the environmental work being done. It includes details about the project scope, methodology, and expected outcomes. This text is long enough to satisfy the minimum character requirements for the impact story field."
    And the user enters short description "E2E test short description for the bumicert certification process."
    And the user clicks "Continue"
    # Step 3: Contributors & Sites
    And the user adds themselves as a contributor
    And the user ensures a test site exists
    And the user selects the first available site
    And the user checks the permissions checkbox
    And the user checks the terms and conditions checkbox
    And the user clicks "Continue"
    # Step 4: Review
    Then the user should see the review page with all sections complete
    When the user clicks "Continue"
    # Step 5: Publish
    And the user clicks "Publish Bumicert"
    Then the bumicert should be published successfully
    And the user should see the success message
