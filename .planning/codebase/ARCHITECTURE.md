# Architecture

**Analysis Date:** 2026-01-18

## Pattern Overview

**Overall:** Next.js 15 App Router with Server Components and Supabase Backend-as-a-Service

**Key Characteristics:**
- Full-stack TypeScript with strict typing via Supabase-generated types
- Role-based access control (RBAC) enforced at multiple layers
- Real-time capabilities via Supabase subscriptions for attendance tracking
- Brazilian educational compliance built into core workflows (18:00 lock, immutability)
- Hybrid rendering: Server Components for data, Client Components for interactivity

## Layers

**Presentation Layer (Client):**
- Purpose: Render UI and handle user interactions
- Location: `gestao_fronteira/app/**/page.tsx`, `gestao_fronteira/components/`
- Contains: Page components, UI components, forms, modals
- Depends on: Hooks, Context providers, Supabase client
- Used by: End users via browser

**Presentation Layer (Server):**
- Purpose: Server-rendered pages and data fetching
- Location: `gestao_fronteira/app/**/page.tsx` (Server Components)
- Contains: Data fetching, initial page rendering
- Depends on: `lib/supabase/server.ts`
- Used by: Client hydration

**API Layer:**
- Purpose: RESTful endpoints for complex operations
- Location: `gestao_fronteira/app/api/`
- Contains: Route handlers (attendance, sessions, compliance, search)
- Depends on: `lib/supabase/server.ts`, Zod validation, business logic
- Used by: Client-side fetches, external integrations

**Server Actions Layer:**
- Purpose: Type-safe server mutations from client
- Location: `gestao_fronteira/app/actions/`
- Contains: `'use server'` functions for attendance workflows
- Depends on: `lib/supabase/server.ts`, validation schemas
- Used by: Client components via direct invocation

**Business Logic Layer:**
- Purpose: Domain-specific services and utilities
- Location: `gestao_fronteira/lib/services/`, `gestao_fronteira/lib/api/`
- Contains: Attendance workflows, compliance rules, API clients
- Depends on: Supabase client, validation schemas
- Used by: API routes, Server Actions, components

**Data Access Layer:**
- Purpose: Supabase client wrappers and queries
- Location: `gestao_fronteira/lib/supabase.ts`, `gestao_fronteira/lib/supabase/server.ts`
- Contains: Browser client, server client, admin client
- Depends on: Supabase SDK, database types
- Used by: All layers requiring data access

**Real-time Layer:**
- Purpose: WebSocket-based live updates for attendance
- Location: `gestao_fronteira/lib/realtime/`, `gestao_fronteira/contexts/session-realtime-context.tsx`
- Contains: Subscription managers, connection handlers
- Depends on: Supabase real-time, React Context
- Used by: Dashboard components, attendance pages

**Validation Layer:**
- Purpose: Input validation and Brazilian data compliance
- Location: `gestao_fronteira/lib/validation/`
- Contains: Zod schemas, CPF/NIS validators, educational validators
- Depends on: Zod
- Used by: Forms, API routes, Server Actions

## Data Flow

**Attendance Marking Flow:**

1. Teacher opens turma chamada page (`/dashboard/turmas/[id]/chamada`)
2. Client loads students via Supabase query (matriculas -> alunos)
3. Existing attendance loaded from `sessoes_aula` + `frequencia` tables
4. Teacher marks P/F/J via `ChamadaStatusButtons` component
5. On save, creates/updates `sessoes_aula` and upserts `frequencia` records
6. Real-time broadcast notifies other viewers via `SessionRealtimeProvider`

**Authentication Flow:**

1. User submits credentials on `/login`
2. `useAuth` hook calls `supabase.auth.signInWithPassword()`
3. Session stored in cookies via Supabase SSR
4. Middleware (`middleware.ts`) validates session on protected routes
5. `AuthGuard` component enforces role-based access client-side
6. Server actions/API routes verify user via `createClient()` from cookies

**State Management:**
- Global auth state: `useAuth` hook with Supabase auth listener
- Real-time sessions: `SessionRealtimeContext` (React Context + Supabase subscriptions)
- Local component state: React `useState`/`useReducer`
- Server state: TanStack Query for caching and sync

## Key Abstractions

**Supabase Client Variants:**
- Purpose: Differentiate client vs server vs admin access
- Examples: `gestao_fronteira/lib/supabase.ts`, `gestao_fronteira/lib/supabase/server.ts`
- Pattern: Factory functions that return typed clients

**BaseApiService:**
- Purpose: Generic CRUD operations for database tables
- Examples: `gestao_fronteira/lib/api/base.ts`
- Pattern: Abstract class with table-specific inheritance

**Validation Schemas:**
- Purpose: Type-safe runtime validation with Zod
- Examples: `gestao_fronteira/lib/validation/brazilian.ts`, `gestao_fronteira/lib/validation/attendance.ts`
- Pattern: Composable schemas with custom refinements

**Real-time Manager:**
- Purpose: Manage Supabase subscriptions lifecycle
- Examples: `gestao_fronteira/lib/realtime/session-realtime.ts`
- Pattern: Class-based subscription manager with callbacks

## Entry Points

**Root Layout:**
- Location: `gestao_fronteira/app/layout.tsx`
- Triggers: All page loads
- Responsibilities: HTML structure, fonts, `Providers` wrapper

**Dashboard Layout:**
- Location: `gestao_fronteira/app/(dashboard)/layout.tsx`
- Triggers: All `/dashboard/*` routes
- Responsibilities: Auth guard, sidebar, header, real-time provider

**Middleware:**
- Location: `gestao_fronteira/middleware.ts`
- Triggers: All non-static requests
- Responsibilities: Route protection, session validation, redirects

**API Endpoints:**
- Location: `gestao_fronteira/app/api/*/route.ts`
- Triggers: HTTP requests to `/api/*`
- Responsibilities: Handle POST/GET/PUT/DELETE operations

## Error Handling

**Strategy:** Domain-specific error types with user-friendly messages

**Patterns:**
- `EducationalErrorType` enum in `gestao_fronteira/lib/error-handling.ts`
- Zod validation errors caught and transformed to structured responses
- Supabase errors mapped to business-friendly messages
- Toast notifications for user feedback via Sonner

**API Error Pattern:**
```typescript
// Standard API error response structure
{
  error: string,           // User-facing message
  code: string,            // Machine-readable code (e.g., 'DUPLICATE_SESSION')
  details?: object[]       // Field-level validation errors
}
```

## Cross-Cutting Concerns

**Logging:**
- Custom `logger` utility in `gestao_fronteira/lib/logger.ts`
- Structured logging with context objects
- Used across API routes, services, and error handlers

**Validation:**
- Zod schemas for all user inputs
- Brazilian-specific validators (CPF, NIS, phone)
- Educational domain validators (attendance, lesson content)

**Authentication:**
- Supabase Auth with cookie-based sessions
- Middleware-level route protection
- Component-level `AuthGuard` for role enforcement
- Server-side `verifyUserRole()` for Server Actions

**Authorization:**
- Role hierarchy: admin > diretor > secretario > professor > responsavel
- School-based isolation via `escola_id` checks
- RLS policies in Supabase for data-level security

**Brazilian Compliance:**
- 18:00 Sao Paulo time auto-lock for attendance (`auto_fechamento_agendado`)
- Immutability principle: "nao existe o esquecer"
- Bolsa Familia alerts when frequency < 80%
- INEP/Educacenso field requirements

---

*Architecture analysis: 2026-01-18*
