# Plan 012: Make CI run unit tests (and fail on lint)

> Drift check: `git diff --stat 7e696f8..HEAD -- .github/workflows/ci.yml package.json vitest.config.mts`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW–MED (CI may go red if tests already fail)
- **Depends on**: none
- **Category**: tests / dx
- **Planned at**: commit `7e696f8`, 2026-07-11

## Why this matters

Repo has ~60 test files and ~26k lines of tests, but `.github/workflows/ci.yml` only runs:

1. `pnpm typecheck`
2. `pnpm lint` with **`continue-on-error: true`**

PRs can merge with failing unit tests. That wastes the existing suite and hides regressions in attendance/validation — the highest-risk domain.

## Current state

File: `.github/workflows/ci.yml` (repo root, 41 lines)

- `working-directory: app`
- Node 20, pnpm 9, frozen lockfile
- No `pnpm test`
- No Playwright (E2E needs secrets/env — keep out of default CI unless already configured)

Scripts in `app/package.json`:

- `"test": "vitest run"`
- `"test:e2e": "playwright test"`

## Commands

| Purpose | Command | Expected |
|---------|---------|----------|
| Local unit | `cd app && pnpm test` | all pass (fix or skip flaky first) |
| Typecheck | `pnpm typecheck` | 0 |

## Scope

**In scope**:

- `.github/workflows/ci.yml`
- Only if tests fail locally: minimal fixes **or** quarantine with `describe.skip` + issue note (prefer fix)

**Out of scope**:

- Enabling Playwright in CI without documented secrets
- Coverage thresholds / Codecov
- daily-code-health.yml redesign

## Steps

### Step 1: Run tests locally

```bash
cd app && pnpm test
```

If failures: fix genuine bugs if trivial; otherwise file list in plan status BLOCKED with failing test names — do not disable entire suite.

### Step 2: Update CI workflow

Add after typecheck:

```yaml
      - name: Unit tests
        run: pnpm test
```

Change lint step: **remove** `continue-on-error: true` so lint failures fail the job.

Optional: split jobs `quality` vs `test` for clearer logs — not required.

### Step 3: Push verification

Open PR or push branch; confirm GitHub Action runs test step green.

**Verify**: workflow file contains `pnpm test`; no `continue-on-error` on lint.

## Done criteria

- [ ] CI runs `pnpm test` in `app/`
- [ ] Lint is gating (no continue-on-error)
- [ ] Local `pnpm test` passes on the branch
- [ ] README plan row updated

## STOP conditions

- \>5 unrelated test failures needing product decisions
- Tests require live Supabase credentials (they should be mocked — if not, report architectural gap)

## Maintenance notes

- Keep E2E as optional workflow later with `SUPABASE_*` secrets
- Reviewer: ensure CI time stays reasonable (vitest run only)
