# Codebase Structure

**Analysis Date:** 2026-01-16

## Directory Layout

```
gestao_fronteira/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Auth route group (login)
│   ├── (dashboard)/        # Protected dashboard routes
│   │   ├── dashboard/      # Main dashboard pages
│   │   ├── diario/         # Class diary (frequencia, relatorios)
│   │   └── relatorios/     # Report pages
│   ├── api/                # API route handlers
│   ├── actions/            # Server Actions
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page (redirects)
│   └── providers.tsx       # Global providers (QueryClient, ServiceWorker)
├── components/             # React components
│   ├── ui/                 # shadcn/ui primitives
│   ├── attendance/         # Attendance workflow components
│   ├── auth/               # Auth components (LoginForm)
│   ├── dashboard/          # Dashboard widgets
│   ├── diary/              # Class diary components
│   ├── grades/             # Grade management
│   ├── layout/             # Layout components (Sidebar, Header)
│   ├── reports/            # Report generation
│   ├── schools/            # School management
│   ├── students/           # Student management
│   └── [domain]/           # Other domain components
├── contexts/               # React Context providers
├── hooks/                  # Custom React hooks
├── lib/                    # Shared utilities and services
│   ├── api/                # API service classes
│   ├── auth/               # Auth utilities
│   ├── export/             # PDF/Excel export utilities
│   ├── hooks/              # Non-React hooks (internal)
│   ├── middleware/         # Auth middleware
│   ├── realtime/           # Supabase Realtime managers
│   ├── reports/            # Report generators
│   ├── services/           # Business logic services
│   ├── stores/             # Zustand stores
│   ├── supabase/           # Supabase client factories
│   ├── utils/              # General utilities
│   └── validation/         # Zod schemas
├── types/                  # TypeScript type definitions
├── public/                 # Static assets
├── scripts/                # Dev/seed scripts
└── middleware.ts           # Next.js middleware (auth)
```

## Directory Purposes

**`app/`:**
- Purpose: Next.js App Router pages and API routes
- Contains: Page components (page.tsx), layouts (layout.tsx), route handlers (route.ts)
- Key files:
  - `gestao_fronteira/app/layout.tsx` - Root layout with Providers
  - `gestao_fronteira/app/providers.tsx` - QueryClient, ServiceWorker providers
  - `gestao_fronteira/app/(dashboard)/layout.tsx` - AuthGuard, Sidebar, SessionRealtime

**`app/(auth)/`:**
- Purpose: Authentication pages (login)
- Contains: Login page
- Key files: `gestao_fronteira/app/(auth)/login/page.tsx`

**`app/(dashboard)/dashboard/`:**
- Purpose: Main application pages (protected)
- Contains: CRUD pages for all entities
- Subdirectories:
  - `alunos/` - Student management (list, create, view, boletim)
  - `turmas/` - Class management
  - `escolas/` - School management
  - `usuarios/` - User management
  - `frequencia/` - Attendance marking
  - `diario/` - Class diary
  - `notas/` - Grades
  - `matriculas/` - Enrollments
  - `relatorios/` - Reports
  - `configuracoes/` - Settings

**`app/api/`:**
- Purpose: API route handlers
- Contains: REST endpoints for business operations
- Key files:
  - `gestao_fronteira/app/api/sessoes/aula/abrir/route.ts` - Open session
  - `gestao_fronteira/app/api/frequencia/marcar/route.ts` - Mark attendance
  - `gestao_fronteira/app/api/compliance/warnings/route.ts` - Compliance alerts
  - `gestao_fronteira/app/api/health/route.ts` - Health check

**`components/ui/`:**
- Purpose: shadcn/ui base components
- Contains: Button, Card, Dialog, Form, Input, etc.
- Key files:
  - `gestao_fronteira/components/ui/index.ts` - Barrel export
  - `gestao_fronteira/components/ui/brazilian-inputs.tsx` - CPF, phone, CEP inputs
  - `gestao_fronteira/components/ui/brazilian-educational-help.tsx` - Field help tooltips

**`components/attendance/`:**
- Purpose: Attendance workflow components
- Contains: Session opening, marking, closing UIs
- Key files:
  - `gestao_fronteira/components/attendance/FrequenciaWorkflow.tsx` - Main workflow
  - `gestao_fronteira/components/attendance/AttendanceGrid.tsx` - Student grid
  - `gestao_fronteira/components/attendance/AbrirAulaWorkflow.tsx` - Open session
  - `gestao_fronteira/components/attendance/FecharAulaDialog.tsx` - Close session

**`components/layout/`:**
- Purpose: Layout structure components
- Contains: Navigation, headers, guards
- Key files:
  - `gestao_fronteira/components/layout/sidebar.tsx` - Navigation sidebar
  - `gestao_fronteira/components/layout/header.tsx` - Top header
  - `gestao_fronteira/components/layout/auth-guard.tsx` - Role-based protection
  - `gestao_fronteira/components/layout/MobileNav.tsx` - Mobile navigation

**`lib/api/`:**
- Purpose: Client-side API service classes
- Contains: Entity services extending BaseApiService
- Key files:
  - `gestao_fronteira/lib/api/base.ts` - Abstract base service
  - `gestao_fronteira/lib/api/students.ts` - Student operations
  - `gestao_fronteira/lib/api/attendance.ts` - Attendance operations
  - `gestao_fronteira/lib/api/classes.ts` - Class operations
  - `gestao_fronteira/lib/api/users.ts` - User operations

**`lib/services/`:**
- Purpose: Business logic services
- Contains: Workflow managers, compliance services
- Key files:
  - `gestao_fronteira/lib/services/attendance-workflow.ts` - Three-phase workflow
  - `gestao_fronteira/lib/services/attendance-immutability.ts` - Legal compliance
  - `gestao_fronteira/lib/services/attendance-locking.ts` - 18:00 auto-lock

**`lib/validation/`:**
- Purpose: Zod validation schemas
- Contains: All entity schemas, Brazilian validators
- Key files:
  - `gestao_fronteira/lib/validation/index.ts` - Barrel export
  - `gestao_fronteira/lib/validation/brazilian.ts` - CPF, phone, CEP
  - `gestao_fronteira/lib/validation/brazilian-educational.ts` - CNPJ, NIS, INEP
  - `gestao_fronteira/lib/validation/students-validation.ts` - Student schemas
  - `gestao_fronteira/lib/validation/users-validation.ts` - User schemas

**`lib/supabase/`:**
- Purpose: Supabase client factories
- Contains: Browser and server client creation
- Key files:
  - `gestao_fronteira/lib/supabase.ts` - Browser client
  - `gestao_fronteira/lib/supabase/server.ts` - Server client (createClient, createAdminClient)

**`lib/stores/`:**
- Purpose: Zustand state stores
- Contains: Global app state
- Key files:
  - `gestao_fronteira/lib/stores/app-store.ts` - Main UI state store
  - `gestao_fronteira/lib/stores/attendance-session-store.ts` - Session state

**`hooks/`:**
- Purpose: Custom React hooks
- Contains: Auth, data fetching, utilities
- Key files:
  - `gestao_fronteira/hooks/use-auth.ts` - Authentication hook
  - `gestao_fronteira/hooks/use-diary-query.ts` - Class diary queries
  - `gestao_fronteira/hooks/use-users-query.ts` - User queries
  - `gestao_fronteira/hooks/use-aula-realtime.ts` - Realtime session hook

**`contexts/`:**
- Purpose: React Context providers
- Contains: Global state providers
- Key files:
  - `gestao_fronteira/contexts/session-realtime-context.tsx` - Realtime subscriptions
  - `gestao_fronteira/contexts/search-context.tsx` - Global search

**`types/`:**
- Purpose: TypeScript type definitions
- Contains: Database types, domain types
- Key files:
  - `gestao_fronteira/types/database.ts` - Supabase generated types
  - `gestao_fronteira/types/supabase.ts` - Additional Supabase types
  - `gestao_fronteira/types/diario-classe.ts` - Class diary types
  - `gestao_fronteira/types/grades.ts` - Grade types

## Key File Locations

**Entry Points:**
- `gestao_fronteira/app/layout.tsx`: Root layout
- `gestao_fronteira/app/(dashboard)/layout.tsx`: Dashboard layout with auth
- `gestao_fronteira/middleware.ts`: Route protection

**Configuration:**
- `gestao_fronteira/next.config.js`: Next.js config
- `gestao_fronteira/tailwind.config.js`: Tailwind CSS config
- `gestao_fronteira/tsconfig.json`: TypeScript config
- `gestao_fronteira/components.json`: shadcn/ui config

**Core Logic:**
- `gestao_fronteira/lib/auth.ts`: Authentication functions
- `gestao_fronteira/lib/supabase/server.ts`: Server Supabase client
- `gestao_fronteira/lib/services/attendance-workflow.ts`: Workflow state machine
- `gestao_fronteira/lib/validation/index.ts`: All validation exports

**Testing:**
- `gestao_fronteira/test-results/`: Test output directory
- No test files detected in source tree

## Naming Conventions

**Files:**
- Components: `kebab-case.tsx` (e.g., `auth-guard.tsx`, `attendance-grid.tsx`)
- Hooks: `use-*.ts` (e.g., `use-auth.ts`, `use-diary-query.ts`)
- API services: `kebab-case.ts` (e.g., `students.ts`, `attendance.ts`)
- Types: `kebab-case.ts` (e.g., `database.ts`, `diario-classe.ts`)
- Validation: `*-validation.ts` (e.g., `students-validation.ts`)

**Directories:**
- Components: `kebab-case` (e.g., `attendance/`, `layout/`, `ui/`)
- Route groups: `(group-name)` (e.g., `(auth)`, `(dashboard)`)
- Dynamic routes: `[param]` (e.g., `[id]`, `[alunoId]`)

**Components:**
- React components: `PascalCase` (e.g., `AttendanceGrid`, `AuthGuard`)
- Props interfaces: `ComponentNameProps` (e.g., `SidebarProps`)

**Functions:**
- Hooks: `use*` (e.g., `useAuth`, `useSessionRealtime`)
- API methods: `verbNoun` (e.g., `getStudentsByClass`, `markAttendance`)
- Validation: `validate*` (e.g., `validateCPF`, `validateStudentRegistration`)

**Types:**
- Database tables: `PascalCase` (e.g., `Aluno`, `Escola`, `Turma`)
- Form data: `*FormData` (e.g., `StudentFormData`, `UserFormData`)
- Schema output: `*Data` (e.g., `StudentRegistrationData`)

## Where to Add New Code

**New Feature (Page):**
- Primary code: `gestao_fronteira/app/(dashboard)/dashboard/[feature]/page.tsx`
- Components: `gestao_fronteira/components/[feature]/`
- API routes: `gestao_fronteira/app/api/[feature]/route.ts`
- Services: `gestao_fronteira/lib/api/[feature].ts`
- Types: `gestao_fronteira/types/[feature].ts`

**New Component:**
- Domain component: `gestao_fronteira/components/[domain]/ComponentName.tsx`
- UI primitive: `gestao_fronteira/components/ui/component-name.tsx` (follow shadcn pattern)
- Add to barrel export if exists

**New API Endpoint:**
- Location: `gestao_fronteira/app/api/[resource]/route.ts`
- Dynamic: `gestao_fronteira/app/api/[resource]/[id]/route.ts`
- Use `createClient` from `@/lib/supabase/server`
- Add Zod validation schema

**New Service:**
- API service: `gestao_fronteira/lib/api/[entity].ts` extending `BaseApiService`
- Business service: `gestao_fronteira/lib/services/[name].ts`

**New Hook:**
- Location: `gestao_fronteira/hooks/use-[name].ts`
- Export from `gestao_fronteira/hooks/index.ts`

**New Validation Schema:**
- Location: `gestao_fronteira/lib/validation/[entity]-validation.ts`
- Export from `gestao_fronteira/lib/validation/index.ts`

**Utilities:**
- Shared helpers: `gestao_fronteira/lib/utils/[name].ts`
- Export utilities: `gestao_fronteira/lib/export/[name].ts`

## Special Directories

**`app/(auth)/`:**
- Purpose: Auth route group (no layout inheritance from dashboard)
- Generated: No
- Committed: Yes

**`app/(dashboard)/`:**
- Purpose: Protected routes with shared dashboard layout
- Generated: No
- Committed: Yes

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes
- Committed: No (in .gitignore)

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes
- Committed: No (in .gitignore)

**`test-results/`:**
- Purpose: Test output artifacts
- Generated: Yes
- Committed: Partial (check .gitignore)

**`public/`:**
- Purpose: Static assets (images, icons)
- Generated: No
- Committed: Yes

**`scripts/`:**
- Purpose: Development and seed scripts
- Contents: `seed-dev.ts`, `seed-superadmin.ts`
- Committed: Yes

---

*Structure analysis: 2026-01-16*
