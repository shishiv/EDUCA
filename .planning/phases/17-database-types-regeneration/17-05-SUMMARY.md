---
phase: 18-database-types-regeneration
plan: 05
subsystem: api
tags: [vivencias, api-routes, stub, typescript, supabase]

# Dependency graph
requires:
  - phase: 18-02
    provides: "regenerated database types (confirmed vivencias table missing)"
provides:
  - "vivencias API routes that compile without database table"
  - "stubbed vivencias service that returns 501 Not Implemented"
affects: [future-vivencias-migration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Stub pattern for missing database tables (return 501)"
    - "Graceful feature degradation without breaking compilation"

key-files:
  created: []
  modified:
    - "gestao_fronteira/app/api/vivencias/route.ts"
    - "gestao_fronteira/app/api/vivencias/[id]/route.ts"
    - "gestao_fronteira/lib/api/vivencias.ts"

key-decisions:
  - "Stub routes with 501 Not Implemented instead of commenting out or deleting"
  - "Keep input types (CreateVivenciaInput, UpdateVivenciaInput) for future implementation"
  - "Log warnings when stub methods called to help identify usage"

patterns-established:
  - "Missing table stub pattern: Return 501 with clear error message, log warnings on service method calls"

# Metrics
duration: 19min
completed: 2026-01-24
---

# Phase 18 Plan 05: Fix Vivencias API Summary

**Stubbed vivencias API routes to return 501 Not Implemented since table does not exist in production database**

## Performance

- **Duration:** 19 min
- **Started:** 2026-01-24T18:57:31Z
- **Completed:** 2026-01-24T19:17:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Confirmed vivencias table NOT in database (grep types/database.ts)
- Confirmed users table has `nome` not `nome_completo` column
- Replaced 279-line route.ts with 35-line stub returning 501
- Replaced 367-line [id]/route.ts with 42-line stub returning 501
- Replaced 254-line lib/api/vivencias.ts with 123-line stubbed service
- Reduced codebase by 700+ lines of non-functional code
- All vivencias files now compile without type errors

## Task Commits

All tasks committed atomically in single commit (assessment + stub implementation):

1. **Task 1: Assess vivencias table status** - `689e2c0` (fix)
2. **Task 2: Fix or stub vivencias API routes** - `689e2c0` (fix)
3. **Task 3: Fix lib/api/vivencias.ts** - `689e2c0` (fix)

**Plan metadata:** (pending)

## Files Created/Modified

- `gestao_fronteira/app/api/vivencias/route.ts` - Stubbed GET/POST returning 501
- `gestao_fronteira/app/api/vivencias/[id]/route.ts` - Stubbed GET/PUT/DELETE returning 501
- `gestao_fronteira/lib/api/vivencias.ts` - Stubbed service class with warning logging

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Stub with 501 instead of delete | Preserves API contract, allows future implementation without breaking changes |
| Keep type definitions | CreateVivenciaInput/UpdateVivenciaInput useful when table is created |
| Log warnings on method calls | Helps identify UI code calling these methods for future fixes |
| Single commit for all tasks | Tasks are tightly coupled - assessment determines stub approach |

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - straightforward stub implementation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Vivencias routes compile and return clear 501 error
- No type errors from vivencias code
- When vivencias table migration is created, restore full implementation
- Consider creating vivencias migration in future phase

**Remaining build errors:** ~30 errors in attendance-immutability.ts, attendance-locking.ts, attendance-workflow.ts (schema mismatch - separate plan 18-06 through 18-10)

---
*Phase: 18-database-types-regeneration*
*Completed: 2026-01-24*
