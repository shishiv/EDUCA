# Plan 007: Add RLS write policies for multi-tenant tables

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 7e696f8..HEAD -- supabase/migrations/`
> If migrations changed, re-read live policy list before writing SQL.

## Status

- **Priority**: P0
- **Effort**: L
- **Risk**: HIGH (wrong policy = data leak or total write failure)
- **Depends on**: none (but coordinate with 011 roles)
- **Category**: security
- **Planned at**: commit `7e696f8`, 2026-07-11

## Why this matters

Baseline migration enables RLS on core tables but only creates **`FOR SELECT`** policies for: `escolas`, `users`, `turmas`, `alunos`, `matriculas`, `frequencia`, `sessoes_aula`, `audit_logs`.

There are **no** `FOR INSERT` / `FOR UPDATE` / `FOR DELETE` policies on those tables in the repo.

With RLS enabled and no write policy, Postgres denies writes for `authenticated` (default deny). That means either:

1. A clean `supabase db push` from this repo **breaks** all writes (attendance, students, enrollments), or
2. Production has hand-written policies **not in git** — unreviewable multi-tenant security.

Both are unacceptable for a municipal school system with student PII.

Feature flags migration already shows the correct pattern (`FOR ALL` for admin) in `20260119_create_feature_flags.sql`.

## Current state

Evidence (read yourself before coding):

```sql
-- supabase/migrations/00000000000000_baseline.sql ~600-739
ALTER TABLE frequencia ENABLE ROW LEVEL SECURITY;
-- ... only CREATE POLICY ... FOR SELECT ... on core tables
```

Helpers already exist (SECURITY DEFINER):

- `auth_is_admin()` — `tipo_usuario IN ('admin', 'gestor_sme')`
- `auth_get_user_role()`
- `auth_get_user_escola()`
- `auth_has_role_or_higher(required_role text)`
- `is_session_editable(session_id uuid)`

App write paths that depend on RLS:

- Server actions: `app/actions/attendance/*.ts` via `createClient()` (user JWT, not service role)
- Client API services: `lib/api/*.ts` via browser client
- Route handlers that insert/update via user session

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Workdir | `cd app` for app cmds; migrations under `../supabase` | — |
| Typecheck | `pnpm typecheck` | exit 0 |
| Unit tests | `pnpm test` | all pass |
| SQL review | open new migration file; no syntax errors | human/SQL |

Prefer applying migrations with the project's documented flow (`pnpm supabase db push` from `app/` or root — check `docs/DEPLOYMENT.md` / README). If you cannot reach a DB, ship the migration file only and mark status BLOCKED with reason "no DB credentials".

## Scope

**In scope**:

- New migration file only, e.g.  
  `supabase/migrations/20260711_rls_write_policies.sql`
- Optional: short note in `supabase/migrations/README.md` describing write policy model
- Tests: add SQL policy comments + if unit tests mock Supabase, do not break them

**Out of scope**:

- Rewriting all app query code
- Provider-agnostic adapter (roadmap doc)
- Dropping SELECT policies
- Using `SUPABASE_SERVICE_ROLE_KEY` to "fix" missing RLS (that hides the bug)
- Changing `is_session_editable` behavior beyond documenting it

## Policy design (implement this model)

Use existing helpers. Prefer **narrow** writes.

### Roles (DB truth)

`responsavel` < `professor` < `secretario` < `diretor` < `gestor_sme` < `admin`  
(see `auth_has_role_or_higher` in baseline ~782)

### Minimum write matrix

| Table | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|
| `frequencia` | professor (own session) or diretor same escola; session editable | same | deny normal users (or admin only) |
| `sessoes_aula` | professor own turma + same escola | professor/diretor same escola if not FECHADA | admin/gestor_sme only |
| `alunos` | secretario+ same escola (or via matricula path) | same | admin only soft-delete if used |
| `matriculas` | secretario+ same escola | same | admin / secretario with care |
| `turmas` | diretor+ / admin | same | admin |
| `users` | admin/gestor_sme (or service role seed) | self limited fields; admin full | admin |
| `escolas` | admin/gestor_sme | admin/gestor_sme | admin |
| `notas` | professor own turma; diretor escola | same | deny / admin |
| `audit_*` | insert via SECURITY DEFINER functions preferred; no client DELETE | — | — |
| `responsaveis`, `aluno_responsaveis`, `disciplinas`, `calendario_escolar`, `configs`, `aulas_abertas` | mirror escola-scoped rules consistent with SELECT | same | admin-heavy |

### Implementation pattern (copy style from feature_flags)

```sql
-- Example shape only — adapt USING/WITH CHECK per table
CREATE POLICY frequencia_insert_escola ON frequencia
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matriculas m
      JOIN turmas t ON t.id = m.turma_id
      WHERE m.id = frequencia.matricula_id
        AND (
          t.escola_id = auth_get_user_escola()
          OR auth_is_admin()
        )
    )
    AND auth_get_user_role() IN ('professor', 'diretor', 'admin', 'gestor_sme')
  );
```

Also:

1. Keep SELECT policies; do not replace them unless broken.
2. Use `TO authenticated` consistently.
3. Prefer `WITH CHECK` on INSERT/UPDATE for tenant isolation.
4. Document that **service role** still bypasses RLS (seed scripts OK).

### Pre-flight against production (required step)

Before applying to prod:

```sql
-- Run in Supabase SQL editor (do not paste secrets into plans/commits)
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

- If prod already has write policies: **diff** them into this migration as the SSOT; do not blindly add duplicates.
- If names collide, use `IF NOT EXISTS` / drop-and-recreate only with explicit comment.

## Steps

### Step 1: Inventory live vs repo

1. Read baseline RLS section and feature_flags migration fully.
2. If you have DB access, dump `pg_policies` (see above).
3. Write findings as comments at top of the new migration file.

**Verify**: migration file exists with inventory comment block.

### Step 2: Author write policies migration

Create `supabase/migrations/20260711_rls_write_policies.sql` covering at least:

- `frequencia`, `sessoes_aula`, `aulas_abertas` (if still used)
- `alunos`, `matriculas`, `turmas`, `users`, `escolas`
- `notas`, `responsaveis`, `aluno_responsaveis`
- `disciplinas`, `calendario_escolar`, `configs` if app writes them

Idempotent: wrap in `DO $$ … IF NOT EXISTS (pg_policies) …` like baseline, or use unique policy names and fail clearly.

**Verify**: SQL parses; policy names unique.

### Step 3: Apply on local/demo (if credentials exist)

Follow repo deploy docs. Seed demo should still open session + mark attendance as professor.

**Verify** (manual smoke):

1. Login as professor → open session → mark attendance → success.
2. Login as professor of **other** escola (or another tenant) → cannot update foreign `frequencia`.
3. Login as `responsavel` → cannot INSERT `frequencia`.

If no DB: stop after Step 2, set plan status BLOCKED with reason.

### Step 4: App verification

```bash
cd app && pnpm typecheck && pnpm test
```

No app code required unless types/RPC signatures change (they should not).

**Verify**: exit 0.

## Test plan

- Prefer a SQL test or documented manual matrix (roles × operations) in the migration header.
- If E2E env exists: `pnpm test:e2e tests/e2e/attendance/` and `tests/e2e/flows/chamada.spec.ts` after apply.
- Unit tests that mock Supabase should remain green without changes.

## Done criteria

- [ ] New migration committed under `supabase/migrations/`
- [ ] Core tables have explicit INSERT/UPDATE policies (and DELETE where product needs)
- [ ] Inventory of prod vs repo documented in migration comments or `supabase/migrations/README.md`
- [ ] Smoke: professor can write own escola; cross-escola denied (or BLOCKED documented if no DB)
- [ ] `cd app && pnpm typecheck && pnpm test` exit 0
- [ ] `plans/README.md` row updated

## STOP conditions

- Prod policies already exist and conflict — stop, export them, ask human which SSOT wins.
- You would need `FORCE ROW LEVEL SECURITY` or revoke grants you do not understand.
- Fix seems to require service role in every server action — that is the wrong fix; stop and report.

## Maintenance notes

- Any new table must ship with SELECT + write policies in the **same** migration.
- Re-run `pg_policies` audit after every schema change.
- Reviewer: check `WITH CHECK` always constrains `escola_id` (directly or via join).
