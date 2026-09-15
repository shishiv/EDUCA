# F04 preservation: atomic user status (DRAFT, incomplete validation)

Date: 2026-09-15 UTC. Base: `063e0e978fd896d5c66ac0ba7d2ddf5afe67aba0` (`dev`). Branch: `fm/educa-f04-user-status-atomic`.

**The captain stopped implementation via inbox `002.msg` at 04:16:32 UTC. This is a reviewable draft, not a completed F04 delivery or permission to merge.** No production, public demo, real data, grades, external email or Supabase Auth mutation was involved. The local disposable Supabase stack was removed, including its synthetic fixtures and credentials.

## Diagnosis and what was actually reproduced

The original `app/app/api/users/[userId]/status/handler.ts` performed three separate store calls: `find`, service-role `UPDATE users.ativo`, then an authenticated `write_pilot_audit_event`. The UPDATE request committed independently of the semantic receipt request.

- **Trigger:** missing/failed semantic receipt after the status update.
- **Masking condition:** the old test checked HTTP 503 and call counts, but its memory store did not persist status. A failed response therefore looked safe while the test never observed the user's state. The generic `pilot_audit_core_change` trigger also already audits user UPDATEs; this is not absence of all auditing.
- **Operator symptom:** failure response (`USER_STATUS_AUDIT_INCOMPLETE`, `completed:false`, or a generic update failure) while a reload can show the changed status. The backend ordering establishes that risk; a browser reload on the old handler was **not executed** before the stop.
- **Minimal executed red test:** added `persistedActive` to the existing memory store, assigned it during update, and asserted that receipt failure preserved `true`. It failed with `false`, while the existing 503 expectation passed: **1 failed / 4 passed**. `handler-reproduction.patch` reproduces this against the base; `handler-before.log` is the actual output. This is handler-level fault injection, not a live pre-fix database/browser reproduction.
- **History:** `7f66cd6b` introduced the governed status route using the service-role update without a semantic receipt. `2f3f0780` split it into a handler and added the separate audit call and the 503 test. No transaction was added around those remote calls.
- **Comparator inspected:** `20260908070000_governed_management_atomic_updates.sql`, `update_governed_school`, updates both sides of the director relationship and calls `record_governed_management_audit` inside a single PL/pgSQL function. `governed_management_mutations.test.sql` verifies persisted relationships and semantic events. Its receipt-failure contrafactual was **not run** in this task.
- **Evidence against an overbroad diagnosis:** browser UPDATE grants were already revoked; the route already checked admin/school; generic database audit triggers already existed; the route already refused HTTP success without a receipt. The defect is the split commit boundary, not a total lack of authorization/auditing or a preexisting false HTTP 200.

## Preserved change

`20260915040000_atomic_user_status.sql` adds `set_governed_user_status(uuid, boolean)`:

- Uses `auth.uid()`, not client actor/school IDs. Locks actor and target in stable UUID order and rereads active admin authority and school after acquiring locks.
- Preserves municipal admin (`escola_id IS NULL`) or same-school admin authority. Inactive **actors** are denied; inactive targets can be reactivated. Existing self-deactivation remains permitted, with a receipt.
- Sets a desired boolean, writes `user_status_updated` in the same transaction, and raises if the semantic insert throws **or suppresses its RETURNING row**.
- Records server-derived actor, target school, previous/current state and whether a change happened. Retry is state-idempotent, not exactly-once: each accepted command receives a new truthful receipt, including no-ops.
- Grants only RPC execution to authenticated, no table UPDATE/INSERT. Existing generic audit writer compatibility is unchanged. Does not alter Auth, email, grades, existing role values, school configuration or RLS policies.

The handler validates only target/boolean, invokes one authenticated RPC, validates receipt/returned target/state, and maps failures without success payloads. No service-role status update remains there. Types were generated from the disposable local stack with the complete canonical migrations; the only generated diff is the new RPC.

## Executed checks (not a full green gate)

Logs retain outcomes and diagnostics; trailing display whitespace was normalized for preservation. The reproduction patch uses reduced context and was checked against the declared base.

Commands below ran from `app/` unless noted. pnpm **9.15.9** was selected locally; the ambient pnpm 11 does not honor this repository's overrides and attempted dependency reconciliation. No lockfile/package changes were made. Installation logs are retained for that distinction, not as product test failures.

| Command / manifest | Result and evidence |
| --- | --- |
| `pnpm test tests/unit/api/user-status-route.test.ts` on original handler plus state assertion | RED, 1 failed / 4 passed; `handler-before.log`, `handler-reproduction.patch` |
| Same command after transactional handler/test rewrite | 17 passed / 0 skipped; `handler-after.log`. Subsequent changes only adjusted error helper/test parameter typing to address lint findings; no final rerun before stop. |
| `psql "$DB_URL" -X -v ON_ERROR_STOP=1 -f supabase/tests/database/user_status_atomic.test.sql` from root, local disposable canonical DB + pilot gate | Exit 0, `F04_USER_STATUS_ATOMIC_OK`; `sql-atomic.log` |
| `EDUCA_USER_STATUS_DB_TEST=1 SUPABASE_DB_URL=<local> pnpm test tests/live/user-status-concurrency.live.test.ts` | 6 passed / 0 skipped; `sql-concurrency.log` |
| `pnpm exec supabase --workdir <isolated-project> gen types typescript --local` | Exit 0; generated file committed as `app/types/database.ts`, only eight added lines |
| `pnpm lint` | Initial failure on three anti-slop type-boundary findings, preserved in `lint-before-type-adjustments.log`. Source adjusted before stop; final lint was queued after typecheck and never ran. **No lint/complexity/anti-slop PASS claim.** No gate configuration changed. |
| `pnpm typecheck` | First attempt timed out at the command harness; second interrupted on captain stop, no diagnostic or exit result. `typecheck.log` explicitly marks incomplete. **Not PASS.** |
| `git diff --check` | Passed during preservation |

SQL assertions cover semantic throw/suppression rollback, both deactivate/activate, absence of partial generic/semantic update receipts, authenticated RPC grant without broad browser writes, RLS retained, inactive/missing actor, secretary, foreign-school and null-school target denial, null input, missing target, same-school/municipal success, no-op retry and self-deactivation.

Live PostgreSQL concurrency tests observe `pg_blocking_pids`, not just sleeps. Actor deactivation, demotion, actor school move and target school move committed first all force denial after waiting, without status/receipt changes. Status-first blocks target movement until commit and retains the original authoritative receipt scope. Opposite status commands serialize with an accurate predecessor state. Fixtures are synthetic `.invalid` identities and were removed with the disposable stack.

## Still required before F04 can be considered delivered

1. Live pre-fix fault injection through the original default handler, SQL persistence/generic-receipt observation, and the smallest comparator counterfactual. The preserved unit red test does not replace this.
2. Final typecheck, lint (`complexity max10`, anti-slop, ESLint), focused unit rerun, build and pertinent existing SQL/RLS regression suite. Only the new focused SQL contract and concurrency suite ran; **the full canonical SQL runner did not run**.
3. Browser focal status positive, receipt failure/reload, denied actor/school and retry using `chrome-devtools-axi`; default handler RPC wiring proof. **No browser was launched, no browser spec executed, no screenshots captured.**
4. Review whether additional authorization/receipt compatibility tests are necessary, particularly generic writer compatibility. Do not broaden grants to satisfy tests.

No campaign/general/R3 repetition occurred. No build, production/deploy, PR merge, no-mistakes daemon operation or Herdr lifecycle action was performed.

## Runtime and cleanup

A temporary direct-server rehearsal used existing `pilot-local-project.ts`, lease and cleanup helpers: full canonical reset, explicit synthetic pilot gate, `seed-pilot-synthetic.ts`, Next development server on loopback. `runtime-rehearsal.sh.txt` preserves the scratch driver for diagnosis, **not a new supported runner**. It expects scratch paths and is not advertised as a package command. Initial setup attempts encountered ambient pnpm 11, missing portless proxy (no shared proxy started), and reuse of an existing scratch directory; the successful rehearsal used pnpm 9, direct serving and a unique project directory.

On stop, the task's app process group and typecheck driver were terminated. Supabase cleanup verified no remaining resources for `f04-supabase.dBXalz`; lease `62160-62169` was released. The earlier `f04-supabase` attempt was also removed and its leases released. `cleanup.log` contains the final verification. No auth state or secrets are preserved in this evidence directory. Scratch mirrors/generated duplicates and local credentials were removed after preserving useful code, commands and diagnostics.
