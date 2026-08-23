# Registry i18n gates — issue #18

## Scope

- Branch: `campaign/leaf-i18n-registry`, based on the fast-forward of `campaign/leaf-i18n`.
- Owns registry routes and components for schools, users, students, guardians, enrolments, and teacher assignments.
- Owns only `messages/{pt-BR,en}/registry.json` and registry-focused tests.
- Does not change schema, RLS, proxy/middleware, layouts, shared catalogs, classroom, dashboard/reports, or package manifests.

## Contracts

- Portuguese remains the default locale; English is selected through the foundation selector.
- URLs, route parameters, database values, status codes, ISO dates, and authorization behavior remain unchanged.
- Both registry catalogs have identical leaf-key structure.
- Client surfaces use `useTranslations('registry')`; no locale-prefixed routing is introduced.

## Four passes

1. **Contract pass:** fast-forwarded to `campaign/leaf-i18n`, read the foundation handoff and gates, and froze the registry-only file boundary.
2. **Implementation pass:** added paired registry catalog keys and translated owned route/component labels, form feedback, status labels, and assignment UI while preserving data flows.
3. **Review pass:** checked changed paths against ownership, catalog parity, preserved route literals and business values, and added focused catalog tests.
4. **Verification pass:** run focused registry i18n tests, typecheck, lint on owned files, and diff whitespace checks before commit.

## Stop conditions

- Stop if a schema/RLS/Pilot Gate or shared catalog change is required.
- Do not push, merge, deploy, access production, or edit package/lock files.
