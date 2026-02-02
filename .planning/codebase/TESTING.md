# Testing Patterns

**Analysis Date:** 2026-01-18

## Test Framework

**Runner:**
- Playwright (for E2E tests)
- Version: 1.56.0 (per `test-results/results.json`)
- Config: `playwright.config.ts` (referenced but not in current repo location)

**Assertion Library:**
- Playwright built-in assertions for E2E
- No unit test framework configured (Jest/Vitest not installed)

**CRITICAL GAP:** No unit test framework is configured. Only E2E testing infrastructure exists.

**Run Commands:**
```bash
# E2E Tests (Playwright)
npx playwright test                    # Run all tests
npx playwright test --ui               # Interactive UI mode
npx playwright test --project="Desktop Chrome"  # Specific browser

# No unit test command - NOT CONFIGURED
# pnpm test                            # DOES NOT EXIST in package.json
```

## Test File Organization

**Location:**
- E2E tests: `tests/e2e/` (configured, may be in different location)
- Unit tests: **NOT PRESENT** - no test files in `app/`, `lib/`, `components/`

**Naming:**
- E2E pattern: `**/*.@(spec|test).?(c|m)[jt]s?(x)`
- No unit test files found in source directories

**Structure (from Playwright config):**
```
tests/
├── e2e/              # E2E test specs
├── global-setup.ts   # Browser setup
└── global-teardown.ts
test-results/
├── results.json      # Test results
├── junit.xml         # CI/CD reporting
└── .last-run.json    # Last run state
```

## E2E Test Structure (Playwright)

**Suite Organization (from config):**
```typescript
// playwright.config.ts structure
{
  projects: [
    { name: 'Desktop Chrome', testDir: 'tests/e2e' },
    { name: 'Mobile - iPhone 12 (Teachers)', testDir: 'tests/e2e' },
    { name: 'Mobile - Galaxy S9+ (Android)', testDir: 'tests/e2e' },
    { name: 'Tablet - iPad (Portrait)', testDir: 'tests/e2e' },
    { name: 'Tablet - iPad (Landscape)', testDir: 'tests/e2e' },
    { name: 'Custom Educational Tablet', testDir: 'tests/e2e' }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000
  }
}
```

**Global Setup:**
```typescript
// tests/global-setup.ts (structure from error)
const browser = await chromium.launch()
const context = await browser.newContext({
  locale: 'pt-BR',
  // Brazilian Portuguese locale for educational context
})
```

## Mocking

**Framework:** Not configured for unit tests

**E2E Approach:**
- Uses real dev server (`npm run dev`)
- Real Supabase connection (dev environment)
- No mocking layer observed

**What Should be Mocked (if unit tests added):**
- Supabase client (`@/lib/supabase`)
- Logger (`@/lib/logger`)
- External APIs (fetch calls)
- Browser APIs (localStorage, navigator)

**What NOT to Mock:**
- Validation logic (`lib/validation/`)
- Pure utility functions (`lib/utils.ts`)
- Zod schemas

## Fixtures and Factories

**Test Data:**
- Seed scripts exist: `scripts/seed-dev.ts`, `scripts/seed-superadmin.ts`
- Run via: `pnpm seed:dev`, `pnpm seed:clear`, `pnpm seed:superadmin`

**No formal test fixtures or factories configured.**

**Recommended Pattern (if implementing):**
```typescript
// tests/fixtures/students.ts
export const createMockStudent = (overrides = {}) => ({
  id: 'test-uuid',
  nome_completo: 'João Silva',
  data_nascimento: '2015-03-15',
  sexo: 'M',
  cpf: '123.456.789-00',
  ativo: true,
  ...overrides
})
```

**Location (recommended):**
- `tests/fixtures/` - Test data factories
- `tests/mocks/` - Service mocks

## Coverage

**Requirements:** None enforced

**View Coverage:** Not configured

**Recommended Setup:**
```bash
# If Jest/Vitest added:
pnpm test --coverage
```

## Test Types

**Unit Tests:**
- **NOT IMPLEMENTED**
- Should cover: Validation functions, utility helpers, Zod schemas, store logic

**Integration Tests:**
- **NOT IMPLEMENTED**
- Should cover: API routes, Supabase queries, authentication flow

**E2E Tests:**
- Playwright configured with multiple device viewports
- Focus on educational workflows
- Brazilian locale support (`pt-BR`)

**Visual Regression:**
- Not configured
- Playwright screenshots capability available

## Device Testing Matrix (Playwright)

From configuration:
| Project | Description |
|---------|-------------|
| Desktop Chrome | Primary desktop testing |
| Mobile - iPhone 12 | Teacher mobile workflow |
| Mobile - Galaxy S9+ | Android student access |
| Tablet - iPad (Portrait) | Tablet portrait mode |
| Tablet - iPad (Landscape) | Tablet landscape mode |
| Custom Educational Tablet | Specialized educational device |

## Common Patterns

**Async Testing:**
```typescript
// Using async/await in components
useEffect(() => {
  const loadData = async () => {
    try {
      setLoading(true)
      const data = await fetchData()
      setData(data)
    } catch (error) {
      setError(error)
    } finally {
      setLoading(false)
    }
  }
  loadData()
}, [])
```

**Error Testing (should implement):**
```typescript
// Pattern for testing error scenarios
describe('validateCPF', () => {
  it('should reject invalid CPF', () => {
    expect(validateCPF('111.111.111-11')).toBe(false)
  })

  it('should accept valid CPF', () => {
    expect(validateCPF('123.456.789-09')).toBe(true)
  })
})
```

**Brazilian Compliance Testing (recommended):**
```typescript
describe('Attendance Locking', () => {
  it('should lock attendance after 18:00 São Paulo time', () => {
    // Mock time to 18:01 São Paulo
    // Attempt to mark attendance
    // Expect error
  })
})
```

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
  "errors": [
    // Playwright browser not installed error
    // "npx playwright install" needed
  ]
}
```

**Status:** E2E tests configured but not running due to missing browser installation.

## Recommended Testing Strategy

**Priority 1 - Unit Tests:**
1. Add Vitest as test runner
2. Test validation functions (`lib/validation/brazilian.ts`)
3. Test Zustand stores (`lib/stores/`)
4. Test utility functions

**Priority 2 - Integration Tests:**
1. Test API routes with mocked Supabase
2. Test authentication flow
3. Test data transformations

**Priority 3 - E2E Tests:**
1. Install Playwright browsers (`npx playwright install`)
2. Test critical user flows:
   - Login/logout
   - Student creation
   - Attendance marking
   - Report generation

## Setup Instructions

**To Enable E2E Testing:**
```bash
cd gestao_fronteira
npx playwright install
npx playwright test
```

**To Add Unit Testing (recommended):**
```bash
# Install Vitest
pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom

# Create vitest.config.ts
# Add test script to package.json
# "test": "vitest",
# "test:coverage": "vitest run --coverage"
```

**Recommended Vitest Config:**
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

## Test Coverage Gaps

**Critical areas without tests:**
1. `lib/validation/brazilian.ts` - CPF, phone, CEP validation
2. `lib/validation/attendance.ts` - Attendance rules
3. `lib/services/attendance-immutability.ts` - Locking logic
4. `lib/stores/attendance-session-store.ts` - State transitions
5. API routes in `app/api/` - All endpoints
6. Zod schemas - All validation schemas

**Components needing visual/E2E tests:**
1. `components/attendance/AttendanceGrid.tsx` - Core workflow
2. `components/auth/enhanced-login-form.tsx` - Authentication
3. Dashboard components - Role-based access

---

*Testing analysis: 2026-01-18*
