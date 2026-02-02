# Phase 15: Technical Debt Cleanup - Research

**Researched:** 2026-01-20
**Domain:** Code quality, refactoring, integration patterns
**Confidence:** HIGH

## Summary

Phase 15 consolidates findings from three audit documents (PAGE-AUDIT.md, CODE-AUDIT.md, INTEGRATION-AUDIT.md) into actionable technical debt cleanup tasks. The research has verified the following key areas:

1. **TODOs Inventory:** 13+ TODOs across pages, components, and lib files - all documented with specific locations and effort estimates
2. **Mock Data:** Notas page uses mock data but a GradesApiService already exists (781 LOC) - requires integration, not new API creation
3. **Component Naming:** 5 kebab-case components identified that need renaming to PascalCase
4. **Large Components:** AttendanceGrid (1,078 LOC) and FrequenciaWorkflow (622 LOC) need refactoring
5. **Direct Supabase Queries:** Dashboard page and diario page have direct queries that should move to API services
6. **Error Tracking:** Logger infrastructure exists with TODO for Sentry/LogRocket integration

**Primary recommendation:** Execute cleanup in dependency order - start with API services consolidation (CLN-07) to enable mock data replacement (CLN-04), then complete remaining TODOs, and finally add error tracking.

## Standard Stack

The established patterns for this cleanup work:

### Core Patterns (Already in Place)
| Pattern | Location | Purpose | Why Standard |
|---------|----------|---------|--------------|
| BaseApiService | `lib/api/base.ts` | CRUD operations | Typed returns, error handling |
| VivenciasApiService | `lib/api/vivencias.ts` | Feature API example | Exemplar pattern for new services |
| React Query | Throughout app | Server state | Consistent data fetching |
| Structured Logger | `lib/logger.ts` | Logging | Educational context support |

### Supporting (To Add)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @sentry/nextjs | 9.32.0+ | Error tracking | Production monitoring |
| logrocket | latest | Session replay | User experience debugging |

**Installation (for error tracking only):**
```bash
pnpm add @sentry/nextjs
# LogRocket is optional, can be added later
```

## Architecture Patterns

### Recommended Refactoring Structure

**AttendanceGrid.tsx (1,078 LOC) - Split into:**
```
components/attendance/
├── AttendanceGrid.tsx          # Main grid container (~300 LOC)
├── AttendanceGridHeader.tsx    # Header with controls (~150 LOC)
├── AttendanceGridRow.tsx       # Single student row (~200 LOC)
├── AttendanceGridSummary.tsx   # Summary statistics (~150 LOC)
├── AttendanceGridToolbar.tsx   # Batch actions toolbar (~150 LOC)
└── index.ts                    # Barrel export
```

**FrequenciaWorkflow.tsx (622 LOC) - Split into:**
```
components/attendance/
├── FrequenciaWorkflow.tsx      # Main workflow container (~200 LOC)
├── WorkflowStepIndicator.tsx   # Step progress bar (~100 LOC)
├── DisciplinaSelector.tsx      # Subject selection (~150 LOC)
├── TurmaSelector.tsx           # Class selection (~150 LOC)
└── index.ts                    # Updated barrel export
```

### Pattern 1: API Service Migration

**What:** Move direct Supabase queries from pages to API services
**When to use:** Any page with direct `supabase.from()` calls

**Current (Dashboard page.tsx):**
```typescript
// Lines 104-130: Direct Supabase queries - VIOLATION
const [alunosResult, escolasResult, ...] = await Promise.all([
  supabase.from('alunos').select(...),
  supabase.from('escolas').select(...),
])
```

**Target (DashboardStatsApiService):**
```typescript
// lib/api/dashboard-stats.ts
import { BaseApiService } from './base'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

export class DashboardStatsApiService extends BaseApiService {
  constructor() {
    super('dashboard-stats')
  }

  async getStats(): Promise<DashboardStats> {
    const [alunosResult, escolasResult, ...] = await Promise.all([
      supabase.from('alunos').select('id', { count: 'exact', head: true }).eq('ativo', true),
      supabase.from('escolas').select('id', { count: 'exact', head: true }).eq('ativo', true),
      // ... other queries
    ])

    return {
      totalAlunos: alunosResult.count || 0,
      totalEscolas: escolasResult.count || 0,
      // ... other stats
    }
  }
}

export const dashboardStatsApi = new DashboardStatsApiService()
```

### Pattern 2: Component Renaming

**Current (kebab-case):**
```
components/attendance/demo-mode-banner.tsx
components/attendance/view-only-notice.tsx
components/diary/class-diary-detail.tsx
components/diary/class-diary-filter.tsx
components/diary/class-diary-list.tsx
```

**Target (PascalCase):**
```
components/attendance/DemoModeBanner.tsx
components/attendance/ViewOnlyNotice.tsx
components/diary/ClassDiaryDetail.tsx
components/diary/ClassDiaryFilter.tsx
components/diary/ClassDiaryList.tsx
```

**Update imports in:**
- `components/attendance/index.ts`
- Any files importing these components

### Anti-Patterns to Avoid
- **Renaming without import updates:** Always use IDE refactoring or grep for imports
- **Breaking barrel exports:** Ensure `index.ts` files are updated
- **Large PRs:** Split refactors into atomic commits per component

## Don't Hand-Roll

Problems that have existing solutions in the codebase:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Grade CRUD | New API service | `lib/api/grades.ts` (781 LOC) | Already complete with validation |
| Dashboard stats | Inline queries | Create DashboardStatsApiService | Follow existing patterns |
| Error tracking | Custom solution | Sentry SDK | Industry standard, Next.js support |
| Component splitting | Manual extraction | IDE refactoring tools | Preserves references |

**Key insight:** The Notas mock data replacement does NOT require creating GradesApiService - it already exists at 781 LOC. The task is to **integrate** the existing service with the page.

## Common Pitfalls

### Pitfall 1: Mock Data Replacement Breaking UI
**What goes wrong:** Replacing mock data changes data structure, breaking UI components
**Why it happens:** Mock data structure differs from API response structure
**How to avoid:**
1. Compare mock interface with GradesApiService return types
2. Create adapter function if needed
3. Test with empty data state
**Warning signs:** TypeScript errors after switching data source

### Pitfall 2: Component Rename Breaking Imports
**What goes wrong:** Renaming file doesn't update all import paths
**Why it happens:** Case-insensitive file systems (Windows) can hide issues
**How to avoid:**
1. Use `git mv` for renames (preserves history)
2. Run `pnpm typecheck` after each rename
3. Grep for old filename in codebase
**Warning signs:** Build works locally but fails in CI (Linux case-sensitive)

### Pitfall 3: Refactoring Large Components
**What goes wrong:** Breaking component into too many pieces, creating prop drilling
**Why it happens:** Over-enthusiasm in splitting
**How to avoid:**
1. Split into max 4-5 subcomponents initially
2. Use composition, not prop drilling
3. Keep state in parent, pass handlers down
**Warning signs:** More than 5 props passing through intermediaries

### Pitfall 4: Sentry Configuration in Wrong File
**What goes wrong:** Server-side initialization in client file or vice versa
**Why it happens:** Next.js 15 has specific file requirements
**How to avoid:**
1. Client: `instrumentation-client.ts`
2. Server: `sentry.server.config.ts`
3. Edge: `sentry.edge.config.ts`
**Warning signs:** Errors in browser console about SSR or missing window

## TODOs Inventory (Verified)

### High Priority (Block Release)
| File | TODO | Effort | Category |
|------|------|--------|----------|
| `alunos/[id]/diario/page.tsx:119` | Implement edit flow | 2h | CLN-01 |
| `alunos/[id]/diario/page.tsx:124` | Implement delete with confirmation | 1h | CLN-01 |
| `alunos/[id]/diario/relatorio/page.tsx:164` | Implement actual save to API | 2h | CLN-01 |
| `alunos/[id]/diario/relatorio/page.tsx:175` | Implement actual finalization to API | 1h | CLN-01 |

### Medium Priority (Phase 15)
| File | TODO | Effort | Category |
|------|------|--------|----------|
| `alunos/[id]/diario/relatorio/page.tsx:194` | Implement print/PDF export | 2h | CLN-01 |
| `alunos/[id]/boletim/page.tsx:438` | Implement PDF export with jspdf | 2h | CLN-01 |
| `diario/page.tsx:395` | Open edit modal with lesson data | 1h | CLN-01 |
| `AbrirAulaWorkflow.tsx:23` | Implement actual logic to open class session | 2h | CLN-02 |
| `role-specific-dashboards.tsx:105,396,587` | Calculate baixa frequencia properly | 3h | CLN-02 |
| `role-specific-dashboards.tsx:790` | Calculate grade from notas table | 2h | CLN-02 |
| `use-compliance-warnings.ts:16` | Implement compliance warnings logic | 3h | CLN-03 |
| `lib/api/attendance.ts:573` | Calculate frequencia from actual data | 1h | CLN-03 |
| `lib/api/schools.ts:311` | Add audit logging for status changes | 1h | CLN-03 |

### Low Priority (Phase 16+)
| File | TODO | Effort | Category |
|------|------|--------|----------|
| `lib/logger.ts:197` | Integrate Sentry/LogRocket | 3-4h | CLN-08 |

## Mock Data Analysis

### Notas Page Mock Data

**Location:** `app/(dashboard)/dashboard/notas/page.tsx`
**Lines:** 70-159 (mockTurmasNotas constant)

**Mock Structure:**
```typescript
interface TurmaNotas {
  id: string
  nome: string
  serie: string
  escola: string
  professor: string
  ano_letivo: number
  disciplinas: string[]
  alunos: NotaAluno[]
}
```

**Existing Database Schema (`notas` table):**
```typescript
{
  id: string
  matricula_id: string      // FK to matriculas
  disciplina: string
  bimestre: number          // 1-4
  nota: number              // 0-10
  tipo_avaliacao: string
  data_avaliacao: string
  observacoes: string | null
  created_at: string | null
}
```

**Existing GradesApiService Methods:**
- `getByMatricula(matriculaId)` - Get grades for enrollment
- `getByTurma(turmaId, options)` - Get all grades for a class
- `calculateAverage(matriculaId, disciplina, bimestres)` - Calculate grade average
- `create(input)` - Create grade record
- `update(gradeId, updates)` - Update grade
- `delete(gradeId)` - Delete grade

**Integration Path:**
1. Notas page needs to fetch turmas via ClassesApiService
2. For each turma, fetch students via enrollment (matriculas)
3. For each student, fetch grades via GradesApiService
4. Transform data to match existing UI structure

## Component Naming Violations

### Files to Rename (5 total)
| Current | Target | Location |
|---------|--------|----------|
| `demo-mode-banner.tsx` | `DemoModeBanner.tsx` | `components/attendance/` |
| `view-only-notice.tsx` | `ViewOnlyNotice.tsx` | `components/attendance/` |
| `class-diary-detail.tsx` | `ClassDiaryDetail.tsx` | `components/diary/` |
| `class-diary-filter.tsx` | `ClassDiaryFilter.tsx` | `components/diary/` |
| `class-diary-list.tsx` | `ClassDiaryList.tsx` | `components/diary/` |

**Note:** The exports are already PascalCase (`export function DemoModeBanner`), only file names need updating.

## Large Component Analysis

### AttendanceGrid.tsx (1,078 LOC)

**Current Structure:**
```
- Types (lines 1-100): Interfaces for Student, AttendanceRecord, SessionLockInfo, Props
- Main component (lines 100-1078):
  - State management (~100 lines)
  - Lock calculation (~80 lines)
  - Data fetching (~100 lines)
  - Event handlers (~150 lines)
  - Render helpers (~100 lines)
  - JSX return (~550 lines)
```

**Recommended Split:**
1. **AttendanceGridHeader** - Controls, filters, lock indicator
2. **AttendanceGridRow** - Single student attendance row with cells
3. **AttendanceGridSummary** - Present/Absent/Attestado counts
4. **AttendanceGridToolbar** - Batch mark present/absent buttons

### FrequenciaWorkflow.tsx (622 LOC)

**Current Structure:**
```
- Types (lines 1-60): Disciplina, Turma, SessaoAtiva, WorkflowStep
- Helper functions (lines 60-75): getDisciplinaIcon
- Main component (lines 76-622):
  - State management (~50 lines)
  - Effect hooks (~100 lines)
  - Handlers (~150 lines)
  - Step renders (~300 lines)
```

**Recommended Split:**
1. **WorkflowStepIndicator** - Progress bar showing current step
2. **DisciplinaSelector** - Subject selection cards with icons
3. **TurmaSelector** - Class selection with student counts

## Direct Supabase Queries

### Dashboard Page (`app/(dashboard)/dashboard/page.tsx`)

**Lines 96-130:** 7 parallel Supabase queries
```typescript
const [alunosResult, escolasResult, turmasResult, ...] = await Promise.all([
  supabase.from('alunos').select('id', { count: 'exact', head: true })...
  supabase.from('escolas').select('id', { count: 'exact', head: true })...
  // 5 more queries
])
```

**Recommendation:** Create `lib/api/dashboard-stats.ts`

### Diario Page (`app/(dashboard)/diario/page.tsx`)

**Lines 402-412:** Direct delete operation
```typescript
const { error } = await supabase.from('sessoes_aula').delete().eq('id', lesson.id)
```

**Recommendation:** Add `deleteSession` method to existing ClassDiaryApiService or create if not exists

## Error Tracking Integration

### Sentry Setup for Next.js 15

**Installation:**
```bash
pnpm add @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

**Files Created:**
```
sentry.client.config.ts     # Client-side init
sentry.server.config.ts     # Server-side init
sentry.edge.config.ts       # Edge runtime init
instrumentation.ts          # onRequestError hook
next.config.ts              # Updated with withSentryConfig
```

**Client Configuration (instrumentation-client.ts):**
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration(),
  ],
});
```

**Integration with Existing Logger:**
```typescript
// lib/logger.ts - Update sendToMonitoringService
import * as Sentry from '@sentry/nextjs';

private async sendToMonitoringService(logs: LogEntry[]): Promise<void> {
  for (const log of logs) {
    if (log.level === 'error' || log.level === 'critical') {
      Sentry.captureMessage(log.message, {
        level: log.level === 'critical' ? 'fatal' : 'error',
        extra: log.context,
      });
    }
  }
}
```

### LogRocket (Optional)

LogRocket is client-only and provides session replay. Can be added later for enhanced debugging.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| console.log debugging | Structured logger | Phase 8 | Already implemented |
| Direct Supabase in pages | API services layer | Phase 4+ | Partial adoption |
| Single large components | Composition pattern | Best practice | Needs enforcement |

**Deprecated/outdated:**
- `console.log` for production logging - Use `logger` from `lib/logger.ts`
- Direct Supabase queries in pages - Use API services from `lib/api/`

## Open Questions

1. **PDF Export Library Choice**
   - What we know: jsPDF mentioned in TODO
   - What's unclear: Whether to use jsPDF or @react-pdf/renderer
   - Recommendation: Use existing `lib/export/content-pdf.ts` pattern if it exists, otherwise jsPDF for simplicity

2. **Sentry DSN Configuration**
   - What we know: Needs Sentry account/project setup
   - What's unclear: Who creates the Sentry project
   - Recommendation: Add env variable placeholder, document setup steps

## Sources

### Primary (HIGH confidence)
- Codebase analysis via Grep/Read tools
- `PAGE-AUDIT.md` - Verified locations and classifications
- `CODE-AUDIT.md` - Verified component sizes and patterns
- `INTEGRATION-AUDIT.md` - Verified TODO inventory

### Secondary (MEDIUM confidence)
- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/) - Official setup guide
- [LogRocket SSR Documentation](https://docs.logrocket.com/docs/using-logrocket-with-server-side-rendering) - Client-only requirement

### Tertiary (LOW confidence)
- None - All findings verified against codebase

## Metadata

**Confidence breakdown:**
- TODOs Inventory: HIGH - Grep verified all locations
- Mock Data Analysis: HIGH - Read verified structure and existing API
- Component Naming: HIGH - Glob confirmed file names
- Large Components: HIGH - wc -l confirmed line counts
- Direct Queries: HIGH - Read confirmed code patterns
- Error Tracking: MEDIUM - WebSearch for current best practices

**Research date:** 2026-01-20
**Valid until:** 2026-02-20 (30 days for stable codebase)
