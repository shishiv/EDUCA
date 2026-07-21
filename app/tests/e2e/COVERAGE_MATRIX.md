# EDUCA E2E coverage matrix

This matrix is the tracked contract for Playwright coverage under `tests/e2e`.
Routes are derived from `app/**/page.tsx`, the desktop/mobile navigation components,
`auth-middleware.ts`, feature-flag access checks, and observed runtime redirects.

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

| Role | Reachable surfaces | Explicitly denied |
|---|---|---|
| `admin` | all dashboard, cadastro, academic, reports, flags, settings | none |
| `diretor` | dashboard, students, classes, enrollment, guardians, assignments, academic, reports, settings | users, schools, flags |
| `secretario` | dashboard, students, classes, enrollment, guardians, academic, reports | users, schools, flags, assignments, settings |
| `professor` | dashboard, assigned classes, attendance, diary, grades | student creation, enrollment, guardians, users, schools, reports, settings |
| `responsavel` | authentication only | dashboard shell redirects to `/unauthorized` because no parent-specific UI or ownership mapping exists yet |

`responsavel` is intentionally recorded as a product gap, not silently skipped. The
schema has the role, but `DashboardLayout` excludes it and no child ownership route is
implemented. Tests assert the denial boundary until a parent portal is defined.

## Route and interaction matrix

| Route | Role | Viewport | Meaningful interactions and expected result | Playwright spec | Status |
|---|---|---|---|---|---|
| `/` | public | desktop | root redirects to `/login` | `auth/login.spec.ts` | covered |
| `/login` | public | desktop + mobile | fields, remember checkbox, native validation, invalid credentials, reset link | `auth/login.spec.ts` | covered |
| `/reset-password` | public | desktop + mobile | required email, submit, success state, back link | `auth/login.spec.ts` | covered |
| `/politica-privacidade` | public | desktop + mobile | heading and policy content render without auth | `auth/login.spec.ts` | covered |
| `/offline` | public | mobile | offline explanation and retry link | `auth/login.spec.ts` | covered |
| `/unauthorized` | authenticated | desktop + mobile | denial message and return-to-dashboard link | `flows/permissions.spec.ts` | covered |
| `/dashboard` | admin, diretor, secretario, professor | desktop + mobile | role greeting, stat cards, quick actions, mobile drawer, bottom nav, sidebar collapse/group toggle | `flows/dashboard-metrics.spec.ts`, `flows/permissions.spec.ts` | covered |
| `/dashboard/alunos` | admin, diretor, secretario | desktop + mobile | search, status/sex filters, empty/clear states, detail/edit/deactivate actions; no pagination control is implemented because the page currently loads all rows | `alunos/list.spec.ts` | covered |
| `/dashboard/alunos/novo` | admin, diretor, secretario | desktop + mobile | tabs, required/native validation, CPF validation, save, cancel | `alunos/create.spec.ts` | covered |
| `/dashboard/alunos/[id]` | admin, diretor, secretario | desktop + mobile | profile data, status, guardian, enrollment and edit/diary links | `alunos/detail.spec.ts` | covered |
| `/dashboard/alunos/[id]/editar` | admin, diretor, secretario | desktop + mobile | validated demographic/contact update, save/cancel, persisted values | `alunos/detail.spec.ts` | covered |
| `/dashboard/alunos/[id]/boletim` | admin, diretor, secretario, professor | desktop | grades/frequency summary and PDF export | `grades/report-card.spec.ts` | covered |
| `/dashboard/alunos/[id]/diario` | admin, diretor, secretario, professor | desktop | entries, filters, new-entry and report navigation | `diary/list.spec.ts` | covered |
| `/dashboard/alunos/[id]/diario/novo` | admin, diretor, secretario, professor | desktop | date, lesson content, BNCC, validation, save/cancel | `diary/create.spec.ts`, `diary/lesson-form.spec.ts` | covered |
| `/dashboard/alunos/[id]/diario/relatorio` | admin, diretor, secretario, professor | desktop | report range and export | `diary/list.spec.ts` | covered |
| `/dashboard/usuarios` | admin | desktop + mobile | search, role/status filters, open/create user | `users/crud.spec.ts` | covered |
| `/dashboard/usuarios/novo` | admin | desktop | required validation, role/school dependency, create | `users/crud.spec.ts`, `users/roles.spec.ts` | covered |
| `/dashboard/usuarios/[id]` | admin | desktop | tabs, status, role permissions preview | `users/crud.spec.ts`, `users/roles.spec.ts` | covered |
| `/dashboard/usuarios/[id]/editar` | admin | desktop + mobile | validated profile/role/school/status update and cancel | `users/crud.spec.ts`, `users/roles.spec.ts` | covered |
| `/dashboard/escolas` | admin | desktop + mobile | search, status filters, open/create school | `schools/crud.spec.ts` | covered |
| `/dashboard/escolas/nova` | admin | desktop | required validation, INEP/contact fields, create/cancel | `schools/crud.spec.ts` | covered |
| `/dashboard/escolas/[id]` | admin | desktop | edit, deactivate, class links, aggregate cards | `schools/crud.spec.ts` | covered |
| `/dashboard/escolas/[id]/editar` | admin | desktop | update fields, save/cancel, persisted values | `schools/crud.spec.ts` | covered |
| `/dashboard/turmas` | admin, diretor, secretario, professor | desktop + mobile | search, school/shift/series/status filters, empty/clear states, detail, attendance/diary actions; no pagination control is implemented because the page currently loads all rows | `turmas/list.spec.ts` | covered |
| `/dashboard/turmas/nova` | admin, diretor, secretario | desktop | required validation, school/teacher selection, save/cancel | `turmas/create.spec.ts` | covered |
| `/dashboard/turmas/[id]` | admin, diretor, secretario, professor | desktop | tabs, students, edit/status, attendance and diary links | `turmas/detail.spec.ts` | covered |
| `/dashboard/turmas/[id]/editar` | admin, diretor, secretario | desktop + mobile | update class, teacher, capacity, shift and active state; save/cancel | `turmas/detail.spec.ts` | covered |
| `/dashboard/turmas/[id]/chamada` | admin, diretor, professor | desktop + mobile | date/session selection, present/absent toggles, keyboard controls, bulk actions, save persistence | `attendance/grid.spec.ts`, `attendance/workflow.spec.ts`, `flows/chamada.spec.ts` | covered |
| `/dashboard/matriculas` | admin, diretor, secretario | desktop + mobile | search/filter/sort/pagination, detail, create | `matriculas/enrollment.spec.ts` | covered |
| `/dashboard/matriculas/nova` | admin, diretor, secretario | desktop | student/class selection, capacity validation, create/cancel | `matriculas/enrollment.spec.ts` | covered |
| `/dashboard/matriculas/[id]` | admin, diretor, secretario | desktop | transfer, cancel/reactivate confirmation, linked student/class | `matriculas/enrollment.spec.ts` | covered |
| `/dashboard/responsaveis` | admin, diretor, secretario | desktop + mobile | search/filter/pagination, detail, create | `responsaveis/crud.spec.ts` | covered |
| `/dashboard/responsaveis/novo` | admin, diretor, secretario | desktop | required validation, CPF/phone, child linking, save/cancel | `responsaveis/crud.spec.ts` | covered |
| `/dashboard/responsaveis/[id]` | admin, diretor, secretario | desktop | contact edit, linked students, unlink confirmation | `responsaveis/crud.spec.ts` | covered |
| `/dashboard/atribuicoes` | admin, diretor | desktop + mobile | school/class/teacher filters, assignment action, attendance navigation | `assignments/teacher.spec.ts` | covered |
| `/dashboard/calendario` | admin, secretario | desktop + mobile | month navigation, add/edit event, day selection | `config/settings.spec.ts` | covered |
| `/dashboard/diario` | admin, diretor, secretario, professor | desktop + mobile | class filters, student diary navigation, role-scoped results | `diary/list.spec.ts` | covered |
| `/diario` | admin, diretor, secretario, professor | desktop + mobile | class/date selection, session cards and navigation | `diary/list.spec.ts` | covered |
| `/diario/frequencia` | admin, diretor, secretario, professor | desktop + mobile | session/date filters, attendance toggles, lock/justification, save/offline state | `attendance/grid.spec.ts`, `attendance/justification.spec.ts`, `attendance/workflow.spec.ts` | covered |
| `/diario/relatorios/[alunoId]` | admin, diretor, secretario, professor | desktop | range, attendance summary, export | `reports/frequency.spec.ts` | covered |
| `/dashboard/notas` | admin, diretor, secretario, professor | desktop + mobile | class/period/subject filters, grade entry, validation, calculated averages, save | `grades/entry.spec.ts`, `flows/notas-boletim.spec.ts` | covered |
| `/dashboard/notas/[turmaId]/boletim` | admin, diretor, secretario, professor | desktop + mobile | class roster and navigation to each student's report card | `grades/report-card.spec.ts` | covered |
| `/dashboard/relatorios` | admin, diretor, secretario | desktop + mobile | report cards, generation, preview, status, download/delete | `flows/relatorios.spec.ts` | covered |
| `/relatorios/frequencia` | admin, diretor, secretario | desktop + mobile | filters, tabs/table, summary, PDF/Excel export | `reports/frequency.spec.ts` | covered |
| `/relatorios/bolsa-familia` | admin, diretor, secretario | desktop + mobile | school/class/period filters, tabs/table, thresholds, Excel/PDF | `reports/bolsa-familia.spec.ts` | covered |
| `/relatorios/conteudo` | admin, diretor, secretario | desktop + mobile | class/subject/period filters, tabs, table, BNCC/PDF export | `reports/content.spec.ts` | covered |
| `/dashboard/configuracoes` | admin, diretor | desktop + mobile | settings sections, switches/selects, save/reset, theme | `config/settings.spec.ts` | covered |
| `/dashboard/flags` | admin | desktop | flag create/edit/toggle, per-school override, denial for non-admin | `config/settings.spec.ts`, `flows/permissions.spec.ts` | covered |
| `/dashboard/perfil` | admin, diretor, secretario, professor | desktop + mobile | profile fields, edit/save, password and theme controls | `profile/user.spec.ts` | covered |
| `/dashboard/sessoes` | admin, diretor, professor | desktop + mobile | status/date/class filters, open/close session, attendance navigation | `attendance/workflow.spec.ts` | covered |

## Broken-link reconciliation

The source inventory exposed reachable URLs without pages. They are treated as product
defects, not test exclusions:

| Previously reachable URL | Evidence | Resolution |
|---|---|---|
| `/dashboard/frequencia` | dashboard quick action and mobile drawer | corrected to `/diario/frequencia` |
| `/relatorios` | mobile bottom navigation | corrected to `/dashboard/relatorios` |
| `/dashboard/turmas/[id]/diario` | class-list action | corrected to `/dashboard/diario?turma=[id]` |
| `/dashboard/frequencia?sessao=[id]` | session page action | corrected to `/diario/frequencia?sessao=[id]` |
| `/reset-password` | login link | page implemented and covered |
| `/offline` | service worker fallback | page implemented and covered |
| `/unauthorized` | permission middleware | page implemented and covered |

## Central benign-noise policy

Only the following are ignored, centrally and with evidence:

1. Browser cancellation errors containing `net::ERR_ABORTED` during an intentional navigation.
2. Next.js development HMR transport requests under `/_next/webpack-hmr`.
3. Favicon misses (`/favicon.ico`) because they do not affect application behavior.

All other console errors, page errors, failed requests, and HTTP responses with status
`>= 400` fail the owning test. Expected authentication failures are asserted explicitly
by the login spec and scoped there rather than globally ignored.
