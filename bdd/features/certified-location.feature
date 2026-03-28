@mutations @certified-location
Feature: Certified Location Management
  As an environmental organization
  I want to create and manage certified locations on the AT Protocol
  So that conservation sites are verifiably registered on a decentralized network

  Background:
    Given a default credential layer

  # ---------- Record creation (offline validation) ----------

  @offline
  Scenario: Create a certified location with valid inputs
    Given a valid polygon GeoJSON file
    And the location name is "Amazon Rainforest Plot A"
    And the location description is "Primary monitoring site in Amazonia"
    When I build a certified location record
    Then the record should have lpVersion "1.0.0"
    And the record should have locationType "geojson-point"
    And the record should have a createdAt timestamp

  @integration @slow
  Scenario: Reject creation when name is missing
    Given valid AT Protocol credentials are available
    And a valid polygon GeoJSON file
    And the location name is ""
    When I create the certified location on the PDS
    Then the operation should fail with a validation error

  # ---------- Integration tests (require credentials) ----------

  @integration @slow
  Scenario: Create a certified location on the PDS
    Given valid AT Protocol credentials are available
    And a valid polygon GeoJSON file
    And the location name is "BDD Test Location"
    When I create the certified location on the PDS
    Then the result should contain a valid AT URI
    And the result should contain a record key
    And the record should have name "BDD Test Location"

  @integration @slow
  Scenario: Upsert updates an existing certified location
    Given valid AT Protocol credentials are available
    And a valid polygon GeoJSON file
    And the location name is "BDD Upsert Test"
    When I upsert the certified location on the PDS
    Then the result should contain a valid AT URI
    When I update the location name to "BDD Upsert Updated"
    And I upsert the certified location on the PDS again
    Then the record should have name "BDD Upsert Updated"
