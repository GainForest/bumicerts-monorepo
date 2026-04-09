/**
 * Custom World Class
 *
 * Stores per-scenario state that is shared across step definitions.
 * Each scenario gets a fresh instance of this world.
 *
 * Contains:
 * - Browser/context/page references
 * - Test environment config
 * - Generated test data (emails, usernames, etc.)
 * - API response storage for assertions
 */

import { World, setWorldConstructor, type IWorldOptions } from '@cucumber/cucumber'
import type { Browser, BrowserContext, Page } from '@playwright/test'
import { testEnv } from './env.js'

export interface AppWorld extends World {
  // Test environment configuration
  env: typeof testEnv

  // Playwright objects (set by hooks)
  browser?: Browser
  context?: BrowserContext
  page?: Page

  // Authentication state
  isAuthenticated?: boolean

  // Generated test data
  testEmail?: string
  testHandle?: string
  testOtp?: string
  bumicertTitle?: string // For bumicert creation tests

  // API response storage (for API assertions)
  lastResponse?: {
    status: number
    body: unknown
  }
}

/**
 * Custom World implementation
 */
export class CustomWorld extends World implements AppWorld {
  env: typeof testEnv
  browser?: Browser
  context?: BrowserContext
  page?: Page

  isAuthenticated?: boolean

  testEmail?: string
  testHandle?: string
  testOtp?: string
  bumicertTitle?: string // For bumicert creation tests

  lastResponse?: {
    status: number
    body: unknown
  }

  constructor(options: IWorldOptions) {
    super(options)
    this.env = testEnv
    this.isAuthenticated = false
  }
}

// Set the custom world as the default for Cucumber
setWorldConstructor(CustomWorld)

// Export for type checking
export { CustomWorld as World }
