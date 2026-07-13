# Plan 001: Fix critical dependency vulnerabilities

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 7e696f8..HEAD -- package.json pnpm-lock.yaml`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED (major version bumps may introduce breaking changes)
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `7e696f8`, 2026-07-11

## Why this matters

The app has **148 known vulnerabilities** including 4 critical:
- **jsPDF 3.0.4**: Local file inclusion/path traversal (GHSA-f8cm-6447-x5h2) + HTML injection (GHSA-wfv2-pwc8-crg5). jsPDF is used in production for attendance report PDF exports.
- **protobufjs 7.5.4**: Arbitrary code execution (GHSA-xq3m-2v4x-88gg). Transitive via posthog-js.
- **Vitest 4.0.17**: Arbitrary file read/execute when Vitest UI server is running (dev-only, lower risk).

These are exploitable in production — jsPDF runs server-side for report generation.

## Current state

- `package.json:57` — `"jspdf": "^3.0.4"` (2 critical CVEs)
- `package.json:58` — `"jspdf-autotable": "^5.0.2"` (depends on vulnerable jspdf)
- `package.json:61` — `"posthog-js": "^1.332.0"` (pulls in vulnerable protobufjs)
- `package.json:96` — `"vitest": "^4.0.17"` (1 critical CVE, dev-only)

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Install   | `pnpm install`           | exit 0              |
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Tests     | `pnpm test`              | all pass            |
| Audit     | `pnpm audit`             | 0 critical          |

## Scope

**In scope** (the only files you should modify):
- `package.json`
- `pnpm-lock.yaml`

**Out of scope** (do NOT touch, even though they look related):
- Any source code changes — if a major version bump breaks imports, STOP and report.
- `posthog-js` upgrade may require API changes — if it does, STOP and report.

## Steps

### Step 1: Upgrade jsPDF to v4+

Run: `pnpm update jspdf@latest jspdf-autotable@latest`

After upgrade, check if the import in `lib/export/pdf-utils.ts` still works:
- `pnpm typecheck` must pass.
- If `jspdf-autotable` has breaking API changes (v5 → v6?), check its changelog.

**Verify**: `pnpm audit 2>&1 | grep -c 'jspdf'` → `0` (no jspdf vulnerabilities)

### Step 2: Upgrade posthog-js to latest

Run: `pnpm update posthog-js@latest`

This should pull in a newer protobufjs transitively.

**Verify**: `pnpm audit 2>&1 | grep -c 'protobufjs'` → `0`

### Step 3: Upgrade vitest to >=4.1.0

Run: `pnpm update vitest@latest @vitejs/plugin-react@latest`

**Verify**: `pnpm audit 2>&1 | grep -c 'vitest'` → `0`

### Step 4: Upgrade remaining high/moderate deps

Run: `pnpm update postcss@latest dompurify@latest`

For `undici` vulnerabilities: these come from `vercel@48.12.1` (dev dependency). Upgrade vercel: `pnpm update vercel@latest`

**Verify**: `pnpm audit` → 0 critical, reduced high count.

### Step 5: Full verification

```bash
pnpm typecheck && pnpm test && pnpm audit
```

Expected: typecheck passes, tests pass, 0 critical vulnerabilities.

## Test plan

- No new tests needed — this is a dependency update.
- Existing test suite (`pnpm test`) must pass unchanged.
- Run `pnpm build` to verify production build works.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0
- [ ] `pnpm audit` reports 0 critical vulnerabilities
- [ ] `pnpm build` exits 0
- [ ] No source code files modified (`git diff --name-only` shows only package.json + lockfile)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `jspdf@4+` has breaking API changes that require modifying `lib/export/pdf-utils.ts` or `lib/export/attendance-pdf.ts` or `lib/export/content-pdf.ts`.
- `posthog-js@latest` changes its init API (the `posthog.init()` call pattern).
- `vitest@latest` breaks the test runner configuration in `vitest.config.mts`.
- A dependency upgrade pulls in a new peer dependency that isn't available.

## Maintenance notes

- jsPDF is used for PDF export of attendance reports and content reports. After upgrading, manually verify that PDF generation still works by calling the export functions.
- PostHog is currently disabled (no `NEXT_PUBLIC_POSTHOG_KEY` set). The upgrade is still important because the dependency is bundled.
- Re-run `pnpm audit` monthly to catch new advisories.
