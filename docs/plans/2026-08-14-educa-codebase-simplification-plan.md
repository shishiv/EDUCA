---
title: EDUCA Codebase Simplification - Plan
type: refactor
date: 2026-08-14
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
---

# EDUCA Codebase Simplification - Plan

## Goal Capsule

Simplify disconnected application code and align the remaining dependency surface without changing product behavior. The authority order is: `CONTEXT.md`, repository instructions, current callers and tests, then this plan. Stop when each candidate has no in-repository consumer, protected compatibility surface, route entry point, package-script use, or generated-file role.

This is a conservative refactor. It must not add features, change routes, alter API responses, change UI behavior, touch Supabase migrations or schema, or remove attendance, pilot, diary, demo-sandbox, or generated-type contracts.

## Product Contract

### Summary

Remove code that the current application does not load and remove one unused package declaration. Keep active modules and compatibility seams unchanged.

### Problem Frame

The repository contains several disconnected implementations that duplicate active concepts or retain unfinished paths. Knip identifies candidates, but its result also includes test-only, script-entry, generated, and compatibility surfaces. Removing candidates without caller and contract checks could change behavior or break pilot guarantees.

### Requirements

#### Dead code removal

- R1. Remove only source modules that have no in-repository import, route entry, package-script reference, generated-file role, or protected test-contract reference.
- R2. Remove the disconnected API base, IP utility, dashboard card, navigation provider, enhanced breadcrumb implementation, unused layout barrel, global search client, search context, diary query hook, and unused v2 logo module after final repository-wide corroboration.
- R3. Preserve active route handlers, direct layout imports, canonical diary components, attendance compatibility adapters, pilot scripts, demo-sandbox guards, generated database types, and test fixtures referenced by path.

#### Dependency alignment

- R4. Remove `@tanstack/react-query-devtools` from `app/package.json` and `app/pnpm-lock.yaml` only when no source or configuration consumer exists.
- R5. Keep the `supabase` package and all executable script entries because documented commands and package scripts use the CLI, even when static unused-dependency analysis reports it.

#### Behavior boundary

- R6. Preserve all current route paths, server actions, API responses, rendered active UI, validation rules, authentication checks, school scoping, audit behavior, and database access.
- R7. Do not merge the two Brazilian phone validators, remove compatibility exports, prune active barrels, or change generated files because their current contracts are not proven equivalent.

### Success Criteria

- The final diff contains only conservative deletions and the unused dependency cleanup, plus required lockfile metadata changes.
- `pnpm typecheck`, `pnpm lint`, and `pnpm test` pass from `app/`.
- `pnpm build` passes from `app/`.
- Repository-wide search finds no references to removed modules, except intentional historical/test contract text that does not load them.
- No migration, Supabase schema, generated type, active route, or protected pilot file changes.

### Scope Boundaries

In scope: the candidate files listed in U1, the unused React Query Devtools dependency, and lockfile entries required by that dependency removal.

Out of scope: migrations and schema, generated types, API or UI redesign, phone-validator consolidation, export-style cleanup, broad barrel pruning, attendance and diary compatibility code, pilot and demo scripts, and removal of `supabase`.

### Dependencies

The dependency cleanup requires the existing pnpm lockfile and the package manager version documented by the repository. The source cleanup depends on current import and test-contract searches remaining clean.

### Sources / Research

- `CONTEXT.md` defines canonical attendance, diary, pilot, demo, generated-type, and command boundaries.
- `app/knip.json` and `pnpm exec knip --reporter compact` provide candidate signals only; the implementation must corroborate every deletion.
- `app/lib/api/base.ts` is the active API service base used by concrete API services.
- `app/app/(dashboard)/layout.tsx` shows active layout imports are direct and do not use the deleted barrel.
- `app/tests/unit/attendance/frequency-policy-contract.test.ts` names `components/diary/RiskAlert.tsx` as a protected policy surface, so that file remains untouched.
- `app/tests/unit/demo-sandbox/demo-demoable-flows.test.ts` protects the direct `ui/page-header` import and the absence of an enhanced-breadcrumb dependency; it does not authorize wiring a replacement.

## Planning Contract

### Key Technical Decisions

- KTD1. Delete disconnected implementations instead of merging them into active modules. Their contracts differ, and no active caller requires a compatibility bridge.
- KTD2. Treat Knip as a candidate detector, not authority. Exclude files referenced by tests, package scripts, routes, generated surfaces, or documented compatibility contracts.
- KTD3. Keep dependency cleanup separate from source deletion in the implementation sequence so lockfile changes remain attributable and can be validated independently.
- KTD4. Do not alter public names or behavior while simplifying. The phone validators, duplicate exports, and active barrels remain unchanged until a separate compatibility-reviewed change proves equivalence.

### High-Level Technical Design

The change has two layers:

1. Verify the candidate graph with repository-wide imports, route references, package scripts, test path reads, and protected-file checks.
2. Delete only the disconnected files, remove the unused dependency through pnpm, then validate the resulting application with typecheck, lint, tests, and build.

No runtime path is replaced. The active application continues to import concrete layout components directly and concrete API services from `lib/api/base.ts`.

### System-Wide Impact

The source deletions reduce the application source graph but do not alter the active route graph. The package cleanup reduces install-time dependencies. TypeScript, ESLint, Vitest, and Next build resolution provide the primary checks that no active consumer remains.

### Risks & Dependencies

- Hidden consumers outside this checkout cannot be proven. This repository is an application, not a published component package, so the boundary is the in-repository route and import graph.
- A file can look unused to Knip while serving as a package script or path-based test fixture. U1 must check those surfaces before deletion.
- `app/lib/api/enhanced-base.ts` defines a different `BaseApiService` from `app/lib/api/base.ts`; merging instead of deleting could alter service behavior.
- Removing a package can expose an implicit install or config dependency. Frozen installation, typecheck, lint, tests, and build must all pass.

### Sequencing

U1 performs source candidate verification and deletion. U2 removes the unused dependency and lockfile entries. U3 performs repository-wide contract checks and the required validation commands. U2 can follow U1; U3 depends on both.

## Implementation Units

### U1. Remove disconnected application modules

**Goal:** Remove source files that are unused and disconnected from active routes, providers, tests, scripts, and generated surfaces.

**Requirements:** R1, R2, R3, R6, R7.

**Files:**

- `app/lib/api/enhanced-base.ts`
- `app/lib/ip-tracking.ts`
- `app/components/dashboard/minhas-turmas-card.tsx`
- `app/components/layout/enhanced-breadcrumbs.tsx`
- `app/components/layout/navigation-provider.tsx`
- `app/components/layout/index.ts`
- `app/components/layout/global-search.tsx`
- `app/contexts/search-context.tsx`
- `app/hooks/use-diary-query.ts`
- `app/components/identity/educa-logo-v2.tsx`

**Approach:** Reconfirm each path has no active import, dynamic import, route entry, script reference, test path contract, or generated role. Preserve `app/components/diary/RiskAlert.tsx`, active layout components, and all compatibility files. Delete only the listed files after the checks pass. Do not replace their callers because there are no callers to preserve.

**Test Scenarios:**

- Active dashboard, layout, diary, and identity imports resolve without the deleted barrels or modules.
- No test reads a deleted file as a policy or fixture surface.
- No package script or route references a deleted module.
- The active application still imports `BaseApiService` from `app/lib/api/base.ts`.

**Verification:** Run targeted repository-wide searches, then `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` from `app/`.

### U2. Remove the unused React Query Devtools dependency

**Goal:** Align the package manifest and lockfile with the source graph.

**Requirements:** R4, R5, R6.

**Files:**

- `app/package.json`
- `app/pnpm-lock.yaml`

**Approach:** Remove only `@tanstack/react-query-devtools` through the repository's pnpm workflow. Keep `supabase` and every package script unchanged. Inspect the lockfile diff to confirm that only the unused dependency and its now-unreachable transitive entries change.

**Test Scenarios:**

- Repository search finds no import or configuration reference to React Query Devtools.
- `pnpm install --frozen-lockfile` accepts the updated manifest and lockfile.
- The active React Query provider still resolves from `@tanstack/react-query`.

**Verification:** Run `pnpm install --frozen-lockfile`, then the required typecheck, lint, test, and build commands from `app/`.

### U3. Reconcile and validate the simplified graph

**Goal:** Prove that simplification did not change active behavior or protected project surfaces.

**Requirements:** R3, R5, R6, R7.

**Files:** No planned source changes. Inspect the U1 and U2 diff plus relevant route, test, package, and context files.

**Approach:** Review the complete diff against the branch base. Run Knip as a post-change signal without treating every remaining report as actionable. Confirm that migrations, generated types, pilot files, and database tests remain untouched. Run all required checks and revert any simplification that causes a failure or changes an active contract.

**Test Scenarios:**

- TypeScript resolves all active imports after deletion.
- ESLint reports no new errors.
- Enabled unit tests pass without weakened or removed assertions.
- Next production build resolves the active route graph.
- Git diff contains no files under `supabase/migrations/` and no change to `app/types/database.ts`.

**Verification:** `pnpm typecheck`; `pnpm lint`; `pnpm test`; `pnpm build`; `pnpm exec knip --reporter compact` for post-change inspection; `git diff --check`; and a final diff/path audit.

## Verification Contract

Run these commands from `app/`:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm exec knip --reporter compact
```

Run these repository-root checks:

```bash
git diff --check
git diff --name-only <base>...HEAD
git grep -n -E "enhanced-base|ip-tracking|minhas-turmas-card|enhanced-breadcrumbs|navigation-provider|global-search|search-context|use-diary-query|educa-logo-v2|react-query-devtools" -- app ':!app/pnpm-lock.yaml'
```

The final grep may return intentional historical or test text. Review each match. It must not reveal an active import or package declaration. Do not run database reset, migration, or pilot commands because this change does not touch their surfaces.

## Definition of Done

- All U1 candidate deletions passed the import, route, script, test-contract, generated-surface, and compatibility checks.
- U2 changed only the unused React Query Devtools dependency and lockfile consequences.
- U3 completed all required checks with passing results.
- No API response, UI rendering, route path, auth behavior, database schema, generated type, or pilot boundary changed.
- No compatibility exports or validator behavior were removed.
- The working tree contains no abandoned experiment or untracked build artifact.
- The final commit contains the complete simplification as one atomic change.
