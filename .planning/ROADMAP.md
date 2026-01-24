# ROADMAP.md - v2.1 Production Pilot

**Started:** 2026-01-24
**Goal:** Deploy to 1-2 pilot schools, add analytics, complete E2E tests.

---

## Phases

### Phase 16: Analytics & Monitoring Integration

**Goal:** Implement production-grade analytics and error tracking with E2E verification.

**Requirements:**
- ANL-01: Working PostHog or alternative analytics provider
- ANL-02: Sentry error tracking integrated
- ANL-03: Logger connected to monitoring service
- ANL-04: E2E login flow verified with browser automation

**Gap Closure:**
- CLN-08 (v2.0 deferred): PostHog integration
- Plan 15-08 (v2.0 skipped): Sentry integration
- logger.ts TODO: External monitoring service connection

**Tasks:**
1. Debug current analytics configuration issues
2. Research Turbopack-compatible analytics solution
3. Install and configure analytics/error tracking packages
4. Connect logger to external monitoring
5. E2E verification with browser automation (login with seed-superadmin credentials)

**Browser Automation Test:**
- Login with: admin@fronteira.mg.gov.br / Admin@Fronteira2025
- Verify analytics events fire
- Verify errors are captured
- Document working configuration

---

### Phase 17: E2E Playwright Smoke Tests (Planned)

**Goal:** Complete deferred TST-03 from v2.0.

**Requirements:**
- TST-03: E2E Playwright smoke tests for critical flows

**Depends on:** Phase 16 (analytics must work to verify in tests)

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

## Success Criteria

v2.1 is complete when:
- [ ] Analytics/error tracking working in production
- [ ] E2E tests pass for critical flows
- [ ] Database types regenerated
- [ ] Deployed to 1-2 pilot schools
- [ ] Initial feedback collected

---

*Created: 2026-01-24*
*From: v2.0 tech debt and PROJECT.md v2.1 scope*
