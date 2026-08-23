# I18N integration gates — issue #18

## Integrated lanes

- [x] Foundation remains the base (`b28dc6a1`); `pt-BR` remains the deterministic default and locale selection does not change URLs.
- [x] Registry lane integrated from `a628bd8a`.
- [x] Classroom lane integrated from `b233832a`.
- [x] Platform lane integrated from `9f98e1dc`.
- [x] Add/add gate documents were retained under separate `.unlazy/i18n-*` directories; catalog-parity assertions were reconciled for all three populated namespaces.

## Security and scope review

- [x] Domain integration does not modify auth middleware, Proxy delegation, RLS/schema, Pilot Gate, package/lock, or deployment files.
- [x] Route paths, database/status values, ISO payloads, report authorization, synthetic-only behavior, and attendance policy constants remain unchanged.
- [x] Regulatory English copy without reviewed wording is explicitly marked unavailable rather than inferred.
- [x] No push, merge, deploy, shared database, production access, or sudo command was used.

## Verification receipt

- [x] `git -c core.whitespace=cr-at-eol diff --check` — passed.
- [x] `pnpm typecheck` — passed.
- [x] `pnpm vitest run tests/unit/i18n` — passed: 7 files, 22 tests.
- [x] Literal domain-key resolution audit — passed for registry, classroom, and platform consumers.
- [x] `pnpm lint` — passed with 0 errors; legacy warnings remain.
- [x] Synthetic `pnpm build` — passed: 57 static-generation entries and the existing Proxy boundary.
- [x] Final Unlazy scope/default/auth/catalog gate — passed.

## Residual risk

- Existing lint warnings remain in legacy screens; lint reports no errors.
- Authenticated domain E2E still depends on local synthetic Supabase fixtures and was not rerun in this final recovery pass.
