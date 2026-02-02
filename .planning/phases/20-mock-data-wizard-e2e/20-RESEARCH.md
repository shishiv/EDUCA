# Phase 20: Mock Data Cleanup, First Access Wizard & E2E Tests - Research

**Researched:** 2026-01-27
**Domain:** React Wizard Components, Playwright E2E Testing, Mock Data Removal
**Confidence:** HIGH

## Summary

This phase addresses three interconnected concerns: removing mock data from production code, implementing a first-access onboarding wizard for all user profiles, and creating E2E tests for critical flows. The codebase already has Playwright configured (v1.51.1), a solid component library (shadcn/ui with Radix primitives), and a clear architecture pattern for context providers (DemoModeContext pattern).

Research identified 5 files containing mock data that must be removed:
1. `app/(dashboard)/dashboard/turmas/page.tsx` - mockTurmas (165 lines)
2. `app/(dashboard)/dashboard/matriculas/page.tsx` - mockMatriculas
3. `app/(dashboard)/dashboard/usuarios/[id]/page.tsx` - mockActivities
4. `lib/api/audit.ts` - generateMockActivities, generateMockAuditLogs
5. `lib/api/reports.ts` - mockData for report generation

The first-access wizard will leverage the existing `primeiro_login` boolean flag in the `users` table (confirmed in database.ts types). The wizard architecture should follow the DemoModeContext pattern for state management with sessionStorage persistence.

**Primary recommendation:** Build a custom wizard using existing Radix Dialog components and React state machine pattern. No additional dependencies needed - the project already has all required primitives.

## Standard Stack

### Core (Already Installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @radix-ui/react-dialog | 1.1.1 | Wizard modal foundation | Already used for dialogs in project |
| @radix-ui/react-progress | 1.1.0 | Step progress indicator | Already available in project |
| @playwright/test | 1.51.1 | E2E testing framework | Already configured in project |
| zustand | 5.0.10 | State management | Already in project for complex state |
| react-hook-form | 7.68.0 | Form handling in wizard | Already used throughout project |

### Supporting (No Installation Needed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | 3.23.8 | Wizard step validation | Already used for form validation |
| sonner | 2.0.7 | Toast notifications | Wizard completion feedback |
| lucide-react | 0.446.0 | Icons for wizard steps | Step indicators, help icons |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom wizard | react-use-wizard | Adds dependency; custom solution simpler for 4-step wizard |
| Custom stepper | @coreui/react | Overkill for simple linear wizard; adds CSS conflicts |
| Dialog modal | Full-page wizard | Modal keeps context visible; better for "skippable" flow |

**Installation:**
```bash
# No new dependencies needed - all required libraries already installed
```

## Architecture Patterns

### Recommended Project Structure
```
components/
├── onboarding/
│   ├── FirstAccessWizard.tsx      # Main wizard container
│   ├── WizardStep.tsx             # Reusable step wrapper
│   ├── steps/
│   │   ├── WelcomeStep.tsx        # Welcome/intro for all profiles
│   │   ├── AdminStep.tsx          # Admin-specific guidance
│   │   ├── DiretorStep.tsx        # Director-specific guidance
│   │   ├── SecretarioStep.tsx     # Secretary-specific guidance
│   │   └── ProfessorStep.tsx      # Teacher-specific guidance
│   └── HelpButton.tsx             # Persistent header help icon
├── ui/
│   └── step-indicator.tsx         # Visual progress indicator
contexts/
└── first-access-context.tsx       # Wizard state management (follow DemoModeContext pattern)
tests/
└── e2e/
    ├── auth.setup.ts              # Authentication state caching
    ├── login.spec.ts              # Login flow tests
    ├── atribuicoes.spec.ts        # Teacher assignment tests
    ├── turmas.spec.ts             # Turmas CRUD tests
    └── helpers/
        └── seed.ts                # Test data seeding utilities
```

### Pattern 1: Wizard State Machine (Custom Implementation)

**What:** Simple state machine for wizard navigation with profile-specific steps
**When to use:** Linear multi-step wizard with conditional content per profile
**Example:**
```typescript
// Source: Pattern based on CONTEXT.md decisions
interface WizardState {
  isOpen: boolean
  currentStep: number
  totalSteps: number
  userProfile: 'admin' | 'diretor' | 'secretario' | 'professor'
  completed: boolean
}

const getStepsForProfile = (profile: string): string[] => {
  const commonSteps = ['welcome']
  const profileSteps = {
    admin: ['system-overview', 'modules-guide'],
    diretor: ['escola-check', 'turmas-overview'],
    secretario: ['escola-check', 'cadastros-guide'],
    professor: ['turmas-check', 'chamada-guide'],
  }
  return [...commonSteps, ...profileSteps[profile], 'complete']
}
```

### Pattern 2: Contextual Help System

**What:** Route-aware help content system
**When to use:** Persistent help icon that shows page-specific tips
**Example:**
```typescript
// Source: CONTEXT.md "Ajuda Contextual" decision
const helpContent: Record<string, HelpTip[]> = {
  '/dashboard/turmas': [
    { title: 'O que e uma turma?', content: 'Turma e onde seus alunos estao agrupados...' },
    { title: 'Como criar turma', content: 'Clique em Nova Turma...' },
  ],
  '/dashboard/chamada': [
    { title: 'Frequencia', content: 'A chamada registra presencas e faltas...' },
    { title: 'Horario limite', content: 'A chamada trava as 18h...' },
  ],
  // ... per-page tips
}
```

### Pattern 3: E2E Authentication Caching

**What:** Cache authenticated state to avoid login in every test
**When to use:** All E2E tests that require authenticated user
**Example:**
```typescript
// Source: Playwright docs + existing playwright.config.ts
// tests/e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test'

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[id="email"]', 'admin@fronteira.mg.gov.br')
  await page.fill('[id="password"]', 'test-password')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/dashboard')

  // Save storage state for reuse
  await page.context().storageState({ path: 'playwright/.auth/admin.json' })
})
```

### Anti-Patterns to Avoid

- **Wizard in every route:** Only show on primeiro_login=true, not on every page load
- **Blocking wizard:** CONTEXT.md specifies "recomendado mas pulavel" - always allow skip
- **UI login in every test:** Use storageState caching - login once, reuse auth
- **Mock data in production code:** Never leave mock arrays in page components

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Progress indicator | Custom div-based steps | Radix Progress + custom step circles | Accessibility built-in |
| Modal wizard | window.open or custom portal | Radix Dialog | Focus trapping, ESC handling |
| Form in wizard steps | Manual state management | react-hook-form with context | Validation, error handling |
| Test authentication | Login in every test beforeEach | Playwright storageState | 10x faster test runs |
| Test data cleanup | Manual DELETE queries | beforeEach database seeding | Isolation guaranteed |

**Key insight:** The project already has all the UI primitives needed (Dialog, Progress, Button). Building on existing Radix components ensures accessibility and consistent behavior without adding dependencies.

## Common Pitfalls

### Pitfall 1: Wizard Showing After First Login Complete
**What goes wrong:** Wizard keeps appearing even after user completed it
**Why it happens:** Client-side check races with server state update
**How to avoid:**
1. Update `primeiro_login=false` in database before closing wizard
2. Use optimistic UI update + server confirmation
3. Store completion in sessionStorage as backup during session
**Warning signs:** Users complaining wizard appears repeatedly

### Pitfall 2: E2E Tests Failing on Auth State
**What goes wrong:** Tests randomly fail on login or session expiry
**Why it happens:** Shared state between tests, expired tokens
**How to avoid:**
1. Use fresh browser context per test (Playwright default)
2. Cache auth state per role (admin.json, professor.json)
3. Set reasonable test timeouts for Next.js cold starts
**Warning signs:** Tests pass locally but fail in CI, flaky login tests

### Pitfall 3: Mock Data Left in Production
**What goes wrong:** Fake data appears in production database or UI
**Why it happens:** Mock arrays defined in component files, not conditionally loaded
**How to avoid:**
1. Remove all `const mock*` from page components
2. Replace with empty state + CTA pattern
3. Keep seed scripts in `/scripts/` only
4. Demo Mode is separate feature (already correctly isolated)
**Warning signs:** Users see "CEMEI Pequenos Passos" or "Pedro Silva Santos" in production

### Pitfall 4: Professor Without Turmas Blocked
**What goes wrong:** New professor can't access system at all
**Why it happens:** Overly restrictive routing checks
**How to avoid:**
1. CONTEXT.md decision: "Acesso ao sistema permitido (pode ver perfil, aguardar atribuicao)"
2. Show message: "Suas turmas ainda nao foram atribuidas. Entre em contato com a direcao da escola."
3. Only block turma-specific actions, not entire dashboard
**Warning signs:** Support tickets from new teachers unable to login

## Code Examples

Verified patterns from existing codebase and official sources:

### Empty State with CTA (Replace Mock Data)
```typescript
// Source: Existing pattern in notas/page.tsx and atribuicoes/page.tsx
{turmas.length === 0 && (
  <Card>
    <CardContent className="p-8 text-center">
      <GraduationCap className="h-12 w-12 mx-auto mb-4 text-gray-400" />
      <p className="text-lg font-medium">Nenhuma turma encontrada</p>
      <p className="text-sm text-muted-foreground mt-1">
        Esta escola ainda nao possui turmas cadastradas.
      </p>
      <Button asChild className="mt-4">
        <Link href="/dashboard/turmas/nova">
          <Plus className="h-4 w-4 mr-2" />
          Nova Turma
        </Link>
      </Button>
    </CardContent>
  </Card>
)}
```

### Wizard Context (Following DemoModeContext Pattern)
```typescript
// Source: Pattern from contexts/demo-mode-context.tsx
'use client'
import * as React from 'react'

const STORAGE_KEY = 'gestao-fronteira-first-access'

interface FirstAccessContextType {
  showWizard: boolean
  currentStep: number
  totalSteps: number
  nextStep: () => void
  prevStep: () => void
  skipWizard: () => void
  completeWizard: () => void
}

export function FirstAccessProvider({ children }: { children: React.ReactNode }) {
  const [showWizard, setShowWizard] = React.useState(false)
  const [currentStep, setCurrentStep] = React.useState(0)
  const [hydrated, setHydrated] = React.useState(false)

  // Hydrate from sessionStorage after mount (avoid SSR mismatch)
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = sessionStorage.getItem(STORAGE_KEY)
      if (!dismissed) {
        // Check userProfile.primeiro_login from auth context
        // setShowWizard(userProfile?.primeiro_login === true)
      }
      setHydrated(true)
    }
  }, [])

  // ... rest of context
}
```

### E2E Test with Database Seeding
```typescript
// Source: Playwright docs + project patterns
import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

test.describe('Atribuicoes Flow', () => {
  test.beforeEach(async () => {
    // Seed test data
    await supabase.from('turmas').upsert({
      id: 'test-turma-1',
      nome: 'Turma Teste E2E',
      escola_id: 'test-escola-1',
      ativo: true
    })
  })

  test.afterEach(async () => {
    // Cleanup test data
    await supabase.from('turmas').delete().eq('id', 'test-turma-1')
  })

  test('diretor can assign professor to turma', async ({ page }) => {
    await page.goto('/dashboard/atribuicoes')
    await expect(page.getByText('Turma Teste E2E')).toBeVisible()
    // ... test steps
  })
})
```

### Help Button for Header
```typescript
// Source: CONTEXT.md "Icone de ajuda (?) persistente no header"
import { HelpCircle } from 'lucide-react'
import { usePathname } from 'next/navigation'

export function HelpButton() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = React.useState(false)

  const tips = helpContent[pathname] || helpContent.default

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-10 w-10 rounded-[10px] bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center"
          aria-label="Ajuda"
        >
          <HelpCircle className="h-5 w-5 text-gray-600" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          {tips.map((tip, i) => (
            <div key={i}>
              <h4 className="font-medium text-sm">{tip.title}</h4>
              <p className="text-sm text-muted-foreground">{tip.content}</p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| UI login every test | storageState caching | Playwright 1.40+ | 5-10x faster E2E suites |
| Full page wizards | Modal dialog wizards | React 18+ patterns | Better context retention |
| Inline mock data | Empty states + CTAs | Modern UX patterns | Production-safe code |

**Deprecated/outdated:**
- `puppeteer` for E2E: Playwright has better Next.js support
- `react-joyride`: Tour libraries overkill for simple wizard
- localStorage for primeiro_login: Must sync with database

## Open Questions

Things that couldn't be fully resolved:

1. **E2E Test Database Strategy**
   - What we know: Playwright tests need isolated data; seed-dev.ts exists
   - What's unclear: Should E2E use same Supabase project or separate?
   - Recommendation: Create test-specific seed script, use SUPABASE_SERVICE_ROLE_KEY for cleanup

2. **Wizard Step Order**
   - What we know: CONTEXT.md says Claude's discretion for order
   - What's unclear: Optimal pedagogical order for non-technical users
   - Recommendation: Welcome > Role-specific overview > Key action demo > Complete

3. **Help Content Writing**
   - What we know: Must be accessible, non-technical Portuguese
   - What's unclear: Who reviews help text for accuracy?
   - Recommendation: Create initial content in code, mark for stakeholder review

## Sources

### Primary (HIGH confidence)
- Playwright documentation (via WebSearch): Authentication caching, project setup, database seeding patterns
- Project codebase (via Read): DemoModeContext pattern, existing Dialog/Radix components, mock data locations
- CONTEXT.md: All user decisions locked in for wizard behavior

### Secondary (MEDIUM confidence)
- [BrowserStack Playwright Best Practices 2026](https://www.browserstack.com/guide/playwright-best-practices): storageState, fresh contexts
- [End-to-End Testing Auth Flows with Playwright and Next.js](https://testdouble.com/insights/how-to-test-auth-flows-with-playwright-and-next-js): Auth setup patterns
- [Next.js Playwright Testing Guide](https://nextjs.org/docs/pages/guides/testing/playwright): Official Next.js integration

### Tertiary (LOW confidence)
- [React Stepper Libraries Comparison](https://onboardjs.com/blog/5-best-react-onboarding-libraries-in-2025-compared): Library options (not using - custom is simpler)
- [Medium React Wizard Article](https://medium.com/@l_e/writing-a-wizard-in-react-8dafbce6db07): State machine pattern conceptually validated

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed, patterns proven in codebase
- Architecture: HIGH - Following existing DemoModeContext pattern, proven Dialog usage
- Pitfalls: HIGH - Mock data locations verified by grep, CONTEXT.md decisions clear
- E2E testing: MEDIUM - Playwright configured but no existing E2E tests to reference

**Research date:** 2026-01-27
**Valid until:** 2026-02-27 (30 days - stable patterns, no fast-moving dependencies)
