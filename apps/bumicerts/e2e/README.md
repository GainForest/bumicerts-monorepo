# E2E Testing for Bumicerts

End-to-end testing setup using Gherkin + Cucumber.js + Playwright.

## Quick Start

### 1. Prerequisites

- Bun installed
- Node.js 22.x (see `.node-version` in project root)
- Dependencies installed (`bun install` already run)

### 2. Start the Dev Server

In one terminal, start the bumicerts app:

```bash
cd apps/bumicerts
bun dev
```

The app will start at `http://localhost:3001`

### 3. Run E2E Tests

In another terminal:

```bash
# Run with visible browser (for development/debugging)
cd apps/bumicerts
bun run test:e2e

# Run headless (faster, for CI)
bun run test:e2e:headless
```

## Test Results

After running tests:

- **HTML Report**: `reports/e2e.html` - Open in browser to view detailed results
- **Screenshots**: `reports/screenshots/` - Failure screenshots are saved here

## Project Structure

```
apps/bumicerts/e2e/
├── .env                          # Local environment config (gitignored)
├── .env.example                  # Environment template
├── cucumber.mjs                  # Cucumber configuration
├── tsconfig.e2e.json             # TypeScript config for E2E
├── features/                     # Gherkin feature files
│   └── explore.feature           # Explore page scenarios
├── step-definitions/             # Step implementations
│   ├── common.steps.ts           # Shared steps (navigation, assertions)
│   └── explore.steps.ts          # Explore-specific steps
└── support/                      # Test infrastructure
    ├── env.ts                    # Environment config loader
    ├── world.ts                  # Custom World (per-scenario state)
    ├── hooks.ts                  # Browser lifecycle management
    └── utils.ts                  # Helper functions
```

## Writing New Tests

### 1. Create a Feature File

Create `e2e/features/my-feature.feature`:

```gherkin
Feature: My Feature

  Background:
    Given the application is healthy

  Scenario: User can do something
    When the user navigates to "/some-page"
    Then the page should be loaded
```

### 2. Create Step Definitions

Create `e2e/step-definitions/my-feature.steps.ts`:

```typescript
import { When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import type { AppWorld } from '../support/world.js'
import { getPage } from '../support/utils.js'

When('the user does something', async function (this: AppWorld) {
  const page = getPage(this)
  // Your Playwright code here
  await page.click('button')
})

Then('something should happen', async function (this: AppWorld) {
  const page = getPage(this)
  await expect(page.locator('.result')).toBeVisible()
})
```

### 3. Run Your Test

```bash
bun run test:e2e
```

## Available Step Definitions

### Common Steps (from `common.steps.ts`)

**Given:**
- `the application is healthy` - Waits for health endpoint to respond

**When:**
- `the user navigates to "{path}"` - Navigate to a URL path

**Then:**
- `the page URL should contain "{text}"` - Assert URL contains text
- `the page URL should be "{path}"` - Assert exact URL path
- `the page should be loaded` - Assert page body is visible
- `the page title should contain "{text}"` - Assert page title

### Explore Steps (from `explore.steps.ts`)

**When:**
- `the user clicks on the first organization` - Click first org link

**Then:**
- `the user sees bumicert cards` - Assert bumicert cards visible
- `the user sees organization cards` - Assert org cards visible
- `the user sees the organization profile page` - Assert org profile loaded

## Environment Configuration

Edit `e2e/.env` to configure test behavior:

```bash
# Main application URL
E2E_APP_URL=http://localhost:3001

# Browser visibility (true = headless, false = visible)
E2E_HEADLESS=false

# Timeouts (optional)
E2E_DEFAULT_TIMEOUT=30000
E2E_NAVIGATION_TIMEOUT=30000
```

## Tips & Best Practices

### Writing Robust Tests

1. **Use semantic selectors**: Prefer `page.getByRole()`, `page.getByLabel()`, `page.getByTestId()`
2. **Wait for elements**: Playwright auto-waits, but use explicit waits for dynamic content
3. **Keep steps focused**: Each step should do one thing
4. **Store state in World**: Use `this.testEmail`, `this.testHandle`, etc. for scenario data

### Debugging Tests

1. **Run with visible browser**: `bun run test:e2e` (not headless)
2. **Add Playwright inspector**: Add `await page.pause()` in your step
3. **Check screenshots**: Failure screenshots are in `reports/screenshots/`
4. **Check HTML report**: Open `reports/e2e.html` for detailed results

### Common Patterns

**Waiting for navigation:**
```typescript
await page.click('a[href="/explore"]')
await page.waitForURL(/\/explore/)
```

**Asserting text content:**
```typescript
await expect(page.getByRole('heading')).toContainText('Welcome')
```

**Filling forms:**
```typescript
await page.fill('[name="email"]', 'test@example.com')
await page.click('button[type="submit"]')
```

## Authenticated Testing

### Setup

Authenticated tests automate the **full OAuth login flow**. This requires:

1. **Test account** on `climateai.org` or another PDS
2. **Environment variables** in `e2e/.env`:

```bash
# Your test account handle (e.g., testuser.climateai.org)
E2E_TEST_HANDLE=testuser.climateai.org

# Your test account password
E2E_TEST_PASSWORD=<your_password>

# PDS domain (optional, defaults to climateai.org)
E2E_TEST_PDS_DOMAIN=climateai.org
```

### How It Works

The E2E suite uses **auth state reuse** to make authenticated tests fast:

#### First Time / Auth State Not Found:
1. **Performs full OAuth login** (once, before first `@auth` scenario)
2. **Saves browser state** to `e2e/.auth/user.json` (gitignored)
3. This includes cookies, localStorage, and session data

#### Subsequent Test Runs:
1. **Loads saved auth state** from file
2. **Skips OAuth flow entirely** - instant authentication!
3. All `@auth` scenarios start already logged in

#### OAuth Flow Details (when needed):
The full OAuth automation includes:
1. Opens the login modal on your app
2. Enters the test handle and selects the PDS domain
3. Clicks authorize to start OAuth
4. Waits for redirect to the PDS authorization page
5. Enters the password on the PDS page
6. Submits and waits for OAuth callback
7. Completes authentication and redirects back to the app

**Performance:**
- Without auth state reuse: ~30s per test (OAuth each time)
- With auth state reuse: ~30s once + instant for remaining tests
- Example: 10 auth tests take ~30s instead of ~5 minutes!

**Auth State Management:**
- Auth state is saved to `e2e/.auth/user.json` (gitignored)
- To force re-authentication: `rm -rf e2e/.auth/`
- State is long-lived (persists across test runs)
- Each developer has their own local auth state

### Writing Authenticated Tests

Tag scenarios with `@auth` and use the authentication steps:

```gherkin
@auth
Scenario: User can edit organization
  Given I am logged in as the test user
  When the user navigates to "/upload"
  Then I should be logged in
```

### Available Auth Steps

**Given:**
- `I am logged in as the test user` - Verifies auth state is loaded (auth happens in Before hook)
- `I am logged out` - Clears auth session

**Then:**
- `I should be logged in` - Verifies user menu visible
- `I should see my handle in the header` - Verifies handle appears

### Running Auth Tests

```bash
# Run all tests including authenticated ones
bun run test:e2e

# Run only authenticated tests
bun run test:e2e -- --tags @auth

# Skip authenticated tests
bun run test:e2e -- --tags "not @auth"
```

### Troubleshooting

**"E2E_TEST_HANDLE is not set" error:**
- Fill in the test credentials in `e2e/.env`
- Format: `username.pdsdomain.com` (e.g., `testuser.climateai.org`)

**"E2E_TEST_PASSWORD is not set" error:**
- Add your test account password to `e2e/.env`
- This is the password you use to log into the PDS

**Login fails / stuck on PDS page:**
- Verify your handle and password are correct
- Try logging in manually first to verify credentials work
- Check if PDS page UI has changed (selectors may need updating)

**"Page not authenticated" errors:**
- Verify your test account has an organization record
- OAuth flow may have failed - check browser screenshots in `reports/screenshots/`

**Tests are slow:**
- First auth test performs OAuth (~30s), subsequent tests reuse state (instant)
- Delete `e2e/.auth/` if you suspect stale auth state
- Consider running with `E2E_HEADLESS=true` for faster execution
- Use `@auth` tag filtering to run only auth tests when debugging

**Auth state is stale / "not authenticated" errors:**
- Delete the saved state: `rm -rf e2e/.auth/`
- Next test run will perform fresh OAuth and save new state

See `apps/bumicerts/skills/e2e.md` for more details on the testing framework.

## Troubleshooting

### Tests fail with "Application not ready"

- Ensure dev server is running: `bun dev`
- Check `E2E_APP_URL` in `e2e/.env` matches dev server port

### Browser doesn't launch

- Reinstall browsers: `bunx playwright install chromium`
- Check Playwright version: `bunx playwright --version`

### TypeScript errors in E2E code

- Check `e2e/tsconfig.e2e.json` is correctly configured
- Ensure `tsx` is installed: `bun add -d tsx`

### Steps show as "undefined"

- Check step definition files are in `e2e/step-definitions/`
- Check files have `.ts` extension
- Check Cucumber config includes `e2e/step-definitions/**/*.ts`
