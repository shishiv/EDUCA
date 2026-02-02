# Codebase Structure

**Analysis Date:** 2026-01-18

## Directory Layout

```
gestao_fronteira/
├── app/                    # Next.js App Router pages and API
│   ├── (auth)/             # Authentication routes (login)
│   ├── (dashboard)/        # Protected dashboard routes
│   │   ├── dashboard/      # Main dashboard pages
│   │   ├── diario/         # Diary/journal routes
│   │   └── relatorios/     # Reports routes
│   ├── actions/            # Server Actions
│   │   └── attendance/     # Attendance-specific actions
│   ├── api/                # REST API routes
│   └── *.tsx               # Root layout, providers, global pages
├── components/             # React components
│   ├── ui/                 # shadcn/ui base components
│   ├── attendance/         # Attendance/chamada components
│   ├── diary/              # Class diary components
│   ├── students/           # Student management components
│   ├── turmas/             # Turma/class components
│   ├── layout/             # Layout components (sidebar, header)
│   └── [domain]/           # Other domain-specific components
├── lib/                    # Utilities and business logic
│   ├── api/                # API service classes
│   ├── services/           # Domain services (attendance workflows)
│   ├── supabase/           # Supabase server client
│   ├── validation/         # Zod validation schemas
│   ├── realtime/           # WebSocket/real-time managers
│   ├── stores/             # Zustand stores
│   └── *.ts                # Core utilities (auth, logger, etc.)
├── hooks/                  # Custom React hooks
├── contexts/               # React Context providers
├── types/                  # TypeScript type definitions
├── public/                 # Static assets
└── scripts/                # Build/dev scripts
```

## Directory Purposes

**`app/`:**
- Purpose: Next.js 15 App Router with file-based routing
- Contains: Pages (page.tsx), layouts (layout.tsx), loading states, API routes
- Key files: `layout.tsx` (root), `providers.tsx`, `middleware.ts`

**`app/(auth)/`:**
- Purpose: Public authentication routes
- Contains: Login page
- Key files: `login/page.tsx`

**`app/(dashboard)/`:**
- Purpose: Protected routes requiring authentication
- Contains: All main application pages
- Key files: `layout.tsx` (dashboard wrapper with AuthGuard)

**`app/(dashboard)/dashboard/`:**
- Purpose: Core CRUD pages for educational entities
- Contains: alunos, turmas, escolas, usuarios, matriculas, frequencia, notas, sessoes
- Key files: Each entity has `page.tsx`, `[id]/page.tsx`, `novo/page.tsx`

**`app/api/`:**
- Purpose: REST API endpoints
- Contains: Route handlers for sessions, attendance, search, compliance
- Key files: `sessoes/aula/abrir/route.ts`, `frequencia/*/route.ts`

**`app/actions/`:**
- Purpose: Server Actions for form submissions and mutations
- Contains: `'use server'` functions
- Key files: `attendance/open-session.ts`, `attendance/mark-attendance.ts`

**`components/ui/`:**
- Purpose: shadcn/ui base components
- Contains: Button, Card, Dialog, Input, Table, etc.
- Key files: `index.ts` (barrel export), individual component files

**`components/attendance/`:**
- Purpose: Attendance (chamada) workflow components
- Contains: Status buttons, date navigation, header, modals
- Key files: `ChamadaStatusButtons.tsx`, `ChamadaHeader.tsx`, `AttendanceGrid.tsx`

**`components/diary/`:**
- Purpose: Class diary and lesson content components
- Contains: Lesson forms, BNCC selectors, development reports
- Key files: `LessonContentForm.tsx`, `BNNCSelector.tsx`, `VivenciaForm.tsx`

**`components/students/`:**
- Purpose: Student profile and form components
- Contains: Student forms, profile displays, info grids
- Key files: `student-form.tsx`, `StudentProfileHeader.tsx`, `StudentInfoGrid.tsx`

**`components/layout/`:**
- Purpose: App-wide layout components
- Contains: Sidebar, header, mobile navigation, auth guard
- Key files: `sidebar.tsx`, `header.tsx`, `auth-guard.tsx`, `MobileNav.tsx`

**`lib/api/`:**
- Purpose: API service classes for data operations
- Contains: Domain-specific API clients extending BaseApiService
- Key files: `base.ts`, `attendance.ts`, `students.ts`, `grades.ts`

**`lib/services/`:**
- Purpose: Complex business logic and workflows
- Contains: Attendance workflow services with compliance rules
- Key files: `attendance-workflow.ts`, `attendance-locking.ts`, `attendance-immutability.ts`

**`lib/validation/`:**
- Purpose: Zod schemas and validators
- Contains: Brazilian data validators, form schemas
- Key files: `brazilian.ts`, `attendance.ts`, `students-validation.ts`

**`lib/realtime/`:**
- Purpose: Supabase real-time subscription management
- Contains: Connection managers, session listeners
- Key files: `session-realtime.ts`, `connection-manager.ts`

**`lib/supabase/`:**
- Purpose: Server-side Supabase client creation
- Contains: Cookie-based auth clients
- Key files: `server.ts`

**`hooks/`:**
- Purpose: Reusable React hooks
- Contains: Auth, queries, real-time, toast hooks
- Key files: `use-auth.ts`, `use-diary-query.ts`, `use-aula-realtime.ts`

**`contexts/`:**
- Purpose: React Context providers
- Contains: Real-time session context, search context
- Key files: `session-realtime-context.tsx`, `search-context.tsx`

**`types/`:**
- Purpose: TypeScript type definitions
- Contains: Supabase-generated types, domain types
- Key files: `database.ts` (Supabase types), `supabase.ts`, domain type files

## Key File Locations

**Entry Points:**
- `gestao_fronteira/app/layout.tsx`: Root HTML layout
- `gestao_fronteira/app/page.tsx`: Home page (redirects to login/dashboard)
- `gestao_fronteira/app/(dashboard)/layout.tsx`: Dashboard wrapper
- `gestao_fronteira/middleware.ts`: Request middleware

**Configuration:**
- `gestao_fronteira/next.config.js`: Next.js configuration
- `gestao_fronteira/tailwind.config.js`: Tailwind CSS configuration
- `gestao_fronteira/tsconfig.json`: TypeScript configuration
- `gestao_fronteira/.eslintrc.json`: ESLint rules

**Core Logic:**
- `gestao_fronteira/lib/supabase.ts`: Browser Supabase client
- `gestao_fronteira/lib/supabase/server.ts`: Server Supabase clients
- `gestao_fronteira/lib/auth.ts`: Auth utilities and profile fetching
- `gestao_fronteira/lib/middleware/auth-middleware.ts`: Route protection logic

**Testing:**
- `gestao_fronteira/test-results/`: Test output directory

## Naming Conventions

**Files:**
- Components: PascalCase (`StudentForm.tsx`, `ChamadaHeader.tsx`)
- Utilities: kebab-case (`date-utils.ts`, `error-handling.ts`)
- Hooks: camelCase with `use-` prefix (`use-auth.ts`, `use-diary-query.ts`)
- Pages: lowercase (`page.tsx`, `loading.tsx`)
- API routes: lowercase (`route.ts`)

**Directories:**
- Domain components: lowercase plural (`components/students/`, `components/turmas/`)
- Feature directories: lowercase (`lib/validation/`, `lib/realtime/`)
- Route groups: parenthesized (`(auth)`, `(dashboard)`)
- Dynamic routes: bracketed (`[id]`, `[alunoId]`)

**Components:**
- Export name matches filename: `StudentForm.tsx` exports `StudentForm`
- Barrel exports in `index.ts` for grouped components

## Where to Add New Code

**New Page:**
- Path: `gestao_fronteira/app/(dashboard)/dashboard/[entity]/page.tsx`
- Include: `loading.tsx` for suspense, `[id]/page.tsx` for detail view

**New Component:**
- Domain-specific: `gestao_fronteira/components/[domain]/ComponentName.tsx`
- UI primitive: `gestao_fronteira/components/ui/component-name.tsx`
- Update barrel: Add export to `gestao_fronteira/components/[domain]/index.ts`

**New API Endpoint:**
- Path: `gestao_fronteira/app/api/[endpoint]/route.ts`
- Pattern: Export `GET`, `POST`, `PUT`, `DELETE` async functions

**New Server Action:**
- Path: `gestao_fronteira/app/actions/[domain]/action-name.ts`
- Pattern: `'use server'` directive, typed params and returns

**New Hook:**
- Path: `gestao_fronteira/hooks/use-[name].ts`
- Update barrel: `gestao_fronteira/hooks/index.ts`

**New Validation Schema:**
- Path: `gestao_fronteira/lib/validation/[domain]-validation.ts`
- Update barrel: `gestao_fronteira/lib/validation/index.ts`

**New Type Definition:**
- Supabase types: Auto-generated, don't edit `database.ts`
- Domain types: `gestao_fronteira/types/[domain].ts`

**New Utility:**
- General: `gestao_fronteira/lib/[utility-name].ts`
- Domain-specific: `gestao_fronteira/lib/[domain]/[utility].ts`

## Special Directories

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes (by pnpm install)
- Committed: No

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes (by next build/dev)
- Committed: No

**`public/`:**
- Purpose: Static files served at root URL
- Generated: No
- Committed: Yes

**`test-results/`:**
- Purpose: Test output and screenshots
- Generated: Yes (by test runs)
- Committed: No (per .gitignore)

**`.claude/`:**
- Purpose: Claude Code configuration and commands
- Generated: No
- Committed: Yes

**`.planning/`:**
- Purpose: Project planning and documentation
- Generated: No (manually created)
- Committed: Yes

---

*Structure analysis: 2026-01-18*
