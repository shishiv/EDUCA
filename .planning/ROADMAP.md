# ROADMAP.md - v2.1 Production Pilot

**Started:** 2026-01-24
**Goal:** Deploy to 1-2 pilot schools.

---

## Phases

### Phase 16: Analytics Placeholder Cleanup ✓

**Goal:** Remove analytics placeholder code. User decided NOT to implement analytics.

**Status:** COMPLETE (2026-01-24)

**Requirements (CLOSED by removal decision):**
- ~~ANL-01: Working PostHog or alternative analytics provider~~ - CLOSED (not implementing)
- ~~ANL-02: Sentry error tracking integrated~~ - CLOSED (not implementing)
- ~~ANL-03: Logger connected to monitoring service~~ - CLOSED (keeping local-only)
- ~~ANL-04: E2E login flow verified with browser automation~~ - CLOSED (no analytics to verify)

**Cleanup Tasks:**
1. Delete AnalyticsProvider.tsx (passthrough component)
2. Remove AnalyticsProvider wrapper from layout.tsx
3. Remove export from providers/index.ts
4. Remove TODO comments from logger.ts
5. Delete or minimize instrumentation.ts
6. Remove PostHog env vars from .env.example

**Plans:** 1 plan
- [x] 16-01-PLAN.md - Remove analytics placeholder code

---

### Phase 17: Database Types Regeneration ✓

**Goal:** Create missing relatorios_descritivos table, regenerate TypeScript types, and fix all type errors.

**Status:** COMPLETE (2026-01-24)

**Requirements:**
- DBT-01: relatorios_descritivos table exists in production ✓
- DBT-02: TypeScript types current with all production tables and columns ✓
- DBT-03: Build passes with regenerated types ✓

**Plans:** 10 plans (all complete)
- [x] 17-01-PLAN.md - Create relatorios_descritivos table
- [x] 17-02-PLAN.md - Regenerate TypeScript types
- [x] 17-03-PLAN.md - Fix AttendanceStatus type mismatch (gap closure)
- [x] 17-04-PLAN.md - Fix API route column name errors (gap closure)
- [x] 17-05-PLAN.md - Fix vivencias API routes (gap closure)
- [x] 17-06-PLAN.md - Fix lib/api layer errors (gap closure)
- [x] 17-07-PLAN.md - Fix service layer errors (gap closure)
- [x] 17-08-PLAN.md - Fix diary/attendance component errors (gap closure)
- [x] 17-09-PLAN.md - Fix layout/UI/context errors (gap closure)
- [x] 17-10-PLAN.md - Fix hooks and remaining errors (gap closure)

**Depends on:** None

---

### Phase 18: Pilot Deployment

**Goal:** Deploy EDUCA to pilot schools (EMEI Maisa, Escola Jose Maria Bastos), onboard users, and establish feedback collection.

**Status:** PLANNED (2026-01-27)

**Requirements:**
- PLT-01: Production deployment accessible on Vercel
- PLT-02: Deployment and rollback procedures documented
- PLT-03: Quick-start guide for pilot users
- PLT-04: User accounts created for pilot schools
- PLT-05: Feedback collection mechanism ready

**Plans:** 3 plans
- [ ] 18-01-PLAN.md - Production deployment and documentation
- [ ] 18-02-PLAN.md - Quick-start guide and feedback template
- [ ] 18-03-PLAN.md - User onboarding and go-live preparation

**Depends on:** Phase 17 (build must pass)

---

### Phase 19: UI/UX Fixes ✓

**Goal:** Fix UI/UX issues: duplicate sonner toasts, components with double close buttons.

**Status:** COMPLETE (2026-01-24)

**Requirements:**
- UIX-01: Fix sonner toast appearing twice ✓
- UIX-02: Fix components with duplicate close buttons ✓

**Depends on:** None

**Plans:** 1 plan
- [x] 19-01-PLAN.md - Remove duplicate Toaster and DialogClose

---

### Phase 20: Mock Data Cleanup, First Access Wizard & E2E Tests

**Goal:** Remove mock data from codebase, implement first-access wizard for all user profiles, and create E2E tests for critical flows.

**Status:** PLANNED (2026-01-27)

**Requirements:**
- MWE-01: All mock data removed from production code
- MWE-02: First-access wizard guides new users through initial setup
- MWE-03: Wizard supports all user profiles (admin, diretor, secretario, professor)
- MWE-04: E2E tests cover atribuições flow
- MWE-05: E2E tests cover turmas management flow
- MWE-06: E2E tests cover login and authentication flow

**Depends on:** Phase 18 (pilot deployment)

**Plans:** 6 plans in 2 waves

Wave 1 (parallel):
- [ ] 20-01-PLAN.md — Remove mock data from pages and API (MWE-01)
- [ ] 20-02-PLAN.md — Create wizard context and step components (MWE-02, MWE-03)
- [ ] 20-04-PLAN.md — Create E2E auth setup and login tests (MWE-06)

Wave 2 (depends on Wave 1):
- [ ] 20-03-PLAN.md — Add help button and integrate wizard (MWE-02, MWE-03)
- [ ] 20-05-PLAN.md — Create turmas E2E tests (MWE-05)
- [ ] 20-06-PLAN.md — Create atribuicoes E2E tests (MWE-04)

---

## Success Criteria

v2.1 is complete when:
- [x] Analytics placeholder code removed (Phase 16 - cleanup only)
- [x] Database types regenerated (Phase 17 - 400+ type errors fixed)
- [ ] Deployed to 1-2 pilot schools
- [ ] Initial feedback collected
- [ ] Mock data removed
- [ ] First-access wizard implemented
- [ ] E2E tests for critical flows

---

*Created: 2026-01-24*
*Updated: 2026-01-27 - Phase 18 planned (3 plans)*
*From: v2.0 tech debt and PROJECT.md v2.1 scope*
