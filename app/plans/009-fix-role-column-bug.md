# Plan 009: Fix `users.role` bug on attendance mark API

> **Executor instructions**: Follow step by step. STOP conditions apply.
> Drift check: `git diff --stat 7e696f8..HEAD -- app/api/frequencia/marcar/route.ts types/database.ts`

## Status

- **Priority**: P0
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (pairs with 008)
- **Category**: bug
- **Planned at**: commit `7e696f8`, 2026-07-11

## Why this matters

`POST /api/frequencia/marcar` loads the user with:

```ts
.select('role, escola_id')
// …
usuario.role !== 'professor'
```

The `users` table and generated types use **`tipo_usuario`**, not `role`:

- SQL: `supabase/migrations/00000000000000_baseline.sql` users definition
- Types: `types/database.ts` → `users.Row.tipo_usuario`

Result: permission check is wrong (always fail / undefined), while later code may still hit RPC — inconsistent authz on a legal-sensitive path.

## Current state

- File: `app/api/frequencia/marcar/route.ts` (from `app/` cwd)
- Lines ~79–97: select + `usuario.role !== 'professor'`
- Also uses dual `sessao_id` / `aula_id` paths — **do not** redesign dual system here

## Commands

| Purpose | Command | Expected |
|---------|---------|----------|
| Typecheck | `pnpm typecheck` | 0 |
| Test | `pnpm test` | pass |

## Scope

**In scope**: `app/api/frequencia/marcar/route.ts` only (plus a unit test if easy)

**Out of scope**: other APIs; dual system removal; RLS

## Steps

### Step 1: Fix select and comparison

Replace:

```ts
.select('role, escola_id')
// …
if (!usuario || usuario.role !== 'professor') {
```

With:

```ts
.select('tipo_usuario, escola_id')
// …
if (!usuario || usuario.tipo_usuario !== 'professor') {
```

**Product note:** `lib/auth.ts` `canRecordAttendance` also allows `diretor`. Decide:

- **Recommended**: use the same rule as product — allow `professor` and `diretor` (and keep later ownership checks). Import or duplicate pure helper.
- If you only fix the column but keep professor-only, document that intentional divergence in the PR body.

Also fix any `sessao.turmas.escola_id` access if types complain — use typed join; do not `as any` unless already present and out of scope.

### Step 2: Align ownership check

Existing check:

```ts
if (sessao.professor_id !== user.id || sessao.turmas.escola_id !== usuario.escola_id)
```

For `diretor`, professor_id equality is wrong. If allowing diretor:

```ts
const isProfessorOwner = sessao.professor_id === user.id
const sameEscola = /* escola from session vs usuario.escola_id */
const isDiretor = usuario.tipo_usuario === 'diretor' && sameEscola
const isAdmin = ['admin', 'gestor_sme'].includes(usuario.tipo_usuario)
if (!(isProfessorOwner || isDiretor || isAdmin)) { return 403 }
```

### Step 3: Verify

```bash
cd app && pnpm typecheck && pnpm test
```

Grep residual:

```bash
rg -n "\.role|select\('role" app/api/frequencia/
```

Must be empty.

## Done criteria

- [ ] No `role` column reference on users in this route
- [ ] Uses `tipo_usuario`
- [ ] Permission rule consistent with `canRecordAttendance` **or** documented professor-only
- [ ] typecheck + test green
- [ ] README plan row updated

## STOP conditions

- Generated types unexpectedly contain `role` as well as `tipo_usuario` — report schema drift
- Route relies on `marcar_frequencia_lote` RPC missing in local DB — do not invent RPC

## Maintenance notes

- Grep whole repo for `users` + `.role` after this plan if time permits (report-only if extra files).
