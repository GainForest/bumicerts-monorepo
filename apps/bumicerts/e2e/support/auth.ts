/**
 * Authentication Helpers for E2E Tests
 *
 * Automates the ATProto OAuth flow including:
 * 1. Opening login modal
 * 2. Entering handle
 * 3. Following redirect to PDS
 * 4. Entering password on PDS page
 * 5. Handling callback
 * 6. Waiting for authentication completion
 *
 * Auth State Reuse:
 * - performAuthSetup() runs once and saves browser state to .auth/user.json
 * - Subsequent tests load this state instead of re-authenticating
 */

import type { AppWorld } from './world.js'
import type { Browser, BrowserContext } from '@playwright/test'
import { getPage } from './utils.js'
import { resolve } from 'node:path'
import { testEnv } from './env.js'

/**
 * Logs in using the full OAuth flow
 *
 * This automates the real login flow:
 * 1. Opens the login modal
 * 2. Enters the test handle
 * 3. Clicks authorize
 * 4. Waits for redirect to PDS
 * 5. Enters password on PDS authorization page
 * 6. Submits and waits for callback
 * 7. Waits for auth completion redirect
 *
 * Requirements:
 * - E2E_TEST_HANDLE must be set in e2e/.env
 * - E2E_TEST_PASSWORD must be set in e2e/.env
 * - E2E_TEST_PDS_DOMAIN must be set (defaults to climateai.org)
 *
 * @param world - Cucumber world context
 * @throws Error if required env vars are missing or login fails
 */
export async function loginViaOAuth(world: AppWorld): Promise<void> {
  const { testHandle, testPassword, testPdsDomain } = world.env

  // Validate required env vars
  if (!testHandle) {
    throw new Error(
      'E2E_TEST_HANDLE is not set. Add it to e2e/.env for authenticated tests.\n' +
        'See e2e/.env.example for details.'
    )
  }

  if (!testPassword) {
    throw new Error(
      'E2E_TEST_PASSWORD is not set. Add it to e2e/.env for authenticated tests.\n' +
        'See e2e/.env.example for details.'
    )
  }

  const page = getPage(world)

  console.log(`🔐 Starting OAuth login for ${testHandle}...`)

  // Step 1: Navigate to home page
  await page.goto(world.env.appUrl)
  await page.waitForLoadState('domcontentloaded')

  // Step 2: Click "Launch app" button on homepage (if it exists)
  const launchAppButton = page.locator('button:has-text("Launch app"), a:has-text("Launch app")').first()
  const launchAppExists = await launchAppButton.isVisible({ timeout: 2000 }).catch(() => false)
  
  if (launchAppExists) {
    console.log('  → Clicking "Launch app" button...')
    await launchAppButton.click()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
  }

  // Step 3: Open login modal
  // Look for "Get started" button in header
  console.log('  → Looking for "Get started" button...')
  const getStartedButton = page.locator('button:has-text("Get started")').first()
  await getStartedButton.waitFor({ state: 'visible', timeout: 5000 })
  await getStartedButton.click()

  // Wait for login modal to appear
  console.log('  → Login modal should be open...')
  await page.waitForTimeout(1000)

  // Step 3: Click on the "Handle" tab
  console.log('  → Clicking Handle tab...')
  const handleTab = page.locator('button:has-text("Handle")').first()
  await handleTab.click()
  await page.waitForTimeout(500)

  // Step 4: Enter just the username part (before the @)
  // Extract username from full handle (e.g., "satyam-test-004" from "satyam-test-004.climateai.org")
  const username = testHandle.split('.')[0]
  console.log(`  → Entering username: ${username}`)
  
  const handleInput = page.locator('input#login-handle')
  await handleInput.waitFor({ state: 'visible', timeout: 3000 })
  await handleInput.fill(username)

  // Step 5: Select PDS domain from dropdown
  console.log(`  → Selecting PDS domain: ${testPdsDomain}`)
  
  // Click the dropdown button (shows current domain like ".climateai.org")
  const pdsDropdownButton = page.locator('button:has-text(".' + (testPdsDomain ?? 'climateai.org') + '")').first()
  const dropdownExists = await pdsDropdownButton.isVisible({ timeout: 2000 }).catch(() => false)
  
  if (!dropdownExists || testPdsDomain !== 'climateai.org') {
    // If not visible or need to change domain, click to open dropdown
    const anyPdsButton = page.locator('button.shrink-0:has(svg)').filter({ hasText: '.' }).first()
    const anyDropdownExists = await anyPdsButton.isVisible().catch(() => false)
    
    if (anyDropdownExists) {
      await anyPdsButton.click()
      await page.waitForTimeout(300)
      
      // Select the desired domain from the list
      const domainOption = page.locator(`button:has-text("${testPdsDomain ?? 'climateai.org'}")`)
      await domainOption.first().click()
      await page.waitForTimeout(300)
    }
  }

  // Step 6: Click the Continue button
  console.log('  → Clicking Continue button...')
  const continueButton = page.locator('button[type="submit"]:has-text("Continue")').first()
  
  // Store the current page URL to detect when we leave
  const currentUrl = page.url()
  
  await continueButton.click()

  console.log('⏳ Waiting for redirect to PDS authorization page...')

  // Step 7: Wait for redirect to PDS authorization page
  // The URL should now be on the PDS domain (climateai.org/oauth/authorize)
  await page.waitForURL(url => {
    const urlString = url.toString()
    const pdsDomain = testPdsDomain ?? 'climateai.org'
    return urlString.includes(pdsDomain) && 
           (urlString.includes('/oauth/') || urlString.includes('/authorize'))
  }, { timeout: 15000 })

  console.log(`✓ Redirected to PDS authorization page: ${page.url()}`)

  // Step 8: Fill in password on PDS page
  console.log('  → Entering password on PDS page...')
  const passwordInput = page.locator('input[type="password"]').first()
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 })
  await passwordInput.fill(testPassword)

  // Step 9: Submit the password (click Next/Sign in/Submit)
  console.log('  → Submitting password...')
  const passwordSubmitButton = page.locator('button[type="submit"], button:has-text("Next"), button:has-text("Sign in"), button:has-text("Continue")').first()
  await passwordSubmitButton.click()

  // Step 10: Wait for and click the "Approve" button on the authorization consent screen
  console.log('  → Waiting for Approve button...')
  const approveButton = page.locator('button:has-text("Approve"), button:has-text("Allow"), button:has-text("Authorize")').first()
  await approveButton.waitFor({ state: 'visible', timeout: 10000 })
  await approveButton.click()

  console.log('⏳ Waiting for OAuth callback and redirects...')

  // Step 11: Wait for navigation to complete
  // The flow goes: PDS → /api/oauth/callback → /auth/complete → final page (e.g., /explore)
  // Just wait for network to be idle and we're back on our domain
  try {
    await page.waitForLoadState('networkidle', { timeout: 15000 })
  } catch (e) {
    // networkidle might timeout, that's okay - just continue
  }

  // Wait a bit more for any final client-side redirects
  await page.waitForTimeout(2000)

  const finalUrl = page.url()
  console.log(`✓ OAuth flow complete!`)
  console.log(`   Final URL: ${finalUrl}`)

  // Verify we're back on our app (not on climateai.org)
  if (finalUrl.includes('climateai.org')) {
    throw new Error(`OAuth flow did not complete - still on PDS page: ${finalUrl}`)
  }

  // Mark world as authenticated
  world.isAuthenticated = true

  console.log(`✅ Successfully authenticated as ${testHandle}`)
}

/**
 * Logs out by clearing the session
 *
 * @param world - Cucumber world context
 */
export async function logout(world: AppWorld): Promise<void> {
  const page = getPage(world)

  // Navigate to home page
  await page.goto(world.env.appUrl)

  // Look for user menu and logout button
  const userMenu = page.locator('[data-testid="user-menu"], [data-testid="user-avatar"]').first()
  const userMenuExists = await userMenu.isVisible().catch(() => false)

  if (userMenuExists) {
    await userMenu.click()
    await page.waitForTimeout(300)

    const logoutButton = page.locator('button:has-text("Sign out"), button:has-text("Logout"), a:has-text("Sign out")').first()
    const logoutExists = await logoutButton.isVisible().catch(() => false)

    if (logoutExists) {
      await logoutButton.click()
      await page.waitForTimeout(1000)
    }
  }

  // Alternative: clear all cookies
  await page.context().clearCookies()

  world.isAuthenticated = false

  console.log('🔓 Logged out')
}

/**
 * Checks if authentication credentials are available
 *
 * Returns true if all required env vars are set, false otherwise.
 * Use this for conditional test execution.
 *
 * @param world - Cucumber world context
 * @returns true if auth credentials are configured
 */
export function isAuthAvailable(world: AppWorld): boolean {
  const { testHandle, testPassword } = world.env
  return Boolean(testHandle && testPassword)
}

/**
 * Performs OAuth authentication setup and saves browser state to file
 *
 * This function should be called once before any @auth tests run.
 * It creates a temporary browser context, performs the full OAuth flow,
 * and saves the authenticated state to e2e/.auth/user.json.
 *
 * Subsequent tests can load this state instead of re-authenticating.
 *
 * @param browser - Shared Playwright browser instance
 * @param authStatePath - Path to save the auth state file
 * @throws Error if authentication fails or required env vars are missing
 */
export async function performAuthSetup(
  browser: Browser,
  authStatePath: string
): Promise<void> {
  const { testHandle, testPassword, testPdsDomain, appUrl } = testEnv

  // Validate required env vars
  if (!testHandle) {
    throw new Error(
      'E2E_TEST_HANDLE is not set. Add it to e2e/.env for authenticated tests.\n' +
        'See e2e/.env.example for details.'
    )
  }

  if (!testPassword) {
    throw new Error(
      'E2E_TEST_PASSWORD is not set. Add it to e2e/.env for authenticated tests.\n' +
        'See e2e/.env.example for details.'
    )
  }

  console.log(`\n🔐 Setting up authentication for ${testHandle}...`)
  console.log(`   Auth state will be saved to: ${authStatePath}`)

  // Create temporary context for authentication
  const context: BrowserContext = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  })
  const page = await context.newPage()

  try {
    // Step 1: Navigate to home page
    await page.goto(appUrl)
    await page.waitForLoadState('domcontentloaded')

    // Step 2: Click "Launch app" button on homepage (if it exists)
    const launchAppButton = page.locator('button:has-text("Launch app"), a:has-text("Launch app")').first()
    const launchAppExists = await launchAppButton.isVisible({ timeout: 2000 }).catch(() => false)
    
    if (launchAppExists) {
      console.log('  → Clicking "Launch app" button...')
      await launchAppButton.click()
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1000)
    }

    // Step 3: Open login modal
    console.log('  → Looking for "Get started" button...')
    const getStartedButton = page.locator('button:has-text("Get started")').first()
    await getStartedButton.waitFor({ state: 'visible', timeout: 5000 })
    await getStartedButton.click()
    await page.waitForTimeout(1000)

    // Step 4: Click on the "Handle" tab
    console.log('  → Clicking Handle tab...')
    const handleTab = page.locator('button:has-text("Handle")').first()
    await handleTab.click()
    await page.waitForTimeout(500)

    // Step 5: Enter just the username part
    const username = testHandle.split('.')[0]
    console.log(`  → Entering username: ${username}`)
    
    const handleInput = page.locator('input#login-handle')
    await handleInput.waitFor({ state: 'visible', timeout: 3000 })
    await handleInput.fill(username)

    // Step 6: Select PDS domain from dropdown
    console.log(`  → Selecting PDS domain: ${testPdsDomain}`)
    
    const pdsDropdownButton = page.locator('button:has-text(".' + (testPdsDomain ?? 'climateai.org') + '")').first()
    const dropdownExists = await pdsDropdownButton.isVisible({ timeout: 2000 }).catch(() => false)
    
    if (!dropdownExists || testPdsDomain !== 'climateai.org') {
      const anyPdsButton = page.locator('button.shrink-0:has(svg)').filter({ hasText: '.' }).first()
      const anyDropdownExists = await anyPdsButton.isVisible().catch(() => false)
      
      if (anyDropdownExists) {
        await anyPdsButton.click()
        await page.waitForTimeout(300)
        
        const domainOption = page.locator(`button:has-text("${testPdsDomain ?? 'climateai.org'}")`)
        await domainOption.first().click()
        await page.waitForTimeout(300)
      }
    }

    // Step 7: Click the Continue button
    console.log('  → Clicking Continue button...')
    const continueButton = page.locator('button[type="submit"]:has-text("Continue")').first()
    await continueButton.click()

    console.log('⏳ Waiting for redirect to PDS authorization page...')

    // Step 8: Wait for redirect to PDS authorization page
    await page.waitForURL(url => {
      const urlString = url.toString()
      const pdsDomain = testPdsDomain ?? 'climateai.org'
      return urlString.includes(pdsDomain) && 
             (urlString.includes('/oauth/') || urlString.includes('/authorize'))
    }, { timeout: 15000 })

    console.log(`✓ Redirected to PDS authorization page`)

    // Step 9: Fill in password on PDS page
    console.log('  → Entering password on PDS page...')
    const passwordInput = page.locator('input[type="password"]').first()
    await passwordInput.waitFor({ state: 'visible', timeout: 10000 })
    await passwordInput.fill(testPassword)

    // Step 10: Submit the password
    console.log('  → Submitting password...')
    const passwordSubmitButton = page.locator('button[type="submit"], button:has-text("Next"), button:has-text("Sign in"), button:has-text("Continue")').first()
    await passwordSubmitButton.click()

    // Step 11: Wait for and click the "Approve" button
    console.log('  → Waiting for Approve button...')
    const approveButton = page.locator('button:has-text("Approve"), button:has-text("Allow"), button:has-text("Authorize")').first()
    await approveButton.waitFor({ state: 'visible', timeout: 10000 })
    await approveButton.click()

    console.log('⏳ Waiting for OAuth callback and redirects...')

    // Step 12: Wait for navigation to complete
    try {
      await page.waitForLoadState('networkidle', { timeout: 15000 })
    } catch (e) {
      // networkidle might timeout, that's okay
    }

    await page.waitForTimeout(2000)

    const finalUrl = page.url()

    // Verify we're back on our app
    if (finalUrl.includes(testPdsDomain ?? 'climateai.org')) {
      throw new Error(`OAuth flow did not complete - still on PDS page: ${finalUrl}`)
    }

    console.log(`✓ OAuth flow complete! Final URL: ${finalUrl}`)

    // Save the authenticated browser state
    await context.storageState({ path: authStatePath })
    console.log(`✅ Auth state saved to: ${authStatePath}`)

  } finally {
    // Clean up temporary context
    await context.close()
  }
}
