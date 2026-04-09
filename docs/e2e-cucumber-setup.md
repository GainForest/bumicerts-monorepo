# E2E Testing Blueprint (Gherkin + Cucumber.js + Playwright)

This is a copy-first guide for setting up end-to-end tests in a new repo.

Stack:

- Gherkin feature files for behavior specs
- Cucumber.js as the test runner
- Playwright for browser automation
- TypeScript for step definitions and support utilities

The goal is to make this easy for another agent to scaffold with minimal decisions.

## How the pieces work together

- `e2e/features/*.feature` describes user behavior in plain language.
- Cucumber reads each scenario step and matches it to a TypeScript step definition.
- Step definitions use Playwright (`page.goto`, `fill`, `click`, `expect`) to drive and verify real UI behavior.
- `e2e/support/world.ts` holds per-scenario state; `hooks.ts` manages browser lifecycle; `env.ts` supplies config; `flows.ts` provides reusable multi-step actions.

Execution chain:

1. `bun test:e2e` runs `cucumber-js` with `e2e/cucumber.mjs`.
2. Cucumber loads `e2e/step-definitions/**/*.ts` and `e2e/support/**/*.ts`.
3. Hooks create browser context/page.
4. Steps run and call Playwright.
5. Results are formatted to console + `reports/e2e.html`, with failure screenshots in `reports/screenshots/`.

## Minimal copyable example

### Example feature (`e2e/features/login.feature`)

```gherkin
Feature: Login

  Scenario: User signs in with email and code
    Given the application is reachable
    When the user signs in with a valid email
    Then the user sees the authenticated home page
```

### Example step definitions (`e2e/step-definitions/auth.steps.ts`)

```ts
import { Given, Then, When } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import type { AppWorld } from '../support/world.js'
import { getPage } from '../support/utils.js'

Given('the application is reachable', async function (this: AppWorld) {
  const res = await fetch(`${this.env.appUrl}/health`)
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`)
})

When('the user signs in with a valid email', async function (this: AppWorld) {
  const page = getPage(this)
  await page.goto(this.env.appUrl)
  await page.fill('[name=email]', `test-${Date.now()}@example.com`)
  await page.click('button[type=submit]')
})

Then(
  'the user sees the authenticated home page',
  async function (this: AppWorld) {
    const page = getPage(this)
    await expect(page).toHaveURL(/dashboard|home|welcome/)
    await expect(page.getByRole('heading')).toContainText(/welcome|dashboard/i)
  },
)
```

### Example Playwright lifecycle wiring (`e2e/support/hooks.ts`)

```ts
import { BeforeAll, AfterAll, Before, After } from '@cucumber/cucumber'
import { chromium, type Browser } from '@playwright/test'
import type { AppWorld } from './world.js'

let sharedBrowser: Browser

BeforeAll(async () => {
  sharedBrowser = await chromium.launch({ headless: true })
})

Before(async function (this: AppWorld) {
  this.context = await sharedBrowser.newContext()
  this.page = await this.context.newPage()
})

After(async function (this: AppWorld) {
  await this.context?.close()
})

AfterAll(async () => {
  await sharedBrowser.close()
})
```

This example is intentionally minimal. Add OTP/email retrieval, consent flows, API assertions, and richer world state only as your product requires.

## 1) Canonical file layout

Use this as the default structure:

```text
e2e/
  .env
  .env.example
  cucumber.mjs
  tsconfig.e2e.json
  features/
    login.feature
    account-settings.feature
  step-definitions/
    common.steps.ts
    auth.steps.ts
    account-settings.steps.ts
  support/
    env.ts
    world.ts
    hooks.ts
    utils.ts
    flows.ts
    mail.ts
reports/
  e2e.html
  screenshots/
```

Conventions:

- Keep all E2E assets under `e2e/`.
- Keep feature files under `e2e/features/`.
- Keep step files thin; put reusable flow logic in `e2e/support/flows.ts`.

## 2) Runner wiring (package scripts)

Add scripts like:

```json
{
  "scripts": {
    "test:e2e": "TSX_TSCONFIG_PATH=e2e/tsconfig.e2e.json node --import tsx/esm ./node_modules/@cucumber/cucumber/bin/cucumber-js --config e2e/cucumber.mjs",
    "test:e2e:headless": "E2E_HEADLESS=true TSX_TSCONFIG_PATH=e2e/tsconfig.e2e.json node --import tsx/esm ./node_modules/@cucumber/cucumber/bin/cucumber-js --config e2e/cucumber.mjs"
  }
}
```

Why:

- `tsx` lets Cucumber import TypeScript directly (no prebuild step).
- `TSX_TSCONFIG_PATH` ensures E2E code uses its dedicated tsconfig.
- `--config` keeps suite behavior centralized.

## 3) Cucumber config skeleton

Create `e2e/cucumber.mjs`:

```js
export default {
  paths: ['e2e/features/**/*.feature'],
  import: ['e2e/step-definitions/**/*.ts', 'e2e/support/**/*.ts'],
  format: ['pretty', 'html:reports/e2e.html'],
  tags: 'not @manual and not @docker-only and not @pending',
  strict: true,
}
```

Notes:

- `paths` selects feature files.
- `import` loads both step definitions and support runtime.
- HTML output is written to `reports/e2e.html`.
- `strict: true` catches undefined/pending steps unless excluded by tags.

## 4) TypeScript config skeleton

Create `e2e/tsconfig.e2e.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "Node16",
    "moduleResolution": "Node16",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "../.e2e-dist",
    "rootDir": "..",
    "types": ["node"]
  },
  "include": ["support/**/*.ts", "step-definitions/**/*.ts"]
}
```

## 5) Environment contract (generic)

Use `e2e/.env.example` as a template, then copy to `e2e/.env`.

Example:

```dotenv
# Required: main application entrypoint under test
E2E_APP_URL=http://localhost:3000

# Optional: split services if your platform has them
E2E_AUTH_URL=http://localhost:3001
E2E_API_URL=http://localhost:3002

# Optional: email/OTP test inbox service
E2E_MAIL_URL=http://localhost:8025
E2E_MAIL_USER=
E2E_MAIL_PASS=

# Optional runner behavior
E2E_HEADLESS=false
```

In `e2e/support/env.ts`:

- load dotenv from `e2e/.env`
- validate required values with a `required(name)` helper
- export a typed `testEnv` object consumed by all steps/support modules

Design rule: do not hardcode URLs in step files; always read from `testEnv`.

## 6) Custom world state

Create `e2e/support/world.ts` with a custom world class that stores per-scenario state, for example:

- browser/context/page references
- generated test identity values (email, username, etc.)
- fetched OTP or token values
- latest HTTP response status/body for API assertions
- optional guard helpers that return `'pending'` when optional dependencies are not configured

This keeps steps composable and avoids brittle globals.

## 7) Hooks and lifecycle

Create `e2e/support/hooks.ts` with:

- `BeforeAll`: create report directories, launch shared Playwright browser
- `Before`: create a fresh context/page per scenario
- `After`: on failure, capture screenshot; always clean up contexts
- `AfterAll`: close shared browser

Recommended defaults:

- set a suite-wide step timeout (for remote cold starts)
- set page navigation/assertion timeouts explicitly
- keep one browser, many isolated contexts (fast + clean state)

## 8) Support modules and responsibilities

Keep modules focused:

- `e2e/support/utils.ts`: tiny helpers (`getPage`, context reset, URL/assert helpers)
- `e2e/support/flows.ts`: reusable browser flows (sign in, registration, consent approval)
- `e2e/support/mail.ts`: optional inbox polling/cleanup/OTP extraction for email-based flows

If your app has no email/OTP path, skip the mail module entirely.

## 9) Step definition design

Organize step files by behavior area, not by technical layer.

Example:

- `common.steps.ts` for universal actions and health checks
- `auth.steps.ts` for login/verification/consent flows
- `account-settings.steps.ts` for profile/security/account actions

Guidelines:

- bind natural Gherkin phrases to minimal orchestration code
- call support flows for multi-step interactions
- store data in world, never in module-level mutable state
- use resilient selectors (`getByRole`, stable IDs)

## 10) Tags and pending strategy

Use tags to control subsets:

- `@manual` for non-automated scenarios
- `@docker-only` (or equivalent infra-scoped tag)
- `@pending` for temporarily excluded work

Default run filter usually excludes these.

For optional infrastructure (mail inbox service, internal secrets, third-party sandbox), return `'pending'` from relevant guarded steps instead of hard-failing the whole suite.

## 11) Reports and debugging artifacts

Always produce:

- Cucumber HTML report at `reports/e2e.html`
- failure screenshots at `reports/screenshots/<scenario-name>.png`

In CI, always upload `reports/` as artifacts, even when tests fail.

## 12) CI workflow pattern (generic)

Use a CI workflow that follows this sequence:

1. Checkout and install dependencies.
2. Install Playwright browser + system deps.
3. Resolve test target URLs from CI context (deployment event, env vars, or manual input).
4. Wait for service readiness (retrying health checks with timeout).
5. Run `bun test:e2e:headless` with E2E env vars injected.
6. Upload `reports/` artifacts regardless of pass/fail.

### Trigger strategy

Common options:

- run on successful preview deployment events
- allow manual re-run (`workflow_dispatch`) for e2e-only changes

### Readiness gate strategy

- poll each required endpoint (app, auth/api, inbox service if used)
- fail fast with a clear error if endpoints never become healthy

### Secrets strategy

- store credentials in CI secrets
- pass non-sensitive URLs as normal env/output values

### Artifact strategy

- upload full `reports/` folder
- use short retention for PR runs

## 13) Reference: current CI implementation in this repo

See `.github/workflows/e2e-pr.yml` for a concrete implementation of the generic pattern above:

- dual trigger (`deployment_status` + `workflow_dispatch`)
- derived service URLs from deployment context
- readiness checks before test execution
- headless E2E run with injected env vars
- artifact upload of `reports/`

Use it as a template for structure, but adapt URL derivation and env names to your platform.

## 14) Bootstrap checklist for another repo

- add dependencies: `@cucumber/cucumber`, `@playwright/test`, `tsx`, `dotenv`
- add `e2e/` structure and config files
- add `support/env.ts`, `support/world.ts`, `support/hooks.ts`, `support/utils.ts`
- add first feature under `e2e/features/` (happy-path login is best)
- add minimal step files (`common.steps.ts`, `auth.steps.ts`)
- add optional mail module if OTP/email is part of auth
- wire CI using the generic sequence in section 12
- confirm artifacts are produced and uploaded

If an agent follows this checklist in order, it should get a first green E2E scenario quickly, then expand feature coverage incrementally.
