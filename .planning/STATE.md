# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-18)

**Core value:** Auditar e padronizar codebase para suportar features futuras e preparar piloto em 1-2 escolas.
**Current focus:** v2.0 Architecture & Launch Prep

## Current Position

Phase: 15 of 15 (Technical Debt Cleanup) - IN PROGRESS
Plan: 3 of 9 complete
Status: Executing Phase 15 plans
Last activity: 2026-01-20 - Verified 15-03-PLAN.md complete (Notas Mock Data Replacement)

Progress: ███████████████░░░ 80% (28/34 requirements)

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
| 09-01 | Two-table design for feature flags | Separates flag definitions from per-escola enablement |
| 09-01 | Soft delete via is_active flag | Preserves audit history when flags are deactivated |
| 09-01 | KnownFlagName type for compile-time safety | Type-safe flag names ('nutricao' | 'estoque_escolar') |
| 09-02 | Safe default: getFlagForEscola returns false on error | Features stay disabled by default for safe rollout |
| 09-02 | placeholderData: false in useFeatureFlag | Prevents flash of enabled content when loading |
| 09-02 | 5min staleTime for flag queries | Flag data is static configuration, rarely changes |
| 09-03 | List-by-flag admin layout | Select flag first, then see all escolas with toggles |
| 09-03 | staleTime: 0 for admin matrix | Admin toggles need immediate UI feedback |
| 09-03 | refetchQueries after invalidate | Guarantees UI sync after mutation |
| 10-03 | Used official Prefeitura contact information | Real phone (34) 3266-1350 and address for LGPD compliance |
| 10-03 | Added business hours | Improves user experience by setting DPO contact expectations |
| 10-02 | Bilingual document format | Portuguese explanations with English technical terms for both auditors and developers |
| 10-02 | Security matrix at document start | Quick reference for auditors per CONTEXT.md |
| 10-02 | SQL code in appendix | Plain language first for non-technical audience |
| 10-01 | 00000000000000 timestamp for baseline | Ensures baseline sorts before any dated migrations |
| 10-01 | CREATE TABLE IF NOT EXISTS for idempotency | Safe to run on both new and existing environments |
| 10-01 | RLS policies in baseline migration | Schema and security are coupled - deploy together |
| 12-01 | Only professor/diretor can record attendance | Separation of duties - admins audit, professors record |
| 12-01 | Blue Alert with Shield icon for view-only | Informative not warning - admin viewing is normal |
| 12-01 | isViewOnly state in chamada page | Consistent with existing canSeeBolsaFamilia pattern |
| 12-02 | Turma cards use green/amber borders for status | Visual distinction between assigned/pending |
| 12-02 | Stats cards at top of page | Quick overview before grid detail |
| 12-02 | Reuse TeacherAssignment component in dialog | No code duplication |
| 13-01 | DemoModeContext follows EscolaContext pattern | Consistent sessionStorage + hydration pattern |
| 13-01 | Purple theme for demo mode banner | Distinct from blue (view-only) and yellow (escola selector) |
| 13-01 | Turma-specific demo mode | demoTurmaId stored, only affects matching turma |
| 13-01 | Actions recorded with admin user_id | Audit trail preserved in demo mode |
| 14-01 | 5-tier page classification system | Clear actionable categories (functional/partial/mock/orphan/dev-only) |
| 14-01 | Separate hidden-intentional from orphan | Perfil and Flags are intentionally hidden, not missing |
| 14-02 | Add Responsaveis to sidebar, keep Calendario/Sessoes hidden | Responsaveis is user-facing; others are admin tools |
| 15-01 | DashboardStatsApiService follows VivenciasApiService pattern | Consistent architecture across API services |
| 15-01 | escolaId parameter for escola-scoped filtering | Enables diretor/secretario to see only their escola's stats |
| 15-01 | Keep supabase import in page for non-stats data | Activities and turmas data still fetched directly (out of scope for plan) |
| 15-03 | Transform TurmaNotasData to component interface | Minimize UI code changes while adopting API data |
| 15-03 | escolaIdToUse pattern for notas page | Consistent with alunos/turmas pages for escola filtering |
| 15-03 | Default disciplines fallback list | When disciplinas table is empty, use Portugues, Matematica, Historia, Geografia, Ciencias |

## Session Continuity

Last session: 2026-01-20
Stopped at: Verified 15-03-PLAN.md complete (already executed)
Resume file: None
Next action: Execute 15-02-PLAN.md (still pending)

### Roadmap Evolution

- Phase 7.1 inserted after Phase 7: Admin School Selector (URGENT) - Admin users blocked from accessing escola-scoped pages
- Phase 7.1 complete: Admin school selector functional, all 3 plans executed and verified
- Phase 8 complete: Code Standards documentation and migration
  - 08-01: Standards document created
  - 08-02: 48 console.error/warn calls migrated to structured logger in lib/
  - 08-03: Inline queries migrated to API services in report/chamada pages
  - 08-04: 22 console.error/warn/log calls migrated to structured logger in pages/components
- Phase 9 complete: Feature Flags system
  - 09-01: Database schema and TypeScript types created
  - 09-02: API service and React Query hooks created
  - 09-03: Admin UI at /dashboard/flags with bulk toggle (verified via browser automation)
- Phase 12 added: Role Access & Assignments (admin view-only restrictions, teacher-class assignments)
- Phase 10 complete: Security & Compliance
  - 10-01: Supabase CLI installed, 843-line baseline migration with 25 tables, RLS policies, and migration workflow documented
  - 10-02: RLS policies documented in .planning/codebase/RLS-POLICIES.md (749 lines, security matrix, 3 Mermaid diagrams)
  - 10-03: Privacy policy updated with real Secretaria de Educacao contact information (phone, address, hours)

- Phase 11 complete: Testing framework configured
  - 11-01: Vitest configured with jsdom, path aliases, global mocks
  - 11-02: Unit tests for AttendanceWorkflowManager and AttendanceLockingService
  - 11-03: Playwright config created (E2E smoke tests deferred - environment issues)

- Phase 12 complete: Role Access & Assignments
  - 12-01: Admin view-only mode for attendance (canRecordAttendance helper, ViewOnlyNotice component)
  - 12-02: Teacher assignment management page at /dashboard/atribuicoes

- Phase 13 complete: Admin Demo Mode
  - 13-01: DemoModeContext + DemoModeBanner + chamada/atribuicoes integration

- Phase 14 complete: Legacy Page Audit
  - 14-01: PAGE-AUDIT.md created with 46 pages inventoried and classified
  - 14-02: Dev pages deleted (showcase, platform-names), Responsaveis added to sidebar
  - AUD-01 and AUD-02 requirements satisfied
  - Post-audit corrections: /dashboard/frequencia deleted (legacy), / redirects to /login

- Phase 15 added: Technical Debt Cleanup (8 requirements)
  - All findings from PAGE-AUDIT.md, CODE-AUDIT.md, INTEGRATION-AUDIT.md
  - CLN-01..03: Complete all TODOs (12 items)
  - CLN-04: Replace Notas mock data
  - CLN-05: Rename 5 kebab-case components
  - CLN-06: Refactor 3 large components (>600 LOC)
  - CLN-07: Move direct Supabase queries to API services
  - CLN-08: Integrate Sentry/LogRocket

- Phase 15 progress:
  - 15-01: COMPLETE - DashboardStatsApiService created, dashboard page migrated
  - 15-03: COMPLETE - Notas mock data replaced with real Supabase queries (getTurmasForNotas)
  - 15-06: COMPLETE - (Previously completed)

---

*State updated: 2026-01-20 after verifying 15-03-PLAN.md complete - Notas Mock Data Replacement*
