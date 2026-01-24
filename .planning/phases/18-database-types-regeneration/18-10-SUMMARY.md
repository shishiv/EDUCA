---
phase: 18-database-types-regeneration
plan: 10
subsystem: hooks-lib-api
tags: [typescript, hooks, lib-utilities, api-routes, type-errors]
dependency-graph:
  requires: [18-02, 18-03, 18-07, 18-08, 18-09]
  provides: [error-free-hooks, error-free-lib, error-free-api-routes]
  affects: []
tech-stack:
  added: []
  patterns: [error-instanceof-pattern, nullish-coalescing]
key-files:
  created: []
  modified:
    - gestao_fronteira/hooks/use-service-worker.ts
    - gestao_fronteira/hooks/use-users-query.ts
    - gestao_fronteira/lib/auth.ts
    - gestao_fronteira/lib/seed-data.ts
    - gestao_fronteira/lib/validation/descriptive-report.ts
    - gestao_fronteira/app/api/compliance/warnings/route.ts
    - gestao_fronteira/app/api/health/route.ts
    - gestao_fronteira/app/api/search/route.ts
decisions: []
metrics:
  duration: 15 minutes
  completed: 2026-01-24
---

# Phase 18 Plan 10: Fix Hooks, Lib Utilities, and Remaining API Routes Summary

**One-liner:** Fixed TypeScript errors in hooks, lib utilities, and API routes by correcting type imports, error handling patterns, and nullish coalescing.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Fix hooks (use-service-worker.ts, use-users-query.ts) | aee8bf3 |
| 2 | Fix lib utilities (auth.ts, seed-data.ts, descriptive-report.ts) | c1fba44 |
| 3 | Fix API routes (compliance/warnings, health, search) | 26a5b5e |

## Changes Made

### Task 1: Fix Hooks

**use-service-worker.ts:**
- Replaced `SyncManager` type with inline interface (Background Sync API)
- Fixed error parameter to use `instanceof Error` pattern for logger.error

**use-users-query.ts:**
- Imported action functions (`addRecentActivity`, `clearBulkSelection`, `addNotification`) from app-store module instead of trying to access them from state
- Removed non-existent `subscribe()` method usage from usersApi
- Converted useUsersSubscription to a placeholder for future Supabase realtime implementation

### Task 2: Fix Lib Utilities

**lib/auth.ts:**
- Fixed AuthUser interface to use `Omit<User, 'user_metadata'>` instead of extending with incompatible user_metadata property

**lib/seed-data.ts:**
- Expanded clearSeedData from dynamic loop to explicit table calls to work with TypeScript's strict type checking for Supabase table names

**lib/validation/descriptive-report.ts:**
- Fixed Zod `.max()` validation message syntax from function callback to object form `{ message: ... }`

### Task 3: Fix API Routes

**compliance/warnings/route.ts:**
- Converted `count` property from `number | null` to `number | undefined` using nullish coalescing
- Fixed logger.error to use `instanceof Error` pattern

**health/route.ts:**
- Fixed logger.error calls in two locations to use `instanceof Error` pattern

**search/route.ts:**
- Fixed logger.error to use `instanceof Error` pattern

## Deviations from Plan

### Files Not Modified (No Errors Found)

The following files listed in the plan had no TypeScript errors:
- `gestao_fronteira/hooks/use-auth.ts` - Already type-safe
- `gestao_fronteira/hooks/use-diary-query.ts` - Already type-safe
- `gestao_fronteira/lib/validation/lesson-content.ts` - Already type-safe

## Verification

All files specified in the plan are now error-free:
```bash
pnpm typecheck 2>&1 | grep -E "hooks/use-auth|hooks/use-diary|hooks/use-service|hooks/use-users|lib/auth\.ts|lib/seed-data|lib/validation/descriptive|lib/validation/lesson|api/health/route|api/search/route|api/compliance/warnings"
# (no output = no errors in these files)
```

## Notes

- The plan goal of "zero TypeScript errors" refers to the specific files targeted, not the entire codebase
- Pre-existing errors in other files (components/diary, lib/realtime, etc.) are out of scope for this plan
- The error `instanceof Error` pattern is now consistently applied across API routes and hooks

## Next Phase Readiness

This plan completes the Phase 18 wave of type error fixes. Remaining errors are in:
- `components/diary/*` (LessonContentForm, NewLessonModal)
- `components/attendance/*` (AttendanceGrid, FrequenciaWorkflow)
- `lib/realtime/session-realtime.ts`
- Various API routes (frequencia, sessoes/aula)

These would require separate plans to address schema mismatches and React Hook Form type issues.
