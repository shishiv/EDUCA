# EDUCA Public Demo Sandbox - Runbook (issue #23)

The public demo sandbox is a shared, synthetic-only instance of EDUCA
(`demo.educa.app.br`) with a fixed login and deterministic seed data. Decision
D7 (2026-08-10) defines the reset as a versioned local script, not a hosted
workflow. This document is the runbook for local resets, offline verification
and provisioning the instance later. **This repository only ships code and
reproducible configuration - it never creates Vercel/Supabase/DNS resources
and never publishes anything.**

## Operational status: 2026-08-10

The public URL `educa-demo.vercel.app` responds healthy, but this audit found
an old deployment and database drift: the dashboard showed 51 students and 9
classes, and the Bolsa Família report showed zero students. The repository has
no `.github/workflows/` files, and D7 explicitly keeps reset automation local.
The `sandbox-ar` decision still controls any operation against the shared
public database. This runbook describes the target and local proof, not proof
that the public demo is ready.

Acceptance criteria from issue #23:

| Criterion | Where it is delivered |
| --- | --- |
| Fixed login `demo@educa.app.br` / `Demo@2026` | `supabase/seed-demo/seed-demo.ts` (env `DEMO_EMAIL`/`DEMO_PASSWORD`) |
| 3 escolas, 5 turmas, 10 professores, 50 alunos | `supabase/seed-demo/seed-demo.sql` (static) + generated attendance |
| Chamadas recentes com frequência variada | `attendance-generator.ts`: 20 school days ending at the reset date |
| Conteúdo canônico para relatórios | `attendance-generator.ts`: one `conteudo_aula` row per closed session, across five disciplines |
| Incluindo < 80% para demonstrar alerta Bolsa Família | matricula `...0401` (aluno "Miguel") fixed at 70% |
| Fonte sintetica de certificado verificavel | `certificate-generator.ts`: matricula, sessoes fechadas, presenca P, carga derivada, emissor e hash |
| Reset versionado local | `app/scripts/demo-reset.sh`, invoked by `pnpm --dir app demo:reset` |
| Signup desabilitado | Supabase project setting (provisioning) + code guards + schema grants |

## Architecture

| Asset | Role |
| --- | --- |
| `supabase/seed-demo/seed-demo.sql` | Static deterministic core: escolas, users, turmas, disciplinas, responsaveis, alunos, vinculos, matriculas, notas, calendario, configs, synthetic markers. No `now()`; all `created_at` anchored at `2026-02-03 08:00:00-03`. |
| `supabase/seed-demo/attendance-generator.ts` | Pure deterministic generator of `sessoes_aula` + `conteudo_aula` + `frequencia` for a moving 20-school-day window ending at the reset date. Every session is closed and receives complete content for its discipline. Seeded PRNG per (matricula, date); fixed 70% alert case; FK-safe IDs. |
| `supabase/seed-demo/certificate-generator.ts` | Pure deterministic certificate-source generator. It selects only the synthetic enrollment's `P` attendance sessions, then the database derives workload, fingerprint, verification code, and hash. It creates no certificate layout. |
| `supabase/seed-demo/seed-demo.ts` | Reset + seed runner (`pnpm seed:demo`): one transaction (TRUNCATE ... CASCADE + static seed + generated attendance + generated certificate source + marker configs) via direct Postgres (`SUPABASE_DEMO_DB_URL`), then syncs the demo auth user via Admin API. |
| `supabase/seed-demo/validate-demo.ts` | `pnpm demo:validate`: proves counts, closed-session content per discipline, the fixed canonical-content fingerprint, certificate source/receipt, relationships, synthetic-only markers, the < 80% alert case, generator-exact per-student attendance, and prints md5 fingerprints. |
| `supabase/seed-demo/verify-sql.sh` | Offline validation on a disposable raw PostgreSQL cluster (no Docker/Supabase): applies canonical migrations (demo shape, no pilot module gate), the seed, generated attendance and certificate source, structural asserts, and a same-anchor repeatability fingerprint check. |
| `app/scripts/demo-reset.sh` | Versioned local wrapper: checks all three `SUPABASE_DEMO_*` variables without printing values, then runs `pnpm seed:demo` and `pnpm demo:validate`. |
| `.github/workflows/` | Intentionally absent. D7 prohibits restoring GitHub Actions for this reset. |
| `app/lib/demo-sandbox/demo-sandbox.ts` + middleware + guarded routes | Demo-sandbox mode guards: blocks admin data-management APIs, hides destructive UI actions, shows the demo banner. |

## Failure receipts

The three historical scheduled runs separate configuration, seed, and validation evidence. The former workflow described by those receipts is no longer tracked; D7 replaces it with the local wrapper:

| Run | Receipt | Classification and correction |
| --- | --- | --- |
| `29185065623` (#1) | The old `Demo Reset` workflow passed only `SUPABASE_DEMO_URL` and `SUPABASE_DEMO_SERVICE_KEY`. The run log is no longer retained. | Workflow configuration gap: it did not provide the direct database connection required by the canonical seed. The last workflow version passed all three `SUPABASE_DEMO_*` secrets. |
| `29678982042` (#2) | `Cannot find module '@supabase/supabase-js'` from `supabase/seed-demo/seed-demo.ts`. | Seed failure before database access: the script resolved packages from outside `app/`. The seed now anchors runtime package resolution at `app/package.json`. |
| `30739795664` (#3) | The three demo environment variables were empty in the runner, and the seed stopped with its required-variable error. | Environment failure before database access: the former runner checked secret presence without printing values. |

No run reached `demo:validate`: the seed step failed first. Local Supabase and disposable PostgreSQL checks now cover the validation phase.

## Demo persona

The demo user is a secretariat-level **admin** with `escola_id = NULL` in the `users` table.
This is the intended persona: an admin who can see and manage all three seeded schools.

| Aspect | Detail |
| --- | --- |
| Email / password | `demo@educa.app.br` / `Demo@2026` |
| Role | `admin` |
| `escola_id` | `NULL` (multi-school secretariat) |
| School context | Admin must select a school from the sidebar selector before school-scoped actions |
| Read access | All schools, turmas, alunos, responsaveis, attendance - no selector needed |
| Write access (create flows) | Selector must be set first: escola_id is resolved from the UI context |

The `escola_id = NULL` pattern is correct. Do **not** assign the demo admin to a school;
the multi-school view is the demoable differentiator.

## Demoable flows (as of this change)

The public demo uses an explicit capability allowlist in
`app/lib/demo-sandbox/demo-sandbox.ts`. The allowlist only changes which product
modules the pilot route guard exposes. It does not change authentication, role
checks, school selection, RLS or audit.

| Capability | UI routes | API routes | Result |
| --- | --- | --- | --- |
| Dashboard and search | `/dashboard`, `/dashboard/perfil` | `/api/dashboard/alerts`, `/api/attendance/trends`, `/api/chamada/pendentes`, `/api/compliance/warnings`, `/api/search`, `/api/turmas/minhas` | Read synthetic metrics and alerts |
| Schools | `/dashboard/escolas`, `/dashboard/escolas/nova`, `/dashboard/escolas/[id]` | Supabase client queries with RLS | Multi-school admin view; school context remains required for school-scoped writes |
| Users | `/dashboard/usuarios`, `/dashboard/usuarios/[id]` | Existing typed Supabase queries, `/api/demo/audit` | Read and manage existing synthetic profiles; status toggle and invitation return a simulated-success no-op |
| Students | `/dashboard/alunos`, `/dashboard/alunos/novo`, `/dashboard/alunos/[id]` | Existing typed Supabase queries | Synthetic CRUD with the selected school context |
| Classes and assignments | `/dashboard/turmas`, `/dashboard/turmas/nova`, `/dashboard/turmas/[id]`, `/dashboard/atribuicoes` | Existing typed Supabase queries | Synthetic class CRUD and teacher assignment |
| Enrollments and guardians | `/dashboard/matriculas`, `/dashboard/matriculas/nova`, `/dashboard/responsaveis` | Existing typed Supabase queries | Synthetic enrollment and guardian CRUD |
| Attendance | `/dashboard/turmas`, `/dashboard/turmas/[id]/chamada` | `/api/sessoes/aula/abrir`, `/api/sessoes/aula/[id]/frequencia/batch` | Professor and diretor write; admin and secretaria view only; server-side role and school checks remain active |
| Diary | `/dashboard/diario`, `/diario`, `/dashboard/alunos/[id]/diario` | `/api/vivencias` | Class diary is available; the legacy `vivencias` endpoint remains a documented 501 stub |
| Grades and report cards | `/dashboard/notas`, `/dashboard/alunos/[id]/boletim` | `/api/grades/*` and typed Supabase queries | Synthetic grades and averages only |
| Reports | `/dashboard/relatorios`, `/relatorios/frequencia`, `/relatorios/bolsa-familia`, `/relatorios/conteudo` | `/api/reports/*` and typed Supabase queries | Browser reports use synthetic rows; no government export is enabled |
| Calendar and internal settings | `/dashboard/calendario`, `/dashboard/configuracoes`, `/dashboard/flags` | `/api/configs/*` | Internal synthetic configuration only |
| Audit and metrics | No standalone page | `/api/pilot/audit`, `/api/pilot/metrics` | Internal audit and pilot metrics remain available |
| Local WhatsApp simulation | No standalone page | `/api/whatsapp/notify`, `/api/whatsapp/opt-in` | Local fake only; no Meta request is possible in demo mode |

The route inventory is intentionally explicit. A new route is not demoable until
its capability is named and its external effects are reviewed.

## Blocked effects

Synthetic imports, Auth user invitations and first-access password mutation are
no longer hard-blocked: they return a simulated-success `2xx` no-op (see
[Demo mode guards](#demo-mode-guards-explicit-code-not-prose)). The effects below
stay fully blocked.

| Effect | Blocked paths or boundary | Expected result |
| --- | --- | --- |
| Educacenso and government integration | `/api/educacenso*`, `/api/government*`, `/api/integracoes*`, `/api/censo*`, `/api/inep*` | `403`; no external request |
| Real PII export | `/api/export*`, `/api/exports*`, `/api/reports/educacenso*`, `/api/reports/export*` | `403`; browser reports remain synthetic-only |
| Real WhatsApp integration | `/api/whatsapp/webhook*` and the gateway factory | `403` for webhook; local fake for notification simulation |
| External telemetry | Grafana collector | Buffer is discarded in demo mode |

## Decision traceability

The preserved work file `educa-demoable-unlanded-2026-08-02.patch` was read and
not applied wholesale. Its useful principle is implemented here: the demo may
bypass a product-scope restriction only for a named synthetic capability. Auth,
role checks, school isolation, RLS, audit and external-effect guards stay active.

> **Nota:** Creating users (`/dashboard/usuarios/novo`) calls `/api/pilot/invitations`.
> In demo mode the endpoint returns a simulated-success `2xx` no-op: it mutates no
> Auth user and writes only the redacted `demo_action_intercepted` audit. This is
> correct behaviour, not a bug.

## Environment and local reset

Decision D7 uses the versioned local wrapper
`app/scripts/demo-reset.sh`. The wrapper fails closed before starting either
command when any required variable is absent. It never falls back to generic
Supabase variables and never prints secret values:

```bash
export SUPABASE_DEMO_URL=https://<ref>.supabase.co
export SUPABASE_DEMO_SERVICE_KEY=<service role key>
export SUPABASE_DEMO_DB_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
```

Run the reset from the repository root or from any directory with the checked
out repository:

```bash
pnpm --dir app demo:reset
```

The command runs `pnpm seed:demo` first, then `pnpm demo:validate`. To pin the
attendance window, pass the seed option through the package script or call the
script directly:

```bash
pnpm --dir app demo:reset -- --date 2026-08-10
# equivalent:
bash app/scripts/demo-reset.sh --date 2026-08-10
```

Optional: `SEED_ANCHOR_DATE=YYYY-MM-DD` pins the attendance window when no
`--date` is supplied. Keep the three required values in an untracked shell
environment or a local secret manager. Never commit them or put them in a
workflow file.

## Local verification (no Docker, no secrets)

Fastest proof that the seed matches the canonical schema:

```bash
pnpm --dir app demo:verify-sql          # raw PG cluster, seed + asserts + repeatability
```

It spins a disposable `initdb` cluster, applies `supabase/tests/database/bootstrap.sql`
plus every canonical migration (without `provision-pilot-module-gate.sql`, exactly the
demo database shape), seeds, asserts, and proves two same-anchor resets produce
identical md5 fingerprints.

Unit tests:

```bash
cd app && pnpm test          # includes supabase/seed-demo generator tests + demo-sandbox guard tests
```

The isolated descriptive-report rehearsal proves the real browser download, PDF header,
responsive report surface and the deliberate-break response after deleting canonical content:

```bash
pnpm --dir app test:e2e:pilot:descriptive
```

## Live verification against a local Supabase stack (optional, Docker)

```bash
pnpm --dir app exec supabase --workdir . start
pnpm --dir app exec supabase --workdir . db reset
export SUPABASE_DEMO_URL=http://127.0.0.1:54321
export SUPABASE_DEMO_SERVICE_KEY=<local service_role key>   # from supabase status
export SUPABASE_DEMO_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
pnpm --dir app demo:reset
```

The fixed-anchor reset rehearsal proves the reset path is idempotent on a live
database (same anchor twice -> identical dataset):

```bash
pnpm --dir app demo:reset-check
```

## Provisioning the demo instance (later, outside this repository)

1. **Supabase** - create the dedicated `educa-demo` project (free tier). Run
   migrations: `pnpm --dir app exec supabase --workdir . link --project-ref <ref>`
   then `pnpm --dir app exec supabase --workdir . db push`.
2. **Disable signup (hard requirement)** - in the Supabase dashboard:
   `Authentication > Sign In / Providers > Email > "Allow new users to sign up" = OFF`.
   The app has no signup UI. Migration
   `20260805093305_demo_users_browser_write_boundary.sql` explicitly revokes
   INSERT, UPDATE and DELETE on `public.users` from `authenticated` and removes
   the browser `admin_full_access` policy; Auth/profile maintenance stays on
   existing server-side paths. The project-level switch remains the
   authoritative control for the Auth API.
3. **Local reset environment** - export
   `SUPABASE_DEMO_URL`, `SUPABASE_DEMO_SERVICE_KEY` and `SUPABASE_DEMO_DB_URL`
   only in the operator shell or local secret manager. D7 prohibits GitHub
   Actions for this reset, and no secret belongs in the repository.
4. **Vercel** - create the demo project from the repository `app/` directory
   (framework Next.js; `app/vercel.json` already sets the build). Add the
   environment variables from `app/.env.demo.example`, including
   `NEXT_PUBLIC_DEMO_SANDBOX=true` and the pilot flags.
5. **First controlled reset, after approval** - after `sandbox-ar` approval,
   run `pnpm --dir app demo:reset` with the three demo variables and capture
   before/after validation receipts. Do not run a reset against the shared demo
   from an unapproved shell.
6. **DNS** - point `demo.educa.app.br` at the Vercel project (external).

## Demo mode guards (explicit code, not prose)

- `NEXT_PUBLIC_DEMO_SANDBOX=true` enables `app/lib/demo-sandbox/demo-sandbox.ts`.
- Middleware uses the named capability allowlist. It does not skip auth or
  route protection for the demo.
- Synthetic imports, Auth user invitations and first-access password mutation
  return a simulated-success `2xx` no-op that writes only the redacted
  `demo_action_intercepted` audit and mutates no external or business tables.
- Educacenso, government integrations, real PII export paths and the WhatsApp
  webhook are blocked as external effects.
- The WhatsApp factory forces the local fake in demo mode, even with complete
  Meta credentials. No request can reach the Meta adapter from this instance.
- Grafana Cloud telemetry is discarded in demo mode. Synthetic activity does
  not leave the sandbox through the monitoring collector.
- The import validator accepts only `SYNTHETIC-EDUCA-PILOT`; the seed validator
  accepts only `SYNTHETIC-EDUCA-DEMO` in `configs.demo_synthetic_marker`.
- UI: delete actions return early with a message and the calendar delete
  affordance is hidden; a banner identifies the sandbox in the dashboard.

## Boundaries (never cross)

- **No real data**: identifiers are fake (invalid CPFs, sequential NIS, fake
  phones) and guardian contacts use the reserved `example.com` domain; staff
  emails use `@educa.app.br`. Validation asserts the markers.
- **No deploy**: this repository only ships code and configuration.
- The demo database runs canonical migrations only (no
  `provision-pilot-module-gate.sql`), so NIS/Bolsa Família seed fields remain
  allowed; RLS still only exposes the pilot-core tables to the demo account.
- Receipts: the 3/5/10/50 seed spec, the reset contract, and the < 80% alert
  threshold all come from issue #23; the 20-school-day window and the volume
  (100 sessoes + 1000 frequencia) are the measured seed size documented in
  `attendance-generator.ts`.

## Troubleshooting

- `DEMO_RESET_ENV_MISSING` - the local wrapper stopped before any database
  command because one or more `SUPABASE_DEMO_*` variables are empty; export all
  three values and run it again.
- `ERRO: faltam variaveis obrigatorias` - the seed runner received incomplete
  demo variables; it never falls back to another Supabase environment.
- Validation fails with a count mismatch - the database was likely changed
  outside the reset; run `pnpm --dir app demo:reset` again (it is idempotent).
- `demo:validate` skips the auth check when `SUPABASE_DEMO_URL`/key are absent -
  expected on the offline harness.
