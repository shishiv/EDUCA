# Plan 003: Eliminate `as any` type escapes in API layer

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 7e696f8..HEAD -- app/lib/api/ app/lib/supabase/server.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW (type-only changes, no runtime behavior change)
- **Depends on**: 002
- **Category**: tech-debt
- **Planned at**: commit `7e696f8`, 2026-07-11

## Why this matters

There are ~20 `as any` casts in the API layer, all working around Supabase's TypeScript inference for dynamic queries. Each `as any` disables the type checker — hiding real bugs like accessing non-existent columns, passing wrong types to `.eq()`, or misreading joined data. The casts cluster in `lib/api/base.ts`, `lib/api/attendance.ts`, `lib/api/grades.ts`, and `lib/api/class-diary.ts`.

## Current state

Key locations:
- `lib/api/base.ts:104,131` — `(supabase as any).from(...)` to bypass generic constraints on dynamic table names
- `lib/api/attendance.ts:74,956` — `(supabase as any)` for insert/select on `sessoes_aula`
- `lib/api/grades.ts:978,980,1156,1158` — `(turma.escola as any)?.nome` for joined data
- `lib/api/class-diary.ts:220-224,449-450` — multiple `as any` for joined turma/escola/professor data
- `lib/api/enhanced-attendance.ts:191` — `(supabase as any)` for insert
- `lib/supabase/server.ts:150` — `userData.tipo_usuario as any` in verifyUserRole
- `lib/realtime/session-realtime.ts:94` — mock channel cast (test infrastructure, skip)
- `lib/logger.ts:288-289` — `(performance as any).memory` (browser API, skip)
- `lib/export/pdf-utils.ts:264` — `(doc as any).lastAutoTable` (jspdf-autotable plugin, skip)

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `lib/api/base.ts` — fix generic types for dynamic table operations
- `lib/api/attendance.ts` — proper typing for Supabase inserts
- `lib/api/grades.ts` — proper typing for joined queries
- `lib/api/class-diary.ts` — proper typing for joined queries
- `lib/api/enhanced-attendance.ts` — proper typing for inserts
- `lib/supabase/server.ts` — fix verifyUserRole type alignment

**Out of scope**:
- `lib/realtime/session-realtime.ts:94` — mock infrastructure, leave as-is
- `lib/logger.ts:288-289` — browser memory API, no typed alternative
- `lib/export/pdf-utils.ts:264` — jspdf-autotable plugin API

## Steps

### Step 1: Fix `lib/api/base.ts` — generic Supabase client

The `as any` casts at lines 104 and 131 exist because the `supabase` browser client's `.from()` method is typed with the `Database` generic, but `this.tableName` is a plain `string`. Fix by typing the constructor:

```typescript
constructor(tableName: TableName) {  // Use the TableName type instead of string
  this.tableName = tableName
}
```

Then `supabase.from(this.tableName)` will be properly typed. If `TableName` doesn't cover all used tables, widen it or use a type assertion to `TableName` instead of `any`.

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Fix `lib/api/attendance.ts` — insert typing

Lines 74 and 956 use `(supabase as any).from('sessoes_aula').insert(insertData)`. The issue is `insertData` is `Record<string, unknown>` which doesn't match the table's Insert type.

Fix: Type `insertData` as `Partial<Database['public']['Tables']['sessoes_aula']['Insert']>` or use the `Inserts<'sessoes_aula'>` helper type from `lib/supabase.ts`.

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Fix `lib/api/grades.ts` — joined query typing

Lines 978, 980, 1156, 1158 access `(turma.escola as any)?.nome`. This happens because Supabase's `.select('*, turma:turmas(*, escola:escolas(*))')` returns a deeply nested type that TypeScript can't narrow.

Fix: Define a local type for the joined result:
```typescript
type TurmaWithEscola = Tables<'turmas'> & { escola: Tables<'escolas'> | null }
```
Cast the query result once at the select site, not at every access site.

**Verify**: `pnpm typecheck` → exit 0

### Step 4: Fix `lib/api/class-diary.ts` — same pattern as grades

Lines 220-224 and 449-450 have the same joined-query typing issue. Apply the same fix: define local types for joined results, cast once at the query site.

**Verify**: `pnpm typecheck` → exit 0

### Step 5: Fix `lib/supabase/server.ts:150` — verifyUserRole

The cast `userData.tipo_usuario as any` exists because the `allowedRoles` parameter uses literal strings (`'admin' | 'diretor' | ...`) but `userData.tipo_usuario` comes from the database type. Fix by ensuring the database type's `tipo_usuario` enum matches the literal union, or use a type guard.

**Verify**: `pnpm typecheck` → exit 0

### Step 6: Full verification

```bash
pnpm typecheck && pnpm test && grep -c 'as any' lib/api/*.ts lib/supabase/server.ts
```

Expected: typecheck passes, tests pass, `as any` count in API layer ≤ 3 (only the intentionally-skipped ones).

## Test plan

- Existing tests must pass unchanged.
- If a type fix causes a test to fail, it means the test was relying on `any` behavior — fix the test to use proper types.
- No new tests needed.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0
- [ ] `grep -c 'as any' lib/api/*.ts lib/supabase/server.ts` → ≤ 3
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Supabase's generated types don't cover a table or column used in the code (type mismatch in `types/database.ts`).
- A `as any` removal causes a cascade of 10+ type errors in downstream files.
- The joined query typing requires changes to `types/database.ts` (auto-generated — don't edit).

## Maintenance notes

- The root cause is that Supabase's auto-generated types in `types/database.ts` don't always match the runtime schema (e.g., missing joined tables). When adding new queries, prefer defining local result types over `as any`.
- Consider running `supabase gen types typescript` to refresh `types/database.ts` if the schema has changed.
