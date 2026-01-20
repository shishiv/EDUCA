# Phase 11: Testing - Research

**Researched:** 2026-01-19
**Domain:** Unit Testing (Vitest) + E2E Testing (Playwright) for Next.js 15
**Confidence:** HIGH

## Summary

Phase 11 establishes the testing framework MVP for the EDUCA educational management system. The primary focus is on Vitest for unit testing critical business logic (attendance-workflow.ts, attendance-locking.ts, Brazilian validations) and Playwright for smoke tests validating basic user flows.

The research confirms Vitest 4.x as the current standard for Next.js unit testing, with excellent TypeScript support and fast execution. Playwright remains the standard for E2E testing with Next.js, with built-in authentication state management for efficient test execution.

**Primary recommendation:** Use Vitest 4.x with complete Supabase mocking for unit tests (target <5s execution). Use Playwright with storage state for login reuse, Chromium-only for MVP, and screenshot-on-failure for debugging.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | ^4.0.0 | Unit test runner | Official Vite ecosystem, fastest for Next.js |
| @vitejs/plugin-react | ^4.4.0 | React/JSX support in Vitest | Required for component testing |
| @testing-library/react | ^16.0.0 | React component testing | Community standard, good practices |
| @playwright/test | ^1.52.0 | E2E testing framework | Microsoft-backed, Next.js recommended |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jsdom | ^26.0.0 | DOM environment for Vitest | All React component tests |
| vite-tsconfig-paths | ^5.1.0 | Path alias resolution | When using @/* imports |
| @testing-library/dom | ^10.4.0 | DOM testing utilities | Component interaction testing |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vitest | Jest | Jest slower with Next.js, requires more config |
| Playwright | Cypress | Playwright faster, better cross-browser, smaller footprint |
| jsdom | happy-dom | jsdom more mature, better compatibility |

**Installation:**
```bash
cd gestao_fronteira
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths @playwright/test
```

## Architecture Patterns

### Recommended Project Structure
```
gestao_fronteira/
├── vitest.config.mts        # Vitest configuration
├── playwright.config.ts     # Playwright configuration
├── tests/
│   ├── unit/                # Unit tests (Vitest)
│   │   ├── services/
│   │   │   ├── attendance-workflow.test.ts
│   │   │   └── attendance-locking.test.ts
│   │   └── validation/
│   │       ├── brazilian.test.ts
│   │       └── attendance.test.ts
│   ├── e2e/                 # E2E tests (Playwright)
│   │   ├── auth.setup.ts    # Login setup
│   │   └── smoke.spec.ts    # Smoke tests
│   └── fixtures/            # Shared test data
│       └── test-data.ts
└── playwright/
    └── .auth/               # Auth state (gitignored)
```

### Pattern 1: Supabase Mocking for Unit Tests
**What:** Complete mocking of Supabase client to isolate business logic
**When to use:** All unit tests for services that interact with Supabase
**Example:**
```typescript
// Source: https://vitest.dev/guide/mocking
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { AttendanceWorkflowManager } from '@/lib/services/attendance-workflow'

// Mock the entire supabase module
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}))

describe('AttendanceWorkflowManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve iniciar no estado PREPARATION', () => {
    const workflow = new AttendanceWorkflowManager('class-1', 'teacher-1', '2026-01-19')
    expect(workflow.getState().phase).toBe('PREPARATION')
  })
})
```

### Pattern 2: Playwright Authentication State Reuse
**What:** Login once, reuse authentication state across all tests
**When to use:** All E2E tests requiring authentication
**Example:**
```typescript
// Source: https://playwright.dev/docs/auth
// tests/e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '../../playwright/.auth/user.json')

setup('authenticate', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(process.env.TEST_USER_EMAIL!)
  await page.getByLabel('Senha').fill(process.env.TEST_USER_PASSWORD!)
  await page.getByRole('button', { name: 'Entrar' }).click()

  // Wait for redirect to dashboard
  await page.waitForURL('/dashboard')
  await expect(page.locator('h1')).toContainText('Dashboard')

  // Save authentication state
  await page.context().storageState({ path: authFile })
})
```

### Pattern 3: Pure Function Testing (No Mocking)
**What:** Direct testing of validation functions without any mocking
**When to use:** All validation utilities that don't have dependencies
**Example:**
```typescript
// Source: Vitest best practices
// tests/unit/validation/brazilian.test.ts
import { describe, it, expect } from 'vitest'
import { validateCPF, formatCPF, calculateAttendanceRate } from '@/lib/validation/brazilian'

describe('Validacao CPF', () => {
  it('deve validar CPF correto', () => {
    expect(validateCPF('529.982.247-25')).toBe(true)
    expect(validateCPF('52998224725')).toBe(true)
  })

  it('deve rejeitar CPF invalido', () => {
    expect(validateCPF('111.111.111-11')).toBe(false)  // repeated digits
    expect(validateCPF('123.456.789-00')).toBe(false)  // wrong checksum
    expect(validateCPF('')).toBe(false)
  })

  it('deve formatar CPF corretamente', () => {
    expect(formatCPF('52998224725')).toBe('529.982.247-25')
  })
})

describe('Calculo de frequencia', () => {
  it('deve calcular taxa de frequencia', () => {
    expect(calculateAttendanceRate(18, 20)).toBe(90)
    expect(calculateAttendanceRate(15, 20)).toBe(75)
    expect(calculateAttendanceRate(0, 20)).toBe(0)
    expect(calculateAttendanceRate(0, 0)).toBe(0) // edge case
  })
})
```

### Anti-Patterns to Avoid
- **Testing implementation details:** Test behavior, not internal state
- **Excessive mocking:** Mock only external dependencies, not internal functions
- **Flaky E2E tests:** Use Playwright's built-in auto-waiting, avoid arbitrary sleeps
- **Testing Next.js internals:** Don't test Next.js router or Server Components directly
- **Shared test state:** Each test should be independent, use beforeEach for cleanup

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Test runner | Custom script | Vitest | Built-in watch mode, coverage, parallel execution |
| Browser automation | Puppeteer scripts | Playwright | Auto-waiting, cross-browser, better DX |
| DOM testing | Manual DOM queries | @testing-library | Encourages accessible queries, better practices |
| Auth state management | Cookie manipulation | Playwright storageState | Handles cookies, localStorage, IndexedDB |
| Mock functions | Manual spy objects | vi.fn(), vi.spyOn() | Automatic call tracking, type safety |

**Key insight:** Vitest and Playwright have evolved significantly. Their built-in features (auto-waiting, coverage, parallel execution) eliminate the need for custom testing infrastructure.

## Common Pitfalls

### Pitfall 1: Testing Async Server Components
**What goes wrong:** Vitest doesn't support async Server Components
**Why it happens:** React Server Components are new, test ecosystem hasn't caught up
**How to avoid:** Use E2E tests for async Server Components, unit test only sync logic
**Warning signs:** Tests hang or fail with "not a function" errors

### Pitfall 2: Supabase Session in Vitest
**What goes wrong:** Tests fail with auth errors or localStorage issues
**Why it happens:** Supabase persists auth in localStorage, which doesn't exist in Node
**How to avoid:** Mock entire Supabase module, or configure `persistSession: false`
**Warning signs:** "localStorage is not defined" errors

### Pitfall 3: Flaky Login Tests
**What goes wrong:** E2E login tests intermittently fail
**Why it happens:** Not waiting for auth redirects to complete
**How to avoid:** Use `page.waitForURL()` after login, verify dashboard element exists
**Warning signs:** Tests pass locally but fail in CI

### Pitfall 4: Port Conflicts
**What goes wrong:** "Port 3000 already in use" errors
**Why it happens:** Dev server still running when tests start
**How to avoid:** Use Playwright webServer config to manage server lifecycle
**Warning signs:** Tests hang on startup

### Pitfall 5: next/headers in Unit Tests
**What goes wrong:** "cookies() can only be called from Server Component" errors
**Why it happens:** Importing server-side auth code that uses next/headers
**How to avoid:** Add mock in vitest.setup.ts for next/headers
**Warning signs:** Tests fail immediately on import

## Code Examples

Verified patterns from official sources:

### Vitest Configuration
```typescript
// Source: https://nextjs.org/docs/app/guides/testing/vitest
// vitest.config.mts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/vitest.setup.ts'],
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['lib/services/**', 'lib/validation/**'],
    },
  },
})
```

### Vitest Setup File
```typescript
// tests/vitest.setup.ts
import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Mock next/headers for server-side imports
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
  headers: vi.fn(() => new Map()),
}))
```

### Playwright Configuration
```typescript
// Source: https://nextjs.org/docs/pages/guides/testing/playwright
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // MVP: run sequentially for simplicity
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // MVP: single worker
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
```

### Smoke Test Example
```typescript
// tests/e2e/smoke.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Smoke Tests', () => {
  test('paginas carregam sem erro 500', async ({ page }) => {
    // Dashboard
    await page.goto('/dashboard')
    await expect(page).not.toHaveURL(/error|500/)
    await expect(page.locator('h1')).toBeVisible()

    // Alunos
    await page.goto('/alunos')
    await expect(page).not.toHaveURL(/error|500/)
  })

  test('navegacao basica funciona', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('text=Alunos')
    await expect(page).toHaveURL(/alunos/)
  })
})
```

### Attendance Workflow Test
```typescript
// tests/unit/services/attendance-workflow.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AttendanceWorkflowManager, createAttendanceWorkflow } from '@/lib/services/attendance-workflow'

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}))

vi.mock('@/lib/services/attendance-immutability', () => ({
  attendanceImmutability: {
    validateModificationPermission: vi.fn().mockResolvedValue({ allowed: true }),
    createImmutableAttendanceRecords: vi.fn().mockResolvedValue({ success: true }),
  },
}))

vi.mock('@/lib/services/attendance-bulk-operations', () => ({
  attendanceBulkOperations: {
    markAllPresent: vi.fn().mockResolvedValue({ success: true, errors: [], performance: {} }),
  },
}))

describe('AttendanceWorkflowManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('inicializacao', () => {
    it('deve criar workflow no estado PREPARATION', () => {
      const workflow = createAttendanceWorkflow('class-1', 'teacher-1', '2026-01-19')
      const state = workflow.getState()

      expect(state.phase).toBe('PREPARATION')
      expect(state.classId).toBe('class-1')
      expect(state.teacherId).toBe('teacher-1')
      expect(state.date).toBe('2026-01-19')
      expect(state.errors).toHaveLength(0)
    })
  })

  describe('transicoes', () => {
    it('deve retornar erro para transicao invalida', async () => {
      const workflow = createAttendanceWorkflow('class-1', 'teacher-1', '2026-01-19')

      // Try to close session without opening first
      const result = await workflow.executeTransition('close_session')

      expect(result.success).toBe(false)
      expect(result.error).toContain('nao permitido')
    })

    it('deve listar acoes disponiveis para fase atual', () => {
      const workflow = createAttendanceWorkflow('class-1', 'teacher-1', '2026-01-19')
      const actions = workflow.getAvailableActions()

      expect(actions).toContain('open_session')
      expect(actions).not.toContain('close_session')
    })
  })

  describe('progresso', () => {
    it('deve calcular progresso inicial como 0%', () => {
      const workflow = createAttendanceWorkflow('class-1', 'teacher-1', '2026-01-19')
      expect(workflow.getOverallProgress()).toBe(0)
    })
  })
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Jest with Next.js | Vitest preferred | 2024 | Faster, simpler config |
| Cypress for E2E | Playwright preferred | 2023 | Better perf, cross-browser |
| Manual DOM testing | @testing-library | 2020 | Better accessibility focus |
| Session per test | Storage state reuse | 2022 | 60-80% faster E2E |

**Deprecated/outdated:**
- **Enzyme:** Replaced by @testing-library/react, no React 18+ support
- **Jest for Vite projects:** Vitest is the native choice
- **Manual browser downloads:** Playwright manages browsers automatically

## Open Questions

Things that couldn't be fully resolved:

1. **Test User in Supabase**
   - What we know: E2E needs a dedicated test user (teste@educa.com)
   - What's unclear: Whether to create via seed script or manually
   - Recommendation: Create in seed-dev.ts script for reproducibility

2. **Coverage Thresholds for MVP**
   - What we know: MVP focuses on critical paths, not percentage
   - What's unclear: Exact minimum threshold to enforce
   - Recommendation: Start with 60% for services, increase over time

3. **E2E against Build vs Dev**
   - What we know: Production build is recommended for realistic testing
   - What's unclear: Whether dev server is acceptable for MVP
   - Recommendation: Use dev server for MVP (faster iteration), add build tests later

## Sources

### Primary (HIGH confidence)
- [Next.js Vitest Documentation](https://nextjs.org/docs/app/guides/testing/vitest) - Complete setup guide
- [Next.js Playwright Documentation](https://nextjs.org/docs/pages/guides/testing/playwright) - E2E setup guide
- [Playwright Authentication](https://playwright.dev/docs/auth) - Storage state pattern
- [Vitest Mocking Guide](https://vitest.dev/guide/mocking) - Mock patterns

### Secondary (MEDIUM confidence)
- [Vitest 4.0 Announcement](https://vitest.dev/blog/vitest-4) - Latest features
- [Testing Supabase with Vitest](https://nygaard.dev/blog/testing-supabase-rtl-msw) - Mocking patterns

### Tertiary (LOW confidence)
- Community blog posts on Supabase mocking - Patterns vary, verify with official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Next.js docs recommend Vitest + Playwright
- Architecture: HIGH - Patterns from official documentation
- Pitfalls: MEDIUM - Based on community experience and docs

**Research date:** 2026-01-19
**Valid until:** 60 days (stable ecosystem, slow-moving)
