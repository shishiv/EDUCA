# Coding Conventions

**Analysis Date:** 2026-01-18

## Naming Patterns

**Files:**
- **Components (INCONSISTENT):**
  - `components/ui/`: kebab-case (`button.tsx`, `alert-dialog.tsx`, `form-field.tsx`)
  - `components/attendance/`: PascalCase (`AttendanceGrid.tsx`, `ChamadaHeader.tsx`)
  - `components/admin/`, `components/auth/`: kebab-case (`user-form.tsx`, `audit-log-viewer.tsx`)
  - **Recommendation:** Standardize to kebab-case for consistency with shadcn/ui pattern

- **Lib/API:** kebab-case (`error-handler.ts`, `class-diary.ts`, `brazilian-educational.ts`)
- **Hooks:** kebab-case with `use-` prefix (`use-auth.ts`, `use-diary-query.ts`)
- **Stores:** kebab-case with `-store` suffix (`app-store.ts`, `attendance-session-store.ts`)
- **Types:** kebab-case (`database.ts`, `diario-classe.ts`, `bolsa-familia.ts`)
- **Contexts:** kebab-case with `-context` suffix (`search-context.tsx`, `session-realtime-context.tsx`)

**Functions:**
- camelCase for all functions (`validateCPF`, `formatBrazilianPhone`, `getAttendanceStatus`)
- Async functions: verb prefix (`loadData`, `performSearch`, `markAttendance`)
- Event handlers: `handle` prefix (`handleOnline`, `handleOffline`)
- Boolean getters: `is` or `get` prefix (`isEditable`, `isSessionLocked`, `getPhaseFromSession`)

**Variables:**
- camelCase for local variables and parameters
- UPPER_SNAKE_CASE for constants (`ERROR_CODES`, `ERROR_STATUS_MAP`)

**Types/Interfaces:**
- PascalCase for types and interfaces (`AttendanceSession`, `StudentWithDetails`, `EducationalError`)
- Type aliases for database tables: PascalCase (`Aluno`, `Escola`, `Turma`)
- Props interfaces: `{Component}Props` pattern (`AttendanceGridProps`, `SearchProviderProps`)

**React Components:**
- PascalCase function names (`AttendanceGrid`, `SearchProvider`, `Button`)
- `displayName` assigned for forwardRef components

## Code Style

**Formatting:**
- No Prettier/Biome configured at project root
- Implicit ESLint formatting via Next.js defaults
- 2-space indentation (observed)
- Single quotes for strings
- Trailing semicolons

**Linting:**
- ESLint with `next/core-web-vitals` and `next/typescript` extends
- Key rules in `.eslintrc.json`:
  - `@typescript-eslint/no-unused-vars`: `error` (ignore `^_` prefixed args)
  - `@typescript-eslint/explicit-function-return-type`: `off`
  - `@typescript-eslint/no-explicit-any`: `warn`
  - `no-console`: `warn` (allow `warn`, `error`, `info`)
  - `no-eval`, `no-implied-eval`: `error` (security)
  - `@next/next/no-img-element`: `error`
  - React 19: `react/no-unknown-property` and `react/prop-types` off

**Run commands:**
```bash
pnpm lint         # Run ESLint
pnpm typecheck    # TypeScript type checking
```

## Import Organization

**Order (observed pattern):**
1. React imports (`'use client'` directive first if present)
2. Next.js imports (`next/navigation`, `next/server`)
3. External library imports (`@supabase/ssr`, `zod`, `sonner`, `zustand`)
4. Radix UI components (`@radix-ui/*`)
5. Internal UI components (`@/components/ui/*`)
6. Internal lib imports (`@/lib/*`)
7. Type imports (`@/types/*`)
8. Relative imports (`./`, `../`)

**Path Aliases:**
- `@/*` maps to project root (`./*`)
- Use `@/lib/supabase` not `../../../lib/supabase`

**Example:**
```typescript
'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type { Database } from '@/types/database'
```

## Error Handling

**Centralized Error System:**
- Location: `lib/error-handling.ts`
- Educational-domain specific error types via `EducationalErrorType` enum
- Severity levels: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`

**API Error Pattern:**
```typescript
// Use structured API error handler
import { handleApiError, createSuccessResponse, createErrorResponse } from '@/lib/api/error-handler'

// API route pattern
try {
  const result = await operation()
  return createSuccessResponse(result, 200)
} catch (error) {
  return handleApiError(error)
}
```

**Client-side Error Pattern:**
```typescript
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

try {
  await operation()
  toast.success('Operação realizada com sucesso')
} catch (error) {
  logger.error('Error message:', { error })
  toast.error('Erro ao realizar operação')
}
```

**Zod Validation Errors:**
```typescript
if (error instanceof z.ZodError) {
  return NextResponse.json({
    error: 'Dados de entrada inválidos',
    details: error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    })),
    code: 'VALIDATION_ERROR'
  }, { status: 400 })
}
```

## Logging

**Framework:** Custom logger (`lib/logger.ts`)

**Patterns:**
```typescript
import { logger } from '@/lib/logger'

// Levels: debug, info, warn, error, critical
logger.info('User action: ${action}', { feature: 'students', action: 'create' })
logger.error('Failed to load data', error, { studentId: id })
logger.critical('Database connection failed', error)

// Educational-specific logging
logger.logUserAction('Abrir Aula', { userId, turmaId })
logger.logAttendanceAction('batch_mark', studentCount, { sessionId })
logger.logComplianceEvent('attendance_locked', studentId, { reason: 'time_18h' })
logger.logSecurityEvent('unauthorized_access', { resource: 'grades' })

// Performance tracking
const metrics = logger.startPerformanceTracking('loadStudents')
await operation()
logger.endPerformanceTracking('loadStudents', metrics)
```

**When to Log:**
- User authentication/authorization events
- Data modifications (create, update, delete)
- Errors and exceptions
- Compliance events (attendance locking, Bolsa Familia alerts)
- Performance-sensitive operations (>3s triggers warning)

## Comments

**When to Comment:**
- JSDoc for exported functions and complex logic
- Inline comments for Brazilian educational domain concepts
- Task references linking to specs (`@see openspec/changes/...`)

**JSDoc Pattern:**
```typescript
/**
 * Validates Brazilian CPF (Cadastro de Pessoas Físicas)
 * @param cpf CPF string to validate
 * @returns boolean indicating if CPF is valid
 */
export function validateCPF(cpf: string): boolean {
  // ...
}
```

**Domain-Specific Comments:**
```typescript
// Brazilian educational compliance: "não existe o esquecer"
// Auto-Lock at 18:00 São Paulo time
// INEP/Educacenso required field
// Bolsa Família: Alert when frequency < 80%
```

## Function Design

**Size:**
- Functions typically 20-60 lines
- Complex functions split into helper functions
- Large components (e.g., `AttendanceGrid.tsx` at ~1000 lines) should be refactored

**Parameters:**
- Use object destructuring for multiple parameters
- Optional parameters with defaults: `options?: { limit?: number; offset?: number }`
- Props interfaces for React components

**Return Values:**
- Explicit types on public functions recommended (though not enforced)
- Async functions return `Promise<T>`
- API services return typed responses or throw errors

## Module Design

**Exports:**
- Named exports preferred over default exports
- Exception: Page components use default exports (Next.js requirement)
- Barrel exports via `index.ts` for related modules

**Barrel Files:**
- `lib/hooks/index.ts`: Re-exports hooks
- `lib/services/index.ts`: Re-exports services
- `lib/validation/index.ts`: Re-exports validation utilities

**Example barrel file:**
```typescript
// lib/services/index.ts
export { attendanceWorkflowService } from './attendance-workflow'
export { attendanceImmutability } from './attendance-immutability'
export { attendanceLockingService } from './attendance-locking'
```

## State Management

**Client State:**
- Zustand for complex state (`lib/stores/`)
- React Context for shared UI state (`contexts/`)
- React Query for server state (`@tanstack/react-query`)

**Zustand Store Pattern:**
```typescript
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export const useMyStore = create<MyState>()(
  devtools(
    (set, get) => ({
      // state
      // actions
    }),
    { name: 'store-name' }
  )
)

// Selectors for optimized subscriptions
export const useMyValue = () => useMyStore((state) => state.value)
```

## API Service Pattern

**Base Service Class:**
```typescript
// lib/api/base.ts
export abstract class BaseApiService {
  protected tableName: string

  async getAll<T>(): Promise<T[]> { ... }
  async getById<T>(id: string): Promise<T | null> { ... }
  async create<T>(data: Partial<T>): Promise<T> { ... }
  async update<T>(id: string, data: Partial<T>): Promise<T> { ... }
  async delete(id: string): Promise<void> { ... }
  async getPaginated<T>(params: PaginationParams): Promise<PaginatedResult<T>> { ... }
}
```

**Service Implementation:**
```typescript
export class StudentsApiService extends BaseApiService {
  constructor() {
    super('alunos')
  }

  async getStudentsByClass(classId: string): Promise<StudentWithDetails[]> {
    // Domain-specific method
  }
}

export const studentsApi = new StudentsApiService()
```

## Data Fetching Pattern

**Three-layer architecture for all data fetching:**

### Layer 1: API Service Layer (`lib/api/*.ts`)

The API service layer handles all Supabase interactions. Use `VivenciasApiService` as the exemplar.

**Pattern:**
```typescript
// lib/api/[domain].ts
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { BaseApiService } from './base'

// Define input/output types at top
interface CreateInput { /* ... */ }
interface DomainItem { /* ... */ }

export class DomainApiService extends BaseApiService {
  constructor() {
    super('table_name')
  }

  async getWithFilters(filters: Filters): Promise<DomainItem[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        logger.error('Error fetching domain items:', error)
        throw error
      }

      return (data || []) as DomainItem[]
    } catch (error) {
      logger.error('Error in getWithFilters:', error)
      throw error
    }
  }

  async create(input: CreateInput): Promise<DomainItem> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .insert({ /* ... */ })
        .select()
        .single()

      if (error) {
        logger.error('Error creating domain item:', error)
        throw error
      }

      // Log success for audit
      logger.info('Domain item created', {
        feature: 'domain',
        action: 'create',
        metadata: { id: data.id }
      })

      return data as DomainItem
    } catch (error) {
      logger.error('Error in create:', error)
      throw error
    }
  }
}

// Export singleton instance
export const domainApi = new DomainApiService()
```

**Key requirements:**
- Class extends `BaseApiService`
- Uses `logger.error` for errors, `logger.info` for success
- Returns typed data, handles PGRST116 (not found) gracefully
- Export singleton instance

### Layer 2: React Query Layer (`hooks/use-*-query.ts`)

The React Query layer manages caching and state synchronization.

**Pattern:**
```typescript
// hooks/use-domain-query.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { domainApi } from '@/lib/api/domain'
import { logger } from '@/lib/logger'

// Query keys from lib/react-query.ts
export const domainQueryKeys = {
  all: ['domain'] as const,
  lists: () => [...domainQueryKeys.all, 'list'] as const,
  list: (filters: Filters) => [...domainQueryKeys.lists(), filters] as const,
  details: () => [...domainQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...domainQueryKeys.details(), id] as const,
}

export function useDomainList(filters: Filters) {
  return useQuery({
    queryKey: domainQueryKeys.list(filters),
    queryFn: () => domainApi.getWithFilters(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useCreateDomain() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: domainApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: domainQueryKeys.lists() })
    },
    onError: (error) => {
      logger.error('Error creating domain item', error, {
        feature: 'domain',
        action: 'create_mutation'
      })
    }
  })
}
```

**staleTime guidelines:**

| Data Type | staleTime | Rationale |
|-----------|-----------|-----------|
| Static data (turmas, escolas) | 5 min | Rarely changes |
| Moderate data (lessons, alunos) | 2 min | Changes during session |
| Active data (sessions, attendance) | 1 min | Real-time relevance |
| Aggregates (risk indicators) | 3 min | Computed values |

### Layer 3: Page Component Layer

Page components use React Query hooks and handle UI state.

**Pattern:**
```typescript
// app/(dashboard)/domain/page.tsx
'use client'

import { useDomainList } from '@/hooks/use-domain-query'

export default function DomainPage() {
  const [filter, setFilter] = useState('todos')

  const { data, isLoading, error } = useDomainList({})

  // Client-side filtering on cached data
  const filteredData = useMemo(() => {
    if (!data) return []
    if (filter === 'todos') return data
    return data.filter(item => item.status === filter)
  }, [data, filter])

  if (isLoading) return <Skeleton />
  if (error) return <ErrorState error={error} />

  return <DataTable data={filteredData} />
}
```

### Decision Table: Where to Add Data Fetching

| Data Type | Where to Add Method | staleTime | Example |
|-----------|---------------------|-----------|---------|
| List pages | Existing `*ApiService` | 5 min | `studentsApi.getAll()` |
| Detail pages | Existing `*ApiService` | 2 min | `studentsApi.getById(id)` |
| Active sessions | New hook if none exists | 1 min | `useActiveSession()` |
| Cross-domain queries | New service method | 3 min | `reportsApi.getFrequencia()` |

### Anti-pattern: Inline Supabase in Pages

**Never do this:**
```typescript
// BAD: Inline Supabase query in page component
useEffect(() => {
  async function fetchData() {
    const { data, error } = await supabase.from('turmas').select('*')
    // ...
  }
  fetchData()
}, [])
```

**Instead:**
```typescript
// GOOD: Use API service via React Query hook
const { data, isLoading, error } = useTurmas()
```

## Filter Standard

**Default value:** `'todos'` (masculine) or `'todas'` (feminine noun context)

**Never use:** `'all'` (English) - use Portuguese for consistency with the localized UI

### Pattern

```typescript
// State initialization
const [statusFilter, setStatusFilter] = useState('todos')

// Filter options
const filterOptions = [
  { value: 'todos', label: 'Todos os Status' }, // or 'Todos' for short
  { value: 'ativo', label: 'Ativos' },
  { value: 'inativo', label: 'Inativos' },
]

// Feminine context (escolas, turmas, disciplinas)
const [escolaFilter, setEscolaFilter] = useState('todas')
const escolaOptions = [
  { value: 'todas', label: 'Todas as Escolas' },
  // ...
]

// Reset behavior
const clearFilters = () => {
  setStatusFilter('todos')
  setEscolaFilter('todas')
}
```

### Filtering Logic

Filter on client-side after fetching full list:

```typescript
const filteredData = useMemo(() => {
  if (!data) return []
  if (filter === 'todos') return data
  return data.filter(item => item.status === filter)
}, [data, filter])
```

### Gender Agreement

Use Portuguese grammatical gender agreement:

| Noun (singular) | Default Value | Label |
|-----------------|---------------|-------|
| status | `'todos'` | Todos os Status |
| aluno | `'todos'` | Todos os Alunos |
| escola | `'todas'` | Todas as Escolas |
| turma | `'todas'` | Todas as Turmas |
| disciplina | `'todas'` | Todas as Disciplinas |

## Brazilian Localization

**Messages in Portuguese:**
- All user-facing error messages in Portuguese
- Validation messages use Portuguese
- Toast notifications in Portuguese

**Brazilian Data Validation:**
- CPF validation: `validateCPF()` in `lib/validation/brazilian.ts`
- Phone: `validateBrazilianPhone()` with 10/11 digit support
- CEP: `validateCEP()` with 8 digits
- INEP code: `validateINEPCode()` with 8 digits

**Zod Schemas for Brazilian Data:**
```typescript
export const cpfSchema = z
  .string()
  .refine(validateCPF, { message: 'CPF inválido' })
  .transform(formatCPF)
```

## Inconsistencies to Address

1. **Component file naming:** Mixed PascalCase and kebab-case
2. **Some `any` types:** Especially in error handling and API responses
3. **Large components:** `AttendanceGrid.tsx` (1000+ lines) should be split
4. **Missing barrel exports:** Some directories lack `index.ts`
5. **Inconsistent error handling:** Some files use custom patterns, others use centralized

---

*Convention analysis: 2026-01-18*
