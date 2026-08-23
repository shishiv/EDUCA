# I18N foundation gates — issue #18

## Scope and ownership

- Branch: `campaign/leaf-i18n`.
- Base: fast-forwarded to `campaign/open-issues-e2e` at `7089549d4458c8e3ec62627cf6b17c9459039fd4` before edits.
- This lane owns the shared i18n runtime, locale persistence, root layout and metadata, shared application chrome, auth pages, and public/system pages.
- This lane does not change database schema, RLS, Educacenso, deployment, production, or the Pilot Gate.
- Existing public URLs remain canonical. Locale is a persisted preference, not a path segment.

## Architecture gates

- Default locale is `pt-BR`; `en` is opt-in through the language selector.
- Unsupported or absent locale preferences resolve to `pt-BR`.
- Locale preference is stored in a same-site, path-wide cookie and validated on the server.
- `next-intl` request configuration provides messages, `America/Sao_Paulo`, and shared date/number formats to Server and Client Components.
- Catalogs are split by feature. Reserved domain catalogs are wired up empty so later lanes can edit disjoint files without changing the shared loader.
- No locale prefix, redirect, or rewrite is introduced. Auth return URLs and all existing route protection prefixes therefore remain unchanged.
- Next.js 16's `proxy.ts` convention replaces the deprecated `middleware.ts` filename without changing the delegated auth/Pilot Gate implementation.
- Localized metadata is request-scoped. No `hreflang` alternates are emitted because both locales intentionally share the same canonical URLs.

## Security and governance gates

- The proxy must continue to delegate every matched request to `authMiddleware`.
- Route protection, Supabase cookie refresh, role checks, RLS-backed access, demo guards, and Pilot Gate behavior must not be weakened or duplicated in the i18n layer.
- Locale code must not read or write business data.
- Locale selection must reject values outside the supported locale allowlist.
- Tests and builds use only synthetic local environment values.

## Accessibility gates

- The selector has a programmatic label, native keyboard behavior, visible focus, and a pending state.
- The document `lang` follows the resolved locale.
- Translated auth and public status messages retain live-region/alert semantics and form labels.

## Four passes

1. **Contract pass — complete:** read repository instructions, integration plan/handoff, issue #18, the installed Next.js 16.3 internationalization, layouts/routing, Proxy/middleware, cookies, and metadata docs, plus the current official `next-intl` App Router, request configuration, routing, Proxy, formatting, testing, plugin, and TypeScript guidance. Froze the no-prefix route, cookie, timezone, and catalog contracts before implementation.
2. **Implementation pass — complete:** added the request runtime, feature catalogs, typed locale/formats, selector, persistence action, localized metadata/layout/auth/public surfaces, and migrated the deprecated middleware convention to `proxy.ts` while retaining delegation to `authMiddleware`.
3. **Review pass — complete:** checked the diff for in-scope literal UI strings, confirmed no schema/Pilot/RLS modules changed, retained all route hrefs and redirects, tested catalog parity and unsupported locale rejection, and removed new lint warnings from touched shared components.
4. **Verification pass — complete:** ran frozen install, focused i18n/auth tests, full typecheck/lint/unit tests, production build with synthetic local Supabase values, and a headless browser smoke covering default locale, switch, cookie persistence, unchanged `/login`, document language, and localized privacy metadata.

## Documentation consulted

- Installed Next.js 16.3: `01-app/02-guides/internationalization.md`, layouts/pages, linking/navigation, Proxy guide and file convention, deprecated middleware convention, dynamic routes, route groups, metadata, `generateMetadata`, and `cookies`.
- Official `next-intl` 4.13 documentation: App Router setup, request configuration, routing configuration, Proxy/middleware composition, date/time and number formatting, testing, plugin configuration, and TypeScript augmentation.

## Verification receipt

- `npm_config_engine_strict=false pnpm install --frozen-lockfile`: passed; lockfile unchanged.
- Focused ESLint over all touched TypeScript/TSX: passed with zero warnings.
- Focused Vitest (`tests/unit/i18n` plus auth middleware): 5 files, 29 tests passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with zero errors and 543 pre-existing warnings outside this change.
- `pnpm test`: 66 files passed, 3 skipped; 807 tests passed, 20 skipped.
- Synthetic production build: passed; 57 existing routes and one Proxy, with no locale-prefixed routes.
- Headless Chrome smoke: `pt-BR` default, switch to `en`, `EDUCA_LOCALE=en`, `/login` unchanged, preference survived reload, privacy heading and metadata localized.

## Reserved catalog contracts for later lanes

The shared loader pre-registers the following top-level namespaces. Later lanes must only add keys to their own two locale files and translate their owned UI files:

- `registry` (`campaign/leaf-i18n-registry`): schools, users, students, guardians, enrolments, assignments, and related CRUD.
- `classroom` (`campaign/leaf-i18n-classroom`): classes, attendance, class diary, sessions, calendar, grades, and related components.
- `platform` (`campaign/leaf-i18n-platform`): dashboard feature content, reports, configuration, feature flags, and remaining operational screens.

Cross-cutting labels belong to `common` or `layout`; later lanes must request an integration change instead of editing those catalogs directly. Portuguese and English keys must remain structurally identical.

Exact file ownership after fast-forwarding this foundation commit:

- `campaign/leaf-i18n-registry` owns `messages/{pt-BR,en}/registry.json`, `app/(dashboard)/dashboard/{alunos,usuarios,escolas,matriculas,responsaveis,atribuicoes}/**`, `components/students/**`, and `components/classes/teacher-assignment.tsx`. It must not edit `i18n/messages.ts`, `types/i18n.d.ts`, `common.json`, or `layout.json`.
- `campaign/leaf-i18n-classroom` owns `messages/{pt-BR,en}/classroom.json`, `app/(dashboard)/dashboard/{turmas,calendario,notas,sessoes,diario}/**`, `app/(dashboard)/diario/**`, `components/{attendance,calendario,diary,turmas}/**`, and classroom-only helpers. It must not change attendance authorization, RLS, Pilot Gate checks, or route paths.
- `campaign/leaf-i18n-platform` owns `messages/{pt-BR,en}/platform.json`, `app/(dashboard)/dashboard/page.tsx`, `app/(dashboard)/dashboard/{perfil,relatorios,configuracoes,flags}/**`, `app/(dashboard)/relatorios/**`, and `components/{dashboard,reports}/**`. It must preserve report security and synthetic-only gates.
- Every lane uses `useTranslations('<namespace>...')` in Client Components and `getTranslations` from `next-intl/server` in async Server Components; `useFormatter` / `getFormatter` or `i18n/formats.ts` owns presentation formatting. Business dates, ISO payloads, sorting keys, and database values stay unchanged.
- Each lane must add matching keys in both locale files, run the catalog-parity tests, and leave URL literals untranslated. Shared changes are deferred to the integration lane.

## Stop conditions

- Stop if the required base merge is not fast-forwardable.
- Stop if implementation requires a schema/RLS/Pilot Gate change.
- Do not deploy, merge another branch, push, or access production.
