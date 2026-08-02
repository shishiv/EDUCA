# EDUCA Public Demo Sandbox - Runbook (issue #23)

The public demo sandbox is a shared, synthetic-only instance of EDUCA
(`demo.educa.app.br`) with a fixed login, deterministic seed data and a weekly
automatic reset. This document is the runbook for local verification and for
provisioning the instance later. **This repository only ships code and
reproducible configuration - it never creates Vercel/Supabase/DNS resources
and never publishes anything.**

Acceptance criteria from issue #23:

| Criterion | Where it is delivered |
| --- | --- |
| Fixed login `demo@educa.app.br` / `Demo@2026` | `supabase/seed-demo/seed-demo.ts` (env `DEMO_EMAIL`/`DEMO_PASSWORD`) |
| 3 escolas, 5 turmas, 10 professores, 50 alunos | `supabase/seed-demo/seed-demo.sql` (static) + generated attendance |
| Chamadas recentes com frequência variada | `attendance-generator.ts`: 20 school days ending at the reset date |
| Incluindo < 80% para demonstrar alerta Bolsa Família | matricula `...0401` (aluno "Miguel") fixed at 70% |
| Auto-reset semanal via GitHub Actions | `.github/workflows/demo-reset.yml` (Sunday 03:00 BRT) |
| Signup desabilitado | Supabase project setting (provisioning) + code guards + schema grants |

## Architecture

| Asset | Role |
| --- | --- |
| `supabase/seed-demo/seed-demo.sql` | Static deterministic core: escolas, users, turmas, disciplinas, responsaveis, alunos, vinculos, matriculas, notas, calendario, configs, synthetic markers. No `now()`; all `created_at` anchored at `2026-02-03 08:00:00-03`. |
| `supabase/seed-demo/attendance-generator.ts` | Pure deterministic generator of `aulas_abertas` + `frequencia` for a moving 20-school-day window ending at the reset date. Seeded PRNG per (matricula, date); fixed 70% alert case; FK-safe IDs. |
| `supabase/seed-demo/seed-demo.ts` | Reset + seed runner (`pnpm seed:demo`): one transaction (TRUNCATE ... CASCADE + static seed + generated attendance + marker configs) via direct Postgres (`SUPABASE_DEMO_DB_URL`), then syncs the demo auth user via Admin API. |
| `supabase/seed-demo/validate-demo.ts` | `pnpm demo:validate`: proves counts, relationships, synthetic-only markers, the < 80% alert case, generator-exact per-student attendance, and prints md5 fingerprints. |
| `supabase/seed-demo/verify-sql.sh` | Offline validation on a disposable raw PostgreSQL cluster (no Docker/Supabase): applies canonical migrations (demo shape, no pilot module gate), the seed, generated attendance, structural asserts, and a same-anchor repeatability fingerprint check. |
| `.github/workflows/demo-reset.yml` | Narrow weekly reset: `pnpm seed:demo` + `pnpm demo:validate` against the demo project. |
| `app/lib/demo-sandbox/demo-sandbox.ts` + middleware + guarded routes | Demo-sandbox mode guards: blocks admin data-management APIs, hides destructive UI actions, shows the demo banner. |

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

| Flow | Path | Notes |
| --- | --- | --- |
| View dashboard, alerts, frequency stats | `/dashboard` | Works without school selector |
| Browse all schools | `/dashboard/escolas` | Multi-school read |
| Browse turmas in a school | `/dashboard/turmas` | Select school first |
| View turma detail + student list | `/dashboard/turmas/[id]` | |
| View chamada (read-only for admin) | `/dashboard/turmas/[id]/chamada` | Editing is teacher-only by design |
| Atribuicoes (assign teacher to class) | `/dashboard/atribuicoes` | Fixed: was crashing |
| **Nova turma** | `/dashboard/turmas/nova` | Fixed: was a stub; now writes to DB |
| **Novo aluno** | `/dashboard/alunos/novo` | Fixed: now passes escola_id from context |
| **Novo responsavel** | `/dashboard/responsaveis/novo` | Fixed: now passes escola_id from context |
| Nova matricula | `/dashboard/matriculas/nova` | Reads real DB; insert works |
| Sessoes de aula (view) | `/dashboard/sessoes` | |
| Open / close session via API | `/api/sessoes/aula/abrir` | Admin role allowed |
| Mark attendance via API | `/api/sessoes/aula/[id]/frequencia` | Admin role allowed |
| Compliance warnings | Dashboard | Fixed: was 400 on matriculas.ativo |
| Grading, Educacenso, Bolsa Familia, health | Various | Out of pilot scope - see CONTEXT.md |

> **Nota:** Creating users (`/dashboard/usuarios/novo`) calls `/api/pilot/invitations` which
> is blocked in demo-sandbox mode by design (it would invite real auth users).
> This is correct behaviour, not a bug.

## Environment (demo runner)

`pnpm seed:demo` and `pnpm demo:validate` require, explicitly (no silent
fallback - a fallback could wipe a non-demo database):

```bash
export SUPABASE_DEMO_URL=https://<ref>.supabase.co
export SUPABASE_DEMO_SERVICE_KEY=<service role key>
export SUPABASE_DEMO_DB_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
```

Optional: `SEED_ANCHOR_DATE=YYYY-MM-DD` (or `--date YYYY-MM-DD`) pins the
attendance window; default is today in America/Sao_Paulo.

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

## Live verification against a local Supabase stack (optional, Docker)

```bash
pnpm --dir app exec supabase --workdir . start
pnpm --dir app exec supabase --workdir . db reset
export SUPABASE_DEMO_URL=http://127.0.0.1:54321
export SUPABASE_DEMO_SERVICE_KEY=<local service_role key>   # from supabase status
export SUPABASE_DEMO_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
pnpm --dir app seed:demo
pnpm --dir app demo:validate
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
   The app has no signup UI, the schema grants no INSERT on `users` to
   authenticated, and the middleware blocks admin data-management APIs - but
   the project-level switch is the authoritative control for the Auth API.
3. **Secrets** - configure GitHub Actions secrets (Settings > Secrets and
   variables > Actions): `SUPABASE_DEMO_URL`, `SUPABASE_DEMO_SERVICE_KEY`,
   `SUPABASE_DEMO_DB_URL` (values from `.env.demo.example`).
4. **Vercel** - create the demo project from the repository `app/` directory
   (framework Next.js; `app/vercel.json` already sets the build). Add the
   environment variables from `app/.env.demo.example`, including
   `NEXT_PUBLIC_DEMO_SANDBOX=true` and the pilot flags.
5. **First seed** - run the workflow manually (Actions > Demo Sandbox Weekly
   Reset > Run workflow), or run `pnpm seed:demo` locally with the demo env.
6. **DNS** - point `demo.educa.app.br` at the Vercel project (external).

## Demo mode guards (explicit code, not prose)

- `NEXT_PUBLIC_DEMO_SANDBOX=true` enables `app/lib/demo-sandbox/demo-sandbox.ts`.
- Middleware returns 403 for `/api/pilot/imports*` and `/api/pilot/invitations*`.
- The same guard is duplicated at the top of those route handlers (defense in depth).
- The canonical schema already `REVOKE DELETE ... FROM authenticated` and grants
  no INSERT on `users` - destructive actions are refused at the database seam.
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
- Receipts: the 3/5/10/50 seed spec, the weekly schedule, and the < 80% alert
  threshold all come from issue #23; the 20-school-day window and the volume
  (100 aulas + 1000 frequencia) are the measured seed size documented in
  `attendance-generator.ts`.

## Troubleshooting

- `ERRO: faltam variaveis obrigatorias` - the demo runner never falls back to
  other Supabase variables; set the three `SUPABASE_DEMO_*` vars.
- Validation fails with a count mismatch - the database was likely changed
  outside the reset; run `pnpm seed:demo` again (it is idempotent).
- `demo:validate` skips the auth check when `SUPABASE_DEMO_URL`/key are absent -
  expected on the offline harness.
