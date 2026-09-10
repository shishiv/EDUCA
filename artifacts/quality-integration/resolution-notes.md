# Content reconciliation

Each row was compared worker-to-base and worker-to-integration. Exact identities and all other paths are in `reconciliation.json`; verification is `python3 artifacts/quality-integration/verify.py`. Differences are not presumed lost functionality.

| Source | Path | Content decision |
| --- | --- | --- |
| auth | `VENT.md` | Union of whole feedback entries; only heading punctuation normalized to ASCII hyphens for typography. Original bodies retained exactly. |
| auth | `app/app/(auth)/login/page.tsx` | Keeps authenticated returnTo validation and retry; adds Suspense required around useSearchParams at build. |
| auth | `app/app/(dashboard)/dashboard/perfil/page.tsx` | Keeps authenticated profile/password mutation; applies returned profile to context, reauthenticates current password and replaces fictitious access history with last_sign_in_at. |
| auth | `app/app/api/pilot/first-access/route.ts` | Same invitation, revoked-profile and completion/audit guards split into functions; no client identity trusted. |
| auth | `app/app/api/pilot/invitations/handler.ts` | Keeps role/school validation and lifecycle registration; ensure_pilot_invitation_audit also repairs receipts on duplicate/retry paths. |
| auth | `app/app/api/users/[userId]/route.ts` | Route delegates to handler preserving scoped update, email compensation and receipt; integrated handler additionally denies assignment changes and handles NULL-school comparisons. |
| auth | `app/app/api/users/[userId]/status/handler.ts` | Same status/receipt behavior; RPC return now inferred from generated contract instead of caller-supplied generic. |
| auth | `app/app/api/users/me/route.ts` | Self-only name update retained in handler and update_current_pilot_profile_name RPC; audit and write atomic, inactive/forged actor denied. |
| auth | `app/contexts/escola-context.tsx` | User-keyed stored selection and scope checks retained in escola-selection.ts; ignores stale in-flight school loads and clears failed selection. |
| auth | `app/lib/auth.ts` | Keeps auth and redacted audit intent; validates metadata, avoids duplicate login_failed event and removes uncalled direct createUserProfile writer. |
| auth | `app/lib/route-policy.ts` | Keeps role/redirect deny-by-default policy. Removed flags/calendar entries correspond to absent routes, not loss of worker auth guards. |
| auth | `app/lib/services/user-lifecycle.ts` | Only removes an unused UserLifecycleErrorInput type; lifecycle behavior identical. |
| auth | `app/tests/unit/api/user-lifecycle-routes.test.ts` | Existing lifecycle outcomes preserved; extends regression to failed receipt retries and recovery with exactly one invitation. |
| auth | `app/tests/unit/auth-middleware.test.ts` | Same permission/redirect table extended to deny absent flags/calendar routes. |
| auth | `supabase/migrations/20260907000000_auth_mutation_audit_receipts.sql` | Removes redundant CASE arm returning empty metadata allowlist; ELSE already returns exactly the same empty text array. |
| contracts | `VENT.md` | Union of whole feedback entries; only heading punctuation normalized to ASCII hyphens for typography. Original bodies retained exactly. |
| contracts | `app/app/api/demo/audit/route.ts` | Both worker intents retained in lib/demo-sandbox/demo-audit-route-handler.ts: active actor, role then school checks, redacted errors, simulated audit receipt; valid Next route exports. |
| contracts | `app/components/turmas/TurmaCard.tsx` | Canonical attendance and diary hrefs retained; thin router wrapper delegates same behavior to testable TurmaCardView. |
| contracts | `app/lib/api/classes.ts` | Keeps detail reads and canonical attendance; mutators route through governed atomic RPC, month bounds use actual last day, query inputs typed. |
| contracts | `app/lib/api/feature-flags.ts` | Same persisted lookup before demo overlay, mutation no-op receipt and reset behavior; override lookup extracted without changing its decisions. |
| contracts | `app/lib/api/schools.ts` | Keeps school relationships/filters; replaces partial direct writes and nonblocking audit with governed atomic RPC, inferred joins and valid month end. |
| contracts | `app/lib/api/students.ts` | Canonical admission retained with school preflight and richer guardian payload; explicit school query, authorized profiles, no unused direct enrollment writers. |
| contracts | `app/lib/api/users.ts` | Keeps route-based status/teacher mutation; response validated, FK explicit, inferred joined rows. Removes unused direct create/bulk writers that bypass governance. |
| contracts | `app/tests/unit/contracts/demo-audit-route-contract.test.ts` | Same foreign/missing school and redacted database-failure outcomes exercised through extracted handler; no route-specific unsupported exports. |
| contracts | `app/types/descriptive-report.ts` | Only restores accents in BNCC field display labels; domain keys and fullName remain unchanged. |
| frequency | `CONTEXT.md` | Keeps correction-window contract and adds canonical catalog parity, conditionality separation and reactivated diary/form tests. |
| frequency | `app/app/(dashboard)/dashboard/turmas/[id]/chamada/page.tsx` | Correction deadline retained; adds persisted ordinary cutoff from session, removing client fixed-hour assumption. |
| frequency | `app/app/actions/attendance/check-lock-status.ts` | Same module call and error contract moved into attendance-actions.ts; async Next boundary retained. |
| frequency | `app/app/actions/attendance/close-session.ts` | Same authorized close, error result and two cache revalidations moved into attendance-actions.ts. |
| frequency | `app/app/actions/attendance/mark-attendance.ts` | Same record normalization/error projection and cache revalidation moved into attendance-actions.ts. |
| frequency | `app/app/actions/attendance/open-session.ts` | Same authorized open/error/cache behavior moved into attendance-actions.ts; async Next export retained. |
| frequency | `app/app/api/sessoes/aula/[id]/frequencia/batch/route.ts` | Same validation and action adapter moved to attendance-batch-route.ts with same status map and response contract. |
| frequency | `app/components/attendance/AttendanceCell.tsx` | Same editing guard and accessibility; locked title no longer incorrectly asserts universal 18:00 cutoff. |
| frequency | `app/components/attendance/AttendanceGrid.tsx` | Retains correction timer and bulk/realtime edits; adds persisted ordinary cutoff and focus refresh, no client E2E bypass. |
| frequency | `app/components/attendance/AttendanceGridHeader.tsx` | Retains window notices; removes unsupported legal claim about fixed 18:00 deadline. |
| frequency | `app/components/attendance/AttendanceGridTypes.tsx` | Correction fields retained; adds scheduledCutoffAt and changes time_18h discriminant to time_cutoff consistently with module. |
| frequency | `app/components/attendance/AttendanceGridUtils.tsx` | Same correction-hook behavior plus captured ordinary deadline, exact expiry and focus refresh. |
| frequency | `app/lib/services/attendance-module.ts` | Correction precedence retained. Database owns opening cutoff/default; maps database denial, distinguishes absent authorized class/date from hidden/missing session. |
| frequency | `app/tests/e2e/attendance/reopen.spec.ts` | Byte-identical move to tests/e2e/pilot/attendance-reopen.spec.ts, selected by specialized legacy manifest instead of leaking into general setup. |
| frequency | `app/tests/e2e/reports/frequency.spec.ts` | Replaces conditional/vacuous assertions with persisted P/F/A fixture, exact 1/1/1 and 67 percent, parsed Excel/PDF and mobile overflow checks. |
| frequency | `app/tests/unit/components/attendance/correction-window.test.tsx` | All worker correction-window assertions retained; adds ordinary cutoff, invalid deadline and exact-expiry mounted-hook checks. |
| frequency | `app/tests/unit/services/attendance-module.test.ts` | Keeps worker authorization/write checks and correction behavior; adds DB cutoff denial and missing/hidden session rejection, no fake-as-never cast. |
| frequency | `app/types/database.ts` | Retains worker correction types, plus generated canonical RPC/WhatsApp/governance additions needed by integrated migrations. No manual regeneration in this task. |
| public | `app/app/providers.tsx` | Preserves provider injection and absence of floating locale overlay; locale control lives in desktop/mobile headers, single global Sonner owner. |
| public | `app/components/dashboard/matriculas-page-content.tsx` | Keeps working detail-route edit and filters; cancel now updates situacao through audited RPC rather than deleting enrollment/history. |
| public | `app/components/dashboard/nova-turma-page-content.tsx` | Keeps tested school/type/teacher selection; uses seeded/per-school capacity, guarded RPC, clears stale dependent selections and removes unwritten observacoes field. |
| public | `app/components/dashboard/teacher-dashboard-enhanced.tsx` | Combines public initialTurmas seam with readmodels query/projection extraction; same canonical class/enrollment/session scoping and status links. |
| public | `app/components/layout/header.tsx` | Keeps shell/search/route context and adds in-layout locale button, replacing global floating overlay. |
| public | `app/components/layout/mobile-header.tsx` | Keeps mobile shell/search and adds in-layout locale button, replacing global floating overlay. |
| public | `app/components/layout/navigation.ts` | Keeps role-filtered canonical links; absent calendar removed, mobile items derived from same role policy, avoids role assertion cast. |
| public | `app/lib/demo-sandbox/demo-audit.ts` | Same intercepted operation/receipt payload; uses generated RPC args/returns and Json metadata, not broad string dictionary. |
| public | `app/tests/unit/demo-sandbox/demo-demoable-flows.test.ts` | Old source-regex/copied-function test replaced by .test.tsx executing real form and Supabase builder. Keeps school/type/payload/denial intent; student admission scope separately checked by SQL. |
| public | `app/tests/unit/demo-sandbox/demo-deploy-package.test.tsx` | Enrollment detail/edit/filter assertions retained; class INSERT assertion now lives in demo-demoable-flows.test.tsx and checks actual governed RPC payload. |
| public | `app/tests/unit/i18n/locale-switcher.test.tsx` | All worker checks retained, plus failed button locale change stays usable and announces error. |
| public | `app/tests/unit/i18n/providers.test.tsx` | Tests content and no floating selector; dashboard locale availability now belongs to header controls and locale-switcher tests, includes actual Toaster region. |
| readmodels | `VENT.md` | Union of whole feedback entries; only heading punctuation normalized to ASCII hyphens for typography. Original bodies retained exactly. |
| readmodels | `app/app/(dashboard)/relatorios/conteudo/page.tsx` | Readmodel behavior identical; heading uses existing localized content.title. |
| readmodels | `app/app/(dashboard)/relatorios/frequencia/page.tsx` | Readmodel behavior identical; localized heading and explicit accessible tab labels at mobile width. |
| readmodels | `app/app/api/dashboard/alerts/route.ts` | Keeps canonical alert reads; inactive profile denied and NULL-school scope limited to municipal roles instead of any unassigned user. |
| readmodels | `app/components/dashboard/teacher-dashboard-enhanced.tsx` | Combines public initialTurmas seam with readmodels query/projection extraction; same canonical class/enrollment/session scoping and status links. |
| readmodels | `app/components/reports/AttendanceReportTable.tsx` | Keeps counts/table/sorting; honors provided riskThreshold consistently, adds summary/legend regions, separates general attendance copy from benefit eligibility. |
| readmodels | `app/components/reports/DescriptiveReportForm.tsx` | Keeps validation/finalization intent; serialized save/finalize, saved-draft comparison preserves edits during save, disabled/callback guards and accessible field labels. |
| readmodels | `app/components/reports/StudentReport.tsx` | Same attendance values; municipal warning no longer asserts Bolsa eligibility from general reference. |
| readmodels | `app/lib/export/attendance-pdf.ts` | Same benefit legal/municipal values; labels match Excel and distinguish municipal alert from compliance. |
| readmodels | `app/tests/e2e/flows/dashboard-metrics.spec.ts` | Retains navigation/shell intent; precise regions and real metrics replace ambiguous/vacuous selectors, drawer dialog close verified. |
| readmodels | `app/tests/e2e/reports/bolsa-familia.spec.ts` | Replaces vacuous visibility checks with locally persisted authorized conditionality fixture, parsed exports and mobile overflow. No real benefit data. |
| readmodels | `app/tests/e2e/reports/content.spec.ts` | Keeps saved-source nonmutation, filters and content assertions; removes dev_auth_bypass and arbitrary waits, parses PDF text and asserts restored snapshot. |
| toolchain | `app/.oxlintrc.json` | Retains stricter integrated file-specific vendor exclusions, not blanket plugin-directory ignore. Fixture programs made inert data instead of disabling checks. |
| toolchain | `app/tools/oxlint/anti-slop/tests/fixtures/import-specifiers.ts` | Exact worker bytes retained as .ts.txt, materialized as temporary TypeScript by executable plugin test; invalid icon-library imports no longer enter app build. |
| toolchain | `app/tools/oxlint/anti-slop/tests/fixtures/local-symbol.ts` | Exact worker bytes retained as .ts.txt, still exercised as forbidden-symbol negative fixture by real oxlint subprocess. |
| toolchain | `app/tools/oxlint/anti-slop/tests/no-shape-in-symbol-names.test.mjs` | Combines worker file fixtures and integrated isolated temp-directory/one-thread cleanup runner; same exact diagnostic assertions, no inline duplicate data. |
| validation | `app/lib/date-utils.ts` | All seven worker replacements preserved; additional UTC month helper and removal of uncalled fixed-hour legacy helpers are separate integrated changes. |
