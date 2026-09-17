# F06 canary preflight evidence

Base: `origin/dev@5b2ebe4f11e221fbbd058231444e34f47abd2a31`.
Issue: https://github.com/shishiv/EDUCA/issues/230.
Run date: 2026-09-17. Only synthetic data and disposable local PostgreSQL were used.

## Defect and correction

`stub-before.log` records the focused regression against the unchanged baseline. Both setup and rollback handed `postgresql://postgres@remote.invalid/postgres` to the recording stub, then rejected its effective address `203.0.113.5`. There was one stub invocation per entry point and no network connection.

The shared preflight now validates a restricted PostgreSQL URI before any `psql` invocation, rejects routing overrides, and pins a numeric loopback `hostaddr`. The existing effective-address check remains before mutation. Python 3.11+ and command prerequisites precede connections and allocation. The raw-PG runner registers cleanup before `mktemp` and handles partial startup without deleting a cluster whose shutdown failed.

## Observed validation

Commands ran from `app/` unless a repository-root command is shown. Runtime was `/usr/bin/node` v26.8.1, ABI 147, pnpm 9.15.9, Python 3.14.7 and PostgreSQL 18.6. Node was invoked explicitly and placed ahead of inherited runtime shims for children. No dependency, lockfile, timeout, assertion, or lint-policy change is included.

| Check | Result |
| --- | --- |
| `python3 ../supabase/tests/canary/test_safety.py -v` | 13 sequential tests passed. `stub-after.log` covers URL denials without client invocation, local admission, effective-address refusal, routing environment, prerequisite ordering, initialization failure, partial startup, and failed-shutdown retention. |
| `pnpm test:database:schema-canary` | Passed against an owned raw-PG cluster. `raw-pg.log` contains the exact success markers for setup, catalog security, export, restore, 1/10/25-schema migration batches, rollback and cleanup. |
| Cleanup witness | `cleanup.json`: zero entries under the dedicated temporary parent and zero PostgreSQL processes referencing that parent after the runner exited. The empty parent was then removed. |
| Offline libpq compatibility | `libpq-parse.json`: five normalized IPv4, localhost, IPv6, encoded-credential and query-option cases parsed with PostgreSQL 18.6 `PQconninfoParse`. Expected hostaddr, port and database matched. This API parses only, with no connection attempt. |
| `pnpm typecheck` | Passed. |
| `pnpm lint` | Passed with complexity max10, anti-slop and ESLint `--max-warnings 0` unchanged. |
| `pnpm run test --maxWorkers=2` | 127 files passed, 3 skipped. 1333 tests passed, 20 skipped. Duration 46.76 seconds. |
| `CIRCLE_NODE_TOTAL=3 NEXT_TELEMETRY_DISABLED=1 pnpm build` | Passed. Next.js reported 2 workers and 70/70 static pages. The installed Next.js configuration computes worker count as `CIRCLE_NODE_TOTAL - 1`. |
| Root: `bash -n supabase/canary/{setup,rollback,safety,prerequisites}.sh supabase/tests/canary/run.sh` | Passed. |
| Root: `shellcheck -S warning -s bash -x supabase/canary/{setup,rollback,safety,prerequisites}.sh supabase/tests/canary/run.sh` | Passed. |
| `git diff --check` | Passed. |

`validation.json` records source hashes and full local log hashes. General-check logs are retained with this evidence, with terminal carriage returns and trailing whitespace normalized. The raw-PG output is condensed to its success markers rather than copying migration notices. The unit run emitted Node's experimental localStorage warning and expected negative-origin diagnostics. The build emitted a stale Browserslist dataset notice. None was hidden or used to relax a gate.

The first attempt to invoke the globally installed pnpm 11 triggered its automatic installation behavior. Its generated workspace file and lockfile churn were removed, and the canonical lockfile was installed frozen with pnpm 9.15.9 before validation. This environment preparation is not part of the patch.

## Boundary

No real remote endpoint was used as a negative control. No school schema was routed, no provider or hosted Supabase behavior was evaluated, and no deployment or hosted CI ran. Browser E2E and the broader Supabase pilot aggregate were not rerun for this shell-only boundary change. Hosted capabilities remain unverified as described in `docs/SCHOOL-SCHEMA-CANARY.md`.
