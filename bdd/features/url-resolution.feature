@offline @url-resolution
Feature: Public URL Resolution
  As a Next.js application developer
  I want the system to correctly resolve public URLs across environments
  So that OAuth callbacks and API endpoints work in dev, preview, and production

  # ---------- resolvePublicUrl ----------

  Scenario: Return explicit URL stripped of trailing slash
    When I resolve the public URL with explicit URL "https://example.com/"
    Then the resolved URL should be "https://example.com"

  Scenario: Return explicit URL as-is when no trailing slash
    When I resolve the public URL with explicit URL "https://example.com"
    Then the resolved URL should be "https://example.com"

  Scenario: Return placeholder when no explicit URL is given
    When I resolve the public URL without an explicit URL
    Then the resolved URL should be "https://placeholder.invalid"

  # ---------- isLoopback ----------

  Scenario Outline: Identify loopback addresses
    When I check if "<url>" is a loopback address
    Then the result should be <expected>

    Examples:
      | url                              | expected |
      | http://127.0.0.1:3000            | true     |
      | http://localhost:3000             | true     |
      | http://localhost                  | true     |
      | https://example.com              | false    |
      | https://my-app.vercel.app        | false    |
      | https://abc123.ngrok.io          | false    |

  # ---------- resolveRequestPublicUrl ----------

  Scenario: Derive public URL from request origin
    Given a request with URL "http://127.0.0.1:3001/api/oauth/epds/login"
    When I resolve the request public URL with fallback "http://127.0.0.1:3000"
    Then the resolved URL should be "http://127.0.0.1:3001"

  Scenario: Normalise localhost to 127.0.0.1 in request URLs
    Given a request with URL "http://localhost:3001/api/oauth/epds/login"
    When I resolve the request public URL with fallback "http://127.0.0.1:3000"
    Then the resolved URL should be "http://127.0.0.1:3001"

  Scenario: Fall back when request URL is unparseable
    Given a request with URL "not-a-url"
    When I resolve the request public URL with fallback "http://127.0.0.1:3001"
    Then the resolved URL should be "http://127.0.0.1:3001"

  Scenario: Do not modify production URLs
    Given a request with URL "https://bumicerts.com/api/oauth/epds/login"
    When I resolve the request public URL with fallback "https://bumicerts.com"
    Then the resolved URL should be "https://bumicerts.com"
