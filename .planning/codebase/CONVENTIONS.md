# Coding Conventions

**Analysis Date:** 2026-01-16

## Naming Patterns

**Files:**
- React components: PascalCase (`AttendanceGrid.tsx`, `UserForm.tsx`)
- API routes: kebab-case directories (`/api/frequencia/marcar/route.ts`)
- Hooks: camelCase with `use-` prefix (`use-auth.ts`, `use-diary-query.ts`)
- Lib utilities: kebab-case (`error-handling.ts`, `date-utils.ts`)
- Types: kebab-case (`diario-classe.ts`, `bolsa-familia.ts`)
- Validation schemas: kebab-case with descriptive suffix (`brazilian-educational.ts`, `students-validation.ts`)

**Functions:**
- React components: PascalCase (`AttendanceGrid`, `DashboardLayout`)
- Hooks: camelCase with `use` prefix (`useAuth`, `useSessionRealtime`)
- Utility functions: camelCase (`validateCPF`, `formatBrazilianPhone`, `calculateAge`)
- API handlers: UPPERCASE HTTP method (`POST`, `GET`)
- Event handlers: camelCase with `handle` or action prefix (`handleError`, `markAttendanceStatus`)

**Variables:**
- State: camelCase (`isLoading`, `userProfile`, `attendanceStats`)
- Constants: SCREAMING_SNAKE_CASE for configs (`ERROR_CODES`, `STATUS_PRESENCA_CONFIG`)
- Booleans: `is`, `has`, `can` prefixes (`isOnline`, `hasError`, `canEdit`)
- Arrays: plural nouns (`students`, `notifications`, `frequencias`)
- Maps/Sets: descriptive names (`attendanceMap`, `subscribedSessions`)

**Types/Interfaces:**
- Interfaces: PascalCase with descriptive names (`AttendanceRecord`, `SessionLockInfo`)
- Type aliases: PascalCase (`StatusPresenca`, `SessaoStatus`)
- Enums: PascalCase with SCREAMING_SNAKE_CASE values (`EducationalErrorType.STUDENT_NOT_FOUND`)
- Props interfaces: ComponentName + `Props` suffix (`AttendanceGridProps`)
- API responses: descriptive + `ApiResponse` suffix (`AttendanceApiResponse`)

## Code Style

**Formatting:**
- No dedicated Prettier config file (uses ESLint defaults)
- Indentation: 2 spaces
- Semicolons: optional (inconsistent usage)
- Quotes: single quotes preferred
- Trailing commas: used in multiline structures

**Linting:**
- ESLint with Next.js config (`next/core-web-vitals`, `next/typescript`)
- Key rules from `.eslintrc.json`:
  - `@typescript-eslint/no-unused-vars`: error (with `_` prefix ignore)
  - `@typescript-eslint/no-explicit-any`: warn
  - `no-console`: warn (allows `warn`, `error`, `info`)
  - `no-eval`: error (security)
  - `no-implied-eval`: error (security)
  - `@next/next/no-img-element`: error (use Next.js Image)
  - `react/prop-types`: off (TypeScript handles this)

## Import Organization

**Order:**
1. React imports (`'react'`, `'use client'`)
2. Next.js imports (`'next/server'`, `'next/headers'`)
3. External libraries (`@supabase/ssr`, `zod`, `lucide-react`)
4. Internal absolute imports with `@/` alias (`@/components/ui/button`, `@/lib/logger`)
5. Relative imports (same directory or parent)
6. Type-only imports

**Path Aliases:**
- `@/*` maps to project root (`./`)
- Use `@/components/`, `@/lib/`, `@/hooks/`, `@/types/`
- Defined in `tsconfig.json` paths

**Example:**
```typescript
'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { z } from 'zod'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { logger } from '@/lib/logger'
import { supabase } from '@/lib/supabase'
import type { AttendanceStats } from './types'
```

## Error Handling

**Client-Side Patterns:**
- Use `errorHandler` singleton from `@/lib/error-handling.ts`
- Show user-friendly messages via `toast` (sonner)
- Log errors via `logger` before displaying
- Provide recovery suggestions when possible

```typescript
// Pattern from error-handling.ts
import { handleError, EducationalErrorType } from '@/lib/error-handling'

try {
  await operation()
} catch (error) {
  handleError(error, { feature: 'attendance' }, true) // shows toast
}
```

**Server-Side Patterns:**
- Use structured error responses from `@/lib/api/error-handler.ts`
- Return consistent JSON shape: `{ success, data?, error?, timestamp }`
- Map errors to appropriate HTTP status codes
- Use `ERROR_CODES` constants for consistency

```typescript
// API route pattern
import { createErrorResponse, ERROR_CODES } from '@/lib/api/error-handler'

if (!user) {
  return NextResponse.json({
    success: false,
    error: {
      code: ERROR_CODES.AUTH_REQUIRED,
      message: 'Autenticacao obrigatoria'
    },
    timestamp: new Date().toISOString()
  }, { status: 401 })
}
```

**Error Code Categories:**
- Authentication: `AUTH_REQUIRED`, `INSUFFICIENT_PERMISSIONS`
- Validation: `VALIDATION_ERROR`, `INVALID_UUID`, `MISSING_REQUIRED_FIELD`
- Business Logic: `SESSION_LOCKED`, `ATTENDANCE_ALREADY_MARKED`
- System: `DATABASE_ERROR`, `INTERNAL_ERROR`

## Logging

**Framework:** Custom `logger` singleton (`@/lib/logger.ts`)

**Patterns:**
- Use structured logging with context objects
- Log levels: `debug`, `info`, `warn`, `error`, `critical`
- Development: logs to console with emojis and formatting
- Production: only logs `warn` and above, buffers for remote sending

```typescript
import { logger } from '@/lib/logger'

// Basic logging
logger.info('User action completed', { userId, action: 'login' })
logger.error('Database query failed', error, { feature: 'attendance' })

// Educational-specific logging
logger.logUserAction('attendance_marked', { studentCount: 25 })
logger.logComplianceEvent('session_locked_18h', studentId, { turmaId })

// Performance tracking
const metrics = logger.startPerformanceTracking('loadStudents')
await loadStudents()
logger.endPerformanceTracking('loadStudents', metrics)
```

**When to Log:**
- All API errors (server-side)
- Authentication events
- Critical business operations (attendance marking, session locking)
- Performance issues (>3000ms operations)
- Compliance events (Brazilian educational requirements)

## Comments

**When to Comment:**
- JSDoc for exported functions and interfaces
- Complex business logic explanation
- Brazilian compliance requirements
- Task references (e.g., `// Task 1.3.2: Lock indicator`)
- TODO/FIXME for known issues

**JSDoc Pattern:**
```typescript
/**
 * Validates Brazilian CPF (Cadastro de Pessoas Fisicas)
 * @param cpf CPF string to validate
 * @returns boolean indicating if CPF is valid
 */
export function validateCPF(cpf: string): boolean {
```

**Component Documentation:**
```typescript
/**
 * Enhanced Touch-Optimized Attendance Grid
 * Task 1.2.2 & 1.2.4: AttendanceGrid with 3-state support and real-time summary
 *
 * Features:
 * - Three-state attendance: P (Presente), F (Falta), A (Attestado)
 * - Touch-optimized with 44px minimum touch targets
 * - Visual lock indicator when session is locked after 18:00
 *
 * @see openspec/changes/2025-12-04-diario-de-classe/spec.md
 */
```

## Function Design

**Size:**
- Keep functions focused on single responsibility
- Large components (500+ lines) are acceptable for complex features
- Extract reusable logic into hooks or utility functions

**Parameters:**
- Destructure props in component signatures
- Use TypeScript interfaces for complex parameter objects
- Provide default values where sensible

```typescript
export function AttendanceGrid({
  sessionId,
  turmaId,
  sessionDate,
  sessionStatus,
  readonly = false,
  showPhotos = true,
  onAttendanceChange
}: AttendanceGridProps) {
```

**Return Values:**
- React components return JSX
- Hooks return objects with named properties
- API handlers return `NextResponse`
- Async functions return `Promise<T>` with explicit types

## Module Design

**Exports:**
- Named exports preferred over default exports
- Components: single named export matching filename
- Utilities: multiple named exports from single file
- Types: export from same file as related functions

**Barrel Files:**
- Use `index.ts` for component directories
- Export all public components/hooks from barrel
- Example: `components/admin/index.ts`, `lib/hooks/index.ts`

```typescript
// components/admin/index.ts
export { BulkUserOperations } from './users/bulk-user-operations'
export { UserForm } from './users/user-form'
export { UserList } from './users/user-list'
```

## Component Patterns

**Client Components:**
- Mark with `'use client'` directive at top
- Use React hooks (useState, useEffect, useCallback, useMemo)
- Handle loading/error states explicitly

**Server Components:**
- Default in Next.js App Router
- Fetch data directly in component
- Pass data to client components as props

**UI Components (shadcn/ui):**
- Located in `components/ui/`
- Use `cn()` utility for conditional classes
- Forward refs with `React.forwardRef`
- Use `cva` for variant styling

```typescript
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
```

## Validation Patterns

**Zod Schemas:**
- Define in `lib/validation/` directory
- Combine validation with transformation
- Use refinements for Brazilian-specific validation

```typescript
export const cpfSchema = z
  .string()
  .refine(validateCPF, { message: 'CPF invalido' })
  .transform(formatCPF)

export const studentFormSchema = z.object({
  nome_completo: z.string().min(2).max(100),
  data_nascimento: z.string().refine(isValidDate),
  cpf: cpfSchema.optional(),
  // ...
})
```

**API Validation:**
- Validate request body with Zod
- Return 422 for validation errors with details

```typescript
const validation = marcarFrequenciaSchema.safeParse(body)
if (!validation.success) {
  return NextResponse.json({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      details: validation.error.format()
    }
  }, { status: 422 })
}
```

## State Management

**Local State:**
- React `useState` for component-level state
- `useMemo` for derived/computed values
- `useCallback` for memoized callbacks

**Global State:**
- Zustand stores in `lib/stores/`
- React Context for cross-cutting concerns (auth, realtime)
- TanStack Query for server state

**Context Patterns:**
```typescript
const SessionRealtimeContext = createContext<SessionRealtimeContextValue | null>(null)

export function useSessionRealtime(): SessionRealtimeContextValue {
  const context = useContext(SessionRealtimeContext)
  if (!context) {
    throw new Error('useSessionRealtime must be used within a SessionRealtimeProvider')
  }
  return context
}
```

## API Route Patterns

**Structure:**
- Use route handlers in `app/api/` directory
- Export named functions for HTTP methods (`POST`, `GET`, etc.)
- Return `NextResponse.json()` for all responses

**Authentication:**
- Check auth at start of every handler
- Use Supabase server client for auth verification

```typescript
export async function POST(request: NextRequest) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({
      success: false,
      error: { code: 'AUTH_REQUIRED', message: 'Autenticacao obrigatoria' }
    }, { status: 401 })
  }
  // ... handler logic
}
```

---

*Convention analysis: 2026-01-16*
