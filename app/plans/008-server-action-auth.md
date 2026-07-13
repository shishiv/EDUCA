# Plan 008: Enforce auth + role checks on attendance server actions

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:  
> `git diff --stat 7e696f8..HEAD -- app/actions/attendance/ lib/supabase/server.ts lib/auth.ts`

## Status

- **Priority**: P0
- **Effort**: M
- **Risk**: MED
- **Depends on**: ideally **007** applied (RLS). Can land before 007 but then auth is the only write gate.
- **Category**: security
- **Planned at**: commit `7e696f8`, 2026-07-11

## Why this matters

Attendance server actions trust the Supabase user session implicitly and only call `is_session_editable`:

- `markAttendanceAction` — no `getUser()`, no role check, no ownership check on `sessao_id` / `matricula_id`
- `openSessionAction` — accepts client-supplied `professor_id` / `escola_id` without verifying they match the authenticated user
- `closeSessionAction` / `checkLockStatus` — same family

Middleware **skips** `/api` and does not protect Server Actions. Client `AuthGuard` is not a security boundary.

`is_session_editable` is `SECURITY DEFINER` (baseline) — it answers “is session open?”, **not** “may this user mutate?”.

## Current state

Files (all under `app/app/actions/attendance/` relative to repo root, or `app/actions/…` from `app/` cwd):

| File | Gap |
|------|-----|
| `mark-attendance.ts` | upsert after editable check only |
| `open-session.ts` | inserts session with params from client |
| `close-session.ts` | close without role/owner verify (read file fully) |
| `check-lock-status.ts` | may be read-only OK if auth still required |

Canonical server client:

```ts
// lib/supabase/server.ts
export async function createClient() { /* cookies + anon key */ }
export async function getCurrentUser() { /* … */ }
export async function verifyUserRole(allowedRoles: …) { /* … */ }
```

Product rule already documented in `lib/auth.ts`:

```ts
// canRecordAttendance: professor | diretor only
// admin/secretario/gestor_sme view-only for attendance marking
```

Match that rule on the server.

## Commands

| Purpose | Command | Expected |
|---------|---------|----------|
| Cwd | `cd app` | — |
| Typecheck | `pnpm typecheck` | exit 0 |
| Unit | `pnpm test` | pass |
| Optional E2E | `pnpm test:e2e tests/e2e/attendance/` | pass if env configured |

## Scope

**In scope**:

- `app/actions/attendance/mark-attendance.ts`
- `app/actions/attendance/open-session.ts`
- `app/actions/attendance/close-session.ts`
- `app/actions/attendance/check-lock-status.ts`
- Optional small helper: `lib/auth/server-attendance.ts` or extend `lib/supabase/server.ts` with `requireUserProfile()`
- Unit tests under `tests/unit/` if you can mock server client cleanly

**Out of scope**:

- Rewriting `lib/services/attendance-*.ts` (browser services) — separate plan 002
- API route `/api/frequencia/marcar` — plan **009**
- RLS SQL — plan **007**

## Steps

### Step 1: Add `requireAttendanceActor()` helper

Create a server-only helper (prefer next to other server auth):

```ts
// lib/supabase/require-attendance-actor.ts  (name flexible)
'use server' // only if needed; else plain server module imported by actions

export async function requireAttendanceActor(): Promise<{
  userId: string
  tipo_usuario: string
  escola_id: string | null
  supabase: Awaited<ReturnType<typeof createClient>>
}> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new AuthError('AUTH_REQUIRED')

  const { data: profile } = await supabase
    .from('users')
    .select('id, tipo_usuario, escola_id')
    .eq('id', user.id)
    .single()

  if (!profile) throw new AuthError('PROFILE_REQUIRED')
  return { userId: user.id, tipo_usuario: profile.tipo_usuario, escola_id: profile.escola_id, supabase }
}
```

Do **not** use column `role` — schema column is `tipo_usuario` (see plan 009).

**Verify**: `pnpm typecheck`

### Step 2: Harden `markAttendanceAction`

Order of checks:

1. `requireAttendanceActor()`
2. `canRecordAttendance(tipo_usuario)` (import from `@/lib/auth` — it is pure; if `'use client'` module boundary blocks import, **duplicate the 4-line pure function** into a shared `lib/auth/permissions.ts` without `'use client'`)
3. Load `sessoes_aula` by `params.sessao_id`; 404 if missing
4. Assert session `escola_id` matches actor `escola_id` unless `admin`/`gestor_sme`
5. If `professor`, assert `professor_id === userId`
6. Then existing `is_session_editable` + upsert

Return the same `{ success, error }` shape; map auth failures to clear Portuguese messages (no stack traces).

**Verify**: `pnpm typecheck`

### Step 3: Harden `openSessionAction`

1. Require actor
2. `canRecordAttendance`
3. **Ignore client `professor_id` for professors** — set `professor_id = userId`
4. For `diretor`, allow opening only if `escola_id === actor.escola_id` (or admin)
5. Do not trust client `escola_id` blindly — load turma and use `turmas.escola_id`

**Verify**: `pnpm typecheck`

### Step 4: Harden `closeSessionAction` + `check-lock-status`

- Close: same ownership/role rules as mark
- Check lock: require authenticated user; return only sessions the user can see (RLS may already filter — still require login)

**Verify**: `pnpm typecheck && pnpm test`

### Step 5: Tests

Add unit tests with mocked `createClient` / `requireAttendanceActor`:

1. Unauthenticated → error
2. `secretario` cannot mark
3. Professor cannot mark another professor's session
4. Happy path professor still succeeds (mock editable + upsert)

Place under `tests/unit/actions/` or extend `tests/unit/services/` patterns.

**Verify**: `pnpm test` includes new cases

## Done criteria

- [ ] All four attendance actions call auth helper
- [ ] Client cannot spoof `professor_id` on open
- [ ] `pnpm typecheck` exit 0
- [ ] `pnpm test` exit 0 with new auth cases
- [ ] No secrets in code
- [ ] `plans/README.md` updated

## STOP conditions

- `lib/auth.ts` is `'use client'` and extracting pure helpers would touch many imports — extract permissions only, do not convert whole auth module without reporting.
- Session table column names differ from types (`status` enums ABERTA vs aberta) — read `types/database.ts` and match real columns; do not invent.
- Action is also called from a path that uses service role — report, do not break seeds.

## Maintenance notes

- New server actions for mutations must call the same helper.
- Reviewer: ensure **authorization** is not only “session editable”.
