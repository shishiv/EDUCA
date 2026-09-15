# EDUCA E2E coverage matrix

This matrix is the tracked catalog for Playwright cases under `tests/e2e`.
Routes are derived from `app/**/page.tsx`, the desktop/mobile navigation components,
and `lib/route-policy.ts`, which is the authority for route roles and redirects.

`Catalogado` means that a route and intended assertion are represented by a spec.
It does not mean that the current source passed a recent browser run. Runtime
results are recorded separately below.

## Current catalog boundary

Reviewed on 2026-09-15 against `dev` `063e0e97`, by source inspection only.
The [evidence index by SHA/manifest](../../../CONTEXT.md#operational-catalog-and-evidence)
links the delivered quality reconciliation and later focused Vivências/periods
proof. Those are different runs, not replacements for General9. The
[R3 runbook reconciliation](../../../docs/R3-PILOT-E2E-FOLLOW-UP.md) is already delivered.

`grades/access-boundary.spec.ts` is the general-suite contract for denied browser
access to `notas`. Positive entry/report-card cases remain in
[`playwright.grades-positive.config.ts`](../../playwright.grades-positive.config.ts),
outside that gate; collection does not establish a passing execution.

## Historical execution receipts: 2026-09-08 snapshot

| Scope | State | Receipt and limit |
|---|---|---|
| General Playwright suite | **RED, diagnostic only** | General9 selected 239 cases: 234 passed, 3 failed, and 2 dependent serial cases were not executed. Cleanup passed. This is not an accepted general-suite result. |
| R3 aggregate in that snapshot | **PASS for the Aggregate9 snapshot: 36/36** | Legacy 26, capacity 3, descriptive 4 and security 3 passed; cleanup passed. A later shared manifest-helper extraction still awaits validation after the test-safe pressure hold. |
| Canonical R1 | **PASS, bounded** | Two canonical browser tests and cleanup passed in the preserved R1 receipt. |
| Database contracts | **PASS, bounded** | The full SQL chain passed, including C04 finalization and both concurrent source-link orderings. |
| Reports hub | **PASS, bounded** | Four hub cases plus authenticated setup passed. They prove only the three destination cards and navigation. |
| Public and service worker | **PASS, bounded: 20/20** | `public-sw-lifecycle-final-20260908` passed 20 cases. A later hook-memoization change has focal verification only, so this receipt does not prove an identical current source snapshot. |
| Unit suite | **PASS: 124 files / 1316 tests** | The ordinary unit selection passed. Twenty live tests remain a separate opt-in contract and are not included in this count. |
| Code census | **PASS: 623 files, 16 rules, 0 diagnostics** | Includes the custom plugin rule and its executable tests. Only 22 byte-identical vendor files are excluded; one thread. |

The following diagnosis describes the 2026-09-08 snapshot, not current pending work:
General9 remains diagnostic evidence only. Two failures are the grade-entry and
report-card checks for the seeded `8.4` grade; the missing authenticated read is
awaiting the governance decision for the canonical `notas` policies. Their two
serial dependents did not execute. The third failure was a strict-locator ambiguity
between the class-series placeholder and its identically worded toast. That test
was corrected after the frozen General9 snapshot, but has not yet received a browser
rerun. No failure, dependent case, or source-only correction is treated as approval.

| General run date | Result | Passed | Failed | Evidence |
|---|---|---:|---:|---|
| 2026-09-08 | diagnostic RED; not accepted | 234 | 3 | General9 selected 239; 2 dependent serial cases did not run; cleanup passed. |

Validation hold recorded on 2026-09-08: test-safe returned PRESSURE_PERSISTENT before static10 started. No final-source PASS is claimed for the later shared manifest helper, and the corrected general class-validation toast still needs a browser rerun. Canonical run3 stopped before proxy/database startup because Portless was absent from PATH; the existing runtime was located, with rerun pending.

## Test environment contract

- **Data:** local Supabase only (`http://127.0.0.1:54321`) with deterministic E2E seed data.
- **Authentication:** setup creates isolated state for admin, diretor, secretario,
  professor, and responsavel. No shared or production credentials are used.
- **Viewports:** desktop is the default. Rows marked `desktop + mobile` exercise
  controls that differ below `md` (mobile header, drawer, bottom navigation, tables).
- **Observable assertions:** every interaction must prove navigation, visible state,
  validation, persisted data, permission denial, or a downloaded artifact.
- **Diagnostics:** uncaught page errors, console errors, and actionable failed requests
  fail the test. Central benign-noise policy lives in `support/diagnostics.ts`.
- **Artifacts:** Playwright preserves screenshots on failure and traces on first retry.

## Role boundary contract

The table describes UI role policy, not API authority or table privileges.
The non-demo Pilot Gate additionally blocks settings, grades and other scoped
modules. Demo allowlisting does not override role policy: calendar/flags remain
denied, and `notas` RLS with no browser policies remains effective in all modes.
The permissions preview on user details shows route policy only, not data access.

| Role | Reachable surfaces | Explicitly denied |
|---|---|---|
| `admin` | dashboard, cadastro, active academic surfaces, reports, settings | calendar, flags |
| `diretor` | dashboard, students, classes, enrollment, guardians, assignments, active academic surfaces, reports, settings | users, schools, calendar, flags |
| `secretario` | dashboard, students, classes, enrollment, guardians, active academic surfaces, reports, settings, sessions | users, schools, calendar, flags, assignments |
| `professor` | dashboard, assigned classes, attendance, diary, grades, sessions | student creation, enrollment, guardians, users, schools, reports, settings, calendar, flags |
| `responsavel` | authentication only | dashboard shell redirects to `/unauthorized` because no parent-specific UI or ownership mapping exists yet |

`responsavel` is intentionally recorded as a product gap, not silently skipped. The
schema has the role, but `DashboardLayout` excludes it and no child ownership route is
implemented. Tests assert the denial boundary until a parent portal is defined.

## Route and interaction matrix

Assertion depth comes from each linked spec, not from its filename or a CRUD
label. A dialog/validation check does not prove persistence. Examples:
[`diary/lesson-form.spec.ts`](diary/lesson-form.spec.ts) checks fields, cancellation
and validation; [`pilot/canonical-lesson.spec.ts`](pilot/canonical-lesson.spec.ts)
checks the persisted class-diary journey. Vivências creation/edit/reload and
read-only UI by role belong to [`diary/vivencias-persistence.spec.ts`](diary/vivencias-persistence.spec.ts),
not to dialog-only checks. Component tests prove DOM/callbacks, not SQL/browser
persistence. Source contracts and execution receipts remain separate.

| Route | Role | Viewport | Meaningful interactions and expected result | Playwright spec | Status |
|---|---|---|---|---|---|
| `/` | public | desktop | landing heading and login path render without auth; `/favicon.ico` resolves through the Next.js app-icon convention | `auth/login.spec.ts` | catalogado |
| `/login` | public | desktop + mobile | fields, remember checkbox, native validation, invalid credentials, reset link | `auth/login.spec.ts` | catalogado |
| `/reset-password` | public | desktop + mobile | required email, submit, success state, back link | `auth/login.spec.ts` | catalogado |
| `/politica-privacidade` | public | desktop + mobile | heading and policy content render without auth | `auth/login.spec.ts` | catalogado |
| `/offline` | public | mobile | offline explanation and retry link | `auth/login.spec.ts` | catalogado |
| `/unauthorized` | authenticated | desktop + mobile | denial message and return-to-dashboard link | `flows/permissions.spec.ts` | catalogado |
| `/dashboard` | admin, diretor, secretario, professor | desktop + mobile | role greeting, stat cards, quick actions, mobile drawer, bottom nav, sidebar collapse/group toggle | `flows/dashboard-metrics.spec.ts`, `flows/permissions.spec.ts` | catalogado |
| `/dashboard/alunos` | admin, diretor, secretario | desktop + mobile | search, filters, empty/clear states, detail/edit navigation; deactivate opens and cancels the confirmation dialog, without a persistence assertion; no pagination control | `alunos/list.spec.ts` | catalogado |
| `/dashboard/alunos/novo` | admin, diretor, secretario | desktop + mobile | tabs, required/native validation, CPF validation, save, cancel | `alunos/create.spec.ts` | catalogado |
| `/dashboard/alunos/[id]` | admin, diretor, secretario | desktop + mobile | profile data, status, guardian, enrollment and edit/diary links | `alunos/detail.spec.ts` | catalogado |
| `/dashboard/alunos/[id]/editar` | admin, diretor, secretario | desktop + mobile | validated demographic/contact update, save/cancel, persisted values | `alunos/detail.spec.ts` | catalogado |
| `/dashboard/alunos/[id]/boletim` | positive contract, subject to UI role policy and RLS | desktop | preserved grades/frequency summary and PDF expectations, not an enabled grade read | `grades/report-card.spec.ts` | positivo separado; não habilitado |
| `/dashboard/alunos/[id]/diario` | admin, diretor, secretario, professor | desktop + mobile | narrative create/edit/reload for the teacher; read-only diary/report UI for director and secretary | `diary/vivencias-persistence.spec.ts` | catalogado |
| `/dashboard/alunos/[id]/diario/novo` | professor | desktop + mobile | date, narrative, BNCC Campos, validation, save/cancel | `diary/vivencias-persistence.spec.ts` | catalogado |
| `/dashboard/alunos/[id]/diario/relatorio` | admin, diretor, secretario, professor; authoring restricted to teacher | desktop + mobile | read-only UI in general tests; draft/reload and immutable narrative finalization across both routes in the dedicated synthetic pilot | `diary/vivencias-persistence.spec.ts`, `pilot-descriptive/descriptive-emission.spec.ts` | catalogado; escopos separados |
| `/dashboard/usuarios` | admin | desktop + mobile | search, role/status filters, open/create user | `users/crud.spec.ts` | catalogado |
| `/dashboard/usuarios/novo` | admin | desktop | required validation, role/school dependency, create | `users/crud.spec.ts`, `users/roles.spec.ts` | catalogado |
| `/dashboard/usuarios/[id]` | admin | desktop | tabs and route-permission preview; inline professor/diretor name/email edit through PATCH `/api/users/[userId]`; professor reload verified, role and school disabled; no separate `/editar` page | `users/crud.spec.ts`, `users/roles.spec.ts` | catalogado |
| `/dashboard/escolas` | admin | desktop + mobile | search, status filters, open/create school | `schools/crud.spec.ts` | catalogado |
| `/dashboard/escolas/nova` | admin | desktop | required validation, INEP/contact fields, create/cancel | `schools/crud.spec.ts` | catalogado |
| `/dashboard/escolas/[id]` | admin | desktop | edit, deactivate, class links, aggregate cards | `schools/crud.spec.ts` | catalogado |
| `/dashboard/escolas/[id]/editar` | admin | desktop | update fields, save/cancel, persisted values | `schools/crud.spec.ts` | catalogado |
| `/dashboard/turmas` | admin, diretor, secretario, professor | desktop + mobile | search, school/shift/series/status filters, empty/clear states, detail, attendance/diary actions; no pagination control is implemented because the page currently loads all rows | `turmas/list.spec.ts` | catalogado |
| `/dashboard/turmas/nova` | admin, diretor, secretario | desktop | required validation, school/teacher selection, save/cancel | `turmas/create.spec.ts` | catalogado |
| `/dashboard/turmas/[id]` | admin, diretor, secretario, professor | desktop | tabs, students, edit/status, attendance and diary links | `turmas/detail.spec.ts` | catalogado |
| `/dashboard/turmas/[id]/editar` | admin, diretor, secretario | desktop | navigation to the edit form and heading; this spec does not save/reload an edited class | `turmas/detail.spec.ts` | navegação catalogada |
| `/dashboard/turmas/[id]/chamada` | admin, diretor, secretario, professor | desktop + mobile | date/session selection, P/F/J toggles, save, review, close, immutable state | `attendance/grid.spec.ts`, `attendance/workflow.spec.ts` | catalogado |
| `/dashboard/matriculas` | admin, diretor, secretario | desktop + mobile | search/filter/sort/pagination, detail, create | `matriculas/enrollment.spec.ts` | catalogado |
| `/dashboard/matriculas/nova` | admin, diretor, secretario | desktop | student/class selection, capacity validation, create/cancel | `matriculas/enrollment.spec.ts` | catalogado |
| `/dashboard/matriculas/[id]` | admin, diretor, secretario | desktop | detail navigation, student/class/status and Edit action visibility; no transfer/cancellation persistence assertion here (creation is persisted/reloaded in the same spec) | `matriculas/enrollment.spec.ts` | detalhe catalogado |
| `/dashboard/responsaveis` | admin, diretor, secretario | desktop + mobile | search/filter/pagination, detail, create | `responsaveis/crud.spec.ts` | catalogado |
| `/dashboard/responsaveis/novo` | admin, diretor, secretario | desktop | required validation, CPF/phone, child linking, save/cancel | `responsaveis/crud.spec.ts` | catalogado |
| `/dashboard/responsaveis/[id]` | admin, diretor, secretario | desktop | contact edit, save/reload and persisted field checks; fixture removal uses service-role cleanup, not a browser delete/unlink proof | `responsaveis/crud.spec.ts` | catalogado |
| `/dashboard/atribuicoes` | admin, diretor | desktop | page, titular dialog and visible teacher selector; no option-scope or assignment save/reload assertion | `assignments/teacher.spec.ts` | diálogo catalogado |
| `/dashboard/calendario` | blocked for all roles | desktop + mobile | dormant source retained; route and navigation must remain unavailable until governed persistence is approved | `flows/permissions.spec.ts`, `../unit/auth-middleware.test.ts`, `../unit/navigation.test.ts` | bloqueado |
| `/diario` | admin, diretor, secretario, professor | desktop + mobile | seeded class-lesson list, filters/empty state, lesson detail dialog and mobile layout | `diary/list.spec.ts` | catalogado |
| `/dashboard/diario` | authenticated diary roles | desktop + mobile | compatibility redirect to `/diario` | `diary/canonical-route.spec.ts` | catalogado |
| `/diario/frequencia` | authenticated users | desktop + mobile | deprecated redirect to `/dashboard/turmas` | no new writes | catálogo de compatibilidade |
| `/diario/relatorios/[alunoId]` | admin, diretor, secretario, professor; authoring restricted to teacher | desktop + mobile | narrative draft/finalization and real PDF from captured Vivências; not the attendance report at `/relatorios/frequencia` | `pilot-descriptive/descriptive-emission.spec.ts` | piloto descritivo dedicado |
| `/dashboard/notas` | UI role policy lists admin, diretor, secretario, professor; data remains denied | desktop + mobile | preserved positive entry/filter/reload expectations; general gate instead verifies denied browser reads/writes with a service-role control | `grades/entry.spec.ts` (separate config), `grades/access-boundary.spec.ts` (general) | positivo separado; negativa no gate geral |
| `/dashboard/relatorios` | admin, diretor, secretario | desktop + mobile | three canonical destination cards and navigation to frequency, content, and Bolsa Família reports | `flows/relatorios.spec.ts` | catalogado |
| `/relatorios/frequencia` | admin, diretor, secretario | desktop + mobile | filters, tabs/table, summary, PDF/Excel export | `reports/frequency.spec.ts` | catalogado |
| `/relatorios/bolsa-familia` | admin, diretor, secretario | desktop + mobile | school/class/period filters, tabs/table, thresholds, Excel/PDF | `reports/bolsa-familia.spec.ts` | catalogado |
| `/relatorios/conteudo` | admin, diretor, secretario | desktop + mobile | class/subject/period filters, tabs, table, BNCC/PDF export | `reports/content.spec.ts` | catalogado |
| `/dashboard/configuracoes` | admin, diretor, secretario outside the non-demo Pilot Gate | desktop + mobile | governed municipal identity; director's own academic year and pedagogical periods with persistence/reload. Pilot UI stays blocked; director APIs under `/api/school-settings/` have separate authority | `config/settings.spec.ts`, `flows/permissions.spec.ts` | UI geral; API não implica UI piloto |
| `/dashboard/flags` | blocked for all roles | desktop | dormant source retained; direct access must remain denied until a governed API is approved | `flows/permissions.spec.ts`, `../unit/auth-middleware.test.ts`, `../unit/navigation.test.ts` | bloqueado |
| `/dashboard/perfil` | admin, diretor, secretario, professor | desktop + mobile | persisted identity and last access, own-name update with audit and reload, password validation/change, and mobile layout | `profile/user.spec.ts` | catalogado |
| `/dashboard/sessoes` | admin, diretor, professor | desktop + mobile | status/date/class filters, open/close session, attendance navigation | `attendance/workflow.spec.ts` | catalogado |

## Broken-link reconciliation

The source inventory exposed reachable URLs without pages. They are treated as product
defects, not test exclusions:

| Previously reachable URL | Evidence | Resolution |
|---|---|---|
| `/dashboard/frequencia` | dashboard quick action and mobile drawer | corrected to `/dashboard/turmas` |
| `/relatorios` | mobile bottom navigation | corrected to `/dashboard/relatorios` |
| `/dashboard/turmas/[id]/diario` | class-list action | corrected to `/diario?turma=[id]` |
| `/dashboard/frequencia?sessao=[id]` | session page action | corrected to `/dashboard/turmas/[id]/chamada?sessao=[id]` |
| `/reset-password` | login link | page implemented and covered |
| `/offline` | service worker fallback | page implemented and covered |
| `/unauthorized` | permission middleware | page implemented and covered |

## Central benign-noise policy

Only the following are ignored, centrally and with evidence:

1. Browser cancellation errors containing `net::ERR_ABORTED` during an intentional navigation.
2. Next.js development HMR transport requests under `/_next/webpack-hmr`.
3. `AuthSessionMissingError` / `Auth session missing` console messages, but only in the
   `chromium-unauth` project: the `AuthProvider` hydrates `getUser()` on every
   unauthenticated page, where a missing session is the expected state rather than
   an application failure. Authenticated projects still fail on real auth errors.

All other console errors, page errors, failed requests, and HTTP responses with status
`>= 400` fail the owning test. Expected authentication failures are asserted explicitly
by the login spec and scoped there rather than globally ignored.
