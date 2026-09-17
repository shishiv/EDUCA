# F03 recovery evidence, 2026-09-17

The original defect was reproduced on `c149a2ab`: a recovery email captured locally led to `/login`, without a new-password form. The completed flow passed against local Supabase Auth and the production application built from `430c9b403d91a2bd90a3f2a5d4b8addd04bfc177`.

## Observed results

| Check | Result | Evidence |
| --- | --- | --- |
| Original recovery flow | Expected RED, landing at `/login` | [baseline output](baseline.txt), [cleanup receipt](baseline.json) |
| Development browser, including Strict Mode | PASS | [development output](development.txt), [receipt](development.json) |
| Causal control, only completion page removed | Expected RED at `valid recovery reaches new password form` | [causal output](causal.txt), [receipt](causal.json) |
| Restored completion, local production build and browser | PASS | [production output](production.txt), [receipt](production.json) |
| Typecheck | PASS | [check output](checks.txt) |
| Lint, max10, anti-slop and ESLint | PASS, zero ESLint warnings | [check output](checks.txt) |
| Focused Auth unit tests | 52 passed in four files, `--maxWorkers=2` | [check output](checks.txt) |
| ShellCheck and diff typography against `origin/dev` | PASS | [check output](checks.txt) |
| Desktop and mobile completion form | Inspected, no horizontal mobile overflow | [desktop](form-desktop.png), [mobile](form-mobile.png), [success](success.png) |

The browser proof uses real local email delivery and Auth, not an administrative password update. It checks exactly one PKCE exchange, password strength, confirmation mismatch, rejection of the unchanged password, successful persistence, rejection of the previous password, and login with the new password. Login proceeds through client navigation in the same document, exercising the existing Auth lock after recovery.

Independent browser profiles prove ordinary login, rejection of a callback without its verifier, preservation of the other profile's identity, successful completion by the requesting profile, and rejection of reused email and PKCE callbacks. Expiration was exercised by backdating only one synthetic account's `recovery_sent_at`. Browser actions were serialized with one worker.

All positive and negative runs report successful cleanup. The final probe also found no F03 containers, volumes, networks, live browser processes, temporary project directories or port leases. SMTP sender and recipients were `.invalid`, with Auth pointing only to the isolated catcher container. No external SMTP, remote Auth, deployment or hosted CI was used.

## Provenance and reproduction

The baseline and development receipts preceded the implementation commit, so their `headSha`, when present, identifies the base rather than the uncommitted application bytes. The causal and production receipts identify the committed implementation. In the causal run, only `app/app/reset-password/complete/page.tsx` was moved outside the App Router. It was restored before building and running the positive control. The negative result was a specific missing-form assertion, not a setup failure or timeout.

The copied browser text contains selected scenario output, not full tool transcripts. Email bodies, password values, callback codes, tokens, browser profiles and storage state are not included. Screenshots show empty inputs or the success state.

The recorded build used `CIRCLE_NODE_TOTAL=2`. The installed Next formula subtracts one, so the effective worker count was one. A follow-up changes only the runner's stdout label and documentation to report that count accurately, alongside these receipts. Application code remains the validated implementation.

Exact local commands and prerequisites are in [the recovery runbook](../../docs/PASSWORD-RECOVERY.md). The checks were run from `app/`. The typography command used `EM_DASH_DIFF_BASE=origin/dev` because this worktree has no local `main` branch and F03 targets `dev`.

This is focused synthetic-only evidence. It is not a full general browser or R3 aggregate run, a production Auth test, an external SMTP test, or approval to deploy.
