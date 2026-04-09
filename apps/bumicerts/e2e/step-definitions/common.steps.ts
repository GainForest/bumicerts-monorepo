/**
 * Common Step Definitions
 *
 * Shared steps used across multiple features:
 * - Health checks
 * - Navigation
 * - Page assertions
 * - Authentication
 */

import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import type { AppWorld } from '../support/world.js'
import { getPage, waitForAppReady } from '../support/utils.js'
import { logout, isAuthAvailable } from '../support/auth.js'

/**
 * Health check: Verify the application is ready
 */
Given('the application is healthy', async function (this: AppWorld) {
  await waitForAppReady(this.env.appUrl)
})

/**
 * Navigation: Navigate to a specific path
 */
When('the user navigates to {string}', async function (this: AppWorld, path: string) {
  const page = getPage(this)
  const url = `${this.env.appUrl}${path}`
  await page.goto(url)
})

/**
 * Assertion: Verify page URL contains a string
 */
Then('the page URL should contain {string}', async function (this: AppWorld, urlPart: string) {
  const page = getPage(this)
  await expect(page).toHaveURL(new RegExp(urlPart))
})

/**
 * Assertion: Verify exact page URL
 */
Then('the page URL should be {string}', async function (this: AppWorld, expectedPath: string) {
  const page = getPage(this)
  const expectedUrl = `${this.env.appUrl}${expectedPath}`
  await expect(page).toHaveURL(expectedUrl)
})

/**
 * Assertion: Verify page is loaded (body is visible)
 */
Then('the page should be loaded', async function (this: AppWorld) {
  const page = getPage(this)
  // Wait for the page body to be visible
  await expect(page.locator('body')).toBeVisible()
})

/**
 * Assertion: Verify page title contains text
 */
Then('the page title should contain {string}', async function (this: AppWorld, titlePart: string) {
  const page = getPage(this)
  await expect(page).toHaveTitle(new RegExp(titlePart, 'i'))
})

// ─────────────────────────────────────────────────────────────────────────────
// Authentication Steps
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Authentication: Log in as the test user
 *
 * This step verifies that the browser context is already authenticated.
 * The actual OAuth login happens in the BeforeAll hook and the auth state
 * is loaded in the Before hook for @auth scenarios.
 *
 * This step is now a simple assertion that auth state is loaded.
 *
 * Requires E2E_TEST_HANDLE and E2E_TEST_PASSWORD in e2e/.env
 */
Given('I am logged in as the test user', async function (this: AppWorld) {
  if (!isAuthAvailable(this)) {
    return 'pending' as const
  }
  
  // Verify that auth state is loaded (done by the Before hook)
  if (!this.isAuthenticated) {
    throw new Error(
      'Auth state not loaded. This should not happen for @auth scenarios. ' +
      'Check that the scenario is tagged with @auth and BeforeAll hook ran successfully.'
    )
  }
  
  console.log('✅ Auth state verified - user is authenticated')
})

/**
 * Authentication: Log out
 */
Given('I am logged out', async function (this: AppWorld) {
  await logout(this)
})

/**
 * Assertion: Verify user is authenticated
 */
Then('I should be logged in', async function (this: AppWorld) {
  const page = getPage(this)
  // Check for presence of user menu or handle in the header
  // Adjust selector based on your app's authenticated header structure
  const userMenu = page.locator('[data-testid="user-menu"], [data-testid="user-avatar"]')
  await expect(userMenu).toBeVisible({ timeout: 10000 })
})

/**
 * Assertion: Verify user's handle appears in the header
 */
Then('I should see my handle in the header', async function (this: AppWorld) {
  const page = getPage(this)
  const { testHandle } = this.env
  
  if (!testHandle) {
    throw new Error('E2E_TEST_HANDLE is not set')
  }

  // Extract just the username part (before the @domain)
  const username = testHandle.split('.')[0] ?? testHandle

  // Look for the username in the header (handle might be displayed without the domain)
  const header = page.locator('header')
  await expect(header).toContainText(username, { timeout: 10000 })
})
