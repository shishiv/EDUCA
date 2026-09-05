# EDUCA internationalization contract

## Runtime

- Supported locales: `pt-BR` (default) and `en` (opt-in).
- URLs never contain a locale segment. Existing links, auth redirects, route protection, and Pilot Gate path checks therefore keep their current contract.
- The server action in `i18n/actions.ts` persists the validated preference in the `EDUCA_LOCALE` cookie. `i18n/request.ts` reads it and falls back to `pt-BR`; browser language does not silently change the product language.
- The product timezone remains `America/Sao_Paulo`. Locale changes presentation, not the calendar or attendance business rules.

Use `useTranslations` / `useFormatter` in Client Components and `getTranslations` / `getFormatter` from `next-intl/server` in async Server Components. Non-React code can use the pure helpers in `i18n/formats.ts`.

## Catalog ownership

Catalogs are feature-scoped under `messages/<locale>/`. Both locale files for a namespace must always expose the same leaf keys.

| Namespace | Owner |
| --- | --- |
| `common` | Foundation/integration only |
| `auth` | Foundation (login, first access, password reset) |
| `public` | Foundation (privacy, offline, unauthorized, loading, not found) |
| `layout` | Foundation/integration only (shared chrome and navigation) |
| `registry` | Schools, users, students, guardians, enrolments, assignments |
| `classroom` | Classes, attendance, diary, sessions, calendar, grades |
| `platform` | Dashboard content, reports, settings, feature flags |

`i18n/messages.ts` registers the populated catalogs. Keep feature copy in its namespace and shared navigation or feedback copy in `common` or `layout`.

## Adding a locale

1. Add the locale to `locales` in `i18n/config.ts` and decide explicitly whether it changes `defaultLocale`.
2. Create every feature catalog under `messages/<locale>/` with key parity.
3. Register those files in `i18n/messages.ts`.
4. Add an option to the accessible selector.
5. Add locale-resolution, catalog-parity, date/number-format, and selector tests.

Do not introduce locale-prefixed routes without a separate migration of auth return URLs, proxy route checks, public metadata/canonicals, service-worker behavior, and all Pilot Gate path tests.
