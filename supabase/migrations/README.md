# Supabase Migrations

Database migrations for EDUCA - Sistema de Gestao Escolar.

## Overview

This directory contains SQL migration files for the Supabase database. Migrations are versioned and applied in chronological order based on their filename timestamps.

## Migration Files

| File | Description | Date |
|------|-------------|------|
| `00000000000000_baseline.sql` | Initial schema snapshot | 2026-01-19 |
| `20260119_create_feature_flags.sql` | Feature flags system | 2026-01-19 |
| `20260124133337_create_relatorios_descritivos.sql` | BNCC descriptive reports | 2026-01-24 |
| `20260719031000_add_censo_escolar_fields.sql` | Minimum Censo Escolar student, class, and school fields | 2026-07-19 |
| `20260721010000_fix_rls_role_policies.sql` | Non-recursive RBAC policies, DML grants, attendance upsert index | 2026-07-21 |
| `20260721011000_create_conteudo_aula.sql` | Lesson content and BNCC report data with school-scoped RLS | 2026-07-21 |

## Schema Contents

### Baseline Migration (00000000000000)

**Core Tables:**
- `escolas` - Schools
- `users` - System users
- `alunos` - Students
- `responsaveis` - Guardians/Parents
- `aluno_responsaveis` - Student-Guardian relationships
- `turmas` - Classes
- `matriculas` - Enrollments
- `disciplinas` - Subjects

**Session & Attendance:**
- `aulas_abertas` - Open class sessions
- `sessoes_aula` - Detailed class sessions
- `frequencia` - Attendance records
- `notas` - Grades

**System Tables:**
- `calendario_escolar` - School calendar
- `configs` - System configuration
- `codigos_inep` - INEP identification codes
- `educacenso_exports` - MEC export tracking

**Audit Tables:**
- `audit_logs` - General audit logging
- `audit_sessoes_aula` - Session-specific audit
- `audit_trail` - Comprehensive audit trail

**Views:**
- `vw_alunos_risco_bolsa_familia` - Bolsa Familia risk students
- `vw_frequencia_completa` - Complete attendance with details
- `audit_summary` - Aggregated audit data

### Feature Flags Migration (20260119)

- `feature_flags` - Flag definitions
- `escola_feature_flags` - Per-escola flag enablement

### Descriptive Reports Migration (20260124133337)

- `relatorios_descritivos` - BNCC early-childhood descriptive reports

### Censo Escolar Fields Migration (20260719031000)

- `alunos` - Race, residential zone, school transport, and disability types
- `turmas` - INEP teaching stage, mediation type, and full-time indicator
- `escolas` - Censo infrastructure indicators and differentiated location

The new columns remain nullable. Only BM10-documented safe defaults are applied, so existing rows are preserved.
The five new `CHECK` constraints are installed as `NOT VALID`: new writes are constrained immediately, while validation of existing rows is deferred to a separately scheduled migration.

## Running Migrations

### New Environments

```bash
# Link to your Supabase project
npx supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations
npx supabase db push
```

### Local Validation and Type Generation

Validate the canonical migration set against a disposable raw PostgreSQL 15 or newer database:

```bash
supabase/tests/database/run.sh
```

The command requires `initdb`, `pg_ctl`, and `psql` on `PATH`. It starts an isolated temporary cluster, applies every migration in filename order, runs the database assertions, and removes the cluster. PostgreSQL extensions referenced by migrations, including `pgvector` if introduced, must be installed in that local PostgreSQL distribution. The command does not use Docker, Supabase services, a linked project, or a remote database.

Generate the committed Supabase type surface only from the optional disposable local Supabase stack:

```bash
pnpm --dir app exec supabase --workdir .. start
pnpm --dir app exec supabase --workdir .. db reset
pnpm --dir app exec supabase --workdir .. gen types typescript --local > app/types/database.ts
pnpm --dir app exec supabase --workdir .. stop
```

Do not use a linked project or `--project-id` to update committed types.

### Creating New Migrations

```bash
# Create new migration
npx supabase migration new your_migration_name

# This creates: supabase/migrations/YYYYMMDDHHMMSS_your_migration_name.sql
```

## Migration Naming Convention

Format: `YYYYMMDDHHMMSS_description.sql`

- **Timestamp prefix**: Ensures chronological ordering
- **Description**: Snake_case description of changes
- **Extension**: Always `.sql`

Examples:
- `20260119120000_add_nutrition_module.sql`
- `20260120093000_add_inventory_tables.sql`

## Important Notes

1. **Production Safety**: The baseline migration uses `CREATE TABLE IF NOT EXISTS` for idempotency. It will not overwrite existing tables.

2. **RLS Policies**: Row Level Security is enabled on all main tables. Admin users (`admin`, `gestor_sme`) have full access. Other users see only their escola's data.

3. **Audit Trail**: All data changes are logged to audit tables for compliance with Brazilian educational regulations.

4. **Brazilian Compliance**: Schema supports INEP codes, Educacenso exports, and Bolsa Familia attendance tracking.

## Environment Variables

Required for CLI operations:
- `SUPABASE_PROJECT_REF` - Project reference ID
- `SUPABASE_DB_PASSWORD` - Database password

Optional:
- `SUPABASE_ACCESS_TOKEN` - For automated deployments
