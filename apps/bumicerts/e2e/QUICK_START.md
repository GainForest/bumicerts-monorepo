# E2E Tests - Quick Start

**5-minute guide to running E2E tests without issues.**

---

## Step 1: Start Dev Server (Terminal 1)

```bash
cd apps/bumicerts
bun dev
```

**Wait for**: `Ready on http://localhost:3001`

**Verify**: Open http://localhost:3001 in your browser - you should see the homepage.

---

## Step 2: Run Tests (Terminal 2)

```bash
cd apps/bumicerts

# Run all tests
bun run test:e2e

# OR run specific feature
bun run test:e2e e2e/features/upload-org.feature

# OR run specific scenario
bun run test:e2e --name "edit and save"

# OR run smoke tests only
bun run test:e2e --tags "@smoke"
```

---

## ⚠️ Common Mistake

**Problem**: Browser opens/closes repeatedly, can't stop it

**Cause**: You ran tests WITHOUT starting the dev server first

**Fix**:
1. Press `Ctrl+C` to stop tests
2. Run `bun dev` in Terminal 1
3. Wait for dev server to be ready
4. Then run tests in Terminal 2

---

## That's It!

For more details, see `TESTING_GUIDE.md`

For test status/coverage, see `TEST_STATUS.md`
