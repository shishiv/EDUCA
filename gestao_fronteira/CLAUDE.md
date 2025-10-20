# CLAUDE.md - Project Context

**Project**: Sistema de Gestão Educacional - Fronteira, MG
**Version**: 1.0.0 MVP | **Status**: 90% Production-Ready
**Updated**: 2025-01-18

---

## 🚀 Quick Start

### Stack
- Next.js 15.5.3 + React 18 + TypeScript 5.2.2
- Supabase 2.57.4 (PostgreSQL + Auth + RLS)
- shadcn/ui + Tailwind CSS 3.3.3
- Zustand + TanStack Query

### 📚 Documentation (START HERE)
- **Master Index**: `docs/DOCUMENTATION_INDEX.md` (15 files, 300KB)
- **Architecture**: `docs/PROJECT_INDEX.md`
- **Components**: `docs/COMPONENT_ARCHITECTURE.md` (145+ components)
- **Database**: `docs/DATABASE_SCHEMA.md` (18 tables)
- **API**: `docs/API_REFERENCE.md`
- **Frontend Pages**: `docs/FRONTEND_PAGES_ANALYSIS.md` (25 pages implemented, 8 pending)
- **Bugs**: `BUGS-ANALYSIS.md` (check before coding!)

### ⚙️ Commands
```bash
cd gestao_fronteira/
pnpm install        # Install deps
pnpm dev            # Dev server (localhost:3000)
pnpm build          # Production build
pnpm typecheck      # TypeScript validation
pnpm test           # Unit tests (Jest)
pnpm test:e2e       # E2E tests (Playwright)
```

---

## 🔴 Critical Rules

### Database Operations
⚠️ **Database = Supabase MCP ONLY**
- ❌ NO `supabase start`, `supabase db push`, or CLI
- ✅ USE `mcp__supabase__apply_migration`, `mcp__supabase__execute_sql`

### Git Workflow
- ❌ NO direct commits to `main`
- ✅ USE `feature/*` or `fix/*` branches
- ✅ Conventional commits: `feat(attendance): implement workflow`

### UI/UX Validation
⚠️ **MANDATORY before any UI change**: Chrome DevTools MCP
1. Visual: Desktop (1920x1080) + Mobile (375x667) + Tablet (768x1024)
2. Functional: Console clean + Network 2xx + Accessibility
3. Performance (pre-production): LCP <2.5s + FPS >30

---

## 📊 Project Status

### ✅ Complete (100%)
- User Management (5-role RBAC)
- Student Registration (INEP-compliant)
- Onboarding Wizard (6-step setup)
- Frontend Pages: 25/33 (76% complete)

### 🔶 Near-Complete (85%)
- Attendance Workflow ("Abrir aula" 3-phase system)
- Reports & Analytics

### ❌ Pending (High Priority)
- Responsáveis module (0% - 3 pages needed)
- Turma details page (`/dashboard/turmas/[id]`)

---

## 🇧🇷 Brazilian Compliance

### INEP/Educacenso 2025
- Stage 1: May 28 - Jul 31, 2025 (enrollment)
- Stage 2: Feb 2 - Mar 13, 2026 (student status)

### Legal Requirements
- **"Não existe o esquecer"**: Attendance immutable after session close
- **LGPD**: Data privacy compliance
- **Bolsa Família**: 80% attendance threshold

### Validation
- CPF: Proper formatting + digit verification
- Phone: Brazilian mobile/landline formats
- Timezone: America/Sao_Paulo

---

## 🛠️ MCP Servers (Active)

1. **Supabase MCP** (`@supabase/mcp-server-supabase`)
   - **MANDATORY** for database operations
   - Project: wxvxlybwpvpenqveycon

2. **Chrome DevTools MCP** (`chrome-devtools-mcp`)
   - **MANDATORY** for UI/UX validation
   - Tools: navigate, screenshot, snapshot, performance_*

3. **shadcn-ui MCP** (`@jpisnice/shadcn-ui-mcp-server`)
   - Component generation and patterns

4. **Context7 MCP** (`@upstash/context7-mcp`)
   - Documentation lookup

---

## 🎯 Architecture Highlights

### Frontend
```
app/
├── (auth)/              # Login, role-selection
├── (dashboard)/         # Main app (25 pages)
├── onboarding/          # Setup wizard
├── actions/             # Server Actions (PRIMARY API)
└── api/                 # RESTful endpoints
```

### Database (18 tables)
- **Core**: users, escolas, alunos, turmas, matriculas
- **Operations**: frequencia, sessoes_aula, notas
- **Security**: RLS policies + school-based multi-tenancy
- **Performance**: 28 indexes (sub-second queries)

### Components (145+)
- **Organized by**: attendance, students, forms, auth, admin, classes
- **Form System**: React Hook Form + Zod + Brazilian validation
- **Attendance**: 3-phase workflow (PLANEJADA → ABERTA → FECHADA)

---

## ⚡ Performance Targets

| Operation | Target | Status |
|-----------|--------|--------|
| Dashboard Load | <3s | ✅ |
| Attendance (single) | <1s | ✅ |
| Attendance (batch 30) | <5s | ✅ |
| Session Open | <2s | ✅ |
| Session Close | <3s | ✅ |

---

## ❌ Common Pitfalls

### Don't
- Use local Supabase CLI
- Commit to main directly
- Skip UI validation (Chrome DevTools MCP)
- Modify attendance after session close
- Ignore `BUGS-ANALYSIS.md`

### Do
- Use Supabase MCP for DB ops
- Create feature branches
- Check docs before coding
- Validate Brazilian data (CPF, phone)
- Test RLS policies

---

## 🚨 Known Bugs

See `BUGS-ANALYSIS.md`:
1. ✅ Login redirect (partially fixed)
2. ⚠️ Toaster setState (React 19)
3. ✅ Delete operations (RLS fixed)

---

## 📋 Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Optional
INEP_API_KEY=
EDUCACENSO_INTEGRATION_TOKEN=
```

---

**Last Updated**: 2025-01-18
**For AI**: Complete project context for code generation and maintenance.
**Documentation**: 15 files (~300KB total) in `docs/`
