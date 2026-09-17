# EDUCA context

## Purpose and current boundary

EDUCA is an MIT-licensed school-management application for Brazilian municipal and small-town school networks. The product covers schools, users, students, guardians, classes, enrolments, teacher assignments, attendance, dashboard views, and reporting surfaces.

The repository currently supports a **synthetic-only municipal pilot foundation**. It does not authorize real student data, municipal deployment, legal approval, or a production-compliance claim.

Educação Infantil uses Vivências: teacher-authored daily narrative observations linked to one or more of the five BNCC Campos de Experiência. Vivências are source material for period development reports and are not grades or generic notes. Their approved complete-selection, atomic snapshot/provenance, legacy, and unconfigured school-period contracts are documented in [`docs/NARRATIVE-SOURCES-AND-SCHOOL-PERIODS.md`](docs/NARRATIVE-SOURCES-AND-SCHOOL-PERIODS.md).

The R3-T4 pilot aggregate runs the legacy, capacity, descriptive, and focused security children as separate lifecycle processes. It acquires one cross-worktree Docker-aware port-range lease and passes it to every child until cleanup completes. Capacity and descriptive setup files remain outside the shared legacy Playwright project, and the R1 canonical runner remains independent. The pilot core is authentication and role-based access, schools, users, students, classes, enrolments, guardians, assignments, attendance, dashboard, and the class diary (captain decision 2026-08-09: diary is a real pilot feature). Grades, Educacenso, health, disability, and race data remain disabled. The hardening ship releases only the scoped Bolsa Família conditionality read model and descriptive-report table; real Bolsa Família data remains blocked by the synthetic-only gate.

## Operational catalog and evidence

Catalog review: 2026-09-15, against `dev` at `063e0e978fd896d5c66ac0ba7d2ddf5afe67aba0`. This identifies the source inspected, not a new application test run. `main` remains production-only; ordinary changes target `dev`.

- [`DEMO.md`](DEMO.md#source-capability-catalog): source capabilities, UI/API boundaries and local Supabase commands, separate from dated public observations.
- [`E2E README`](app/tests/e2e/README.md) and [`coverage matrix`](app/tests/e2e/COVERAGE_MATRIX.md): cases and assertion depth, not an automatic PASS for the current tree.
- [`R3 reconciliation`](docs/R3-PILOT-E2E-FOLLOW-UP.md): already delivered; not pending work. [`Narrative contract`](docs/NARRATIVE-SOURCES-AND-SCHOOL-PERIODS.md) and [`import contract`](docs/PILOT-DATA-IMPORT.md) remain the authorities for snapshots/periods and retention/rollback.

| Evidence scope | SHA / manifest | What the record establishes |
| --- | --- | --- |
| Preservation, 2026-09-08 | Integration snapshot `2d95afc0237a74ded944cae53ed4db30a83903aa`; [content manifest](artifacts/educa-quality-prs-dev/20260908-inventory/content-manifest.json), [receipts](artifacts/educa-quality-prs-dev/preservation/receipts.json) | Original bytes and alternatives preserved, not work to merge blindly or proof of current readiness. See the [dated inventory](artifacts/educa-quality-prs-dev/README.md). |
| Quality reconciliation, landed as `2f3f07801c461792557cb6dc580cb295947ecb22` | [Ledger](artifacts/quality-integration/reconciliation.json), [general result](artifacts/quality-integration/general/result.txt), [R3 selected manifests and receipts](artifacts/quality-integration/pilot/aggregate.json) | [Delivery record](artifacts/quality-integration/README.md): general 235/235 with negative grades boundary; four R3 children passed in that integration. This does not turn General9 red or its unexecuted cases into PASS. |
| Vivências/periods, landed as `a41c2501d7f9cabdd2f5119a2d1a3060d4ef3373` | Code provenance `6a534024f0f664df151e4c050451b07d529530b3`; [descriptive manifest/receipt](artifacts/contracts/pilot/r3-t4-descriptive-pilot-e2e-20260914T090227Z-3081593.json) | [Delivery record](artifacts/contracts/README.md): focused general browser 27/27, descriptive 6/6 including setup, SQL and real PDF. Not a new full-general/R3 aggregate run. |

Merge SHAs locate delivered work; they do not replace the source SHAs inside receipts. Historical logs, snapshots and hashes stay unchanged. `artifacts/quality-integration/verify.py` compares the ledger's pinned final bytes, not an evolving `dev`; later changes can fail that comparison and must not be hidden by updating old hashes. Missing checks remain missing; selection/collection, component callbacks and dialog rendering are not persistence proofs. Application gates remain `complexity max10` plus anti-slop in [`app/.oxlintrc.json`](app/.oxlintrc.json), run through `pnpm lint`; no hosted CI workflow is introduced.

## Architecture

- `app/` is the Next.js 16 App Router application. It uses React 19, TypeScript, Tailwind/shadcn UI, Supabase SSR clients, and RLS-backed multi-school data access.
- `app/app/` holds routes and route handlers, including the canonical public entry at `/`, the synthetic sandbox explanation at `/demo`, the operational entry at `/login`, the public privacy contract, and the preserved public blog. `app/components/`, `app/lib/`, `app/hooks/`, `app/contexts/`, and `app/types/` contain shared UI, business logic, state, and committed database types.
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
pnpm --dir app exec supabase --workdir .. start
pnpm --dir app exec supabase --workdir .. db reset
```

Generate the committed type surface only from that disposable local stack, never a linked or remote project:

```bash
pnpm --dir app exec supabase --workdir .. gen types typescript --local > app/types/database.ts
pnpm --dir app exec supabase --workdir .. stop
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
pnpm test:e2e:password-recovery         # isolated local Auth + mail catcher + serial AXI recovery scenarios
pnpm test:e2e:pilot                     # R3-T4 aggregate: legacy, capacity, descriptive, and focused security children
pnpm test:e2e:pilot:canonical           # isolated local Supabase, synthetic gate/identity, named app, one canonical attendance E2E
pnpm test:e2e:pilot:legacy              # R3-T1 shared legacy slice only
pnpm test:e2e:pilot:security             # focused security child with its own R3-T1 lifecycle
pnpm test:e2e:pilot:capacity             # isolated synthetic capacity seed and concurrency E2E
pnpm test:e2e:pilot:descriptive         # isolated synthetic seed, bounded descriptive-report PDF E2E
pnpm test:database:attendance:conditionality  # isolated raw PostgreSQL legal floors, municipal margins, fallback, and RLS
pnpm test:database:schema-canary              # isolated synthetic per-school schema setup/export/restore/rollback proof
pnpm canary:schema:setup                      # local-only synthetic canary setup; requires the documented DB_URL and safety flags
pnpm canary:schema:rollback                   # removes only canary schema metadata; requires the same local safety flags
pnpm pilot:restore-test                 # partial local synthetic encrypted backup/restore rehearsal
pnpm test:database:restore              # isolated raw PostgreSQL pedagogical restore, grants, catalog and school-scope regression
bash ../supabase/tests/pilot/run-pedagogical-rehearsal.sh  # own synthetic source, encrypted portable replay and verified cleanup
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

It needs `initdb`, `pg_ctl`, `psql`, and `pg_dump` from PostgreSQL 15 or newer. It creates and removes its own temporary cluster. Contracts run against the canonical ordered migration chain. Legacy report replay runs on an isolated database copy whose schema, function bodies, policies, triggers, and grants must match the canonical catalog before pilot provisioning. The pilot commands require a running local Supabase stack and refuse an external Supabase endpoint.

## Supabase and data boundaries

`app/types/database.ts` is generated from the complete local Supabase migration chain and is required by the application build. Preserve it and regenerate it only through the command above. Pilot, WhatsApp, attendance-reopen, and sensitive-family adapters remain intentionally narrower than the generated client at security-sensitive seams.

`pnpm dev:local` creates a disposable Supabase project on a leased local port range, applies the pilot module gate, loads the synthetic pilot seed, and removes that project on exit. It prints the browser URL and uses the documented `secretaria@synthetic.invalid` secretariat role. The canonical migrations retain the full product schema. The pilot-only provisioner revokes grades, Educacenso, and the legacy Bolsa Família view, and blocks high-risk student fields during synthetic pilot rehearsal. The hardening migration releases only the security-invoker conditionality RPC/view and scoped descriptive-report table. The pilot accepts synthetic data only, expects the `SYNTHETIC-EDUCA-PILOT` marker during import, and uses `.invalid` identities in its test harness. The browser CSV route records the authenticated secretary or designated operator as owner, verifies a confirmed `pilot_data_treatment_agreements` row, publishes canonical rows through the transactional `pilot_publish_synthetic_import_batch` RPC, keeps the encrypted source through raw retention, and rolls back exact canonical rows through the service-role RPC.

`supabase/pilot/provision-pilot-descriptive-report-demo.sql` is a companion grant for `pnpm test:e2e:pilot:descriptive` only. It follows the base revoke, requires the local synthetic marker and environment gate at the route, and never applies to the public demo sandbox.

`app/scripts/pilot-safety-gate.ts` blocks external deploys while `PILOT_MODE=true`. To authorize real data or external pilot deployment, make a separate reviewed change with named legal and governance approvals. Do not weaken the gate as part of routine feature work.

The partial portable restore proof writes generated evidence under ignored `.pilot-evidence/`. `app/scripts/run-pilot-restore-test.sh` requires T08's `isolated-proof` identity, reads only a local synthetic source, and replays the explicit 26-table allowlist from `supabase/tests/pilot/restore-coverage-v2.tsv` into a temporary migrated database. F07 includes school configuration, academic years/periods, diary content, Vivências, reports/source links and attendance-reopen decisions. Exact CSV equality preserves snapshots, NULL legacy provenance and deadlines, while PostgreSQL recomputes the original JSONB fingerprint and checks post-replay foreign keys. The existing identity manifest, Storage file checks, catalog/grant probes, tombstones, school scope, cleanup and RPO/RTO remain bounded. Full historical audit, other modules and restored Auth/Storage services remain excluded. `pnpm test:database:restore` is the smaller raw-PostgreSQL regression. `supabase/tests/pilot/run-pedagogical-rehearsal.sh` creates its own disposable local Supabase source and exercises the encrypted portable path with the two-school F07 fixture. See `docs/PILOT-RESTORE-PROOF.md` for commands, coverage, negative probes and provider limits. Governed pilot CSV preparation is proof-only: `app/scripts/run-pilot-import-proof-e2e.sh` creates a disposable PostgreSQL database, requires the explicit `isolated-proof` target and synthetic marker, encrypts the payload, records redacted safety receipts, counts and fingerprints, cleans expired ciphertext, and exercises rollback. It rejects the public demo, `SUPABASE_DEMO_*`, real mode, and production endpoints before database access; see `docs/PILOT-DATA-IMPORT.md`.

Password recovery uses the local PKCE and browser lifecycle contract in [`docs/PASSWORD-RECOVERY.md`](docs/PASSWORD-RECOVERY.md). That document owns the focused rehearsal prerequisites, callback allowlist and causal negative control.

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
| `supabase/canary/`, `supabase/tests/canary/`, `docs/SCHOOL-SCHEMA-CANARY.md` | Non-routed synthetic school-schema canary, deterministic rollback, and isolated export/restore proof. |
| `supabase/pilot/provision-pilot-module-gate.sql` | Explicit synthetic-pilot containment. |
| `supabase/tests/` | Database and backup/restore validation. |
| `docs/PILOT-DATA-IMPORT.md`, `app/scripts/pilot-import-proof.ts`, `app/scripts/run-pilot-import-proof-e2e.sh` | Governed CSV contract, proof-only import runner, retention, rollback, fingerprints, and isolated PostgreSQL receipt. |
| `supabase/seed-demo/` | Deterministic demo dataset, reset runner, validation (issue #23). |
| `DEMO.md` | Demo sandbox runbook, local reset command, environment contract and safety boundaries. |
| `app/lib/demo-sandbox/` | Demo sandbox mode guards (signup + destructive actions). |
| `app/content/`, `app/lib/blog-posts.ts`, `app/public/brand/`, `app/app/icon.png`, `app/app/apple-icon.png`, `app/app/favicon.ico`, `app/app/opengraph-image.jpg` | Canonical public articles, social images, and raster brand assets preserved or derived from the former marketing repository. |

## Demo sandbox (issue #23)

- The public demo sandbox ships code and reproducible configuration only; provisioning (Supabase/Vercel/DNS projects) is external and documented in `DEMO.md`.
- The demo seed is deterministic: static entities use a fixed anchor timestamp and attendance is generated for a 20-school-day window ending at the reset date (seeded PRNG, fixed 70% alert case). `app/scripts/demo-reset.sh`, `pnpm demo:reset-check` and `supabase/seed-demo/verify-sql.sh` prove the local reset path and repeatability. The public scheduled reset remains absent. The 2026-08-10 audit recorded drift; the dated [runtime/validation receipt](data/educa-node-runtime-promote-final/report.md) and [2026-08-16 promotion receipt](docs/deployments/2026-08-16-educa-demo-promotion.md) belong to their recorded releases, not today's `dev`. A future shared reset still needs `sandbox-ar` approval and its own convergence receipt.
- Demo sandbox mode (`NEXT_PUBLIC_DEMO_SANDBOX=true`) blocks signup (no UI, no INSERT grant/policy on `users` for authenticated, project setting in `DEMO.md`) and destructive actions (schema `REVOKE DELETE`, middleware + route guards, hidden UI deletes).
- The demo database runs canonical migrations only - it never applies `supabase/pilot/provision-pilot-module-gate.sql`, so NIS/Bolsa Familia seed fields remain allowed.

## Key decisions and constraints

- **Dependency pins (security/typecheck contract):** `app/package.json` carries a `pnpm.overrides` block that pins `@supabase/supabase-js` to `2.90.1` and `tar`, `uuid`, `postcss@8.4.31`, `sharp`, and `ws@8.19.0` to security-patched versions. Do not remove these pins casually: supabase-js 2.111.0 breaks `pnpm typecheck` with ~12 `RejectExcessProperties` errors in `lib/api/*` and attendance/diary modules, and the other pins close confirmed advisories that upstream manifests still declare as vulnerable. Regenerate the lockfile only with `pnpm 9` (CI version) and, for transitive-only refreshes, use `pnpm update <pkg> --save=false` (plain `pnpm update` rewrites unrelated package.json ranges). Local Node 26 requires `npm_config_engine_strict=false` on installs because `@vercel/python-analysis` (via `vercel`) only supports Node `<=24`.

- The product application and canonical public entry now live together in this repository. The former `shishiv/educa-site` repository remains untouched for rollback/history; new public-site work belongs here.
- School isolation depends on Supabase RLS. Keep role checks, school scoping, and audit behavior intact when changing data access.
- Attendance is designed to be immutable and time-locked. Treat changes to `app/lib/services/attendance-*` and related migrations as compliance-sensitive.
- Attendance uses `/dashboard/turmas/[id]/chamada` and `sessoes_aula` as its canonical flow. A turma has one titular professor in the pilot; discipline and assignment-history controls are not part of this model. Server actions enforce actor/role/school/session ownership through `app/lib/services/attendance-auth.ts` (issue #30). Never trust client-supplied `professor_id`/`escola_id`; resolve the actor from the server session. Live regression harness: `app/tests/live/attendance-auth.live.test.ts` (needs `EDUCA_LIVE_SUPABASE=1` and a provisioned local stack). The V1 reopen contract lives in `supabase/migrations/20260812000000_attendance_reopen_workflow.sql`, `app/lib/services/attendance-reopen.ts`, and the attendance reopen database/browser tests: only the titular teacher requests, and only a director of the same school decides.
- An attendance correction window is the bounded editing period granted when the school's director approves the titular teacher's reopening request. The approval captures its deadline using the database's seeded default or per-school override; later configuration changes do not extend an existing approval. The captured deadline takes precedence over the ordinary day/cutoff, and expiry blocks correction writes and teacher/director closure even while the session remains open. Closing inside the window restores the immutable hash and lock. Historical approvals without a captured deadline receive no retroactive window; actor, session, school, reason, decision and corrected records remain audited.
- `frequencia` is canonical per `(sessao_id, matricula_id)`. The session supplies and protects `data_aula`; multiple sessions on one class-day preserve separate history. Migration `20260803095753_educa_attendance_canonical_flow.sql` removes the older day-level conflict target and enforces the session-level unique index.
- The demo sandbox persona is a secretariat-level admin (`tipo_usuario = 'admin'`, `escola_id = NULL`). Create flows (alunos, turmas, responsaveis) resolve the target school from the UI escola-context selector; the admin must select a school first. Do not assign the demo admin to a school - the multi-school view is the intended demo differentiator. See `DEMO.md` for the demoable flow list.
- `use-compliance-warnings.ts` filters active enrolments with `.eq('situacao', 'ativa')` (`matriculas` has no `ativo` column; the column name is `situacao`).
- The general attendance alert bands in `app/lib/attendance/attendance-policy.ts` retain the municipal reference of 80 and preventive margin of 85. They do not determine Bolsa Família eligibility. General alert reads use `app/lib/api/canonical-attendance-facts.ts`; benefit-specific legal floors and municipal margins belong to the separately authorized conditionality read model.
- `anos_letivos` stores each school's dated academic-year records. The adjustable product default is the current calendar year from January 1 through December 31, without asserting a legal or pedagogical calendar. Migration backfills only a missing current year for existing schools, and later years are separate records so prior years remain unchanged. Its persisted `periodos` default is empty: only the school's director configures pedagogical period names/dates. Civil-month/custom reporting and drafts remain usable without them; new narrative finalization requires a configured semester and at least one eligible Vivência. Finalized reports use their immutable database snapshot, never a later live preview.
- Bolsa Família and NIS reads are denied on `alunos` for browser roles and exposed only through policy-checked RPCs. `configs.bolsa_familia_visible_roles` stores the seeded database default and per-school overrides; teachers and guardians cannot be added. Coordination and social-assistance duties use existing administrative roles rather than new role values.
- The former CI contract ran typecheck, lint, unit tests, and a full E2E suite against disposable local Supabase. No hosted workflow is currently tracked. Run build, database validation, and applicable local Supabase pilot checks before proposing operational or database changes.
- GitHub's default branch is `dev`: ordinary work starts from and targets `dev`. `main` is production-only; do not push or merge ordinary work there. Promote `dev` to `main` only through a separate explicit production-promotion action.
- Grades remain inaccessible to browser roles in the canonical schema: `notas` has RLS enabled and no policies after `20260810220000_governed_pilot_security_hardening.sql`. The general E2E verifies that denial in `app/tests/e2e/grades/access-boundary.spec.ts`. Positive grade-entry/report-card contracts remain intact under `app/playwright.grades-positive.config.ts`, outside the general gate; collecting them is not a passing execution. Reactivating access requires separate authorization (decision `grades-general-contract`, 2026-09-09).
- Diary-component and descriptive-report suites participate in both `tsconfig.typecheck.json` and `vitest.config.mts`. Their component tests prove DOM, form validation and callbacks; they do not replace browser, SQL, persistence, or pilot lifecycle checks.
- Historical and extended documentation is archived outside the repository at `/home/shiv/docs/EDUCA/`, preserving original repository-relative paths. `MOVED_FROM_REPO.md` there records the archive manifest and source commit.
