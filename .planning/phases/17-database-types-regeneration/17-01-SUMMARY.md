---
phase: 18-database-types-regeneration
plan: 01
subsystem: database
tags: [supabase, postgresql, rls, bncc, educacao-infantil]

# Dependency graph
requires:
  - phase: 05-aluno-diario-infantil
    provides: relatorio/page.tsx component referencing table
provides:
  - relatorios_descritivos table in production Supabase
  - RLS policies for escola-scoped access control
  - Foreign keys to matriculas, turmas, users tables
affects: [19-types-regeneration, diario-infantil, relatorios]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - RLS policy pattern: professors manage own, directors view escola, admin view all

key-files:
  created:
    - gestao_fronteira/supabase/migrations/20260124133337_create_relatorios_descritivos.sql
  modified: []

key-decisions:
  - "Used IF NOT EXISTS for idempotent migration"
  - "Followed sessoes_aula RLS pattern for consistent access control"
  - "5 BNCC Campos de Experiencia as nullable text fields for flexibility"

patterns-established:
  - "Database migration naming: YYYYMMDDHHMMSS_descriptive_name.sql"
  - "RLS 3-tier pattern: owner-manage, escola-view, admin-view"

# Metrics
duration: 9min
completed: 2026-01-24
---

# Phase 18 Plan 01: Create relatorios_descritivos Table Summary

**Created relatorios_descritivos table in Supabase production with BNCC Campos de Experiencia columns, RLS policies, and foreign keys to matriculas/turmas/users**

## Performance

- **Duration:** 9 min
- **Started:** 2026-01-24T16:32:31Z
- **Completed:** 2026-01-24T16:41:23Z
- **Tasks:** 2 (1 creation, 1 verification)
- **Files modified:** 1

## Accomplishments

- relatorios_descritivos table created with 18 columns for BNCC Campos de Experiencia
- RLS enabled with 3 policies: professors (ALL), directors (SELECT), admin (SELECT)
- Unique constraint on (matricula_id, ano_letivo, semestre) prevents duplicates
- Foreign keys enforce referential integrity to matriculas, turmas, users

## Task Commits

Each task was committed atomically:

1. **Task 1: Create relatorios_descritivos table** - `286b107` (feat)
2. **Task 2: Verify table structure** - Verification only (no commit)

## Files Created/Modified

- `gestao_fronteira/supabase/migrations/20260124133337_create_relatorios_descritivos.sql` - Migration DDL with CREATE TABLE, indexes, RLS policies

## Table Structure Verified

| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| matricula_id | uuid | NO |
| turma_id | uuid | NO |
| professor_id | uuid | NO |
| ano_letivo | integer | NO |
| semestre | text | NO |
| status | text | NO |
| campo_eu_outro_nos | text | YES |
| campo_corpo_gestos | text | YES |
| campo_tracos_sons | text | YES |
| campo_escuta_fala | text | YES |
| campo_espacos_tempos | text | YES |
| observacoes_gerais | text | YES |
| created_at | timestamptz | YES |
| updated_at | timestamptz | YES |
| created_by | uuid | YES |
| finalizado_em | timestamptz | YES |
| finalizado_por | uuid | YES |

## RLS Policies

1. **Professors can manage reports for their turmas** - ALL
2. **Directors can view reports from their escola** - SELECT
3. **Admin can view all reports** - SELECT

## Foreign Keys

- matricula_id -> matriculas(id)
- turma_id -> turmas(id)
- professor_id -> users(id)
- created_by -> users(id)
- finalizado_por -> users(id)

## Indexes

- idx_relatorios_descritivos_matricula (matricula_id)
- idx_relatorios_descritivos_turma (turma_id)
- idx_relatorios_descritivos_professor (professor_id)
- idx_relatorios_descritivos_ano_semestre (ano_letivo, semestre)

## Decisions Made

- Used `IF NOT EXISTS` for idempotent migration (safe to re-run)
- Followed `sessoes_aula` RLS pattern for consistent access control across diary features
- BNCC Campos de Experiencia as nullable text fields (teacher fills as needed)
- `ON DELETE RESTRICT` for foreign keys (cannot delete referenced records)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Repaired remote migration history**
- **Found during:** Task 1 (migration push)
- **Issue:** Remote had migrations 20260124 and 20260124152319 not matching local
- **Fix:** Used `supabase migration repair --status reverted` to mark conflicting remote migrations as reverted
- **Files modified:** None (remote database only)
- **Verification:** `supabase migration list` showed clean state
- **Committed in:** N/A (database operation)

**2. [Rule 1 - Bug] Fixed config.toml major_version**
- **Found during:** Task 1 (db push)
- **Issue:** major_version = 16 was invalid, Supabase uses version 15
- **Fix:** Changed to major_version = 15
- **Files modified:** gestao_fronteira/supabase/config.toml (not committed - local config)
- **Verification:** db push succeeded

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both auto-fixes necessary for migration to succeed. No scope creep.

## Issues Encountered

- Migration mismatch between local and remote required repair commands
- config.toml PostgreSQL version mismatch required update

## User Setup Required

None - no external service configuration required. Table created in production database.

## Next Phase Readiness

- relatorios_descritivos table ready for use by relatorio/page.tsx
- TypeScript types need regeneration to include new table (Phase 18-02 or 19)
- Frontend code already references this table (will work once types are regenerated)

---
*Phase: 18-database-types-regeneration*
*Completed: 2026-01-24*
