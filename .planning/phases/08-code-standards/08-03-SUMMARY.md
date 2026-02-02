---
phase: "08"
plan: "03"
subsystem: code-standards
tags: [api-layer, logger, refactoring, code-quality]
depends_on:
  requires:
    - "08-01" # API services foundation
    - "08-02" # Logger integration
  provides:
    - Inline queries migrated to API services in report/chamada pages
    - All API services using structured logger
    - No console calls in target files
  affects:
    - "08-04" # Page/component logger migration
tech-stack:
  added: []
  patterns:
    - API service methods for report filtering
    - Chamada-specific methods in attendanceApi
    - Role-checking method in usersApi
key-files:
  created: []
  modified:
    - lib/api/reports.ts
    - lib/api/classes.ts
    - lib/api/attendance.ts
    - lib/api/users.ts
    - lib/api/error-handler.ts
    - lib/api/rate-limiting.ts
    - app/(dashboard)/relatorios/frequencia/page.tsx
    - app/(dashboard)/relatorios/bolsa-familia/page.tsx
    - app/(dashboard)/relatorios/conteudo/page.tsx
    - app/(dashboard)/dashboard/turmas/[id]/chamada/page.tsx
decisions: []
metrics:
  duration: "~22min"
  completed: "2026-01-19"
---

# Phase 08 Plan 03: Inline Queries to API Services Summary

Migrated inline Supabase queries from report pages and chamada page to centralized API services, ensuring consistent data access patterns and structured logging.

## What Was Built

### 1. ReportsApiService Extensions (lib/api/reports.ts)
- `getTurmasForFilters()` - Get turmas with escola for report filters
- `getSchoolsForFilters()` - Get schools for bolsa-familia filters
- `getTurmasBySchool(escolaId)` - Get turmas by school for cascading filters

### 2. ClassesApiService Extension (lib/api/classes.ts)
- `getClassWithSchool(classId)` - Get single class with escola info for chamada header

### 3. AttendanceApiService Extensions (lib/api/attendance.ts)
- `getStudentsForChamada(turmaId)` - Get enrolled students with matriculaId and hasNis
- `getAttendanceForDate(turmaId, dateStr)` - Get session and attendance records
- `saveChamada(turmaId, dateStr, sessionId, records)` - Save chamada with session creation

### 4. UsersApiService Extension (lib/api/users.ts)
- `getCurrentUserRole()` - Get current authenticated user's role for BF visibility

### 5. Page Migrations

| Page | Queries Removed | console.* Migrated |
|------|-----------------|---------------------|
| frequencia/page.tsx | 1 (turmas) | 4 (to logger) |
| bolsa-familia/page.tsx | 2 (escolas, turmas) | 5 (to logger) |
| conteudo/page.tsx | 1 (turmas) | 3 (to logger) |
| chamada/page.tsx | 6 (turmas, matriculas, sessoes, frequencia, users) | 5 (to logger) |

### 6. API Service Console Migration
- error-handler.ts: console.log -> logger.info for audit
- rate-limiting.ts: console.warn -> logger.warn for rate limits
- rate-limiting.ts: console.log -> logger.logComplianceEvent for compliance

## Commits

| Hash | Description |
|------|-------------|
| 97d2a89 | refactor(08-03): migrate report pages to API layer |
| f0388d3 | refactor(08-03): migrate chamada page to API layer |
| 7dd647b | refactor(08-03): migrate remaining console calls to logger |

## Files Modified

### API Services
- `lib/api/reports.ts` - +3 methods for report filtering
- `lib/api/classes.ts` - +1 method for class with school
- `lib/api/attendance.ts` - +3 methods for chamada operations
- `lib/api/users.ts` - +1 method for current user role
- `lib/api/error-handler.ts` - console.log to logger.info
- `lib/api/rate-limiting.ts` - console.warn/log to logger.warn/logComplianceEvent

### Pages
- `app/(dashboard)/relatorios/frequencia/page.tsx` - full migration
- `app/(dashboard)/relatorios/bolsa-familia/page.tsx` - full migration
- `app/(dashboard)/relatorios/conteudo/page.tsx` - full migration
- `app/(dashboard)/dashboard/turmas/[id]/chamada/page.tsx` - full migration

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

```bash
# Zero inline queries in target files
grep -c "supabase\.from" relatorios/**/*.tsx chamada/*.tsx
# Result: 0

# Zero console calls in target files
grep -c "console\." relatorios/**/*.tsx chamada/*.tsx
# Result: 0

# TypeScript compiles without errors
pnpm typecheck
# Result: Success
```

## Next Phase Readiness

Ready for 08-04 (page/component logger migration). The API layer patterns established here provide a template for migrating remaining pages and components to use structured logging.

## Technical Notes

1. **Type Reuse**: Report pages now use `ReportTurma` and `ReportSchool` types from lib/api/reports.ts instead of defining local interfaces

2. **Map Handling**: The attendance API returns `Map<string, {...}>` which required conversion in the chamada page to match component's `AttendanceRecord` type

3. **Session Handling**: `getAttendanceForDate` uses `.maybeSingle()` instead of `.single()` to avoid errors when no session exists

4. **Supabase Client**: Some pages still import supabase for other purposes (e.g., passing to report generation functions that accept a client parameter)
