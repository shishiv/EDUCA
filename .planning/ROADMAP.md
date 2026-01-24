# ROADMAP.md - v2.1 Production Pilot

**Started:** 2026-01-24
**Goal:** Deploy to 1-2 pilot schools, complete E2E tests.

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

### Phase 17: E2E Playwright Smoke Tests (Planned)

**Goal:** Complete deferred TST-03 from v2.0.

**Requirements:**
- TST-03: E2E Playwright smoke tests for critical flows

**Depends on:** None (Phase 16 no longer has analytics to verify)

---

### Phase 18: Database Types Regeneration (Planned)

**Goal:** Regenerate Supabase types for relatorios_descritivos table.

**Requirements:**
- Types current with production schema

---

### Phase 19: Pilot Deployment (Planned)

**Goal:** Deploy to 1-2 pilot schools.

**Requirements:**
- Production deployment to Vercel
- Pilot school onboarding
- Feedback collection mechanism

---

### Phase 20: UI/UX Fixes ✓

**Goal:** Fix UI/UX issues: duplicate sonner toasts, components with double close buttons.

**Status:** COMPLETE (2026-01-24)

**Requirements:**
- UIX-01: Fix sonner toast appearing twice ✓
- UIX-02: Fix components with duplicate close buttons ✓

**Depends on:** None

**Plans:** 1 plan
- [x] 20-01-PLAN.md - Remove duplicate Toaster and DialogClose

---

## Success Criteria

v2.1 is complete when:
- [x] Analytics placeholder code removed (Phase 16 - cleanup only)
- [ ] E2E tests pass for critical flows
- [ ] Database types regenerated
- [ ] Deployed to 1-2 pilot schools
- [ ] Initial feedback collected

---

*Created: 2026-01-24*
*Updated: 2026-01-24 - Phase 20 COMPLETE, duplicate toast and close button removed*
*From: v2.0 tech debt and PROJECT.md v2.1 scope*
