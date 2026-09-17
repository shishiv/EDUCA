# EDUCA quality preservation, 2026-09-08

## Outcome

Eight original worktrees were committed in place and pushed before any comparison or PR creation. No source files were copied into this evidence worktree. These artifacts contain inventories, content hashes, Git object identifiers, operation receipts, comparisons and check logs.

The initial inventory has **801 non-noise entries**: 795 entries known to the index (including intent-to-add and a rename) plus 6 untracked files. Eleven `.pi/semantic-grep.sqlite*` files were excluded and left untouched. All three untracked worker `VENT.md` files were included.

Three initial deletion markers referred to paths already absent both on disk and in the original HEAD. Their absence is preserved, not silently dropped from the accounting. Thus the eight commits have **798 diff-file entries in total**, with overlap between branches, not 798 unique files.

| Worktree | Remote branch | Inventory entries | Commit diff files | Commit | PR to dev |
|---|---|---:|---:|---|---|
| integration | `refactor/educa-zero-slop-20260907` | 561 | 559 | `2d95afc0237a74ded944cae53ed4db30a83903aa` | https://github.com/shishiv/EDUCA/pull/211 |
| auth | `salvar/educa-quality-auth-20260908` | 29 | 29 | `a8c143eab185d4459ce1cf7740c8a841f1e014b9` | https://github.com/shishiv/EDUCA/pull/212 |
| contracts | `salvar/educa-quality-contracts-20260908` | 25 | 25 | `9732efeaee2edbf2455d01905bfb26ef48d40615` | https://github.com/shishiv/EDUCA/pull/213 |
| frequency | `salvar/educa-quality-frequency-20260908` | 39 | 39 | `d8e884b3135edc24aba2a27df764c1a7224d7cb8` | https://github.com/shishiv/EDUCA/pull/214 |
| public | `salvar/educa-quality-public-20260908` | 51 | 50 | `c0b0d4c63da6f2081f47a69000c7db654745c5aa` | https://github.com/shishiv/EDUCA/pull/215 |
| readmodels | `salvar/educa-quality-readmodels-20260908` | 42 | 42 | `8393a99dbc1f800a64753c7d737fb71ea43b20eb` | https://github.com/shishiv/EDUCA/pull/216 |
| toolchain | `salvar/educa-quality-toolchain-20260908` | 33 | 33 | `1fb7874e082ca05f867b72991b3a384e81468af2` | https://github.com/shishiv/EDUCA/pull/217 |
| validation | `salvar/educa-quality-validation-20260908` | 21 | 21 | `5d1bb89a78218a5abb0f82c29b275fa5f23ffab5` | Covered by integration; no separate PR |
| **Total** | | **801** | **798** | | |

All seven preservation PRs are deliberate drafts. The separate `fm/educa-quality-prs-dev` delivery branch holds 88 evidence/feedback files, not a ninth source snapshot.

## Evidence map

- [`20260908-inventory/inventory.json`](20260908-inventory/inventory.json): initial HEAD, branch, exact paths and counts for all eight worktrees.
- `20260908-inventory/*.status.txt`: raw initial `git -C <worktree> status --porcelain=v1 -uall` output, including excluded noise.
- [`20260908-inventory/content-manifest.json`](20260908-inventory/content-manifest.json): SHA-256 fingerprints, modes, presence/absence and original rename paths captured before staging.
- [`20260908-inventory/secret-preflight.json`](20260908-inventory/secret-preflight.json): sensitive-filename/high-confidence credential-pattern preflight. No findings; this is not a comprehensive secret audit.
- [`preservation/receipts.json`](preservation/receipts.json): original HEADs, safety branches, new commit IDs, staged-byte/mode verification, remote SHA confirmations and Git diff counts.
- [`preservation/initial-absences.json`](preservation/initial-absences.json): the three initial index-only deletion markers. `integration` had `app/app/api/demo/audit/handler.ts` and `app/tests/e2e/diary/canonical-lesson.spec.ts`; `public` had `app/lib/middleware/proxy-boundary.ts`.
- `preservation/*.commit.txt`, `*.push.txt`, `*.remote.txt`: operation receipts. Nothing was force-pushed.
- [`comparison/comparison.json`](comparison/comparison.json): per-path base/worker/integration tree identities and comparisons; `*.numstat.txt` records the original direct same-path diff statistics.
- [`preservation/prs.json`](preservation/prs.json) and [`pr-bodies/`](pr-bodies/): returned forge URLs and posted PR descriptions.
- [`checks/results.json`](checks/results.json) and `checks/*.log`: bounded integrated checks, including unsuccessful invocations rather than hiding them.
- [`final-proof/verification.json`](final-proof/verification.json): post-test verification of every original content hash, Git mode, absence, remote SHA and final worktree status. Zero unpreserved changes.
- `final-proof/*.status.txt`: final raw statuses; integration is clean, workers contain only the same 11 excluded index-noise files.
- [`final-proof/github-verification.txt`](final-proof/github-verification.txt): `true` from an authenticated `gh-axi api` assertion that all seven source PRs have the exact returned URL, expected head branch/SHA, base `dev`, open/draft state and exact local body.
- [`final-proof/protected-branches.txt`](final-proof/protected-branches.txt): `dev` remains `8713027b52caf6930999385253fdf1f052bbf912`; `main` remains `f3f02c8fb9664895eeea10221f3e57b4f469388b`.

## Containment decisions

Comparison was performed with `git diff <worker-commit> <integration-commit> -- <path>` on every inventoried worker path, not by assuming the integration branch was complete. Byte/mode identity is distinguished from line-edit coverage and moved content.

- **auth, contracts, readmodels:** each has its own exclusive `VENT.md` plus divergent code/test versions.
- **toolchain:** two exclusive fixture files and divergent configuration/test versions.
- **public:** divergent code/test versions, including a prior `.test.ts` version replaced by different `.test.tsx` tests in integration.
- **frequency:** partially contained, with 17 divergent versions preserved for reconciliation. Its reopen E2E is byte-identical at the new `app/tests/e2e/pilot/attendance-reopen.spec.ts` path and is not exclusive content.
- **validation:** all changes covered. Twenty paths are byte/mode-identical. In `app/lib/date-utils.ts`, all seven worker replacements anchored to the common base are also present in integration after CRLF/LF normalization. Integration's added UTC month helper and removed unchanged legacy helpers are separate edits. No standalone PR was opened; the exact original worker snapshot remains on its remote branch.

A divergent version is not a claim that a feature is missing from integration. The worker drafts preserve alternatives for manual reconciliation and must not be merged blindly over the integrated result.

## Checks and remaining gates

Executed only against the committed integration snapshot, with commands resolved from its `app/` directory via `pnpm --dir`:

- `pnpm lint`: passed.
- `pnpm run test --maxWorkers=2 --no-file-parallelism`: passed, 124 test files and 1316 tests; 3 files and 20 tests skipped. Expected negative-origin checks emit stderr but the runner exits zero.
- `pnpm typecheck`: **failed**, `app/tests/e2e/pilot/deployed-isolation.spec.ts:71:26`, `TS7006`, parameter `metric` implicitly has type `any`. No fix was mixed into preservation commits.
- An initial `pnpm test --maxWorkers=2 --no-file-parallelism` was rejected by pnpm before invoking Vitest. The corrected `pnpm run test` invocation above is the actual completed test run.
- Build, browser/E2E, SQL and pilot lifecycle gates were not rerun. Workers were not independently tested. This preservation delivery makes no production-readiness or merge-readiness claim.
- The evidence branch's full `git diff --cached --check` flags trailing whitespace/blank EOF lines in raw GitHub push output and check logs. Those raw receipts were deliberately not rewritten. The authored Markdown/JSON scope passes the same whitespace check.

## Safety and authority

The disposable worktree was verified by both `pwd -P` and `git rev-parse --show-toplevel`. Firstmate explicitly resolved the scaffold's conflicting write/push restrictions and authorized mutation only in the eight original quality worktrees and publication of their safety branches/PRs. The primary checkout and five clean architecture worktrees were not modified.

Commits used `git -C <original-worktree> ...`; workers received new `salvar/educa-quality-*-20260908` branches and integration retained its existing branch. Staging excluded only `.pi/semantic-grep.sqlite*`. No source rewrite, destructive Git command, merge, PR closure, branch deletion or directory removal was performed.
