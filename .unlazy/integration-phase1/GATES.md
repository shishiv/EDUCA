# Integration phase 1 gates

This gate record was created before integrating any lane changes. It records the
evidence required for this integration: complete lane handoff and commit,
synthetic-only behavior, Pilot Gate and RLS preservation, ownership checks,
conflict review, and repository validation (typecheck, lint, relevant tests,
documentation generation, and build). Failed lanes or material decisions stay
outside the integration and are recorded in the phase-1 handoff.

## Results

- [x] DEVX: complete handoff and clean lane; cherry-picked `6af593e3` and
  `a377b52b`.
- [x] PRIVACY: focused tests and typecheck/lint evidence; cherry-picked
  `936db6cc`. The pending municipal-controller legal-basis decision remains
  explicit and no legal basis is asserted by the code.
- [x] API DOCS: complete handoff with typecheck, lint, unit tests, and docs
  generation evidence; cherry-picked `b529e710`.
- [ ] JOURNEYS: not integrated. The handoff could only provide structural
  checks; typecheck and E2E were not run because dependencies/local Supabase
  were unavailable, and it records material activation blockers (public
  claims, privacy reconciliation, and invalid public demo credentials). Its
  commits remain on `campaign/leaf-journeys`.
- [x] Frozen dependency install: `npm_config_engine_strict=false pnpm install
  --frozen-lockfile` passed; no lockfile changes.
- [x] `pnpm typecheck` passed with zero errors.
- [x] `pnpm lint` passed with zero errors (558 existing warnings).
- [x] `pnpm test` passed: 62 files, 793 passed, 20 skipped.
- [x] `pnpm docs:api` passed with zero errors and 14 external-reference
  warnings; output is generated under ignored `docs/api/`.
- [x] `pnpm build` passed with synthetic placeholder Supabase environment
  values. A no-environment build was also attempted and failed during
  prerendering because Supabase URL/key are required; no real endpoint or
  credentials were used.

## Safety and ownership review

- [x] No deploy, merge, push, shared database, or sudo command was run.
- [x] Integrated changes do not add routes, migrations, real-data paths, or
  external effects; Pilot Gate, RLS, and synthetic-only constraints remain in
  place.
- [x] No ownership collision was found among the integrated DEVX, PRIVACY, and
  API DOCS paths. The journeys-owned files were not cherry-picked.

## Phase 2 recovery integration (2026-08-23)

- [x] I18N foundation, registry, classroom, platform, and integration commits
  were cherry-picked from `campaign/leaf-i18n`, ending at source commit
  `7d29766c`; integrated HEADs are `401dc08a`, `22552f52`, `7feb1662`,
  `94e9d8af`, and `018a39b3`.
- [x] Educacenso source commit `e8410998` was cherry-picked as `3f8dacdd`.
  Its bounded 2026 Identification v1 module remains pure/offline, synthetic
  fixture-only, and unreachable from product routes; demo/Pilot Gate blocks
  remain unchanged.
- [x] I18N review preserved `pt-BR` default, unchanged URLs, Proxy delegation,
  auth, RLS, report authorization, and synthetic-only behavior. Unreviewed
  regulatory English wording remains unavailable.
- [x] Frozen install, typecheck, lint, unit tests, API docs, and synthetic
  production build passed after the phase-2 cherry-picks. Unit tests reported
  70 files passed, 3 skipped; 823 passed, 20 skipped. Lint had zero errors
  (594 warnings).
- [x] The isolated canonical authenticated E2E passed on rerun with a local
  Supabase stack: synthetic teacher UI login, authenticated read/write, and
  cross-school RLS isolation all passed (2 tests).
- [ ] The R3-T4 aggregate E2E remains unmet in this environment. Both attempts
  failed before browser execution because the pilot scripts require a named
  `.localhost` URL without a port, while unprivileged portless could only run
  on `:1355`; no sudo was used. Each attempt cleaned its isolated stacks and
  released its port lease. This is an infrastructure gate, not a code claim.
- [x] No deploy, merge, push, shared database, issue mutation, or sudo command
  was run. Pre-existing unrelated Supabase containers were not touched.
