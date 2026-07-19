# EDUCA - Test Suite Documentation

Complete guide for running and maintaining tests in the EDUCA Gestão de Fronteira system.

---

## Table of Contents
1. [Quick Start](#quick-start)
2. [Test Architecture](#test-architecture)
3. [Running Tests](#running-tests)
4. [Test Types](#test-types)
5. [Fixtures & Test Data](#fixtures--test-data)
6. [Environment Variables](#environment-variables)
7. [Writing New Tests](#writing-new-tests)
8. [Troubleshooting](#troubleshooting)
9. [CI/CD Integration](#cicd-integration)

---

## Quick Start

### Prerequisites
- Node.js 22+ (project uses v22.22.0)
- pnpm package manager
- Supabase project (dev or test instance)

### Installation
```bash
# Install dependencies (REQUIRED - tests cannot run without this)
pnpm install

# Verify installation
pnpm playwright --version  # Should show v1.51.1
pnpm vitest --version      # Should show v4.0.17
```

### First Run
```bash
# 1. Setup environment
cp .env.example .env.local
# Edit .env.local with test database credentials

# 2. Seed test database
pnpm seed:dev

# 3. Run unit tests
pnpm test

# 4. Run E2E tests (starts dev server automatically)
pnpm test:e2e
```

---

## Test Architecture

### Directory Structure
```
tests/
├── e2e/                          # End-to-end tests (Playwright)
│   ├── auth/                     # Authentication tests
│   │   └── login.spec.ts         # Login flow tests
│   ├── forms/                    # CRUD form tests
│   │   ├── aluno.spec.ts         # Student management
│   │   ├── escola.spec.ts        # School management
│   │   ├── matricula.spec.ts     # Enrollment management
│   │   ├── responsavel.spec.ts   # Guardian management
│   │   ├── turma.spec.ts         # Class management
│   │   └── usuario.spec.ts       # User management
│   ├── flows/                    # Complex workflows
│   │   └── chamada.spec.ts       # Attendance workflow
│   ├── utils/                    # Test utilities
│   │   └── test-helpers.ts       # Reusable helpers
│   └── auth.setup.ts             # Authentication setup
├── unit/                         # Unit tests (Vitest)
│   └── services/                 # Service layer tests
│       ├── attendance-locking.test.ts
│       └── attendance-workflow.test.ts
├── vitest.setup.ts               # Vitest configuration
├── TEST_COVERAGE_REPORT.md       # Coverage analysis
└── README.md                     # This file
```

### Test Frameworks

#### Playwright (E2E)
- **Purpose:** Full browser testing of user workflows
- **Browser:** Chromium (Desktop Chrome)
- **Execution:** Sequential (1 worker for MVP)
- **Config:** `playwright.config.ts`

#### Vitest (Unit)
- **Purpose:** Fast unit tests for business logic
- **Environment:** jsdom (simulated browser)
- **Mocking:** Supabase, Next.js headers
- **Config:** `vitest.config.mts`

---

## Running Tests

### Unit Tests

#### Basic Commands
```bash
# Run all unit tests once
pnpm test

# Watch mode (re-run on file changes)
pnpm test:watch

# With coverage report
pnpm test:coverage
```

#### Test Specific Files
```bash
# Run specific test file
pnpm vitest tests/unit/services/attendance-locking.test.ts

# Run tests matching pattern
pnpm vitest attendance
```

#### Coverage Analysis
```bash
# Generate coverage report
pnpm test:coverage

# View HTML report
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

**Coverage Targets:**
- `lib/services/**` - Business logic services
- `lib/validation/**` - Validation utilities

---

### E2E Tests

#### Basic Commands
```bash
# Run all E2E tests (starts dev server automatically)
pnpm test:e2e

# Interactive UI mode (recommended for debugging)
pnpm test:e2e:ui

# Run specific spec
pnpm playwright test tests/e2e/auth/login.spec.ts

# Run specific test by name
pnpm playwright test -g "should login successfully"
```

#### Advanced Options
```bash
# Headed mode (see browser)
pnpm playwright test --headed

# Debug mode (step through tests)
pnpm playwright test --debug

# Run only failed tests
pnpm playwright test --last-failed

# Generate test report
pnpm playwright show-report
```

#### Multi-Browser Testing (Future)
```bash
# Currently: Chromium only
# Future: Add Firefox/WebKit in playwright.config.ts
pnpm playwright test --project=firefox
pnpm playwright test --project=webkit
```

---

## Test Types

### 1. Authentication Tests
**Location:** `tests/e2e/auth/`

**Coverage:**
- Login form validation
- Successful authentication
- Protected route redirection
- Session persistence

**Test Credentials (from seed data):**
```javascript
// Admin user
email: 'admin@test.com'
password: 'test123456'

// Professor (if seeded)
email: 'professor@test.com'
password: 'test123456'

// Diretor (if seeded)
email: 'diretor@test.com'
password: 'test123456'
```

**Example:**
```bash
pnpm playwright test tests/e2e/auth/login.spec.ts
```

---

### 2. CRUD Form Tests
**Location:** `tests/e2e/forms/`

**Coverage:**
- List views with filters/search
- Create forms with validation
- Edit forms
- Delete/archive operations (partial)

**Available Tests:**
- `aluno.spec.ts` - Student management (CPF validation, Bolsa Família)
- `escola.spec.ts` - School management (INEP, contact info)
- `turma.spec.ts` - Class management (série, turno, capacidade)
- `matricula.spec.ts` - Enrollment management (status transitions)
- `responsavel.spec.ts` - Guardian management (CPF, parentesco)
- `usuario.spec.ts` - User management (roles, permissions)

**Example:**
```bash
# Run all form tests
pnpm playwright test tests/e2e/forms/

# Run specific form
pnpm playwright test tests/e2e/forms/aluno.spec.ts
```

---

### 3. Workflow Tests
**Location:** `tests/e2e/flows/`

**Coverage:**
- Complex multi-step processes
- Brazilian compliance rules
- Business logic validation

**Available Tests:**
- `chamada.spec.ts` - Attendance workflow
  - Mark presence/absence
  - Bolsa Família highlighting
  - 18:00 auto-lock rule
  - Low attendance warnings (<80%)

**Example:**
```bash
pnpm playwright test tests/e2e/flows/chamada.spec.ts
```

---

### 4. Unit Tests (Services)
**Location:** `tests/unit/services/`

**Coverage:**
- Business logic (no UI)
- State management
- Validation rules
- Compliance checks

**Available Tests:**
- `attendance-locking.test.ts` - Attendance immutability rules
- `attendance-workflow.test.ts` - Workflow state machine

**Example:**
```bash
pnpm vitest tests/unit/services/attendance-locking.test.ts
```

---

## Fixtures & Test Data

### Seed Data

#### Required Before E2E Tests
```bash
# Seed test database with sample data
pnpm seed:dev

# Clear and re-seed
pnpm seed:clear && pnpm seed:dev
```

#### What Gets Seeded
- **Users**: admin, diretor, professor, secretario
- **Escolas**: Sample schools with INEP codes
- **Turmas**: Classes for 2026 academic year
- **Alunos**: Sample students (some with Bolsa Família)
- **Responsáveis**: Sample guardians
- **Matrículas**: Active enrollments

#### Seed Data Location
- Script: `scripts/seed-dev.ts`
- Check script for exact test credentials

---

### Test Helpers

#### Available Helpers
**File:** `tests/e2e/utils/test-helpers.ts`

```typescript
// Authentication
await loginAs(page, 'admin@test.com')

// Form helpers
await selectOption(page, /turno/i, /manhã/i)
await fillDate(page, /data/i, new Date())

// Assertions
await expectFormSuccess(page)
await expectToast(page, /salvo com sucesso/i)

// Data generators
const cpf = generateValidCPF()  // e.g., "529.982.247-25"
const email = generateTestEmail('test')  // e.g., "test1738468123@teste.com"
```

#### Usage Example
```typescript
import { test, expect } from '@playwright/test'
import { loginAs, selectOption, expectFormSuccess } from '../utils/test-helpers'

test('create student', async ({ page }) => {
  await loginAs(page, 'admin@test.com')
  await page.goto('/dashboard/alunos/novo')
  
  await page.getByLabel(/nome/i).fill('Aluno Teste')
  await selectOption(page, /sexo/i, /masculino/i)
  
  await page.getByRole('button', { name: /salvar/i }).click()
  await expectFormSuccess(page)
})
```

---

### Authentication State

#### How It Works
1. `auth.setup.ts` runs once before all tests
2. Logs in as admin, saves session to `playwright/.auth/user.json`
3. All E2E tests reuse this session (no repeated logins)

#### Multi-Role Testing (Future)
```typescript
// Uncomment in auth.setup.ts to enable
setup('authenticate as professor', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill('professor@test.com')
  await page.getByLabel(/senha/i).fill('test123456')
  await page.getByRole('button', { name: /entrar/i }).click()
  await page.context().storageState({ 
    path: path.join(__dirname, '../playwright/.auth/professor.json')
  })
})
```

---

## Environment Variables

### Required Variables

#### For Unit Tests
```bash
# .env.local (minimal for mocked tests)
NODE_ENV=test
```

Unit tests use mocked Supabase client, so no real database connection needed.

---

#### For E2E Tests
```bash
# .env.local (full configuration required)

# Supabase (TEST instance recommended)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key  # For seeding

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Playwright (optional override)
PLAYWRIGHT_BASE_URL=http://localhost:3000

# PostHog (optional, can be disabled for tests)
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
```

---

### Test Environment Best Practices

#### 1. Use Separate Test Database
**Why:** Prevents polluting production/staging data

**How:**
- Create separate Supabase project for testing
- Use `supabase link` to connect to test project
- Keep test credentials in `.env.local` (gitignored)

#### 2. Environment-Specific Seeds
```bash
# Development seeds (rich data)
pnpm seed:dev

# Test seeds (minimal, predictable)
pnpm seed:test  # TODO: Create this script
```

#### 3. CI Environment Variables
Set these in your CI/CD platform (GitHub Actions, etc.):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Writing New Tests

### E2E Test Template

```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: navigate to page
    await page.goto('/dashboard/feature')
  })

  test('should do something', async ({ page }) => {
    // Arrange: setup test data
    const testData = { name: 'Test' }
    
    // Act: perform action
    await page.getByLabel(/name/i).fill(testData.name)
    await page.getByRole('button', { name: /save/i }).click()
    
    // Assert: verify result
    await expect(page.getByText(/success/i)).toBeVisible()
  })
})
```

### Unit Test Template

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { myService } from '@/lib/services/my-service'

describe('MyService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should do something', () => {
    // Arrange
    const input = 'test'
    
    // Act
    const result = myService.doSomething(input)
    
    // Assert
    expect(result).toBe('expected')
  })
})
```

---

### Test Naming Conventions

#### E2E Tests
```typescript
// Use descriptive "should" statements
test('should display login form')
test('should validate CPF format')
test('should create student with minimum data')

// Group related tests
test.describe('Aluno - List View', () => {})
test.describe('Aluno - Create Form', () => {})
```

#### Unit Tests
```typescript
// Use "should" or descriptive statements
it('should validate CPF checksum')
it('deve bloquear alterações após 18:00')  // Portuguese OK

// Group by feature
describe('AttendanceLockingService', () => {
  describe('getLockingRules', () => {})
  describe('validateUnlock', () => {})
})
```

---

### Selectors Best Practices

#### Prefer Accessible Selectors
```typescript
// ✅ Good (semantic, resilient)
page.getByRole('button', { name: /salvar/i })
page.getByLabel(/email/i)
page.getByText(/sucesso/i)

// ⚠️ Avoid (brittle)
page.locator('#btn-submit')
page.locator('.form-input')
```

#### Use Regex for i18n Resilience
```typescript
// ✅ Case-insensitive, flexible
page.getByLabel(/email/i)
page.getByRole('button', { name: /salvar|enviar|confirmar/i })

// ❌ Exact match breaks easily
page.getByLabel('Email')
```

---

## Troubleshooting

### Common Issues

#### 1. "Cannot run tests - node_modules missing"
**Solution:**
```bash
pnpm install
```

---

#### 2. "Test timeout waiting for dev server"
**Cause:** Next.js dev server slow to start

**Solution:**
```bash
# Increase timeout in playwright.config.ts
webServer: {
  timeout: 180 * 1000,  // 3 minutes
}
```

---

#### 3. "Test user not found"
**Cause:** Database not seeded

**Solution:**
```bash
pnpm seed:dev
```

---

#### 4. "Supabase connection error"
**Cause:** Missing or invalid `.env.local`

**Solution:**
```bash
# Check environment variables
cat .env.local

# Verify Supabase connection
curl https://your-project.supabase.co/rest/v1/
```

---

#### 5. "E2E tests fail but unit tests pass"
**Causes:**
- Dev server not running
- Wrong base URL
- Database state issues

**Debug:**
```bash
# Run with UI mode to see what's happening
pnpm test:e2e:ui

# Run with headed browser
pnpm playwright test --headed

# Check dev server manually
pnpm dev
# Visit http://localhost:3000 in browser
```

---

#### 6. "Flaky tests (pass/fail randomly)"
**Common Causes:**
- Missing `await` on async operations
- Race conditions in form submissions
- Network timing issues

**Solutions:**
```typescript
// ❌ Bad: no wait for navigation
await page.getByRole('button').click()
await expect(page).toHaveURL(/dashboard/)

// ✅ Good: explicit timeout
await page.getByRole('button').click()
await expect(page).toHaveURL(/dashboard/, { timeout: 10000 })

// ✅ Good: wait for state
await page.getByRole('button').click()
await page.waitForLoadState('networkidle')
```

---

### Debugging Tests

#### Playwright Inspector
```bash
# Open interactive debugger
pnpm playwright test --debug

# Debug specific test
pnpm playwright test --debug tests/e2e/auth/login.spec.ts
```

#### View Test Traces
```bash
# Run test with trace
pnpm playwright test --trace on

# Open trace viewer
pnpm playwright show-trace trace.zip
```

#### Screenshot on Failure
Tests are configured to capture screenshots on failure automatically:
```
test-results/
└── chromium-Feature-Name-should-do-something/
    ├── test-failed-1.png
    └── trace.zip
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 22
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run unit tests
        run: pnpm test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 22
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Install Playwright browsers
        run: pnpm playwright install --with-deps chromium
      
      - name: Seed test database
        run: pnpm seed:dev
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SUPABASE_SERVICE_KEY }}
      
      - name: Run E2E tests
        run: pnpm test:e2e
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Additional Resources

### Documentation
- [Playwright Docs](https://playwright.dev/)
- [Vitest Docs](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- [Project README](../README.md)

### Test Coverage Report
- See `TEST_COVERAGE_REPORT.md` for detailed coverage analysis and gaps

### Related Scripts
```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build production
pnpm lint             # Run ESLint
pnpm typecheck        # TypeScript validation

# Database
pnpm seed:dev         # Seed test data
pnpm seed:clear       # Clear database
```

---

## Contributing

### Adding New Tests

1. **Identify feature to test**
2. **Choose test type** (E2E vs Unit)
3. **Create test file** in appropriate directory
4. **Follow naming conventions** (`*.spec.ts` for E2E, `*.test.ts` for unit)
5. **Use test helpers** when possible
6. **Document complex scenarios**
7. **Update this README** if adding new patterns

### Test Review Checklist
- [ ] Tests are deterministic (no randomness)
- [ ] Tests clean up after themselves
- [ ] Assertions are clear and specific
- [ ] Test names describe behavior, not implementation
- [ ] Uses semantic selectors (roles, labels)
- [ ] Follows project conventions
- [ ] Passes locally before pushing

---

## Support

### Questions?
- Check troubleshooting section above
- Review test examples in `tests/e2e/`
- Read coverage report: `TEST_COVERAGE_REPORT.md`

### Found a Bug?
- Open issue with reproduction steps
- Include test failure screenshots/traces
- Mention Node.js version and OS

---

*Last updated: 2026-02-02*  
*Maintained by: EDUCA Development Team*
