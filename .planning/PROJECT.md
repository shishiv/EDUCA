# PROJECT.md

## Project: EDUCA - Sistema de Gestao Escolar

**Status:** v2.0 SHIPPED (2026-01-24)
**Started:** 2026-01-16
**Type:** School Management System (Brownfield)

---

## Next Milestone: v2.1 Production Pilot

**Goal:** Deploy to 1-2 pilot schools, add analytics, complete E2E tests.

**Planned scope:**
- PostHog analytics integration
- E2E Playwright smoke tests
- Database types regeneration
- Pilot deployment and feedback collection

---

## Current State

### v2.0 SHIPPED (2026-01-24)

Architecture & Launch Prep milestone complete:
- Build quality enforcement (TypeScript + ESLint in CI)
- Data integrity: real Supabase data, Vivencias API CRUD
- Admin school selector with sessionStorage persistence
- Code standards: structured logger, API service layer, CONVENTIONS.md
- Feature flags system with per-escola toggles at /dashboard/flags
- Security: Supabase migrations versioned, RLS policies documented
- Testing foundation: Vitest configured with attendance workflow tests
- Role-based access: admin view-only, teacher-turma assignments, demo mode
- Legacy page audit: 46 pages classified, dev pages removed
- Technical debt cleanup: components refactored, dead code removed
- Config audit: ESLint fixed, 10 unused deps removed, tsconfig modernized

### v1.0 SHIPPED (2026-01-18)

UI/UX overhaul following EDUCA design system:
- Design system foundation (CSS variables, Tailwind, typography)
- Responsive layout (Sidebar, Header, MobileNav)
- Screens: Login, Dashboard, Turmas, Chamada, Aluno
- New module: Diario Infantil (BNCC-compliant)

### Known Issues

**Deferred to v2.1:**
- TST-03: E2E Playwright smoke tests (environment issues)
- CLN-08: PostHog analytics integration
- Database types regeneration (relatorios_descritivos table)

**Tech Debt (minor):**
- 4 TODOs remaining in lib/ (96% cleanup achieved)
- 2 orphaned API routes for future modules
- 715 ESLint code issues (236 errors, 479 warnings)

---

## Vision

Sistema de gestao escolar completo para a rede municipal de Fronteira, MG. Gerencia alunos, frequencia, diarios de classe, nutricao, transporte e relatorios para MEC/Bolsa Familia.

---

## Goals

### v2.1 Goals (Next)

1. **Production Pilot**
   - Deploy to 1-2 schools
   - Collect user feedback
   - Monitor error rates and performance

2. **Analytics & Monitoring**
   - PostHog integration (deferred CLN-08)
   - Error tracking and user behavior analytics

3. **Testing Completion**
   - E2E Playwright smoke tests (deferred TST-03)
   - Database types regeneration

### Previous Goals (v2.0 - Complete)

- Codebase Audit: PAGE-AUDIT.md, CODE-AUDIT.md, INTEGRATION-AUDIT.md
- Architecture Standardization: CONVENTIONS.md, API service layer
- Feature Flags System: Supabase config, /dashboard/flags UI
- Launch Readiness: RLS policies documented, privacy policy updated

### Previous Goals (v1.0 - Complete)

- Design System EDUCA
- Layout Principal (Sidebar, Header)
- Telas Refatoradas (Login, Dashboard, Turmas, Chamada, Aluno)
- Diario Infantil BNCC

---

## Requirements

### Validated (v2.0)

27 of 28 requirements satisfied (96%):
- Build & Quality: BLD-01..04 (TypeScript + ESLint enforcement)
- Data Integrity: DAT-01..03 (real Supabase data)
- Admin School Selector: ADM-01..03 (escola-scoped admin access)
- Code Standards: STD-01..04 (patterns, logger, API layer)
- Feature Flags: FLG-01..04 (Supabase config + admin UI)
- Security: SEC-01..03 (migrations, RLS, privacy policy)
- Testing: TST-01..02 (Vitest configured, attendance tests)
- Role Access: ROL-01..02 (admin view-only, assignments)
- Demo Mode: DMO-01 (admin demo assignment)
- Legacy Audit: AUD-01..02 (page inventory)
- Tech Debt: CLN-01..07 (TODOs, refactors, naming)
- Dead Code: DCA-01..03 (audit, removal, documentation)
- Config: CFG-01..03 (package.json, tsconfig, next.config)

### Validated (v1.0)

48 UI/UX requirements across:
- Design System (4), Layout (5), Components (10)
- Login (5), Dashboard (4), Turmas (4), Chamada (5)
- Aluno (3), Diario Infantil (5), Accessibility (3)

### Deferred to v2.1

| Requirement | Reason |
|-------------|--------|
| TST-03 | E2E Playwright (environment issues) |
| CLN-08 | PostHog integration |

### Out of Scope

| Feature | Reason |
|---------|--------|
| Novos modulos (Nutricao, Estoque) | Feature flags apenas, implementacao futura |
| Integracao WhatsApp | Complexidade alta, deferida |
| Edicao retroativa de frequencia | Compliance brasileiro proibe |

---

## Constraints

- Must maintain existing Supabase API contracts
- Must preserve Brazilian compliance (attendance immutability, auto-lock)
- Must work offline-first (existing PWA)
- Must support Portuguese language
- Pilot in 1-2 schools before full rollout

---

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| v1.0: CSS variables as tokens | Enables runtime theming | Good |
| v1.0: Sort in JS not Supabase | Nested relation ordering | Good |
| v2.0: Supabase feature flags | Per-school toggle, no external deps | Good |
| v2.0: Audit before new features | Unknown codebase state | Good |
| v2.0: Vitest over Jest | Faster, better ESM support | Good |
| v2.0: Native ESLint 9 flat config | No FlatCompat wrapper needed | Good |
| v2.0: knip for dead code detection | Automated, CI-ready | Good |
| v2.0: EscolaContext for admin escola selection | sessionStorage + hydration-safe | Good |
| v2.0: Structured logger over console.error | Filterable, actionable logs | Good |

---

## Source of Truth

**Original roadmap:** `/docs/educa-roadmap(1).html`
**Design mockups:** `/docs/*.html`
**Codebase:** `gestao_fronteira/`
**Milestone archives:** `.planning/milestones/`

---

*Last updated: 2026-01-24 after v2.0 SHIPPED*
