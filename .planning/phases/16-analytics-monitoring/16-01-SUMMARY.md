---
phase: 16-analytics-monitoring
plan: 01
subsystem: providers
tags: [cleanup, analytics, posthog, turbopack]

# Dependency graph
requires:
  - phase: none
    provides: N/A
provides:
  - Clean codebase with no dead analytics code
  - Layout renders without unnecessary provider wrappers
  - Logger without external service TODOs
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: []
  removed: [posthog-js]

key-files:
  created: []
  modified:
    - gestao_fronteira/app/layout.tsx
    - gestao_fronteira/components/providers/index.ts
    - gestao_fronteira/lib/logger.ts
    - gestao_fronteira/instrumentation.ts
    - gestao_fronteira/.env.example
  deleted:
    - gestao_fronteira/components/providers/PostHogProvider.tsx

key-decisions:
  - "User decided NOT to implement analytics - cleanup instead of integration"
  - "Keep logger.sendToMonitoringService method for potential future use"
  - "Keep instrumentation.ts minimal stub (Next.js may require it)"

patterns-established: []

# Metrics
duration: 10min
completed: 2026-01-24
---

# Phase 16-01: Analytics Cleanup Summary

**Removed all PostHog analytics placeholder code - 51 lines deleted across 6 files, codebase now clean of dead analytics integration**

## Performance

- **Duration:** 10 min
- **Started:** 2026-01-24T11:36:16Z
- **Completed:** 2026-01-24T11:45:43Z
- **Tasks:** 6
- **Files modified:** 5 (1 deleted)

## Accomplishments

- Deleted PostHogProvider.tsx passthrough component
- Removed PHProvider wrapper from RootLayout (layout.tsx)
- Cleaned providers barrel export (index.ts)
- Removed PostHog TODO comments and imports from logger.ts
- Simplified instrumentation.ts to minimal stub
- Removed PostHog env vars from .env.example

## Task Commits

All 6 tasks committed atomically in single cleanup commit:

1. **Task 1: Delete AnalyticsProvider.tsx** - `2a9ba26` (chore)
2. **Task 2: Remove AnalyticsProvider from layout.tsx** - `2a9ba26` (chore)
3. **Task 3: Remove AnalyticsProvider export from index.ts** - `2a9ba26` (chore)
4. **Task 4: Remove TODO comment from logger.ts** - `2a9ba26` (chore)
5. **Task 5: Delete or minimize instrumentation.ts** - `2a9ba26` (chore)
6. **Task 6: Remove PostHog env vars from .env.example** - `2a9ba26` (chore)

_Note: All tasks combined into single atomic commit as they're all part of same cleanup objective._

## Files Created/Modified

- `gestao_fronteira/components/providers/PostHogProvider.tsx` - DELETED (37 lines removed)
- `gestao_fronteira/app/layout.tsx` - Removed PHProvider import and wrapper
- `gestao_fronteira/components/providers/index.ts` - Removed PHProvider export
- `gestao_fronteira/lib/logger.ts` - Removed PostHog import and TODO comments
- `gestao_fronteira/instrumentation.ts` - Simplified to minimal stub
- `gestao_fronteira/.env.example` - Removed PostHog env var placeholders

## Lines Changed

- **Insertions:** 9
- **Deletions:** 60
- **Net:** -51 lines

## Decisions Made

1. **Single commit for all tasks** - All 6 tasks are part of the same cleanup objective, atomic commit preserves intent
2. **Keep logger.sendToMonitoringService method** - Useful stub for potential future analytics integration
3. **Keep instrumentation.ts as minimal stub** - Next.js may require the file to exist

## Deviations from Plan

### Plan Mismatch: File naming

**Found during:** Task 1

**Issue:** Plan referenced `AnalyticsProvider.tsx` but actual committed file was `PostHogProvider.tsx` with `PHProvider` export. The working directory had an untracked `AnalyticsProvider.tsx` placeholder.

**Resolution:** Deleted `PostHogProvider.tsx` (the committed file), cleaned up `PHProvider` references. The untracked `AnalyticsProvider.tsx` was already deleted from working directory.

**Impact:** None - both files are now removed, codebase is clean.

---

**Total deviations:** 1 minor (file naming difference)
**Impact on plan:** Plan objectives fully achieved despite naming mismatch.

## Issues Encountered

1. **Build fails on typecheck** - Pre-existing issue documented in STATE.md: database types missing `relatorios_descritivos` table. NOT caused by analytics cleanup. Requires `supabase gen types` regeneration (out of scope for this plan).

2. **Git staging** - The `AnalyticsProvider.tsx` file was untracked (new file), so deleting it didn't create a git operation. The actual committed file was `PostHogProvider.tsx` which was properly staged and deleted.

## Requirements Closed

By user decision not to implement analytics, the following requirements from the original roadmap are CLOSED:

- **ANL-01:** PostHog integration - CLOSED (user decision: no analytics)
- **ANL-02:** Sentry error tracking - CLOSED (user decision: no analytics)
- **ANL-03:** Dashboard metrics - CLOSED (user decision: no analytics)
- **ANL-04:** E2E verification - CLOSED (out of scope without analytics)

## User Setup Required

None - this plan removes configuration, doesn't add any.

## Next Phase Readiness

- Analytics placeholder code completely removed
- Codebase is cleaner (~51 lines removed)
- **Blocker:** TypeScript build still fails due to missing `relatorios_descritivos` types (pre-existing issue, needs Phase 18 DB types regeneration)

---
*Phase: 16-analytics-monitoring*
*Completed: 2026-01-24*
