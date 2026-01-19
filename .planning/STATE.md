# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-18)

**Core value:** Auditar e padronizar codebase para suportar features futuras e preparar piloto em 1-2 escolas.
**Current focus:** v2.0 Architecture & Launch Prep

## Current Position

Phase: 7.1 of 11 (Admin School Selector)
Plan: 2 of 4 complete
Status: Plan 02 complete, ready for Plan 03
Last activity: 2026-01-19 - Completed 07.1-02-PLAN.md (UI Components and Layout Integration)

Progress: ████████░░ 38% (8/21 requirements)

## Milestone Summary

### v2.0 Architecture & Launch Prep (CURRENT)

- 6 phases planned (6-11)
- 21 requirements defined
- Focus: Audit, standardization, feature flags, launch readiness
- Target: Pilot in 1-2 schools

### v1.0 UI/UX Refactoring (SHIPPED)

- 5 phases completed
- 48 requirements satisfied
- 3 days elapsed (2026-01-16 to 2026-01-18)
- Archive: `.planning/milestones/v1.0-*`

## Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 06-01 | FlatCompat bridge for eslint-config-next | Official Next.js ESLint config is still legacy format |
| 06-02 | Remove both ignore flags for full enforcement | Both eslint and typescript flags removed together |
| 06-03 | Delete unused student-form.tsx vs creating missing module | Component never used - actual form in app/(dashboard)/dashboard/alunos/novo/page.tsx |
| 06-04 | pnpm 9 + Node.js 20 LTS for CI | Current LTS versions for stability and performance |
| 07-01 | Followed AttendanceApiService pattern for Vivencias | Consistent architecture across API services |
| 07-01 | Deferred foto_url behind feature flag | LGPD compliance per CONTEXT.md |
| 07-02 | Promise.all for parallel dashboard queries | Faster page load by fetching all stats simultaneously |
| 07-02 | Escola-scoped data for Diretor/Secretario | Data filtered by escola_id from authenticated user's profile |
| 07-02 | ResponsavelDashboard real data fetch | Fetches children linked to parent, calculates per-student attendance |
| 07-03 | Attendance calculation uses current month | Filters frequencia by current month date range |
| 07-03 | Attendance format "XX% (N/M dias)" | Per CONTEXT.md DAT-01 requirement |
| 07-04 | Fetch active matricula for turma_id | Required for vivencia creation API |
| 07-04 | Empty states with CTA button | Guides users when no vivencias exist |
| 07.1-01 | SessionStorage over localStorage | Session-only persistence per CONTEXT.md |
| 07.1-01 | Hydration-safe sessionStorage pattern | Read in useEffect, not useState initializer |
| 07.1-01 | Auto-select escola for single-school users | diretor/secretario/professor with escola_id get it auto-selected |
| 07.1-02 | EscolaProvider wraps SessionRealtimeProvider | Escola context outer for global access |
| 07.1-02 | Yellow highlight for no escola selected | Visual emphasis per EDUCA design system |
| 07.1-02 | Collapsed sidebar icon-only selector | Space-efficient School icon with popover |

## Session Continuity

Last session: 2026-01-19
Stopped at: Completed 07.1-02-PLAN.md (UI Components and Layout Integration)
Resume file: .planning/phases/07.1-admin-school-selector/07.1-03-PLAN.md

### Roadmap Evolution

- Phase 7.1 inserted after Phase 7: Admin School Selector (URGENT) - Admin users blocked from accessing escola-scoped pages

---

*State updated: 2026-01-19 after 07.1-02-PLAN.md complete*
