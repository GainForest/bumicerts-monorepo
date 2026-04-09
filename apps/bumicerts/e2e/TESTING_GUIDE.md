# E2E Testing Guide

Complete guide for running E2E tests individually or as a suite.

---

## Prerequisites

### ⚠️ CRITICAL: Dev Server Must Be Running

**Before running ANY tests**, you MUST start the dev server in a separate terminal:

```bash
# Terminal 1 - Start dev server (keep this running)
cd apps/bumicerts
bun dev
```

**Verify it's running**:
- Open `http://localhost:3001` in your browser
- You should see the Bumicerts homepage

**If you don't start the dev server first:**
- Tests will fail or hang
- Browser may open/close repeatedly
- You'll see connection errors

---

### Environment Variables

Ensure `e2e/.env` exists with test credentials:
```bash
cd apps/bumicerts/e2e
cp .env.example .env
# Edit .env with your test account credentials
```

---

### Running Tests (Terminal 2)

**Only after dev server is running**, run tests in a separate terminal:

```bash
# Terminal 2 - Run tests
cd apps/bumicerts
bun run test:e2e
```

---

## Quick Reference

### Run ALL Tests
```bash
cd apps/bumicerts
bun run test:e2e
```

### Run Tests by Feature File
```bash
# Bumicert creation tests (4 scenarios)
bun run test:e2e e2e/features/bumicert-create.feature

# Upload/organization tests (4 scenarios)
bun run test:e2e e2e/features/upload-org.feature

# Explore page tests (3 scenarios)
bun run test:e2e e2e/features/explore.feature
```

### Run Specific Scenario by Name
```bash
# Run only scenarios matching "full flow"
bun run test:e2e --name "full flow"

# Run only scenarios matching "edit"
bun run test:e2e --name "edit"

# Run a specific scenario from a specific file
bun run test:e2e e2e/features/bumicert-create.feature --name "save and resume"
```

### Run Tests by Tag
```bash
# Run only @smoke tests (critical happy paths)
bun run test:e2e --tags "@smoke"

# Run only @auth tests
bun run test:e2e --tags "@auth"

# Run tests WITHOUT @auth tag
bun run test:e2e --tags "not @auth"

# Run @smoke AND @auth tests
bun run test:e2e --tags "@smoke and @auth"
```

### Run with Visible Browser (for debugging)
```bash
# Default is headless, use this to see the browser
E2E_HEADLESS=false bun run test:e2e

# Or for a specific test
E2E_HEADLESS=false bun run test:e2e --name "full flow"
```

---

## Authentication State Management

### How It Works

1. **First run with `@auth` tag**:
   - System checks if `e2e/.auth/user.json` exists
   - If **NOT found**: Runs full OAuth flow, saves state to file (~30 seconds)
   - If **found**: Loads saved state instantly (<1 second)

2. **Subsequent runs with `@auth` tag**:
   - Always loads from `e2e/.auth/user.json`
   - **No login needed** - instant authentication!

3. **Tests without `@auth` tag**:
   - Always start with fresh unauthenticated context
   - Useful for testing login flows, public pages, etc.

### Force Fresh Authentication

If you need to re-authenticate (e.g., credentials changed, auth state expired):

```bash
# Delete the saved auth state
rm apps/bumicerts/e2e/.auth/user.json

# Next @auth test will perform OAuth again
bun run test:e2e --tags "@auth"
```

### Auth State Location
- **File**: `apps/bumicerts/e2e/.auth/user.json`
- **Gitignored**: Yes (see `e2e/.gitignore`)
- **Contains**: Cookies, localStorage, sessionStorage for authenticated session

---

## Available Test Scenarios

### Bumicert Creation (`bumicert-create.feature`)

| Scenario | Tags | Description |
|----------|------|-------------|
| User can start a new bumicert | `@auth` | Tests navigation to creation wizard |
| User can navigate between steps | `@auth` | Tests step navigation (forward/back) |
| User can save and resume a draft | `@auth` | Tests draft persistence |
| **User can create and publish a bumicert (full flow)** | `@auth @smoke` | **Complete end-to-end flow** |

**Full Flow Steps**:
1. Upload cover image
2. Enter title, mark as ongoing, select work type
3. Continue to Step 2
4. Enter impact story and short description
5. Continue to Step 3
6. Add contributor (self), create/select site, check permissions & T&C
7. Continue to Step 4 (Review)
8. Continue to Step 5 (Publish)
9. Click "Publish Bumicert"
10. Verify success message

### Upload/Organization Tests (`upload-org.feature`)

| Scenario | Tags | Description |
|----------|------|-------------|
| User can view upload dashboard | `@auth` | Basic navigation test |
| User can enter edit mode | `@auth` | Edit mode activation |
| User can cancel edits | `@auth` | Cancel without saving |
| **User can edit and save organization** | `@auth @smoke` | **Complete edit flow** |

### Explore Page Tests (`explore.feature`)

| Scenario | Tags | Description |
|----------|------|-------------|
| User can view explore page | (none) | Public page test |
| User can see featured bumicerts | (none) | Content rendering |
| User can navigate to bumicert details | (none) | Navigation test |

---

## Test Development Tips

### Running During Development

When developing a new test, run only that test to save time:

```bash
# While writing "User can do X" scenario
E2E_HEADLESS=false bun run test:e2e --name "can do X"
```

### Debugging Failed Tests

1. **Check screenshots**:
   ```bash
   open reports/screenshots/
   ```
   Failed tests automatically save screenshots

2. **Run with visible browser**:
   ```bash
   E2E_HEADLESS=false bun run test:e2e --name "failing test"
   ```

3. **Check console logs**:
   - Each step logs its progress (e.g., `✅ Checked permissions checkbox`)
   - Look for the last successful log before failure

4. **View HTML report**:
   ```bash
   open reports/e2e.html
   ```

### Adding New Tests

1. **Tag appropriately**:
   - Use `@auth` if test requires logged-in user
   - Use `@smoke` for critical happy path tests
   - Use feature-specific tags as needed

2. **Reuse auth state**:
   - Any test with `@auth` tag automatically gets authenticated session
   - No need to write login steps!

3. **Use `.first()` for duplicate elements**:
   - Many elements appear twice (mobile + desktop views)
   - Always use `.first()` or `.last()` to avoid strict mode violations

---

## Common Commands Cheat Sheet

```bash
# All tests
bun run test:e2e

# Single feature
bun run test:e2e e2e/features/bumicert-create.feature

# By name match
bun run test:e2e --name "publish"

# By tag
bun run test:e2e --tags "@smoke"

# Visible browser
E2E_HEADLESS=false bun run test:e2e

# Fresh auth
rm e2e/.auth/user.json && bun run test:e2e --tags "@auth"

# Specific test with visible browser
E2E_HEADLESS=false bun run test:e2e e2e/features/bumicert-create.feature --name "full flow"
```

---

## Troubleshooting

### ⚠️ Browser opens/closes repeatedly (MOST COMMON ISSUE)

**Symptoms**:
- Browser window opens and immediately closes
- This happens 10-20 times in a row
- Can't stop it by clicking
- Tests never actually run

**Root Cause**: Dev server is NOT running on port 3001

**Solution**:
1. **Kill the test process**:
   ```bash
   # Press Ctrl+C in the test terminal
   # If that doesn't work, kill Node/Bun processes:
   pkill -f "cucumber-js"
   pkill -f "bun"
   ```

2. **Start the dev server FIRST**:
   ```bash
   cd apps/bumicerts
   bun dev
   # Wait for "Ready on http://localhost:3001"
   ```

3. **Then run tests** (in a NEW terminal):
   ```bash
   cd apps/bumicerts
   bun run test:e2e
   ```

**Prevention**: Always verify `http://localhost:3001` loads in your browser before running tests!

---

### Test times out waiting for element

**Cause**: Selector not finding element (wrong selector or element not rendered yet)

**Solution**:
1. Run with visible browser to see actual page
2. Check if you need `.first()` or `.last()` for duplicate elements
3. Add explicit waits for dynamic content

---

### Auth state expired/invalid

**Symptoms**: `@auth` tests fail with authentication errors

**Solution**:
```bash
rm apps/bumicerts/e2e/.auth/user.json
bun run test:e2e --tags "@auth"
```

---

### Tests hang after starting

**Symptoms**:
- Test command runs but nothing happens
- No browser opens
- Process hangs indefinitely

**Possible Causes**:
1. TypeScript compilation failing
2. Missing `.e2e-dist` output folder
3. Corrupt auth state file

**Solution**:
```bash
# 1. Clean and recompile
rm -rf e2e/.e2e-dist
npx tsc --project e2e/tsconfig.e2e.json

# 2. Remove auth state (will re-authenticate)
rm e2e/.auth/user.json

# 3. Try again
bun run test:e2e
```

---

### Port 3001 already in use

**Symptoms**: `bun dev` fails with "port already in use"

**Solution**:
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Restart dev server
bun dev
```

---

### Can't stop running tests

**Symptoms**: Pressed Ctrl+C but tests keep running

**Solution**:
```bash
# Nuclear option - kill all related processes
pkill -f "cucumber-js"
pkill -f "playwright"
pkill -f "chromium"
pkill -f "bun.*test"
```

---

## CI/CD Integration

Tests are designed to run in CI with:
- Headless mode by default
- Auth state reuse for speed
- Screenshot capture on failure
- HTML reports for debugging

Example CI command:
```bash
E2E_HEADLESS=true bun run test:e2e --tags "@smoke"
```
