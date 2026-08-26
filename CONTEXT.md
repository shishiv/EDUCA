# EDUCA context

## Purpose and current boundary

EDUCA is an MIT-licensed school-management application for Brazilian municipal and small-town school networks. The product covers schools, users, students, guardians, classes, enrolments, teacher assignments, attendance, dashboard views, and reporting surfaces.

The repository currently supports a **synthetic-only municipal pilot foundation**. It does not authorize real student data, municipal deployment, legal approval, or a production-compliance claim.

The R3-T4 pilot aggregate runs the legacy, capacity, descriptive, and focused security children as separate lifecycle processes. It acquires one cross-worktree Docker-aware port-range lease and passes it to every child until cleanup completes. Capacity and descriptive setup files remain outside the shared legacy Playwright project, and the R1 canonical runner remains independent. The pilot core is authentication and role-based access, schools, users, students, classes, enrolments, guardians, assignments, attendance, dashboard, and the class diary (captain decision 2026-08-09: diary is a real pilot feature). Grades, Educacenso, health, disability, and race data remain disabled. The hardening ship releases only the scoped Bolsa Família conditionality read model and descriptive-report table; real Bolsa Família data remains blocked by the synthetic-only gate.

## Architecture

- `app/` is the Next.js 16 App Router application. It uses React 19, TypeScript, Tailwind/shadcn UI, Supabase SSR clients, and RLS-backed multi-school data access.
- `app/app/` holds routes and route handlers. `app/components/`, `app/lib/`, `app/hooks/`, `app/contexts/`, and `app/types/` contain shared UI, business logic, state, and committed database types.
- `supabase/migrations/` is the canonical ordered schema history. `supabase/config.toml` defines the local Supabase topology.
- `supabase/pilot/provision-pilot-module-gate.sql` is deliberately outside canonical migrations. Synthetic pilot tests apply it explicitly, so ordinary `supabase db push` does not disable modules.
- `supabase/seed-demo/` holds the deterministic demo dataset (issue #23): static seed SQL, `attendance-generator.ts`, reset runner and validation. `app/scripts/demo-reset.sh` is the versioned local wrapper for reset plus validation; D7 keeps this automation out of GitHub Actions. `DEMO.md` is the runbook. `supabase/tests/database/` validates migrations against a temporary raw PostgreSQL cluster. `supabase/tests/pilot/` verifies encrypted portable backup and restore against a local Supabase stack.
- The repository has no `.github/workflows/` files. D7 explicitly prohibits restoring GitHub Actions for the demo reset. The former CI contract ran typecheck, lint, unit tests, and an independent full E2E job from `app/`; do not restore it as part of this local reset work.
- `app/vercel.json` and `app/nixpacks.toml` are deployment inputs. Vercel builds from `app/`; `app/package.json` owns the executable application, test, seed, safety, and deployment commands.

## Setup

Prerequisites: Node.js 20+, pnpm 9+, and Docker for local Supabase. Copy `app/.env.local.example` to `app/.env.local` and set Supabase values. Keep the supplied pilot flags unless named governance approvals exist.

```bash
git clone https://github.com/shishiv/EDUCA.git
cd EDUCA/app
cp .env.local.example .env.local
pnpm install --frozen-lockfile
pnpm dev
```

For a full local Supabase stack, run from the repository root:

```bash
pnpm --dir app exec supabase --workdir . start
pnpm --dir app exec supabase --workdir . db reset
```

Generate the committed type surface only from that disposable local stack, never a linked or remote project:

```bash
pnpm --dir app exec supabase --workdir . gen types typescript --local > app/types/database.ts
pnpm --dir app exec supabase --workdir . stop
```

## Exact commands

Run package commands from `app/`.

```bash
pnpm dev                 # local Next.js development server
pnpm dev:local           # isolated local Supabase + synthetic pilot seed + Next.js + cleanup
pnpm build               # production build
pnpm start               # serve a production build
pnpm typecheck           # TypeScript, including E2E specs and enabled unit tests
pnpm lint                # ESLint
pnpm check:diff-typography # rejects new U+2014 em dashes relative to main
pnpm test                # enabled Vitest unit tests
pnpm test:e2e            # general Playwright suite
pnpm test:e2e:pilot                     # R3-T4 aggregate: legacy, capacity, descriptive, and focused security children
pnpm test:e2e:pilot:canonical           # isolated local Supabase, synthetic gate/identity, named app, one canonical attendance E2E
pnpm test:e2e:pilot:legacy              # R3-T1 shared legacy slice only
pnpm test:e2e:pilot:security             # focused security child with its own R3-T1 lifecycle
pnpm test:e2e:pilot:capacity             # isolated synthetic capacity seed and concurrency E2E
pnpm test:e2e:pilot:descriptive         # isolated synthetic seed, bounded descriptive-report PDF E2E
pnpm test:database:attendance:conditionality  # isolated raw PostgreSQL legal floors, municipal margins, fallback, and RLS
pnpm pilot:restore-test                 # local synthetic encrypted backup/restore rehearsal
pnpm seed:demo                          # synthetic demo seed / reset primitive (issue #23)
pnpm demo:validate       # prove counts, relationships, synthetic markers, alert case
pnpm demo:reset          # local wrapper: preflight demo env, seed, then validate
pnpm demo:reset-check    # prove a same-anchor reset is idempotent on a live database
pnpm demo:verify-sql     # offline raw-PG validation of the demo seed (no Docker, no secrets)
pnpm deploy              # safety-gated Vercel production deploy
pnpm deploy:preview      # safety-gated Vercel preview deploy
```

The bounded R1 tripwire must fail after removing one local attendance RLS policy, then clean the isolated stack:

```bash
PILOT_CANONICAL_DELIBERATE_BREAK=security pnpm test:e2e:pilot:canonical  # expected red
```

Run database migration validation from the repository root:

```bash
supabase/tests/database/run.sh
```

It needs `initdb`, `pg_ctl`, and `psql` from PostgreSQL 15 or newer. It creates and removes its own temporary cluster. The pilot commands require a running local Supabase stack and refuse an external Supabase endpoint.

## Supabase and data boundaries

`app/types/database.ts` is generated from the local Supabase schema and is required by the application build. Preserve it and regenerate it only through the command above. It intentionally lags the live schema: pilot code casts at the seam (`asPilotRpcClient`, `asWhatsAppClient`).

`pnpm dev:local` creates a disposable Supabase project on a leased local port range, applies the pilot module gate, loads the synthetic pilot seed, and removes that project on exit. It prints the browser URL and uses the documented `secretaria@synthetic.invalid` secretariat role. The canonical migrations retain the full product schema. The pilot-only provisioner revokes grades, Educacenso, and the legacy Bolsa Família view, and blocks high-risk student fields during synthetic pilot rehearsal. The hardening migration releases only the security-invoker conditionality RPC/view and scoped descriptive-report table. The pilot accepts synthetic data only, expects the `SYNTHETIC-EDUCA-PILOT` marker during import, and uses `.invalid` identities in its test harness. The browser CSV route records the authenticated secretary or designated operator as owner, verifies a confirmed `pilot_data_treatment_agreements` row, publishes canonical rows through the transactional `pilot_publish_synthetic_import_batch` RPC, keeps the encrypted source through raw retention, and rolls back exact canonical rows through the service-role RPC.

`supabase/pilot/provision-pilot-descriptive-report-demo.sql` is a companion grant for `pnpm test:e2e:pilot:descriptive` only. It follows the base revoke, requires the local synthetic marker and environment gate at the route, and never applies to the public demo sandbox.

`app/scripts/pilot-safety-gate.ts` blocks external deploys while `PILOT_MODE=true`. To authorize real data or external pilot deployment, make a separate reviewed change with named legal and governance approvals. Do not weaken the gate as part of routine feature work.

The portable restore proof writes generated evidence under ignored `.pilot-evidence/`. `app/scripts/run-pilot-restore-test.sh` requires T08's `isolated-proof` identity, reads only a local synthetic source, replays the explicit allowlist into a temporary migrated database, validates Auth, Storage, policies, grants, views, RPCs, tombstones, scoped teacher session, checksums, cleanup, and documented RPO/RTO, then removes all temporary state. It is a synthetic proof, not municipal readiness; see `docs/PILOT-RESTORE-PROOF.md`. Governed pilot CSV preparation is proof-only: `app/scripts/run-pilot-import-proof-e2e.sh` creates a disposable PostgreSQL database, requires the explicit `isolated-proof` target and synthetic marker, encrypts the payload, records redacted safety receipts, counts and fingerprints, cleans expired ciphertext, and exercises rollback. It rejects the public demo, `SUPABASE_DEMO_*`, real mode, and production endpoints before database access; see `docs/PILOT-DATA-IMPORT.md`.

## WhatsApp attendance notifications (bounded MVP)

The bounded WhatsApp notification module lives in `app/lib/notifications/whatsapp-*` with routes under `app/app/api/whatsapp/`. The gateway seam (`whatsapp-gateway.ts`) hides Meta request details behind a small interface with two adapters: a production-shaped Meta adapter and a deterministic local fake. External delivery is a later explicit approval: the safety gate (`whatsapp-safety-gate.ts`) forces the local fake while `PILOT_MODE=true` or Meta credentials are missing, and masked receipts land in `.pilot-evidence/whatsapp-receipts.jsonl`. Schema and delivery-state machine live in `supabase/migrations/20260801000001_whatsapp_notifications.sql`; webhook status updates go only through the monotonic `apply_whatsapp_delivery_status` RPC. Never log or persist message bodies, tokens, or phone numbers. Local rehearsal: `WHATSAPP_LOCAL_FAKE_MODE=deliver|fail|reject` plus unit tests in `app/tests/unit/notifications/` and DB tests in `supabase/tests/database/whatsapp_notifications.test.sql`.

## Load-bearing files

| File or directory | Why it stays tracked |
| --- | --- |
| `app/package.json`, `app/pnpm-lock.yaml` | Exact dependency graph and executable command contract. |
| `app/next.config.js`, `app/vercel.json`, `app/nixpacks.toml` | Application runtime and deployment configuration. |
| `app/.env.example`, `app/.env.local.example` | Non-secret environment contracts. |
| `app/types/database.ts` | Generated type surface required by TypeScript builds. |
| `app/scripts/` | Seed, pilot, deployment, and operational commands. |
| `AUDIT-2026-08-10.md` | Bounded reconciliation, current receipts, open ships, and decision holds for the 2026-08-10 session. |
| `supabase/config.toml`, `supabase/migrations/` | Local Supabase configuration and canonical schema evolution. |
| `supabase/pilot/provision-pilot-module-gate.sql` | Explicit synthetic-pilot containment. |
| `supabase/tests/` | Database and backup/restore validation. |
| `docs/PILOT-DATA-IMPORT.md`, `app/scripts/pilot-import-proof.ts`, `app/scripts/run-pilot-import-proof-e2e.sh` | Governed CSV contract, proof-only import runner, retention, rollback, fingerprints, and isolated PostgreSQL receipt. |
| `supabase/seed-demo/` | Deterministic demo dataset, reset runner, validation (issue #23). |
| `DEMO.md` | Demo sandbox runbook, local reset command, environment contract and safety boundaries. |
| `app/lib/demo-sandbox/` | Demo sandbox mode guards (signup + destructive actions). |

## Demo sandbox (issue #23)

- The public demo sandbox ships code and reproducible configuration only; provisioning (Supabase/Vercel/DNS projects) is external and documented in `DEMO.md`.
- The demo seed is deterministic: static entities use a fixed anchor timestamp and attendance is generated for a 20-school-day window ending at the reset date (seeded PRNG, fixed 70% alert case). `app/scripts/demo-reset.sh`, `pnpm demo:reset-check` and `supabase/seed-demo/verify-sql.sh` prove the local reset path and repeatability. The public scheduled reset remains absent; the public runtime is not considered deterministic until `sandbox-ar` approval and a controlled reset prove convergence.
- Demo sandbox mode (`NEXT_PUBLIC_DEMO_SANDBOX=true`) blocks signup (no UI, no INSERT grant/policy on `users` for authenticated, project setting in `DEMO.md`) and destructive actions (schema `REVOKE DELETE`, middleware + route guards, hidden UI deletes).
- The demo database runs canonical migrations only - it never applies `supabase/pilot/provision-pilot-module-gate.sql`, so NIS/Bolsa Familia seed fields remain allowed.

## Key decisions and constraints

- **Dependency pins (security/typecheck contract):** `app/package.json` carries a `pnpm.overrides` block that pins `@supabase/supabase-js` to `2.90.1` and `tar`, `uuid`, `postcss@8.4.31`, `sharp`, and `ws@8.19.0` to security-patched versions. Do not remove these pins casually: supabase-js 2.111.0 breaks `pnpm typecheck` with ~12 `RejectExcessProperties` errors in `lib/api/*` and attendance/diary modules, and the other pins close confirmed advisories that upstream manifests still declare as vulnerable. Regenerate the lockfile only with `pnpm 9` (CI version) and, for transitive-only refreshes, use `pnpm update <pkg> --save=false` (plain `pnpm update` rewrites unrelated package.json ranges). Local Node 26 requires `npm_config_engine_strict=false` on installs because `@vercel/python-analysis` (via `vercel`) only supports Node `<=24`.

- Product application and marketing site remain separate repositories. This repository owns the product, database assets, and operational code.
- School isolation depends on Supabase RLS. Keep role checks, school scoping, and audit behavior intact when changing data access.
- Attendance is designed to be immutable and time-locked. Treat changes to `app/lib/services/attendance-*` and related migrations as compliance-sensitive.
- Attendance uses `/dashboard/turmas/[id]/chamada` and `sessoes_aula` as its canonical flow. A turma has one titular professor in the pilot; discipline and assignment-history controls are not part of this model. Server actions enforce actor/role/school/session ownership through `app/lib/services/attendance-auth.ts` (issue #30). Never trust client-supplied `professor_id`/`escola_id`; resolve the actor from the server session. Live regression harness: `app/tests/live/attendance-auth.live.test.ts` (needs `EDUCA_LIVE_SUPABASE=1` and a provisioned local stack). The V1 reopen contract lives in `supabase/migrations/20260812000000_attendance_reopen_workflow.sql`, `app/lib/services/attendance-reopen.ts`, and the attendance reopen database/browser tests: only the titular teacher requests, and only a director of the same school decides.
- `frequencia` is canonical per `(sessao_id, matricula_id)`. The session supplies and protects `data_aula`; multiple sessions on one class-day preserve separate history. Migration `20260803095753_educa_attendance_canonical_flow.sql` removes the older day-level conflict target and enforces the session-level unique index.
- The demo sandbox persona is a secretariat-level admin (`tipo_usuario = 'admin'`, `escola_id = NULL`). Create flows (alunos, turmas, responsaveis) resolve the target school from the UI escola-context selector; the admin must select a school first. Do not assign the demo admin to a school - the multi-school view is the intended demo differentiator. See `DEMO.md` for the demoable flow list.
- `use-compliance-warnings.ts` filters active enrolments with `.eq('situacao', 'ativa')` (`matriculas` has no `ativo` column; the column name is `situacao`).
- Attendance alert policy D5 (2026-08-10) lives in `app/lib/attendance/attendance-policy.ts`: `CONFORMIDADE=80` is the Bolsa Família conditionality and `ATENCAO=85` is the preventive municipal margin. Alert reads use `app/lib/api/canonical-attendance-facts.ts`.
- Bolsa Família and NIS reads are denied on `alunos` for browser roles and exposed only through policy-checked RPCs. `configs.bolsa_familia_visible_roles` stores the seeded database default and per-school overrides; teachers and guardians cannot be added. Coordination and social-assistance duties use existing administrative roles rather than new role values.
- The former CI contract ran typecheck, lint, unit tests, and a full E2E suite against disposable local Supabase. No hosted workflow is currently tracked. Run build, database validation, and applicable local Supabase pilot checks before proposing operational or database changes.
- `tsconfig.typecheck.json` and `vitest.config.mts` exclude diary-component and descriptive-report test directories because those suites were written before the diary entered the confirmed pilot. Those files remain for a future reactivation gate and do not prove pilot-core readiness.
- Historical and extended documentation is archived outside the repository at `/home/shiv/docs/EDUCA/`, preserving original repository-relative paths. `MOVED_FROM_REPO.md` there records the archive manifest and source commit.
