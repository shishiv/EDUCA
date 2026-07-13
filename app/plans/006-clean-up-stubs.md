# Plan 006: Clean up stub code and dead features

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 7e696f8..HEAD -- app/lib/stores/ app/app/api/vivencias/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `7e696f8`, 2026-07-11

## Why this matters

The codebase has stub functions that log to console.debug and do nothing else, plus a dependency (`zustand`) that's imported but barely used. These create false signals for auditors and new contributors — they look like real functionality but are dead code.

## Current state

- `lib/stores/app-store.ts` — entire file is stubs:
  - `addRecentActivity()` — `console.debug('Activity:', activity)` (line 41)
  - `clearBulkSelection()` — `console.debug('Bulk selection cleared')` (line 47)
  - `addNotification()` — `console.debug('Notification:', notification)` (line 56)
  - `useAppStore` — Zustand store with only user filters, used nowhere
- `zustand` in `package.json:71` — only used by the stub store

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0              |
| Tests     | `pnpm test`              | all pass            |
| Grep      | `grep -rn 'useAppStore\|addRecentActivity\|clearBulkSelection\|addNotification' app/` | check usage |

## Scope

**In scope**:
- `lib/stores/app-store.ts` — delete file
- `package.json` — remove `zustand` if unused elsewhere

**Out of scope**:
- `app/api/vivencias/` — stubbed but cleanly returns 501; leave it (it's pre-staged for a real feature).
- Any other stub that has a clear TODO and is part of a planned feature.

## Steps

### Step 1: Verify no imports of the stub store

Run: `grep -rn 'useAppStore\|addRecentActivity\|clearBulkSelection\|addNotification' --include='*.ts' --include='*.tsx' | grep -v node_modules | grep -v .next | grep -v lib/stores/app-store.ts`

If any matches exist, check if they're real usages or re-exports. If real usages exist, STOP — the store isn't dead.

**Verify**: 0 matches (or only re-exports that also need cleanup)

### Step 2: Delete the stub store

Delete `lib/stores/app-store.ts`.

If there's a barrel export in `lib/stores/index.ts` or `hooks/index.ts` that re-exports from it, remove that too.

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Remove zustand if unused

Run: `grep -rn "from 'zustand'" --include='*.ts' --include='*.tsx' | grep -v node_modules | grep -v .next | grep -v lib/stores/app-store.ts`

If no other file imports from zustand, remove it:
`pnpm remove zustand`

**Verify**: `pnpm typecheck` → exit 0, `grep zustand package.json` → no match

### Step 4: Full verification

```bash
pnpm typecheck && pnpm test && pnpm build
```

## Test plan

- No tests for the stub store exist (it had nothing to test).
- Existing tests must pass.
- Build must succeed.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `lib/stores/app-store.ts` does not exist
- [ ] `grep -rn 'useAppStore\|addRecentActivity\|clearBulkSelection\|addNotification' app/` → 0 matches (excluding node_modules/.next)
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0
- [ ] `pnpm build` exits 0
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any file imports from `lib/stores/app-store.ts` (it's not dead code).
- Zustand is used by another file not visible in the grep.

## Maintenance notes

- If activity tracking, bulk selection, or notifications are needed later, implement them properly rather than re-adding stubs.
- Zustand is a fine choice for client state if needed — just don't ship empty stores.
