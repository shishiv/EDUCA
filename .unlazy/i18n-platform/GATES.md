# I18N platform gates — issue #18

## Scope

- This lane owns the root dashboard, reports, profile, settings, feature flags, and their dashboard/report components.
- Only the `platform` catalogs and platform-owned tests are changed here. Shared catalogs, routing, proxy, layout, registry, classroom, schema, RLS, and deployment remain untouched.
- Portuguese (`pt-BR`) remains the default locale. English is opt-in, with unchanged URLs and report routes.

## Security and product gates

- Report authorization, synthetic-only report behavior, attendance policy thresholds, exports, and Pilot Gate checks are unchanged.
- Translation is presentation-only: database values, role identifiers, status codes, ISO dates, and API payloads are not translated.
- The report catalog preserves Bolsa Família legal/municipal distinctions and synthetic-only empty states.

## Accessibility and formatting gates

- Labels, button names, empty/error states, status badges, and report headings use the `platform` namespace in both locales.
- Native controls retain their labels and keyboard behavior. Locale-aware date/number formatting remains owned by the foundation helpers.
- Portuguese and English catalogs have identical leaf-key structure.

## Four passes

1. **Contract pass:** fast-forwarded to `campaign/leaf-i18n`, read the foundation handoff and gates, and froze platform-only file ownership.
2. **Implementation pass:** added the platform catalog translations and wired owned Client Components to `useTranslations('platform')` without changing data or route contracts.
3. **Review pass:** checked report/Pilot/attendance policy code paths, URL literals, ISO values, statuses, exports, and forbidden directories for scope drift.
4. **Verification pass:** ran platform catalog parity tests, focused i18n tests, typecheck, lint, and diff checks.

## Stop conditions

- Stop if a report security, synthetic-only, Pilot Gate, schema, RLS, proxy, or shared catalog change is required.
- Do not push, merge, deploy, access production, or use shared database state.
