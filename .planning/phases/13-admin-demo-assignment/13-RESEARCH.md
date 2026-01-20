# Phase 13: Admin Demo Assignment - Research

**Researched:** 2026-01-20
**Domain:** Admin role impersonation / demo mode for attendance workflow
**Confidence:** HIGH

## Summary

This phase addresses the need for admin users to demonstrate the full professor workflow (specifically attendance/chamada) without breaking the separation of duties established in Phase 12. Currently, admins are view-only for attendance per ROL-01.

The research identified three viable approaches:
1. **Session-based impersonation** - Admin temporarily assumes professor role in UI only
2. **Demo turma assignment** - Admin self-assigns to a demo/test turma
3. **Demo mode context** - Ephemeral context that overrides `canRecordAttendance`

**Primary recommendation:** Implement a **Demo Mode Context** using sessionStorage (consistent with EscolaContext pattern). This approach:
- Requires no database changes
- Uses existing `canRecordAttendance` helper
- Isolates demo actions visually (banner/badge)
- Can be exited at any moment
- Actions are still recorded with admin's real user_id for audit trail

## Current Architecture Analysis

### Authentication & Role System

**Source:** `lib/auth.ts`, `hooks/use-auth.ts`

| Component | Purpose |
|-----------|---------|
| `useAuth` hook | Returns `user`, `userProfile`, `loading` |
| `UserProfile.tipo_usuario` | Role: admin, diretor, secretario, professor, responsavel |
| `canRecordAttendance(tipo)` | Returns `true` only for `professor` and `diretor` |
| `roleHierarchy` | Numeric hierarchy (admin=5, diretor=4, professor=2) |

**Key code pattern:**
```typescript
// From lib/auth.ts
export const canRecordAttendance = (tipoUsuario: UserProfile['tipo_usuario'] | null): boolean => {
  if (!tipoUsuario) return false
  if (tipoUsuario === 'professor') return true
  if (tipoUsuario === 'diretor') return true
  return false // admin, secretario = view-only
}
```

### EscolaContext Pattern (Precedent)

**Source:** `contexts/escola-context.tsx`

The EscolaContext is the **key precedent** for this feature:

| Aspect | Implementation |
|--------|----------------|
| Storage | `sessionStorage` (clears on tab close) |
| Key | `'gestao-fronteira-selected-escola'` |
| Hydration | `useEffect` to avoid SSR mismatch |
| Computed | `shouldShowSelector` based on `tipo_usuario` |

**Pattern to replicate:**
```typescript
// Hydrate from sessionStorage after mount
useEffect(() => {
  if (typeof window !== 'undefined') {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored) {
      setSelectedEscolaId(stored)
    }
    setHydrated(true)
  }
}, [])
```

### View-Only Implementation (Phase 12)

**Source:** `app/(dashboard)/dashboard/turmas/[id]/chamada/page.tsx`

Current flow:
1. `isViewOnly` state initialized from `canRecordAttendance(role)`
2. If `isViewOnly === true`, buttons are disabled
3. `ViewOnlyNotice` component shows blue banner with Shield icon
4. `lockReason` displays "Modo visualizacao - apenas professores registram"

**Key integration point:**
```typescript
// Line 338
setIsViewOnly(!canRecordAttendance(role))

// Line 464
const isDisabled = isLocked || isFutureDate || isViewOnly
```

### Attendance Data Flow

**Source:** `lib/api/attendance.ts`

When saving chamada:
1. Session created in `sessoes_aula` table (no explicit professor_id in saveChamada)
2. Attendance records in `frequencia` table
3. Audit trail via `attendanceImmutability` service

**Important:** The `saveChamada` method does NOT require professor_id - it uses turma_id and creates session based on that.

## Design Options Analysis

### Option A: Session-Based Role Impersonation

**Concept:** Admin temporarily assumes `professor` role in auth context.

| Pro | Con |
|-----|-----|
| Clean permission model | Requires auth context changes |
| All existing checks work automatically | Security risk if not isolated |
| No new context needed | May affect other pages unexpectedly |

**Complexity:** HIGH - Touches core auth

### Option B: Demo Turma Assignment (Database)

**Concept:** Admin self-assigns as professor_id on a specific turma.

| Pro | Con |
|-----|-----|
| Uses existing turma.professor_id | Requires database modification |
| Natural permission flow | Must handle cleanup |
| Audit trail is real | May conflict with real professor assignments |

**Complexity:** MEDIUM - Database changes needed

### Option C: Demo Mode Context (RECOMMENDED)

**Concept:** New context `useDemoMode` that:
1. Stores demo state in sessionStorage
2. Provides `isDemoMode`, `enterDemoMode()`, `exitDemoMode()`
3. Overrides `isViewOnly` computation in chamada page
4. Shows distinctive visual indicator (purple/orange banner)

| Pro | Con |
|-----|-----|
| No database changes | New context to maintain |
| Follows EscolaContext pattern | Must be integrated in affected pages |
| Session-scoped (auto-cleanup) | Actions still save with admin user_id |
| Easy to toggle on/off | Need clear visual distinction |

**Complexity:** LOW - Follows established pattern

## Recommended Approach

### Demo Mode Context

Create `contexts/demo-mode-context.tsx` following EscolaContext pattern:

```typescript
// Proposed structure
interface DemoModeContextType {
  isDemoMode: boolean
  demoTurmaId: string | null
  enterDemoMode: (turmaId: string) => void
  exitDemoMode: () => void
  canUseDemoMode: boolean // true only for admin
}
```

### Integration Points

1. **Chamada page:** Override `isViewOnly` when `isDemoMode && demoTurmaId === currentTurmaId`
2. **Header/Banner:** Show distinctive "MODO DEMO" indicator
3. **Atribuicoes page:** Add "Demo" button on turma cards for admin
4. **Dashboard sidebar:** Show demo indicator if active

### Visual Design

```
+--------------------------------------------------+
| MODO DEMONSTRACAO                    [Sair Demo] |
| Voce esta demonstrando como professor            |
+--------------------------------------------------+
```

- Color: Purple/violet (distinct from blue view-only, yellow escola selector)
- Icon: Presentation/Demo icon (Tv2 or Presentation from lucide)
- Position: Same as ViewOnlyNotice (below date nav)

## Standard Stack

### Core (Already Available)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Context | 18.x | State management | Matches EscolaContext |
| sessionStorage | Web API | Persistence | Per Phase 7.1 decision |
| lucide-react | 0.400+ | Icons | Existing UI system |

### Supporting (Already Available)
| Library | Purpose | When to Use |
|---------|---------|-------------|
| shadcn/ui Alert | Banner component | Demo mode indicator |
| cn() util | Class merging | Conditional styling |

**No new dependencies required.**

## Architecture Patterns

### Recommended Project Structure
```
contexts/
├── escola-context.tsx    # Existing - escola selection
└── demo-mode-context.tsx # NEW - demo mode state

components/
├── attendance/
│   ├── view-only-notice.tsx  # Existing
│   └── demo-mode-banner.tsx  # NEW - demo indicator

lib/
├── auth.ts
│   └── canRecordAttendance() # Unchanged - core function
│   └── isDemoModeAllowed()   # NEW - admin check
```

### Pattern: Context with SessionStorage

**What:** React context + sessionStorage for session-scoped state
**When to use:** Admin-only features that should clear on tab close
**Example:** See EscolaContext implementation

### Pattern: Computed Permission Override

**What:** Combine base permission with context state
**When to use:** Temporary permission elevation
**Example:**
```typescript
const baseViewOnly = !canRecordAttendance(role)
const effectiveViewOnly = isDemoMode ? false : baseViewOnly
```

### Anti-Patterns to Avoid

- **Modifying auth context directly** - Keep auth pure, use separate context
- **Persisting demo state to database** - Use sessionStorage only
- **Allowing demo on production turmas** - Consider optional escola/turma restriction

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| State persistence | Custom localStorage wrapper | sessionStorage directly | Simple, session-scoped |
| Hydration handling | Custom solution | EscolaContext pattern | Proven SSR-safe |
| Visual indicator | Custom div | shadcn Alert component | Design consistency |

## Common Pitfalls

### Pitfall 1: SSR Hydration Mismatch
**What goes wrong:** Server renders without sessionStorage, client has value
**Why it happens:** sessionStorage is client-only
**How to avoid:** Use `hydrated` state flag, read in useEffect
**Warning signs:** React hydration warning in console

### Pitfall 2: Demo Mode Persisting Across Sessions
**What goes wrong:** User expects clean slate, sees demo mode
**Why it happens:** Using localStorage instead of sessionStorage
**How to avoid:** Explicitly use sessionStorage per CONTEXT.md decision

### Pitfall 3: Actions Attributed to Wrong User
**What goes wrong:** Audit trail shows admin, not professor
**Why it happens:** Demo mode doesn't change auth user
**How to avoid:** This is INTENTIONAL - admin actions should show admin user_id for accountability

### Pitfall 4: Demo Banner Hidden by Other Alerts
**What goes wrong:** User forgets they're in demo mode
**Why it happens:** Too many competing visual elements
**How to avoid:** Make demo banner fixed/sticky or highly distinctive (purple)

## Code Examples

### Demo Mode Context (Proposed)

```typescript
// Source: Following EscolaContext pattern from contexts/escola-context.tsx
'use client'

import * as React from 'react'
import { useAuth } from '@/hooks/use-auth'

const STORAGE_KEY = 'gestao-fronteira-demo-mode'

interface DemoModeContextType {
  isDemoMode: boolean
  demoTurmaId: string | null
  enterDemoMode: (turmaId: string) => void
  exitDemoMode: () => void
  canUseDemoMode: boolean
}

const DemoModeContext = React.createContext<DemoModeContextType | null>(null)

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const { userProfile } = useAuth()
  const [demoTurmaId, setDemoTurmaId] = React.useState<string | null>(null)
  const [hydrated, setHydrated] = React.useState(false)

  // Hydrate from sessionStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (stored) {
        setDemoTurmaId(stored)
      }
      setHydrated(true)
    }
  }, [])

  const canUseDemoMode = userProfile?.tipo_usuario === 'admin'
  const isDemoMode = hydrated && !!demoTurmaId && canUseDemoMode

  const enterDemoMode = React.useCallback((turmaId: string) => {
    setDemoTurmaId(turmaId)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, turmaId)
    }
  }, [])

  const exitDemoMode = React.useCallback(() => {
    setDemoTurmaId(null)
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  return (
    <DemoModeContext.Provider value={{
      isDemoMode,
      demoTurmaId,
      enterDemoMode,
      exitDemoMode,
      canUseDemoMode,
    }}>
      {children}
    </DemoModeContext.Provider>
  )
}

export function useDemoMode() {
  const context = React.useContext(DemoModeContext)
  if (!context) {
    throw new Error('useDemoMode must be used within a DemoModeProvider')
  }
  return context
}
```

### Demo Mode Banner Component (Proposed)

```typescript
// Source: Following ViewOnlyNotice pattern
import { Presentation, X } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DemoModeBannerProps {
  onExit: () => void
  className?: string
}

export function DemoModeBanner({ onExit, className }: DemoModeBannerProps) {
  return (
    <Alert className={cn("bg-purple-50 border-purple-200", className)}>
      <Presentation className="h-4 w-4 text-purple-600" />
      <AlertTitle className="text-purple-800 flex items-center justify-between">
        <span>Modo Demonstracao</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onExit}
          className="h-6 text-purple-600 hover:text-purple-800"
        >
          <X className="h-4 w-4 mr-1" />
          Sair
        </Button>
      </AlertTitle>
      <AlertDescription className="text-purple-700">
        Voce esta demonstrando o fluxo de professor. Acoes serao registradas com seu usuario admin.
      </AlertDescription>
    </Alert>
  )
}
```

### Chamada Page Integration (Proposed Change)

```typescript
// In chamada/page.tsx, modify the view-only check

// Import
import { useDemoMode } from '@/contexts/demo-mode-context'

// In component
const { isDemoMode, demoTurmaId, exitDemoMode } = useDemoMode()

// Modify view-only calculation (around line 338)
const baseViewOnly = !canRecordAttendance(role)
const inDemoForThisTurma = isDemoMode && demoTurmaId === turmaId
setIsViewOnly(inDemoForThisTurma ? false : baseViewOnly)

// In render, add demo banner above ViewOnlyNotice
{inDemoForThisTurma && (
  <DemoModeBanner onExit={exitDemoMode} />
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| localStorage for admin state | sessionStorage | Phase 7.1 | Session-scoped, auto-cleanup |
| Inline permission checks | Centralized `canRecordAttendance` | Phase 12 | Single source of truth |
| Role switching in auth | Context-based override | Now | Cleaner separation of concerns |

## Open Questions

1. **Should demo mode be restricted to specific "test" escolas?**
   - What we know: Current requirement says "escola/turma de teste"
   - What's unclear: Does "de teste" mean a flagged test escola or any escola?
   - Recommendation: For MVP, allow any escola. Add restriction flag later if needed.

2. **Should demo actions create actual database records?**
   - What we know: `saveChamada` will create real records
   - What's unclear: Is this acceptable or should demo be ephemeral?
   - Recommendation: Create real records with admin user_id for demo clarity. Consider adding `is_demo` flag to session table in future if isolation needed.

3. **Entry point for demo mode?**
   - What we know: Atribuicoes page shows turma cards
   - What's unclear: Best UX for entering demo mode
   - Recommendation: Add "Demonstrar" button on turma cards in Atribuicoes page for admin users.

## Files That Need Modification

| File | Change Type | Description |
|------|-------------|-------------|
| `contexts/demo-mode-context.tsx` | NEW | Demo mode context and provider |
| `components/attendance/demo-mode-banner.tsx` | NEW | Visual demo indicator |
| `components/attendance/index.ts` | MODIFY | Export new component |
| `app/(dashboard)/layout.tsx` | MODIFY | Wrap with DemoModeProvider |
| `app/(dashboard)/dashboard/turmas/[id]/chamada/page.tsx` | MODIFY | Integrate demo mode check |
| `app/(dashboard)/dashboard/atribuicoes/page.tsx` | MODIFY | Add demo entry button |

## Implementation Complexity Assessment

| Task | Complexity | Estimate |
|------|------------|----------|
| DemoModeContext | LOW | 1 hour |
| DemoModeBanner component | LOW | 30 min |
| Provider integration in layout | LOW | 15 min |
| Chamada page integration | LOW | 1 hour |
| Atribuicoes page demo button | MEDIUM | 1 hour |
| Testing and refinement | MEDIUM | 1 hour |

**Total estimate:** 4-5 hours

## Sources

### Primary (HIGH confidence)
- `contexts/escola-context.tsx` - EscolaContext pattern reference
- `lib/auth.ts` - canRecordAttendance implementation
- `app/(dashboard)/dashboard/turmas/[id]/chamada/page.tsx` - View-only integration
- `components/attendance/view-only-notice.tsx` - Banner component pattern

### Secondary (MEDIUM confidence)
- [User Impersonation in Web Applications - DEV Community](https://dev.to/mohosin2126/enhancing-support-and-administration-with-user-impersonation-in-web-applications-reactjsapollo-7jf)
- [Secure User Impersonation Feature - DEV Community](https://dev.to/akash_shukla/-how-i-built-a-secure-and-clean-user-impersonation-feature-reactjs-nodejs-40kn)
- [User Impersonation Risks - Authress](https://authress.io/knowledge-base/academy/topics/user-impersonation-risks)
- [User Remote Support via Impersonation - Medium](https://medium.com/saas-infra/user-impersonation-532e74a8f5f5)

### Tertiary (LOW confidence)
- General React admin patterns from web search

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing project patterns
- Architecture: HIGH - Following EscolaContext precedent
- Pitfalls: HIGH - Based on actual codebase analysis
- Implementation: HIGH - Clear integration points identified

**Research date:** 2026-01-20
**Valid until:** 2026-02-20 (30 days - stable patterns)
