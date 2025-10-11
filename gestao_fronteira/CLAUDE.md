# CLAUDE.md - Project Context for AI Assistants

**Project**: Sistema de Gestão Educacional - Município de Fronteira, MG
**Version**: 1.0.0 (MVP Production-Ready)
**Last Updated**: 2025-01-11
**Status**: 80% Production-Ready, Active Development

---

## Quick Reference

### Project Essentials
- **Stack**: Next.js 15.5.3 + React 18.2.0 + Supabase 2.57.4 + TypeScript 5.2.2
- **Package Manager**: **pnpm** (mandatory)
- **Database**: PostgreSQL via Supabase (RLS enabled)
- **UI**: shadcn/ui + Radix UI + Tailwind CSS 3.3.3
- **State**: Zustand 4.4.7 + TanStack Query 5.17.9

### Critical Paths
- **Documentation**: `docs/PROJECT_INDEX.md` (start here)
- **Bugs**: `BUGS-ANALYSIS.md` (check before coding)
- **API Reference**: `docs/API_REFERENCE.md`
- **Deployment**: `DEPLOYMENT.md`

### Database Operations
⚠️ **CRITICAL**: Database access is **ONLY** through **Supabase MCP**
- ❌ DO NOT use `supabase start`, `supabase db push`, or local CLI
- ✅ USE `mcp__supabase__apply_migration`, `mcp__supabase__execute_sql`
- ✅ USE `mcp__supabase__list_tables`, `mcp__supabase__generate_typescript_types`

---

## Project Status (2025-01-11)

### ✅ Complete Modules (100%)
1. **User Management** - 5-role RBAC system
2. **Student Registration** - INEP-compliant with Brazilian validation
3. **Onboarding Wizard** - 6-step school initialization

### 🔶 Near-Complete Modules (85%)
4. **Digital Diary/Attendance** - "Abrir aula" workflow in progress
5. **Reports & Analytics** - Enhanced reporting planned

### 📊 Database Status
- **Migrations Applied**: 29 total
- **RLS**: Enabled on all critical tables
- **Indexes**: 28 performance indexes created
- **Security**: Explicit DELETE policies added (Bug #3 fixed)

### 🐛 Known Critical Bugs
See `BUGS-ANALYSIS.md` for details:
1. ✅ Login redirect (partially fixed, needs profile wait logic)
2. ⚠️ Toaster setState error (React 19 compatibility)
3. ✅ Delete operations (RLS policies fixed)

---

## Development Commands

```bash
# Navigate to project
cd gestao_fronteira/

# Package management (pnpm only!)
pnpm install
pnpm add [package]
pnpm remove [package]

# Development
pnpm dev                # http://localhost:3000
pnpm build              # Production build
pnpm lint               # ESLint check
pnpm typecheck          # TypeScript validation

# Testing
pnpm test               # Unit tests (Jest)
pnpm test:e2e           # E2E tests (Playwright)
pnpm test:coverage      # Coverage report

# Database (via MCP only - see above)
# Use mcp__supabase__* tools in Claude Code
```

---

## Brazilian Educational Compliance

### INEP Standards (Educacenso 2025)
- **Stage 1**: May 28 - July 31, 2025 (Initial Enrollment)
- **Stage 2**: Feb 2 - Mar 13, 2026 (Student Status)
- **Data Points**: Student CPF, enrollment status, attendance, teacher assignments

### Bolsa Família Integration
- **Requirement**: Minimum 80% attendance for social program compliance
- **Alerts**: Automated warnings below threshold
- **Unique Registration**: Official registration number per student

### Legal Compliance
- **"Não Existe o Esquecer"**: Attendance is immutable after session closure
- **Official Documents**: Attendance records are legal documents
- **Audit Trail**: Complete timestamp and user tracking
- **Multi-School Isolation**: Complete data separation via RLS

### Brazilian Validation
- **CPF**: Proper formatting and digit verification
- **Phone**: Mobile/landline format validation (BR)
- **Calendar**: Aligned with Brazilian school year
- **Timezone**: America/Sao_Paulo

---

## Architecture Overview

### Frontend Architecture
```
app/
├── (auth)/              # Authentication routes
├── (dashboard)/         # Main application (protected)
├── onboarding/          # New user setup wizard
├── actions/             # Server Actions (primary API)
└── api/                 # API Routes (RESTful endpoints)
```

### Server Actions (Primary API)
Location: `app/actions/`
- **attendance/**: open-session, mark-attendance, close-session
- Type-safe, automatic revalidation
- Direct database access via Supabase client

### API Routes (RESTful)
Location: `app/api/`
- **sessions/**: Session management endpoints
- **compliance/**: Warnings and INEP integration
- **search/**: Universal search

### Database Layer
- **Core Tables**: users, escolas, alunos, turmas, matriculas, frequencia
- **RLS Policies**: School-based isolation
- **Indexes**: 28 performance indexes
- **Triggers**: Auto-audit, hash generation

---

## UI/UX Quality Assurance

### Chrome DevTools MCP (MANDATORY)
⚠️ **Before any UI change**, validate with Chrome DevTools MCP:

1. **Visual Validation**
   - Desktop (1920x1080, 1366x768)
   - Mobile (375x667, 414x896)
   - Tablet (768x1024, 1024x768)

2. **Functional Validation**
   - Console clean (no errors/warnings)
   - Network requests return 2xx
   - Accessibility snapshot structured

3. **Performance Validation** (before production)
   - LCP < 2.5s (Largest Contentful Paint)
   - FPS > 30 (no significant drops)
   - No memory leaks
   - Network requests < 1s

**Tools**: `mcp__chrome-devtools__*` (navigate, screenshot, snapshot, list_console_messages, performance_*)

---

## Git Workflow

### Branch Strategy
- **main**: Production-ready code only
- **feature/***: New features
- **fix/***: Bug fixes
- ❌ **NEVER** commit directly to main

### Commit Format (Conventional Commits)
```bash
feat(attendance): implement Abrir aula workflow
fix(students): correct CPF validation for edge cases
perf(database): optimize RLS policies for attendance queries
docs(api): update student registration endpoint docs
test(e2e): add Brazilian compliance validation tests

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Scopes**: attendance, students, schools, classes, reports, compliance, database, auth

---

## Performance Targets

| Operation | Target | Status |
|-----------|--------|--------|
| Dashboard Load | < 3s | ✅ Achieved |
| Attendance Marking (single) | < 1s | ✅ Achieved |
| Attendance Marking (batch 30) | < 5s | ✅ Achieved |
| Session Open | < 2s | ✅ Achieved |
| Session Close | < 3s | ✅ Achieved |

---

## Testing Strategy

### Test Types
1. **Unit Tests** (Jest + RTL): Component logic, utility functions
2. **E2E Tests** (Playwright): Complete user workflows
3. **Visual Tests**: Chrome DevTools MCP screenshots
4. **Accessibility**: WCAG 2.1 AA compliance
5. **Performance**: Load times, API response times

### Test Commands
```bash
pnpm test                # Unit tests
pnpm test:watch          # Unit tests (watch mode)
pnpm test:e2e            # E2E tests
pnpm test:e2e:ui         # Playwright UI mode
pnpm test:coverage       # Coverage report
```

---

## Environment Variables

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database (Local Development)
DATABASE_URL=postgresql://postgres:password@localhost:54322/postgres

# Brazilian Education APIs (Optional)
INEP_API_KEY=your_inep_api_key
EDUCACENSO_INTEGRATION_TOKEN=your_token

# Performance Monitoring (Optional)
PERFORMANCE_MONITORING_KEY=your_key
```

---

## Roadmap to 100% Production (36.5 hours)

1. **Enhanced "Abrir aula" Workflow** (8h) - Three-phase attendance system
2. **Attendance Locking Mechanism** (4h) - Legal compliance enforcement
3. **Multi-Guardian Management** (8h) - Complex family structure support
4. **INEP Integration** (6h) - Government reporting system
5. **Comprehensive Audit System** (4h) - LGPD compliance
6. **Enhanced RLS Policies** (2h) - Multi-school security
7. **Brazilian Validation Library** (2.5h) - Government standards
8. **Advanced Reporting** (2h) - Analytics and exports

---

## Documentation Index

### Current Documentation (docs/)
- **PROJECT_INDEX.md** - Complete architecture overview (START HERE)
- **API_REFERENCE.md** - Server Actions and API Routes reference
- **DATABASE_SECURITY_PERFORMANCE_PLAN.md** - Database optimization plan
- **PRODUCTION-READINESS-REPORT.md** - Production readiness assessment
- **SECURITY_PERFORMANCE_SUMMARY.md** - Security audit summary
- **NEW_HOMEPAGE_DESIGN.md** - Homepage redesign specs
- **ROADMAP-PORTAL-RESPONSAVEIS.md** - Parent portal roadmap
- **UI_UX_IMPROVEMENTS.md** - UI/UX enhancement guide

### Archived Documentation (docs/archive/)
- **archive/2025-10/**: October 2025 historical docs
- **archive/historical/**: Implementation guides and analysis
- **archive/test-results/**: Performance and stress test results

### Root Documentation
- **README.md** - Project overview and quick start
- **BUGS-ANALYSIS.md** - Known bugs and analysis
- **DEPLOYMENT.md** - Deployment instructions

---

## MCP Servers Configuration

### Active MCP Servers
1. **Supabase MCP** (`@supabase/mcp-server-supabase`)
   - **MANDATORY** for all database operations
   - Project: wxvxlybwpvpenqveycon
   - Tools: `mcp__supabase__*`

2. **Chrome DevTools MCP** (`chrome-devtools-mcp`)
   - **MANDATORY** for UI/UX validation
   - Tools: `mcp__chrome-devtools__*`

3. **shadcn-ui MCP** (`@jpisnice/shadcn-ui-mcp-server`)
   - Component generation and documentation
   - Tools: `mcp__shadcn-ui__*`

4. **Context7 MCP** (`@upstash/context7-mcp`)
   - Documentation and code patterns
   - Tools: `mcp__context7__*`

---

## Common Pitfalls & Solutions

### ❌ Don't
- Use local Supabase CLI for database operations
- Commit directly to main branch
- Skip UI/UX validation with Chrome DevTools MCP
- Modify attendance records after session closure
- Mix npm/yarn with pnpm
- Ignore BUGS-ANALYSIS.md before coding

### ✅ Do
- Use Supabase MCP for all database operations
- Create feature branches for all work
- Validate UI changes with Chrome DevTools MCP
- Check BUGS-ANALYSIS.md before starting work
- Use pnpm for all package operations
- Follow conventional commit format
- Test Brazilian validation (CPF, phone, dates)
- Verify RLS policies before production

---

## Support & Resources

### Documentation
- **Start Here**: `docs/PROJECT_INDEX.md`
- **API Reference**: `docs/API_REFERENCE.md`
- **Known Bugs**: `BUGS-ANALYSIS.md`

### External Resources
- **Next.js 15**: https://nextjs.org/docs
- **Supabase**: https://supabase.com/docs
- **shadcn/ui**: https://ui.shadcn.com
- **INEP/Educacenso**: Brazilian Ministry of Education standards

### Development Team
- **Primary Language**: Portuguese (Brazilian)
- **Timezone**: America/Sao_Paulo (UTC-3)
- **Domain**: Brazilian Educational System

---

**Last Updated**: 2025-01-11
**Maintained By**: Development Team
**For AI Assistants**: This file provides complete project context for code generation, debugging, and maintenance tasks.
