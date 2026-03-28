@authentication @offline
Feature: AT Protocol Credential Authentication
  As an API consumer
  I want to authenticate with AT Protocol using credentials
  So that I can perform authenticated mutations on my PDS

  Scenario: Build a credential agent layer with valid configuration
    Given credentials with service "https://bsky.social" and identifier "test.bsky.social" and password "test-password"
    When I build a credential agent layer
    Then the layer should be created successfully

  Scenario: Credential layer rejects empty service URL
    Given credentials with service "" and identifier "test.bsky.social" and password "test-password"
    When I check if credentials are complete
    Then the credentials should be incomplete

  Scenario: Credential layer rejects empty identifier
    Given credentials with service "https://bsky.social" and identifier "" and password "test-password"
    When I check if credentials are complete
    Then the credentials should be incomplete

  Scenario: Credential layer rejects empty password
    Given credentials with service "https://bsky.social" and identifier "test.bsky.social" and password ""
    When I check if credentials are complete
    Then the credentials should be incomplete

  @integration @slow
  Scenario: Authenticate with valid credentials against real PDS
    Given valid AT Protocol credentials are available
    When I authenticate with the PDS
    Then the session should contain a valid DID
    And the session should contain the expected handle

  @integration @slow
  Scenario: Fail authentication with wrong password
    Given valid AT Protocol credentials are available
    But the password is overridden with "wrong-password"
    When I attempt to authenticate with the PDS
    Then the authentication should fail with a "CredentialLoginError"
