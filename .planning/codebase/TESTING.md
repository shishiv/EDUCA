# Testing Patterns

**Analysis Date:** 2026-01-16

## Test Framework

**Runner:**
- Playwright (E2E testing)
- Config referenced in `test-results/results.json`
- No unit test framework currently configured in package.json

**E2E Configuration:**
- Config file: `playwright.config.ts` (referenced, not found in current directory)
- Test directory: `tests/e2e/`
- Global setup: `tests/global-setup.ts`
- Global teardown: `tests/global-teardown.ts`

**Run Commands:**
```bash
# No test scripts in package.json
# Playwright would typically be run with:
npx playwright test          # Run all tests
npx playwright test --ui     # Interactive UI mode
npx playwright test --debug  # Debug mode
```

## Test File Organization

**Location:**
- E2E tests: `tests/e2e/` (separate from source)
- Unit tests: Not configured

**Naming:**
- Pattern: `**/*.@(spec|test).?(c|m)[jt]s?(x)`
- Example: `attendance.spec.ts`, `login.test.ts`

**Directory Structure (Playwright):**
```
tests/
├── e2e/                    # E2E test specs
├── global-setup.ts         # Setup before all tests
├── global-teardown.ts      # Cleanup after all tests
└── screenshots/            # Visual regression captures
test-results/
├── results.json            # JSON test results
├── junit.xml               # JUnit format results
└── .last-run.json          # Last run metadata
```

## Test Configuration

**Playwright Projects (from results.json):**
```javascript
[
  { name: 'Desktop Chrome', timeout: 30000 },
  { name: 'Mobile - iPhone 12 (Teachers)', timeout: 30000 },
  { name: 'Mobile - Galaxy S9+ (Android)', timeout: 30000 },
  { name: 'Tablet - iPad (Portrait)', timeout: 30000 },
  { name: 'Tablet - iPad (Landscape)', timeout: 30000 },
  { name: 'Custom Educational Tablet', timeout: 30000 }
]
```

**Global Settings:**
- `fullyParallel: true` - Tests run in parallel
- `workers: 2` - Two worker processes
- `reuseExistingServer: true` - Uses running dev server
- Brazilian Portuguese locale (`pt-BR`)

**Reporters:**
```javascript
reporter: [
  ['html', null],
  ['json', { outputFile: 'test-results/results.json' }],
  ['junit', { outputFile: 'test-results/junit.xml' }]
]
```

**Web Server Config:**
```javascript
webServer: {
  command: 'npm run dev',
  url: 'http://localhost:3000',
  reuseExistingServer: true,
  timeout: 120000
}
```

## Test Structure

**Suite Organization (Playwright pattern):**
```typescript
import { test, expect } from '@playwright/test'

test.describe('Attendance Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to attendance page
    await page.goto('/dashboard/frequencia')
  })

  test('should mark student as present', async ({ page }) => {
    // Test implementation
  })

  test('should show lock after 18:00', async ({ page }) => {
    // Test implementation
  })
})
```

**Patterns:**
- Setup: `test.beforeEach` for page navigation and state
- Assertions: Playwright's `expect()` API
- Async/await throughout
- Brazilian Portuguese locale for date/time formatting

## Mocking

**Framework:** Not configured (no Jest/Vitest mock utilities)

**Patterns for E2E:**
- Use Playwright route interception for API mocking
- Real Supabase database for E2E tests (test environment)

```typescript
// API route interception pattern
await page.route('/api/frequencia/marcar', async route => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: { ... } })
  })
})
```

**What to Mock (E2E):**
- External API calls
- Time-sensitive operations (18:00 lock)
- Network failures

**What NOT to Mock (E2E):**
- UI interactions
- Navigation flows
- Real database operations

## Fixtures and Factories

**Test Data:**
- Seed scripts in `scripts/`:
  - `seed-dev.ts` - Development seed data
  - `seed-superadmin.ts` - Create superadmin user

```bash
pnpm seed:dev          # Seed development data
pnpm seed:clear        # Clear seed data
pnpm seed:superadmin   # Create superadmin
```

**Location:**
- `lib/seed-data.ts` - Seed data definitions
- `scripts/` - Seed execution scripts

## Coverage

**Requirements:** Not enforced (no coverage configuration)

**View Coverage:** Not configured

**Recommendation:** Add Vitest or Jest for unit tests with coverage reporting

## Test Types

**Unit Tests:**
- Not currently configured
- Recommended: Vitest for component and utility testing
- Should cover: validation functions, hooks, utility functions

**Integration Tests:**
- Not currently configured
- Recommended: Testing Library + Vitest for React component integration

**E2E Tests:**
- Playwright configured
- Tests full user flows
- Multi-device testing (desktop, mobile, tablet)
- Browser setup issue in results (needs `npx playwright install`)

## Current Test Status

**From `test-results/results.json`:**
```json
{
  "stats": {
    "expected": 0,
    "skipped": 0,
    "unexpected": 0,
    "flaky": 0
  },
  "errors": ["browserType.launch: Executable doesn't exist..."]
}
```

**Issue:** Playwright browsers not installed
**Fix:**
```bash
npx playwright install
```

## Recommended Testing Setup

**Add to package.json:**
```json
{
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.0.0"
  },
  "scripts": {
    "test": "vitest",
    "test:e2e": "playwright test",
    "test:coverage": "vitest --coverage"
  }
}
```

## Common Patterns

**Async Testing (Playwright):**
```typescript
test('should load students', async ({ page }) => {
  await page.goto('/dashboard/frequencia')

  // Wait for data to load
  await expect(page.getByRole('heading', { name: /Chamada/ })).toBeVisible()

  // Wait for specific element
  await page.waitForSelector('[data-testid="student-list"]')

  // Assert content
  const students = await page.locator('[data-testid="student-row"]').count()
  expect(students).toBeGreaterThan(0)
})
```

**Error Testing (Playwright):**
```typescript
test('should show error on failed save', async ({ page }) => {
  // Mock API failure
  await page.route('/api/frequencia/marcar', async route => {
    await route.fulfill({ status: 500 })
  })

  await page.click('[data-testid="save-attendance"]')

  // Expect error toast
  await expect(page.getByText('Erro ao marcar frequencia')).toBeVisible()
})
```

**Brazilian Compliance Testing:**
```typescript
test('should lock attendance after 18:00 Sao Paulo time', async ({ page }) => {
  // Mock time to 18:01
  await page.evaluate(() => {
    const mockDate = new Date('2026-01-16T21:01:00Z') // 18:01 Sao Paulo
    // ... mock Date implementation
  })

  await page.goto('/dashboard/frequencia')

  // Expect lock indicator
  await expect(page.getByText('Frequencia Bloqueada')).toBeVisible()
  await expect(page.getByRole('button', { name: /Marcar/ })).toBeDisabled()
})
```

## Mobile Testing

**Device Profiles (from Playwright config):**
- iPhone 12 (Teachers) - Primary mobile device
- Galaxy S9+ (Android) - Android coverage
- iPad Portrait/Landscape - Tablet coverage
- Custom Educational Tablet - Specialized device

**Touch Targets:**
- Minimum 44px touch targets (documented in components)
- Test touch interactions with `page.tap()`

```typescript
test('touch-optimized attendance marking', async ({ page }) => {
  // Mobile viewport
  await page.setViewportSize({ width: 375, height: 812 })

  await page.tap('[data-testid="attendance-cell-student-1"]')

  // Verify status changed
  await expect(page.locator('[data-testid="attendance-cell-student-1"]'))
    .toHaveAttribute('data-status', 'presente')
})
```

## Screenshots

**Directory:** `tests/screenshots/` (needs to be created before tests)

**Capture Pattern:**
```typescript
test('visual regression - attendance grid', async ({ page }) => {
  await page.goto('/dashboard/frequencia')
  await page.waitForLoadState('networkidle')

  await expect(page).toHaveScreenshot('attendance-grid.png')
})
```

**Pre-test Setup:**
```bash
mkdir -p tests/screenshots  # Required before running visual tests
```

## Test Gap Analysis

**Currently Tested:**
- E2E flows (Playwright configured but browsers not installed)

**Missing Coverage:**
- Unit tests for validation functions (`lib/validation/*.ts`)
- Unit tests for hooks (`hooks/*.ts`)
- Unit tests for utility functions (`lib/utils.ts`, `lib/date-utils.ts`)
- Component tests for UI components
- Integration tests for API routes

**Priority Testing Areas:**
1. Brazilian validation functions (CPF, phone, CEP, INEP)
2. Attendance locking logic (18:00 rule)
3. Session state machine (PLANEJADA -> ABERTA -> FECHADA)
4. Error handling flows
5. Real-time synchronization

---

*Testing analysis: 2026-01-16*
