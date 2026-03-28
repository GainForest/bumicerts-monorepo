@offline @validation @geojson
Feature: GeoJSON Validation
  As a conservation data steward
  I want the system to validate GeoJSON files before accepting them
  So that only well-formed spatial data enters the AT Protocol network

  Background:
    Given a default credential layer

  # ---------- MIME type validation ----------

  Scenario: Reject files with incorrect MIME type
    Given a GeoJSON file with MIME type "text/plain"
    When I attempt to create a certified location with the file
    Then the operation should fail with a "GeoJsonValidationError"
    And the error message should contain "application/geo+json"

  Scenario: Accept files with correct MIME type
    Given a valid polygon GeoJSON file
    When I validate the GeoJSON file
    Then the validation should pass

  # ---------- File size validation ----------

  Scenario: Reject GeoJSON files exceeding 10 MB
    Given a GeoJSON file that is 10485761 bytes
    When I attempt to create a certified location with the file
    Then the operation should fail with a "GeoJsonValidationError"
    And the error message should contain "exceeds maximum"

  Scenario Outline: Accept GeoJSON files within size limits
    Given a GeoJSON file that is <size> bytes
    When I validate the file size against the 10 MB limit
    Then the file size should be accepted

    Examples:
      | size     |
      | 1024     |
      | 5242880  |
      | 10485760 |

  # ---------- Structure validation ----------

  Scenario: Reject malformed GeoJSON structures
    Given a GeoJSON file with content '{"type": "notAType"}'
    When I attempt to create a certified location with the file
    Then the operation should fail with a "GeoJsonValidationError"

  Scenario: Reject GeoJSON with only point geometry (no polygon)
    Given a GeoJSON file containing only a point geometry at coordinates [-73.935, 40.731]
    When I attempt to create a certified location with the file
    Then the operation should fail with a "GeoJsonProcessingError"

  Scenario: Accept GeoJSON with valid polygon geometry
    Given a GeoJSON file containing a valid polygon
    When I validate the GeoJSON structure
    Then the validation should pass
    And the polygon metrics should be computed
