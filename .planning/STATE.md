# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-18)

**Core value:** Auditar e padronizar codebase para suportar features futuras e preparar piloto em 1-2 escolas.
**Current focus:** v2.0 Architecture & Launch Prep

## Current Position

Phase: 9 of 11 (Feature Flags) — READY TO DISCUSS
Plan: 0 of 0
Status: Phase 8 verified, ready for Phase 9 discussion
Last activity: 2026-01-19 - Phase 8 executed and verified

Progress: ██████████░ 58% (14/24 requirements)

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
| 07.1-03 | escolaIdToUse pattern for hybrid filtering | Computes effective escola from selector or profile |
| 07.1-03 | Empty state shows PageHeader + EscolaRequiredState | Consistent UX for admin without selection |
| 07.1-03 | Alunos filtered via matriculas->turmas chain | Escola doesn't have direct aluno relation |
| 07.1-03 | Yellow EscolaRequiredState matches header indicator | Design consistency across empty states |
| 08-01 | VivenciasApiService as exemplar pattern | Best example of API service with JSDoc, logger, typed returns |
| 08-01 | staleTime: 5min static, 2min moderate, 1min active | React Query caching strategy by data type |
| 08-01 | Portuguese 'todas' for feminine noun filters | Filter consistency with localized UI |
| 08-02 | Feature names match file/domain | Intuitive grouping for log filtering |
| 08-02 | Action names describe operation | Precise identification of error source |
| 08-02 | console.warn also migrated to logger.warn | Consistency with structured logging |
| 08-04 | Feature names match domain | diario-infantil, relatorios-descritivos, alunos, matriculas, reports, dashboard |
| 08-04 | Action names describe operation | load_student, create_vivencia, save_draft, etc. |
| 08-04 | console.log -> logger.info | Draft/finalize operations benefit from structured logging |
| 08-03 | API service methods for report filtering | getTurmasForFilters, getSchoolsForFilters, getTurmasBySchool in reportsApi |
| 08-03 | Chamada-specific methods in attendanceApi | getStudentsForChamada, getAttendanceForDate, saveChamada |
| 08-03 | Type reuse from API services | ReportTurma, ReportSchool types from lib/api/reports.ts |

## Session Continuity

Last session: 2026-01-19
Stopped at: Phase 8 verified
Next step: `/gsd:discuss-phase 9` to gather context for Feature Flags phase

### Roadmap Evolution

- Phase 7.1 inserted after Phase 7: Admin School Selector (URGENT) - Admin users blocked from accessing escola-scoped pages
- Phase 7.1 complete: Admin school selector functional, all 3 plans executed and verified
- Phase 8 complete: Code Standards documentation and migration
  - 08-01: Standards document created
  - 08-02: 48 console.error/warn calls migrated to structured logger in lib/
  - 08-03: Inline queries migrated to API services in report/chamada pages
  - 08-04: 22 console.error/warn/log calls migrated to structured logger in pages/components
- Ready for Phase 9: Feature Flags

---

*State updated: 2026-01-19 after Phase 8 verification passed*
