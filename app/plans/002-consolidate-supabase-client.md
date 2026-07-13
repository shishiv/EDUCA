# Plan 002: Consolidate Supabase client usage

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 7e696f8..HEAD -- app/lib/supabase/ app/api/ app/actions/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (auth changes affect all protected routes)
- **Depends on**: none
- **Category**: security / correctness
- **Planned at**: commit `7e696f8`, 2026-07-11

## Why this matters

The app has **two competing Supabase server client patterns**, creating inconsistent auth handling and a correctness issue:

1. `lib/supabase/server.ts` — the canonical pattern using `@supabase/ssr` + `cookies()` from Next.js.
2. Inline creation in API routes — manual `createServerClient` + `cookies()` boilerplate.

Additionally, the **attendance services** (`lib/services/attendance-immutability.ts`, `attendance-locking.ts`, `attendance-workflow.ts`) import the **browser client** (`lib/supabase.ts`) but are used in server-side contexts. The browser client uses the anon key and respects RLS — but these services need elevated permissions for admin operations like locking sessions.

## Current state

- `lib/supabase.ts` — browser client, `createBrowserClient`, anon key. Used by ALL services.
- `lib/supabase/server.ts:23-52` — `createClient()` using cookies. Used by server actions.
- `lib/supabase/server.ts:67-95` — `createAdminClient()` using service role key. Available but underused.
- `lib/services/attendance-immutability.ts:13` — `import { supabase } from '@/lib/supabase'` (BROWSER client)
- `lib/services/attendance-locking.ts:7` — same browser client import
- `lib/services/attendance-workflow.ts:11` — same browser client import
- `app/api/frequencia/marcar/route.ts:1-38` — inline `createServerClient` instead of using `createClient()`

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Install   | `pnpm install`           | exit 0              |
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `lib/services/attendance-immutability.ts` — change import to server client
- `lib/services/attendance-locking.ts` — change import to server client
- `lib/services/attendance-workflow.ts` — change import to server client
- `app/api/frequencia/marcar/route.ts` — use `createClient()` from server.ts
- `app/api/frequencia/sessao/[aula_id]/route.ts` — same pattern
- `app/api/sessoes/aula/*/route.ts` — same pattern (4 files)
- `app/api/compliance/warnings/route.ts` — check and fix if inline
- `app/api/dashboard/alerts/route.ts` — check and fix if inline
- `app/api/search/route.ts` — check and fix if inline

**Out of scope**:
- `lib/supabase.ts` — do NOT delete the browser client; it's used by client components.
- `lib/api/*.ts` — these are client-side API services that correctly use the browser client.
- Any change to RLS policies or database schema.

## Steps

### Step 1: Fix attendance services to use server client

For each of the 3 service files:
1. Change `import { supabase } from '@/lib/supabase'` to `import { createClient } from '@/lib/supabase/server'`
2. Since these are singleton classes that import `supabase` at module level, you need to change the pattern: instead of a module-level `supabase` constant, make each method create its own client via `const supabase = await createClient()`.
3. This means methods must become `async` if they aren't already.

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Fix API routes to use canonical server client

For `app/api/frequencia/marcar/route.ts`:
- Replace the inline `createServerClient` + `cookies()` boilerplate (lines 22-38) with:
  ```typescript
  import { createClient } from '@/lib/supabase/server'
  // ...
  const supabase = await createClient()
  ```
- Keep the rest of the route logic unchanged.

Repeat for all other API routes that use inline Supabase client creation.

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Verify all server-side code uses server client

Run: `grep -rn "from '@/lib/supabase'" --include='*.ts' --include='*.tsx' app/api/ app/actions/ app/lib/services/ app/lib/reports/ app/lib/audit.ts`

Every match should import from `@/lib/supabase/server` (server client), NOT from `@/lib/supabase` (browser client). The only exception is `lib/audit.ts` which uses the browser client — check if it's called from server or client code and fix accordingly.

**Verify**: No server-side file imports from `@/lib/supabase` (browser).

### Step 4: Run full test suite

```bash
pnpm typecheck && pnpm test
```

**Verify**: All pass.

## Test plan

- Existing tests must pass. The attendance service tests in `tests/unit/services/` may need mocking updates if the Supabase client import changes.
- If tests fail because they mock `@/lib/supabase`, update the mocks to target `@/lib/supabase/server` instead.
- New tests: none required — this is a refactor preserving behavior.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0
- [ ] `grep -rn "from '@/lib/supabase'" app/api/ app/actions/ app/lib/services/ app/lib/audit.ts` returns only `@/lib/supabase/server` imports (no browser client in server code)
- [ ] No inline `createServerClient` boilerplate in API routes
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Converting the attendance services to async breaks the singleton pattern in a way that affects client-side callers.
- The `createClient()` from server.ts doesn't work in API route handlers (cookie context issue).
- Tests fail after mock updates and the fix isn't obvious.

## Maintenance notes

- After this change, any new API route or server action MUST use `createClient()` from `lib/supabase/server.ts`. Document this in AGENTS.md.
- The browser client (`lib/supabase.ts`) is ONLY for client components and hooks.
- If a server-side operation needs to bypass RLS (e.g., admin operations), use `createAdminClient()` from `lib/supabase/server.ts`.
