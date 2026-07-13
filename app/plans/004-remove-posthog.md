# Plan 004: Remove or re-enable PostHog

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 7e696f8..HEAD -- package.json app/.env.local.example`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `7e696f8`, 2026-07-11

## Why this matters

`posthog-js@^1.332.0` is in `package.json` dependencies but **never imported or used** in any source file. The `.env.local.example` says "PostHog (currently disabled due to Turbopack HMR bug)". This means:
- posthog-js + its transitive deps (protobufjs, dompurify) are bundled for nothing.
- It's the source of 1 critical + 2 high/low vulnerabilities (protobufjs CVE, dompurify CVEs).
- ~50KB+ of unused JavaScript shipped to every client.

## Current state

- `package.json:61` — `"posthog-js": "^1.332.0"`
- No source file imports `posthog-js` (verified via grep).
- `.env.local.example` — `# NEXT_PUBLIC_POSTHOG_KEY=` (commented out)
- No PostHog provider, no `instrumentation-client.ts`, no analytics code.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Install   | `pnpm install`           | exit 0              |
| Typecheck | `pnpm typecheck`         | exit 0              |
| Build     | `pnpm build`             | exit 0              |

## Scope

**In scope**:
- `package.json` — remove `posthog-js` dependency
- `pnpm-lock.yaml` — regenerated

**Out of scope**:
- Do NOT add a PostHog provider or analytics code — that's a separate feature decision.
- Do NOT remove the `.env.local.example` PostHog comments (they document the decision).

## Steps

### Step 1: Remove posthog-js dependency

Run: `pnpm remove posthog-js`

**Verify**: `grep posthog package.json` → no match

### Step 2: Verify no imports break

Run: `pnpm typecheck`

If any file imports posthog-js (unlikely based on grep), STOP and report — the dependency is actually used somewhere.

**Verify**: exit 0

### Step 3: Verify build

Run: `pnpm build`

**Verify**: exit 0

### Step 4: Check bundle size improvement

Run: `pnpm build 2>&1 | grep -i 'size\|kb\|mb'` — note the before/after.

## Test plan

- No tests affected (posthog-js wasn't tested).
- Existing test suite must pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm build` exits 0
- [ ] `grep posthog-js package.json` returns no match
- [ ] `pnpm audit` shows fewer critical vulnerabilities (protobufjs gone)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any source file imports `posthog-js` (it's actually used despite the grep).
- Build fails after removal.

## Maintenance notes

- When the Turbopack HMR bug is fixed and PostHog is wanted, re-add it as a new dependency with a proper provider component.
- The PostHog comments in `.env.local.example` should stay — they document why it was removed.
