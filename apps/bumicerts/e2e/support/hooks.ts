/**
 * Cucumber Lifecycle Hooks
 *
 * Manages Playwright browser lifecycle:
 * - BeforeAll: Launch browser, create report directories, setup auth state
 * - Before: Create context (with or without auth state) + page for each scenario
 * - After: Capture screenshot on failure, clean up context
 * - AfterAll: Close browser
 *
 * Auth State Reuse:
 * - BeforeAll with @auth tag: Performs OAuth once, saves state to .auth/user.json
 * - Before with @auth tag: Loads saved auth state (no login needed!)
 * - Before without @auth tag: Fresh unauthenticated context
 */

import { BeforeAll, AfterAll, Before, After, setDefaultTimeout } from '@cucumber/cucumber'
import { chromium, type Browser } from '@playwright/test'
import { mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { AppWorld } from './world.js'
import { performAuthSetup } from './auth.js'

let sharedBrowser: Browser
const AUTH_STATE_PATH = resolve(process.cwd(), 'e2e/.auth/user.json')

// Set default timeout for all steps (60 seconds)
// This is important for remote deployments with cold starts and OAuth flows
setDefaultTimeout(60_000)

/**
 * Before all scenarios: Launch browser and ensure report directories exist
 */
BeforeAll(async function () {
  // Create reports directory if it doesn't exist
  try {
    mkdirSync(resolve(process.cwd(), 'reports'), { recursive: true })
    mkdirSync(resolve(process.cwd(), 'reports/screenshots'), { recursive: true })
    mkdirSync(resolve(process.cwd(), 'e2e/.auth'), { recursive: true })
  } catch (err) {
    // Directory already exists, ignore
  }

  // Launch browser (shared across all scenarios for performance)
  sharedBrowser = await chromium.launch({
    headless: process.env.E2E_HEADLESS === 'true',
  })

  console.log('🚀 Browser launched')
})



/**
 * Before each @auth scenario: Create browser context WITH saved auth state
 * 
 * This loads the authentication state from the file. If the file doesn't exist yet,
 * it performs the OAuth setup first, then loads the state.
 * The page will be already authenticated - no need to login in the step!
 */
Before({ tags: '@auth' }, async function (this: AppWorld) {
  // Ensure auth state exists - perform OAuth setup if needed
  if (!existsSync(AUTH_STATE_PATH)) {
    console.log('\n📝 Auth state not found - performing initial OAuth setup...')
    await performAuthSetup(sharedBrowser, AUTH_STATE_PATH)
  } else {
    console.log('✅ Auth state found - reusing existing session')
  }

  // Create browser context with saved authentication state
  this.context = await sharedBrowser.newContext({
    storageState: AUTH_STATE_PATH,
    viewport: { width: 1280, height: 720 },
  })

  // Create new page
  this.page = await this.context.newPage()

  // Set timeouts on page
  this.page.setDefaultNavigationTimeout(30_000)
  this.page.setDefaultTimeout(30_000)

  // Mark as authenticated
  this.isAuthenticated = true

  console.log('🔓 Context created with auth state - user is authenticated!')
})

/**
 * Before each non-@auth scenario: Create fresh unauthenticated browser context
 */
Before({ tags: 'not @auth' }, async function (this: AppWorld) {
  // Create isolated browser context (fresh cookies, storage, etc.)
  this.context = await sharedBrowser.newContext({
    viewport: { width: 1280, height: 720 },
  })

  // Create new page
  this.page = await this.context.newPage()

  // Set timeouts on page
  this.page.setDefaultNavigationTimeout(30_000)
  this.page.setDefaultTimeout(30_000)

  // Not authenticated
  this.isAuthenticated = false
})

/**
 * After each scenario: Capture screenshot on failure, clean up context
 */
After(async function (this: AppWorld, { result, pickle }) {
  // Capture screenshot on failure
  if (result?.status === 'FAILED' && this.page) {
    const screenshotPath = resolve(
      process.cwd(),
      'reports/screenshots',
      `${pickle.name.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.png`
    )

    try {
      await this.page.screenshot({ path: screenshotPath, fullPage: true })
      console.log(`📸 Screenshot saved: ${screenshotPath}`)
    } catch (err) {
      console.error('Failed to capture screenshot:', err)
    }
  }

  // Clean up browser context
  if (this.context) {
    await this.context.close()
  }
})

/**
 * After all scenarios: Close shared browser
 */
AfterAll(async function () {
  if (sharedBrowser) {
    await sharedBrowser.close()
    console.log('🛑 Browser closed')
  }
})
