/**
 * E2E Test Environment Configuration
 *
 * Loads and validates environment variables from e2e/.env
 * Provides typed access to test configuration values
 */

import { config } from 'dotenv'
import { resolve } from 'node:path'

// Load environment variables from e2e/.env
// Use process.cwd() which is the project root where tests are run from
const envPath = resolve(process.cwd(), 'e2e', '.env')
const result = config({ path: envPath })

if (result.error) {
  console.error('❌ Failed to load .env file:', result.error)
  console.error('Tried path:', envPath)
  console.error('Current working directory:', process.cwd())
  throw result.error
}

console.log('✅ Loaded .env from:', envPath)
console.log('📋 E2E_APP_URL:', process.env.E2E_APP_URL)
console.log('📋 E2E_TEST_HANDLE:', process.env.E2E_TEST_HANDLE)

/**
 * Helper to require an environment variable
 * @throws Error if the variable is not set
 */
function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}\n` +
        `Please set it in e2e/.env (see e2e/.env.example for reference)`
    )
  }
  return value
}

/**
 * Helper to get an optional environment variable
 */
function optional(name: string, defaultValue?: string): string | undefined {
  return process.env[name] ?? defaultValue
}

/**
 * Test environment configuration
 *
 * All URLs, credentials, and runtime settings should be accessed through this object
 */
export const testEnv = {
  // Main application URL under test
  appUrl: required('E2E_APP_URL'),

  // Browser behavior
  headless: optional('E2E_HEADLESS', 'false') === 'true',

  // Optional: Separate service URLs (if your platform has them)
  authUrl: optional('E2E_AUTH_URL'),
  apiUrl: optional('E2E_API_URL'),

  // Optional: Email/OTP service (for auth testing)
  mailUrl: optional('E2E_MAIL_URL'),
  mailUser: optional('E2E_MAIL_USER'),
  mailPass: optional('E2E_MAIL_PASS'),

  // Timeouts (in milliseconds)
  defaultTimeout: Number.parseInt(optional('E2E_DEFAULT_TIMEOUT', '30000') ?? '30000'),
  navigationTimeout: Number.parseInt(optional('E2E_NAVIGATION_TIMEOUT', '30000') ?? '30000'),

  // Test account credentials (for authenticated tests via OAuth)
  testHandle: optional('E2E_TEST_HANDLE'),
  testPassword: optional('E2E_TEST_PASSWORD'),
  testPdsDomain: optional('E2E_TEST_PDS_DOMAIN', 'climateai.org'),
} as const
