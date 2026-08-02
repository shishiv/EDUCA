# EDUCA context

## Purpose and current boundary

EDUCA is an MIT-licensed school-management application for Brazilian municipal and small-town school networks. The product covers schools, users, students, guardians, classes, enrolments, teacher assignments, attendance, dashboard views, and reporting surfaces.

The repository currently supports a **synthetic-only municipal pilot foundation**. It does not authorize real student data, municipal deployment, legal approval, or a production-compliance claim. The pilot core is authentication and role-based access, schools, users, students, classes, enrolments, guardians, assignments, attendance, and dashboard. Grades, full diary, Educacenso, Bolsa Família/NIS, health, disability, and race data are disabled by the pilot provisioner.

## Architecture

- `app/` is the Next.js 16 App Router application. It uses React 19, TypeScript, Tailwind/shadcn UI, Supabase SSR clients, and RLS-backed multi-school data access.
- `app/app/` holds routes and route handlers. `app/components/`, `app/lib/`, `app/hooks/`, `app/contexts/`, and `app/types/` contain shared UI, business logic, state, and committed database types.
- `supabase/migrations/` is the canonical ordered schema history. `supabase/config.toml` defines the local Supabase topology.
- `supabase/pilot/provision-pilot-module-gate.sql` is deliberately outside canonical migrations. Synthetic pilot tests apply it explicitly, so ordinary `supabase db push` does not disable modules.
- `supabase/seed-demo/` holds the deterministic demo dataset (issue #23): static seed SQL, `attendance-generator.ts`, reset runner and validation. `.github/workflows/demo-reset.yml` resets the public sandbox weekly; `DEMO.md` is the runbook. `supabase/tests/database/` validates migrations against a temporary raw PostgreSQL cluster. `supabase/tests/pilot/` verifies encrypted portable backup and restore against a local Supabase stack.
- `.github/workflows/ci.yml` is the current CI contract: install from `app/pnpm-lock.yaml`, then typecheck and lint from `app/`.
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
pnpm build               # production build
pnpm start               # serve a production build
pnpm typecheck           # TypeScript, including E2E specs and enabled unit tests
pnpm lint                # ESLint
pnpm test                # enabled Vitest unit tests
pnpm test:e2e            # general Playwright suite
pnpm test:e2e:pilot      # reset local Supabase, provision synthetic pilot, build, and run pilot E2E
pnpm pilot:restore-test  # local synthetic encrypted backup/restore rehearsal
pnpm seed:demo           # synthetic demo seed / reset (public sandbox, issue #23)
pnpm demo:validate       # prove counts, relationships, synthetic markers, alert case
pnpm demo:reset-check    # prove a same-anchor reset is idempotent on a live database
pnpm demo:verify-sql     # offline raw-PG validation of the demo seed (no Docker, no secrets)
pnpm deploy              # safety-gated Vercel production deploy
pnpm deploy:preview      # safety-gated Vercel preview deploy
```

Run database migration validation from the repository root:

```bash
supabase/tests/database/run.sh
```

It needs `initdb`, `pg_ctl`, and `psql` from PostgreSQL 15 or newer. It creates and removes its own temporary cluster. The pilot commands require a running local Supabase stack and refuse an external Supabase endpoint.

## Supabase and data boundaries

`app/types/database.ts` is generated from the local Supabase schema and is required by the application build. Preserve it and regenerate it only through the command above. It intentionally lags the live schema: pilot code casts at the seam (`asPilotRpcClient`, `asWhatsAppClient`).

The canonical migrations retain the full product schema. The pilot-only provisioner revokes high-risk modules and blocks high-risk student fields only during synthetic pilot rehearsal. The pilot accepts synthetic data only, expects the `SYNTHETIC-EDUCA-PILOT` marker during import, and uses `.invalid` identities in its test harness.

`app/scripts/pilot-safety-gate.ts` blocks external deploys while `PILOT_MODE=true`. To authorize real data or external pilot deployment, make a separate reviewed change with named legal and governance approvals. Do not weaken the gate as part of routine feature work.

The backup/restore rehearsal writes generated evidence under ignored `.pilot-evidence/`. It verifies portable CSV data, Auth and Storage representations, policies, grants, views, RPCs, tombstones, and RPO/RTO without modifying its source database.

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
| `.github/workflows/ci.yml` | Hosted CI definition. |
| `supabase/config.toml`, `supabase/migrations/` | Local Supabase configuration and canonical schema evolution. |
| `supabase/pilot/provision-pilot-module-gate.sql` | Explicit synthetic-pilot containment. |
| `supabase/tests/` | Database and backup/restore validation. |
| `supabase/seed-demo/` | Deterministic demo dataset, reset runner, validation (issue #23). |
| `.github/workflows/demo-reset.yml` | Weekly public demo sandbox reset (issue #23). |
| `DEMO.md` | Demo sandbox runbook: local verification and later provisioning. |
| `app/lib/demo-sandbox/` | Demo sandbox mode guards (signup + destructive actions). |
| `docker-compose.yml` | Optional bare local PostgreSQL development service. |

## Demo sandbox (issue #23)

- The public demo sandbox ships code and reproducible configuration only; provisioning (Supabase/Vercel/DNS projects) is external and documented in `DEMO.md`.
- The demo seed is deterministic: static entities use a fixed anchor timestamp and attendance is generated for a 20-school-day window ending at the reset date (seeded PRNG, fixed 70% alert case). `pnpm demo:reset-check` and `supabase/seed-demo/verify-sql.sh` prove repeatable resets.
- Demo sandbox mode (`NEXT_PUBLIC_DEMO_SANDBOX=true`) blocks signup (no UI, no INSERT grant/policy on `users` for authenticated, project setting in `DEMO.md`) and destructive actions (schema `REVOKE DELETE`, middleware + route guards, hidden UI deletes).
- The demo database runs canonical migrations only - it never applies `supabase/pilot/provision-pilot-module-gate.sql`, so NIS/Bolsa Familia seed fields remain allowed.

## Key decisions and constraints

- **Dependency pins (security/typecheck contract):** `app/package.json` carries a `pnpm.overrides` block that pins `@supabase/supabase-js` to `2.90.1` and `tar`, `uuid`, `postcss@8.4.31`, `sharp`, and `ws@8.19.0` to security-patched versions. Do not remove these pins casually: supabase-js 2.111.0 breaks `pnpm typecheck` with ~12 `RejectExcessProperties` errors in `lib/api/*` and attendance/diary modules, and the other pins close confirmed advisories that upstream manifests still declare as vulnerable. Regenerate the lockfile only with `pnpm 9` (CI version) and, for transitive-only refreshes, use `pnpm update <pkg> --save=false` (plain `pnpm update` rewrites unrelated package.json ranges). Local Node 26 requires `npm_config_engine_strict=false` on installs because `@vercel/python-analysis` (via `vercel`) only supports Node `<=24`.

- Product application and marketing site remain separate repositories. This repository owns the product, database assets, and operational code.
- School isolation depends on Supabase RLS. Keep role checks, school scoping, and audit behavior intact when changing data access.
- Attendance is designed to be immutable and time-locked. Treat changes to `app/lib/services/attendance-*` and related migrations as compliance-sensitive.
- Attendance server actions enforce actor/role/school/session ownership through the single interface in `app/lib/services/attendance-auth.ts` (issue #30). Never trust client-supplied `professor_id`/`escola_id`; resolve the actor from the server session. Live regression harness: `app/tests/live/attendance-auth.live.test.ts` (needs `EDUCA_LIVE_SUPABASE=1` and a provisioned local stack).
- `frequencia` has a unique index on `(matricula_id, data_aula)` (migration `20260801000000`): one attendance row per student per class-day. The mark toggle upsert depends on it.
- The demo sandbox persona is a secretariat-level admin (`tipo_usuario = 'admin'`, `escola_id = NULL`). Create flows (alunos, turmas, responsaveis) resolve the target school from the UI escola-context selector; the admin must select a school first. Do not assign the demo admin to a school - the multi-school view is the intended demo differentiator. See `DEMO.md` for the demoable flow list.
- `use-compliance-warnings.ts` filters active enrolments with `.eq('situacao', 'ativa')` (`matriculas` has no `ativo` column; the column name is `situacao`).
- When `NEXT_PUBLIC_DEMO_SANDBOX=true` the pilot route gate (`PILOT_DISABLED_ROUTE_PREFIXES`) is bypassed in the middleware, sidebar, and mobile nav. The demo DB never applies `provision-pilot-module-gate.sql`; all data is synthetic; every module is demoable.
- CI currently runs typecheck and lint only. Run unit tests, build, database validation, and applicable local Supabase pilot checks before proposing operational or database changes.
- `tsconfig.typecheck.json` and `vitest.config.mts` exclude diary and descriptive-report test directories because those modules are outside the confirmed synthetic pilot. Those files remain for a future reactivation gate and do not prove pilot-core readiness.
- Historical and extended documentation is archived outside the repository at `/home/shiv/docs/EDUCA/`, preserving original repository-relative paths. `MOVED_FROM_REPO.md` there records the archive manifest and source commit.
