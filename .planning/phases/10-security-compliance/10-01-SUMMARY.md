---
phase: 10-security-compliance
plan: 01
subsystem: database
tags: [supabase, migrations, schema, audit, compliance]
dependency-graph:
  requires: []
  provides: [supabase-cli, baseline-migration, migration-workflow]
  affects: [11-launch-prep, future-schema-changes]
tech-stack:
  added:
    - supabase@2.23.4
  patterns:
    - versioned-migrations
    - baseline-schema-snapshot
    - idempotent-ddl
file-tracking:
  key-files:
    created:
      - supabase/config.toml
      - supabase/migrations/00000000000000_baseline.sql
      - supabase/migrations/README.md
    modified:
      - gestao_fronteira/package.json
decisions:
  - id: baseline-timestamp
    choice: "00000000000000 for baseline migration"
    rationale: "Ensures baseline sorts before any dated migrations"
  - id: idempotent-ddl
    choice: "CREATE TABLE IF NOT EXISTS / CREATE POLICY IF NOT EXISTS"
    rationale: "Safe to run on both new and existing environments"
  - id: rls-policies-baseline
    choice: "Include RLS policies in baseline"
    rationale: "Schema and security are coupled - deploy together"
metrics:
  duration: ~15 minutes
  completed: 2026-01-19
---

# Phase 10 Plan 01: Supabase CLI Setup & Baseline Migration Summary

**One-liner:** Supabase CLI installed, 843-line baseline migration capturing 25 tables with RLS policies

## What Was Done

### Task 1: Install Supabase CLI and Initialize Project Structure
- Added `supabase@2.23.4` to devDependencies
- Created `supabase/config.toml` with local development configuration
- Configured API, database, auth, storage, and studio settings

### Task 2: Create Baseline Schema Migration
- Created `00000000000000_baseline.sql` (843 lines)
- Captured 25 existing tables from production schema
- Included RLS policies, indexes, views, and helper functions
- Used `CREATE TABLE IF NOT EXISTS` for idempotent deployments

### Task 3: Verify Migration File Ordering and Structure
- Confirmed migration order: baseline -> feature_flags
- Created `supabase/migrations/README.md` documenting workflow
- Verified SQL syntax with CREATE TABLE/POLICY counts

## Key Implementation Details

### Tables Captured in Baseline

**Core Tables (8):**
- escolas, users, alunos, responsaveis
- aluno_responsaveis, turmas, matriculas, disciplinas

**Session & Attendance (5):**
- aulas_abertas, sessoes_aula, frequencia, notas, calendario_escolar

**System Tables (3):**
- configs, codigos_inep, educacenso_exports

**Audit Tables (3):**
- audit_logs, audit_trail, audit_sessoes_aula

**Legacy Tables (6):**
- School, User, Role, Permission, UserRole, RolePermission

### Views Included
- `vw_alunos_risco_bolsa_familia` - Bolsa Familia attendance risk
- `vw_frequencia_completa` - Complete attendance with all joins
- `audit_summary` - Aggregated audit data

### Helper Functions
- `auth_is_admin()` - Check admin role
- `auth_get_user_role()` - Get current user type
- `auth_get_user_escola()` - Get current user's school
- `auth_has_role_or_higher()` - Role hierarchy check
- `is_session_editable()` - Session edit permission
- `get_session_phase()` - Session workflow phase

## Migration Workflow Established

```bash
# New environments
npx supabase link --project-ref YOUR_REF
npx supabase db push

# Check status
npx supabase db diff

# Generate types
npx supabase gen types typescript --project-id ID > lib/database.types.ts
```

## Files Created/Modified

| File | Change | Lines |
|------|--------|-------|
| `gestao_fronteira/package.json` | Added supabase devDep | +1 |
| `supabase/config.toml` | New | 140 |
| `supabase/migrations/00000000000000_baseline.sql` | New | 843 |
| `supabase/migrations/README.md` | New | 117 |

## Commits

| Hash | Type | Description |
|------|------|-------------|
| c9ee630 | chore | Install Supabase CLI and create config.toml |
| acd61f8 | feat | Create baseline schema migration |
| 96f2e38 | docs | Add migrations README with workflow documentation |

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria Verification

- [x] Supabase CLI installed as devDependency
- [x] supabase/config.toml exists with project configuration
- [x] Baseline migration (00000000000000_baseline.sql) captures existing schema
- [x] Migration files sort in correct order (baseline before feature_flags)
- [x] README.md documents migration workflow

## Next Phase Readiness

**Phase 10 Status:** COMPLETE (3/3 plans)
- 10-01: Supabase CLI & baseline migration (this plan)
- 10-02: RLS policies documentation (completed earlier)
- 10-03: Privacy policy contact update (completed earlier)

**Ready for Phase 11:** Launch Readiness
- Supabase CLI available for database operations
- Migration workflow documented for deployments
- Baseline schema versioned for audit trail
