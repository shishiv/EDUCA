# Architecture

**Analysis Date:** 2026-01-16

## Pattern Overview

**Overall:** Feature-Based Modular Architecture with Next.js App Router

**Key Characteristics:**
- Next.js 15 App Router with route groups for authentication and dashboard separation
- Supabase as BaaS (Backend-as-a-Service) for database, auth, and realtime
- Three-phase attendance workflow with Brazilian legal compliance
- Role-based access control (RBAC) with 5 user types
- Real-time session updates via Supabase Realtime subscriptions

## Layers

**Presentation Layer (UI):**
- Purpose: Render UI components and handle user interactions
- Location: `gestao_fronteira/app/` and `gestao_fronteira/components/`
- Contains: Pages, layouts, React components, form components
- Depends on: Hooks, Contexts, API services
- Used by: End users (teachers, admins, secretaries, directors)

**Route Handlers (API):**
- Purpose: Handle HTTP requests and business logic validation
- Location: `gestao_fronteira/app/api/`
- Contains: Next.js route handlers (route.ts files)
- Depends on: Supabase server client, validation schemas, logger
- Used by: Client-side components via fetch

**Service Layer:**
- Purpose: Encapsulate business logic and data operations
- Location: `gestao_fronteira/lib/api/` and `gestao_fronteira/lib/services/`
- Contains: API service classes, workflow managers
- Depends on: Supabase client, validation schemas
- Used by: Components, API routes

**State Management:**
- Purpose: Manage client-side state and server cache
- Location: `gestao_fronteira/lib/stores/`, `gestao_fronteira/contexts/`, `gestao_fronteira/hooks/`
- Contains: Zustand stores, React contexts, custom hooks
- Depends on: React Query, Zustand, Supabase subscriptions
- Used by: Components

**Data Access Layer:**
- Purpose: Database operations and type-safe queries
- Location: `gestao_fronteira/lib/supabase/`
- Contains: Supabase client factories (browser and server)
- Depends on: Supabase SDK, database types
- Used by: All layers needing database access

**Validation Layer:**
- Purpose: Schema validation and Brazilian compliance
- Location: `gestao_fronteira/lib/validation/`
- Contains: Zod schemas for all entities, Brazilian validators (CPF, CNPJ, NIS)
- Depends on: Zod library
- Used by: Forms, API routes, services

## Data Flow

**Attendance Workflow (Three-Phase):**

1. **PLANEJADA (Planned):** Teacher opens session via `POST /api/sessoes/aula/abrir`
2. **ABERTA (Open):** Session is active, teacher marks student attendance
3. **FECHADA (Closed):** Session auto-locks at 18:00 SP time, records become immutable

```
Teacher → AbrirAulaWorkflow.tsx → POST /api/sessoes/aula/abrir
                                        ↓
                              createClient() (server)
                                        ↓
                              Supabase sessoes_aula INSERT
                                        ↓
                              Realtime broadcast
                                        ↓
                              SessionRealtimeProvider updates state
```

**Authentication Flow:**

1. User submits credentials → `useAuth` hook → `authSignIn()` in `lib/auth.ts`
2. Supabase Auth validates → Session cookie set
3. Middleware (`lib/middleware/auth-middleware.ts`) validates on route access
4. `AuthGuard` component protects dashboard layout
5. User profile fetched from `users` table

**State Management:**
- Server cache: React Query (`@tanstack/react-query`) with 1-minute stale time
- Global UI state: Zustand with localStorage persistence (`lib/stores/app-store.ts`)
- Real-time data: Supabase subscriptions via `SessionRealtimeProvider`

## Key Abstractions

**BaseApiService:**
- Purpose: Abstract CRUD operations for all entities
- Examples: `gestao_fronteira/lib/api/base.ts`
- Pattern: Class-based service with generic methods

```typescript
// Pattern used by all entity services
export abstract class BaseApiService {
  protected tableName: string
  async getAll<T>(): Promise<T[]>
  async getById<T>(id: string): Promise<T | null>
  async create<T>(data: Partial<T>): Promise<T>
  async update<T>(id: string, data: Partial<T>): Promise<T>
  async delete(id: string): Promise<void>
  async getPaginated<T>(params): Promise<PaginatedResult<T>>
}
```

**AttendanceWorkflowManager:**
- Purpose: State machine for three-phase attendance workflow
- Examples: `gestao_fronteira/lib/services/attendance-workflow.ts`
- Pattern: State machine with transition validation

```typescript
type WorkflowPhase = 'PREPARATION' | 'OPENING' | 'MARKING' | 'CLOSING' | 'COMPLETED' | 'ERROR'

// Workflow manages transitions and validates business rules
const workflow = new AttendanceWorkflowManager(classId, teacherId, date)
await workflow.executeTransition('open_session')
await workflow.markStudentAttendance(studentId, 'presente')
await workflow.executeTransition('close_session')
```

**Supabase Clients:**
- Purpose: Type-safe database access with RLS context
- Examples: `gestao_fronteira/lib/supabase.ts` (browser), `gestao_fronteira/lib/supabase/server.ts` (server)
- Pattern: Factory functions for client creation

```typescript
// Browser client (for components)
import { supabase } from '@/lib/supabase'

// Server client (for API routes and Server Actions)
import { createClient, createAdminClient } from '@/lib/supabase/server'
```

**Validation Schemas:**
- Purpose: Runtime type validation with Zod
- Examples: `gestao_fronteira/lib/validation/brazilian.ts`, `gestao_fronteira/lib/validation/students-validation.ts`
- Pattern: Zod schemas with Brazilian-specific validators

```typescript
import { studentRegistrationSchema, validateCPF, formatCPF } from '@/lib/validation'
```

## Entry Points

**Application Root:**
- Location: `gestao_fronteira/app/layout.tsx`
- Triggers: Next.js server render
- Responsibilities: Global providers, fonts, metadata

**Dashboard Layout:**
- Location: `gestao_fronteira/app/(dashboard)/layout.tsx`
- Triggers: Any `/dashboard/*` route
- Responsibilities: AuthGuard, Sidebar, Header, SessionRealtimeProvider, ModalProvider

**Auth Layout:**
- Location: `gestao_fronteira/app/(auth)/layout.tsx`
- Triggers: `/login` route
- Responsibilities: Login page wrapper

**Middleware:**
- Location: `gestao_fronteira/middleware.ts`
- Triggers: All routes except static files
- Responsibilities: Route protection, session validation, role-based redirects

**API Routes:**
- Location: `gestao_fronteira/app/api/*/route.ts`
- Triggers: HTTP requests to `/api/*`
- Responsibilities: Request validation, business logic, database operations

Key API endpoints:
- `POST /api/sessoes/aula/abrir` - Create attendance session
- `POST /api/frequencia/marcar` - Mark attendance
- `GET /api/compliance/warnings` - Get compliance alerts
- `GET /api/attendance/trends` - Get attendance statistics

## Error Handling

**Strategy:** Layered error handling with user-friendly messages

**Patterns:**
- API routes: try/catch with Zod error handling, HTTP status codes
- Services: throw errors with descriptive messages in Portuguese
- Components: Error boundaries, toast notifications via Sonner
- Logging: Structured logging via `lib/logger.ts`

```typescript
// API route pattern
try {
  const validatedData = schema.parse(body)
  // ... business logic
} catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
  }
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
}
```

**Error codes returned by API:**
- `UNAUTHORIZED` - Not authenticated
- `NOT_FOUND` - Resource not found
- `INSUFFICIENT_PERMISSIONS` - Role lacks access
- `DUPLICATE_SESSION` - Session already exists
- `VALIDATION_ERROR` - Schema validation failed
- `BUSINESS_RULE_VIOLATION` - Domain rule violated

## Cross-Cutting Concerns

**Logging:**
- Implementation: `gestao_fronteira/lib/logger.ts`
- Pattern: Structured logging with context (feature, action, IDs)
- Used for: Errors, audit events, workflow transitions

**Validation:**
- Implementation: `gestao_fronteira/lib/validation/`
- Pattern: Zod schemas for all entities
- Brazilian-specific: CPF, CNPJ, NIS, INEP codes, phone numbers

**Authentication:**
- Implementation: Supabase Auth + custom middleware
- Pattern: Cookie-based sessions, role hierarchy
- Roles: admin > diretor > secretario > professor > responsavel

**Authorization:**
- Implementation: `gestao_fronteira/lib/middleware/auth-middleware.ts`
- Pattern: Role-based route protection with hierarchy
- Component-level: `AuthGuard` component checks `allowedRoles`

**Audit Trail:**
- Implementation: `gestao_fronteira/lib/audit.ts`
- Pattern: Log operations to `audit_trail` table
- Captures: table, record_id, operation, old/new values, user, timestamp

**Real-time:**
- Implementation: `gestao_fronteira/lib/realtime/`, `gestao_fronteira/contexts/session-realtime-context.tsx`
- Pattern: Supabase Realtime subscriptions with reconnection handling
- Used for: Session updates, attendance marking, compliance warnings

---

*Architecture analysis: 2026-01-16*
