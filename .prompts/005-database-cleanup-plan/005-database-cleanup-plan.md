# Prompt: Database Cleanup Plan

## Objective
Create a detailed plan for cleaning up the Supabase database, focusing on consolidating migrations, removing obsolete schemas, and simplifying RLS policies.

## Context
- Database: Supabase (PostgreSQL)
- Current migrations: 42
- Known issues: Multiple RLS rewrites, duplicate indexes
- MCP: `mcp__supabase__*` tools available

## Input
Read the system audit findings and current migration state.

## Analysis Tasks

### 1. Get Current Migration List

```
mcp__supabase__list_migrations
```

### 2. Categorize Migrations

Group by purpose:

**Schema Creation:**
- `initial_schema`
- `gestao_fronteira_educational_schema`
- `create_*` migrations

**RLS Policies:**
- `enable_rls_security`
- `simple_rls_policies_*`
- `create_rls_policies_*`
- `rewrite_rls_policies_*`
- `fix_*_rls_*`

**Performance:**
- `create_*_indexes`
- `performance_indexes_*`
- `optimize_sequential_scans`

**Features:**
- `add_*` migrations
- `enhance_*` migrations

**Bug Fixes:**
- `fix_*` migrations

### 3. Identify Issues

**Duplicate RLS Policies:**
```
20250915112703_enable_rls_security
20251115230631_create_rls_helper_functions
20251115230856_rewrite_rls_policies_core
20251115231139_rewrite_rls_policies_remaining_fixed
20251116043118_rewrite_disciplinas_rls_policies
20251116043144_rewrite_educacenso_exports_rls_policies
20251116043216_rewrite_sessoes_aula_rls_policies
20251116043247_rewrite_aluno_responsaveis_rls_policies
```

**Multiple Index Creations:**
```
20250918053537_create_simple_performance_indexes
20250926053336_create_performance_indexes_simple
20251002104123_performance_indexes_corrected
20251011123539_add_missing_fk_indexes
20251116043356_create_performance_indexes
```

**Potential Obsolete:**
- Migrations for features that were removed
- Migrations superseded by later versions

### 4. Verify Current State

```sql
-- Check current RLS policies
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';

-- Check current indexes
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE schemaname = 'public';

-- Check for orphaned functions
SELECT proname, prosrc
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace;
```

## Output

Create `.prompts/005-database-cleanup-plan/database-cleanup.md` with:

```markdown
# Database Cleanup Plan

**Date:** {date}
**Current migrations:** 42
**Target migrations:** X (after consolidation)

## Executive Summary

[Overview of cleanup plan and expected benefits]

## Migration Analysis

### By Category

| Category | Count | Action |
|----------|-------|--------|
| Schema | X | Keep |
| RLS Policies | X | Consolidate |
| Indexes | X | Consolidate |
| Features | X | Keep |
| Bug Fixes | X | Review |

### Migrations to Keep (As-Is)

| Migration | Purpose | Reason to Keep |
|-----------|---------|----------------|
| initial_schema | Base tables | Foundation |
| gestao_fronteira_educational_schema | Core schema | Essential |
| add_nis_bolsa_familia | NIS field | Active feature |

### Migrations to Consolidate

**RLS Policies → Single Migration**

Current (8 migrations):
```
20250915112703_enable_rls_security
20251115230631_create_rls_helper_functions
20251115230856_rewrite_rls_policies_core
20251115231139_rewrite_rls_policies_remaining_fixed
20251116043118_rewrite_disciplinas_rls_policies
20251116043144_rewrite_educacenso_exports_rls_policies
20251116043216_rewrite_sessoes_aula_rls_policies
20251116043247_rewrite_aluno_responsaveis_rls_policies
```

Consolidate to:
```
YYYYMMDDHHMMSS_consolidated_rls_policies
```

**Indexes → Single Migration**

Current (5 migrations):
```
20250918053537_create_simple_performance_indexes
20250926053336_create_performance_indexes_simple
20251002104123_performance_indexes_corrected
20251011123539_add_missing_fk_indexes
20251116043356_create_performance_indexes
```

Consolidate to:
```
YYYYMMDDHHMMSS_consolidated_indexes
```

### Migrations to Remove

| Migration | Reason for Removal |
|-----------|-------------------|
| [migration_name] | Superseded by X |
| [migration_name] | Feature removed |

### Migrations Requiring Review

| Migration | Concern | Action Needed |
|-----------|---------|---------------|
| [migration_name] | Unclear purpose | Audit SQL |
| [migration_name] | May have side effects | Test carefully |

## Consolidation Strategy

### Step 1: Create Backup
```bash
# Export current schema
pg_dump --schema-only > backup_schema_$(date +%Y%m%d).sql

# Export data (if needed)
pg_dump --data-only > backup_data_$(date +%Y%m%d).sql
```

### Step 2: Generate Consolidated Migrations

**RLS Consolidation:**
```sql
-- File: supabase/migrations/YYYYMMDDHHMMSS_consolidated_rls_policies.sql

-- Drop all existing policies
-- [Generated list of DROP POLICY statements]

-- Create helper functions
-- [From create_rls_helper_functions]

-- Create all policies
-- [Consolidated from all rewrite migrations]
```

**Index Consolidation:**
```sql
-- File: supabase/migrations/YYYYMMDDHHMMSS_consolidated_indexes.sql

-- Drop duplicate indexes
-- [Generated list of DROP INDEX statements for duplicates]

-- Create optimized indexes
-- [Consolidated unique indexes only]
```

### Step 3: Test in Development Branch

```bash
# Create development branch
mcp__supabase__create_branch --name="database-cleanup"

# Apply consolidated migrations
mcp__supabase__apply_migration --name="consolidated_rls_policies" --query="..."

# Run application tests
pnpm test

# Verify functionality
# - Auth works
# - RLS policies enforce correctly
# - Queries perform well
```

### Step 4: Merge to Production

```bash
# Only after thorough testing
mcp__supabase__merge_branch --branch_id="..."
```

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Data loss | Low | Critical | Full backup before changes |
| RLS breaks auth | Medium | High | Test all roles |
| Performance regression | Low | Medium | Compare query plans |
| Missing indexes | Medium | Medium | Monitor slow queries |

## Rollback Plan

If issues occur after deployment:

1. **Immediate:** Revert to backup schema
2. **Short-term:** Restore original migrations
3. **Investigation:** Identify what went wrong

```bash
# Restore schema
psql < backup_schema_YYYYMMDD.sql

# Restore data if needed
psql < backup_data_YYYYMMDD.sql
```

## Verification Checklist

After consolidation:

- [ ] All tables exist
- [ ] All columns have correct types
- [ ] All foreign keys intact
- [ ] All RLS policies work
- [ ] All indexes present
- [ ] Auth flows work (login, logout, session)
- [ ] CRUD operations work for each table
- [ ] Reports generate correctly
- [ ] Performance acceptable

## Beads Issues

```bash
bd create --title="Backup database before cleanup" --type=task
bd create --title="Create consolidated RLS policies migration" --type=task
bd create --title="Create consolidated indexes migration" --type=task
bd create --title="Test consolidated migrations in dev branch" --type=task
bd create --title="Merge database cleanup to production" --type=task
```

## Expected Outcomes

| Metric | Before | After |
|--------|--------|-------|
| Total migrations | 42 | ~25 |
| RLS migrations | 8 | 1 |
| Index migrations | 5 | 1 |
| Duplicate policies | X | 0 |
| Duplicate indexes | X | 0 |

<metadata>
<confidence>medium</confidence>
<dependencies>
- System audit completed (003)
- Supabase MCP access
- Development branch capability
</dependencies>
<open_questions>
- Which migrations have dependencies on removed features?
- Are there any data migrations mixed with schema migrations?
</open_questions>
<assumptions>
- Can create development branches
- Have backup/restore capability
- No active transactions during migration
</assumptions>
</metadata>
```

## Success Criteria
- [ ] All 42 migrations categorized
- [ ] Consolidation targets identified
- [ ] Backup strategy defined
- [ ] Rollback plan documented
- [ ] Verification checklist created
- [ ] Beads issues created
