# Phase 8: Code Standards - Research

**Researched:** 2026-01-19
**Domain:** Data Fetching, Filtering, Logging Patterns
**Confidence:** HIGH

## Summary

This research analyzes the current codebase to identify patterns and gaps for standardizing data fetching, filtering, and logging. The codebase has a well-established `lib/api/` layer with 22 service files following the `BaseApiService` pattern, but significant inconsistency exists between pages that use the API layer vs inline Supabase queries.

The logging infrastructure (`lib/logger.ts`) already exists with the required 4 levels (debug, info, warn, error) plus critical. The main gap is ~85 `console.error` calls scattered across 25 files that need migration.

**Primary recommendation:** Migrate inline Supabase queries to lib/api/ services using the established patterns, replace console.error with logger.error, and document the standardized patterns in CONVENTIONS.md.

## Current State Analysis

### 1. Data Fetching Patterns Found

**Pattern A: lib/api/ Service Layer (Established)**
- Location: `lib/api/*.ts` (22 files)
- Structure: Class-based services extending `BaseApiService`
- Examples: `AttendanceApiService`, `VivenciasApiService`, `StudentsApiService`
- Usage: Exports singleton instance (e.g., `export const attendanceApi = new AttendanceApiService()`)

**Pattern B: React Query Hooks (Partial)**
- Location: `hooks/use-diary-query.ts`, `hooks/use-users-query.ts`
- Structure: `useQuery`/`useMutation` with query keys from `lib/react-query.ts`
- Caching: Configured with staleTime (1-5 min), gcTime (5-10 min)
- Invalidation: `invalidateQueries` helpers exported

**Pattern C: Inline Supabase in Pages (ANTI-PATTERN)**
- Prevalence: 12 files with `supabase.from()` calls
- Key files:
  - `app/(dashboard)/diario/page.tsx` - 5 inline queries
  - `app/(dashboard)/dashboard/alunos/page.tsx` - 3 inline queries
  - `app/(dashboard)/dashboard/turmas/page.tsx` - 2 inline queries
  - `app/(dashboard)/relatorios/frequencia/page.tsx` - 1 inline query
  - `app/(dashboard)/relatorios/bolsa-familia/page.tsx` - 3 inline queries
  - `app/(dashboard)/relatorios/conteudo/page.tsx` - 2 inline queries
  - `app/(dashboard)/dashboard/turmas/[id]/chamada/page.tsx` - 4 inline queries
  - `app/(dashboard)/dashboard/alunos/[id]/page.tsx` - 1 inline query
  - `app/(dashboard)/dashboard/matriculas/nova/page.tsx` - 1 inline query
  - `app/(dashboard)/dashboard/alunos/[id]/diario/*.tsx` - 6 inline queries

### 2. Filter Implementations Found

**Pattern A: InlineFilters Component**
- Location: `components/filters/inline-filters.tsx`
- Default value: Options with `value: 'todos'` or `value: 'todas'`
- State management: Local useState per filter
- Clear behavior: `onClearAll` resets to 'todos'/'todas'

**Pattern B: Local State Filters (Current Standard)**
- Example from `alunos/page.tsx`:
```typescript
const [statusFilter, setStatusFilter] = useState('todos')
const [sexoFilter, setSexoFilter] = useState('todos')
```
- Filtering: Client-side via `.filter()` on fetched data
- Reset: Manual `setStatusFilter('todos')`

**Pattern C: ClassDiaryFilter Component**
- Location: `components/diary/class-diary-filter.tsx`
- Default value: `'all'` instead of `'todos'`
- Apply pattern: Explicit "Buscar" button to apply filters

**Filter Default Value Inconsistency:**
| Component | Default Value | Portuguese |
|-----------|--------------|------------|
| InlineFilters | 'todos' | Yes |
| alunos/page | 'todos' | Yes |
| turmas/page | 'todas' | Yes |
| ClassDiaryFilter | 'all' | No |

**URL Sync:** Currently NO pages sync filters to URL. All filters are local state.

### 3. console.error Usage

**Total: 85 occurrences across 25 files**

**By Category:**

| Location | Count | Notes |
|----------|-------|-------|
| Pages (dashboard) | 28 | Should use logger |
| Pages (relatorios) | 13 | Should use logger |
| lib/api/ | 26 | Should use logger |
| lib/services/ | 3 | Should use logger |
| lib/utils/ | 4 | Should use logger |
| lib/realtime/ | 5 | Should use logger |
| lib/hooks/ | 2 | Should use logger |
| scripts/ | 6 | May keep for CLI output |
| lib/logger.ts | 2 | Expected (internal) |

**Key Files Requiring Migration:**
1. `lib/api/multi-guardian.ts` - 12 console.error calls
2. `lib/api/inep-integration.ts` - 11 console.error calls
3. `app/(dashboard)/dashboard/turmas/[id]/chamada/page.tsx` - 5 calls
4. `app/(dashboard)/relatorios/bolsa-familia/page.tsx` - 5 calls
5. `lib/realtime/aulas-abertas-listener.ts` - 5 calls

### 4. lib/api/ Structure Analysis

**Current Services (22 files):**
```
lib/api/
├── base.ts              # BaseApiService abstract class
├── enhanced-base.ts     # Extended base with audit
├── attendance.ts        # AttendanceApiService (good example)
├── vivencias.ts         # VivenciasApiService (good example)
├── students.ts          # StudentsApiService
├── classes.ts           # ClassesApiService
├── schools.ts
├── users.ts
├── grades.ts
├── reports.ts
├── audit.ts
├── bolsa-familia.ts
├── class-diary.ts
├── configs.ts
├── enhanced-attendance.ts
├── error-handler.ts
├── inep-integration.ts
├── lesson-content.ts
├── multi-guardian.ts
├── rate-limiting.ts
└── storage.ts
```

**Established Pattern (from base.ts):**
```typescript
export abstract class BaseApiService {
  protected tableName: string

  constructor(tableName: string) {
    this.tableName = tableName
  }

  async getAll<T>(): Promise<T[]>
  async getById<T>(id: string): Promise<T | null>
  async create<T>(data: Partial<T>): Promise<T>
  async update<T>(id: string, data: Partial<T>): Promise<T>
  async delete(id: string): Promise<void>
  async getPaginated<T>(params: PaginationParams): Promise<PaginatedResult<T>>
  async count(filter?: Record<string, any>): Promise<number>
}
```

**Naming Convention:**
- Class: `[Domain]ApiService` (e.g., `AttendanceApiService`)
- Export: `export const [domain]Api = new [Domain]ApiService()`
- Methods: `get*`, `create*`, `update*`, `delete*`, `save*`

## Existing Patterns to Follow

### 1. BaseApiService Pattern (lib/api/base.ts)

**Key Features:**
- Extends with `tableName` for automatic table operations
- Uses `logger` for all error logging
- Returns typed data (not raw Supabase response)
- Handles common errors (PGRST116 = not found)

### 2. VivenciasApiService Pattern (lib/api/vivencias.ts) - BEST EXAMPLE

**Why this is the best example:**
- Clean JSDoc comments
- Input/Output types defined at top
- Uses logger.error AND logger.info for audit
- Typed return values
- Handles PGRST116 gracefully

```typescript
async create(data: CreateVivenciaInput): Promise<Vivencia> {
  try {
    const { data: created, error } = await supabase
      .from('vivencias')
      .insert({...})
      .select()
      .single()

    if (error) {
      logger.error('Error creating vivencia:', error)
      throw error
    }

    logger.info('Vivencia created successfully', {
      feature: 'diario-infantil',
      action: 'create_vivencia',
      metadata: {...}
    })

    return created as Vivencia
  } catch (error) {
    logger.error('Error in create for vivencias:', error)
    throw error
  }
}
```

### 3. React Query Usage Pattern (hooks/use-diary-query.ts)

**Key Features:**
- Dedicated query keys: `diaryQueryKeys.turmas.list()`
- Configured staleTime per data type
- Uses logger for errors
- Exports query invalidation helpers

**staleTime Guidelines:**
| Data Type | staleTime | Rationale |
|-----------|-----------|-----------|
| Turmas (rarely change) | 5 min | Static reference data |
| Lessons (moderate) | 2 min | Changes during session |
| Sessions (active) | 1 min | Real-time relevance |
| Risk indicators | 3 min | Computed aggregates |

### 4. Logger Usage Pattern (lib/logger.ts)

**Existing Logger API:**
```typescript
// Available levels
logger.debug(message, context?)
logger.info(message, context?)
logger.warn(message, context?)
logger.error(message, error?, context?)
logger.critical(message, error?, context?)

// Context structure
interface LogContext {
  feature?: string      // e.g., 'attendance', 'diario'
  action?: string       // e.g., 'create_vivencia', 'load_turmas'
  metadata?: Record<string, any>
}

// Convenience functions
logError(message, error, context)
logUserAction(action, context)
logPerformance(label, fn, context)
```

## Gap Analysis

### STD-01: Data Fetching Standard

**Current State:** Mixed patterns - some use lib/api/, some use inline queries
**Gap:** ~15 pages with inline Supabase queries need migration
**Solution:** Migrate to lib/api/ services + React Query hooks

**Files Needing Work:**
1. `app/(dashboard)/diario/page.tsx` - Add to DiaryApiService
2. `app/(dashboard)/dashboard/alunos/page.tsx` - Use StudentsApiService
3. `app/(dashboard)/dashboard/turmas/page.tsx` - Use ClassesApiService
4. `app/(dashboard)/relatorios/frequencia/page.tsx` - Use ReportsApiService
5. `app/(dashboard)/relatorios/bolsa-familia/page.tsx` - Use BolsaFamiliaApiService
6. `app/(dashboard)/relatorios/conteudo/page.tsx` - Use ReportsApiService
7. `app/(dashboard)/dashboard/turmas/[id]/chamada/page.tsx` - Use AttendanceApiService
8. Plus 5 more pages under `alunos/[id]/diario/`

### STD-02: Filter Standard (Default: 'todos')

**Current State:** Inconsistent - 'todos', 'todas', 'all'
**Gap:** ClassDiaryFilter uses 'all' instead of 'todos'
**Solution:** Standardize all filters to use Portuguese 'todos'/'todas'

**Update Required:**
- `components/diary/class-diary-filter.tsx` - Change 'all' to 'todas'

### STD-03: Centralized Supabase Queries

**Current State:** 22 services in lib/api/, but pages bypass them
**Gap:** Pages directly import supabase and make queries
**Solution:** Route all queries through lib/api/ services

**Migration Priority:**
1. HIGH: Report pages (most complex queries)
2. HIGH: Chamada page (attendance critical)
3. MEDIUM: Diario page
4. MEDIUM: Alunos/Turmas list pages
5. LOW: Detail pages with simple queries

### STD-04: Logger Migration (console.error -> logger)

**Current State:** 85 console.error calls, logger exists but underused
**Gap:** Most files still use console.error
**Solution:** Replace with logger.error(message, error, context)

**Migration Pattern:**
```typescript
// BEFORE
console.error('Error fetching turmas:', err)

// AFTER
logger.error('Error fetching turmas', err, {
  feature: 'relatorios',
  action: 'fetch_turmas'
})
```

## Recommendations

### 1. Data Fetching Standard

**Proposed Pattern:**
```typescript
// 1. API Service (lib/api/[domain].ts)
export class DomainApiService extends BaseApiService {
  async getWithFilters(filters: DomainFilters): Promise<DomainItem[]> {
    try {
      // Query logic
      return data as DomainItem[]
    } catch (error) {
      logger.error('Error in getWithFilters', error, { feature: 'domain' })
      throw error
    }
  }
}
export const domainApi = new DomainApiService()

// 2. React Query Hook (hooks/use-domain-query.ts)
export function useDomainList(filters: DomainFilters) {
  return useQuery({
    queryKey: queryKeys.domain.list(filters),
    queryFn: () => domainApi.getWithFilters(filters),
    staleTime: 5 * 60 * 1000,
  })
}

// 3. Page Component
function DomainPage() {
  const { data, isLoading, error } = useDomainList(filters)
  // Render
}
```

### 2. Filter Standard

**Proposed Pattern:**
```typescript
// Default value constant
const FILTER_DEFAULT = 'todos' // or 'todas' for feminine nouns

// State initialization
const [statusFilter, setStatusFilter] = useState(FILTER_DEFAULT)

// Filter options
const filterOptions = [
  { value: 'todos', label: 'Todos' }, // or 'Todos os Status'
  { value: 'ativo', label: 'Ativos' },
  // ...
]

// Reset behavior
const clearFilters = () => {
  setStatusFilter(FILTER_DEFAULT)
  // ...
}
```

### 3. Logger Migration

**Phase 1 - lib/api/ (26 calls):**
Replace console.error in API services with logger.error

**Phase 2 - Pages (41 calls):**
Replace console.error in pages with logger.error

**Phase 3 - lib/utils/, services, hooks (14 calls):**
Replace remaining console.error calls

**Keep as console.error (6 calls):**
- `scripts/*.ts` - CLI scripts benefit from stdout

## Code Examples

### Example 1: API Service Method (from vivencias.ts)

```typescript
// Source: lib/api/vivencias.ts
async getByAluno(alunoId: string, limit: number = 50): Promise<Vivencia[]> {
  try {
    const { data, error } = await supabase
      .from('vivencias')
      .select('*')
      .eq('aluno_id', alunoId)
      .order('data_vivencia', { ascending: false })
      .limit(limit)

    if (error) {
      logger.error(`Error fetching vivencias for aluno ${alunoId}:`, error)
      throw error
    }

    return (data || []) as Vivencia[]
  } catch (error) {
    logger.error('Error in getByAluno for vivencias:', error)
    throw error
  }
}
```

### Example 2: React Query Hook (from use-diary-query.ts)

```typescript
// Source: hooks/use-diary-query.ts
export function useTurmas(options: UseTurmasOptions = {}) {
  const { escolaId, professorId, enabled = true } = options

  return useQuery({
    queryKey: diaryQueryKeys.turmas.list({ escolaId, professorId }),
    queryFn: async (): Promise<Turma[]> => {
      let query = supabase
        .from('turmas')
        .select('id, nome, serie, ano_letivo, escola_id, professor_id')
        .eq('ativo', true)
        .order('nome')

      if (escolaId) query = query.eq('escola_id', escolaId)
      if (professorId) query = query.eq('professor_id', professorId)

      const { data, error } = await query

      if (error) {
        logger.error('Error loading turmas:', error, {
          feature: 'diary-query',
          action: 'load_turmas',
        })
        throw error
      }

      return (data || []) as Turma[]
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    enabled,
  })
}
```

### Example 3: InlineFilters Usage (from alunos/page.tsx)

```typescript
// Source: app/(dashboard)/dashboard/alunos/page.tsx
<InlineFilters
  search={{
    value: search,
    onChange: setSearch,
    placeholder: 'Buscar por nome, CPF ou responsavel...',
  }}
  filters={[
    {
      id: 'status',
      placeholder: 'Status',
      value: statusFilter,
      options: [
        { value: 'todos', label: 'Todos os Status' },
        { value: 'matriculado', label: 'Matriculados' },
        { value: 'nao_matriculado', label: 'Nao Matriculados' },
      ],
      onChange: setStatusFilter,
      width: 'w-full sm:w-44',
    },
  ]}
  onClearAll={() => {
    setSearch('')
    setStatusFilter('todos')
  }}
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline Supabase in components | lib/api/ services | Phase 5-7 | Consistency |
| console.error everywhere | lib/logger.ts | Phase 7 | Observability |
| No caching | React Query | Phase 5 | Performance |
| Hardcoded filter values | InlineFilters component | Phase 6 | Reusability |

## Open Questions

1. **URL Sync for Filters**
   - What we know: Currently no pages sync filters to URL
   - What's unclear: Which pages should support URL-shareable filters?
   - Recommendation: Defer to Phase 9 or later - not in current requirements

2. **React Query vs useState+useEffect**
   - What we know: Some pages use React Query, most use useState+useEffect
   - What's unclear: Should ALL data fetching migrate to React Query?
   - Recommendation: Use React Query for list pages with caching needs, useState+useEffect acceptable for simple one-time fetches

## Sources

### Primary (HIGH confidence)
- `lib/api/base.ts` - BaseApiService pattern
- `lib/api/attendance.ts` - AttendanceApiService implementation
- `lib/api/vivencias.ts` - VivenciasApiService (best example)
- `lib/logger.ts` - Logger implementation with 4 levels
- `lib/react-query.ts` - Query key structure
- `hooks/use-diary-query.ts` - React Query usage pattern
- `components/filters/inline-filters.tsx` - Filter component

### Secondary (MEDIUM confidence)
- `app/(dashboard)/dashboard/alunos/page.tsx` - Current inline query pattern
- `app/(dashboard)/relatorios/frequencia/page.tsx` - Report page pattern

### Tertiary (LOW confidence)
- None - all findings from direct code inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Direct code analysis
- Architecture: HIGH - Established patterns exist
- Pitfalls: HIGH - Clear anti-patterns identified
- Migration scope: HIGH - File counts verified with grep

**Research date:** 2026-01-19
**Valid until:** 2026-02-19 (30 days - stable patterns)
