# Spec: Deep Cleaning (Console Logs & Code Refactoring)

**Capability:** `deep-cleaning`
**Change:** `organize-codebase-foundation`
**Status:** Proposed (FUTURE - Not part of initial change)
**Owner:** Development Team

---

## Overview

This spec defines requirements for deep code cleaning including console log replacement, TypeScript error fixes, API route consolidation, and dead code removal. This work is FUTURE-scoped and will be performed after surface chores are complete.

**Current Problem:**
- 646 console.* calls in 84 files (bypassing structured logger)
- 651 TypeScript errors (schema drift + Next.js 15 API changes)
- Duplicate API routes (/sessions vs /sessoes-aula)
- Unused components, utilities, and functions
- Inconsistent error handling patterns

**Solution:**
- Replace all console.* with structured logger
- Fix TypeScript errors (regenerate types, fix null safety)
- Consolidate duplicate API routes
- Remove dead code and unused imports
- Standardize error handling

---

## ADDED Requirements

### Requirement: LOG-001 - Centralized Structured Logging
**Priority:** HIGH
**Type:** Functional

All console.log, console.error, console.warn, console.info calls SHALL be replaced with the centralized logger system.

#### Scenario: Replacing console.error with logger
**Given** code contains `console.error('Error message', error)`
**When** deep cleaning is performed
**Then** it is replaced with `logger.error('Error message', error, { feature, action, context })`
**And** proper feature context is added
**And** error metadata is structured

#### Scenario: Replacing console.log with logger
**Given** code contains `console.log('Debug message', data)`
**When** deep cleaning is performed
**Then** it is replaced with `logger.debug('Debug message', { data, feature, action })`
**And** debug calls are only in development code
**And** no console.log remains in production code

#### Scenario: No console.* calls remain
**Given** deep cleaning is complete
**When** searching for console.* patterns
**Then** zero matches are found in app/, components/, lib/
**And** only test files and scripts use console if necessary
**And** production code uses logger exclusively

---

### Requirement: LOG-002 - Feature Context in Logs
**Priority:** MEDIUM
**Type:** Non-Functional

All logger calls SHALL include feature context to enable structured querying and debugging.

#### Scenario: Logger calls include feature context
**Given** code in lib/api/schools.ts logs an error
**When** logger is called
**Then** it includes `{ feature: 'schools', action: 'fetch_dashboard' }`
**And** metadata is structured and queryable
**And** logs can be filtered by feature

#### Scenario: Consistent feature naming
**Given** multiple files in the same feature domain
**When** they use logger
**Then** they use the same feature name (e.g., 'attendance')
**And** feature names match domain modules
**And** a feature naming convention exists

---

### Requirement: TS-001 - Zero TypeScript Errors
**Priority:** CRITICAL
**Type:** Non-Functional

The codebase SHALL compile with zero TypeScript errors in strict mode.

#### Scenario: Fixing Supabase schema drift
**Given** Supabase schema has changed (sessoes_aula table structure)
**And** TypeScript types are outdated
**When** types are regenerated
**Then** all 200+ schema-related errors are resolved
**And** code uses correct column names
**And** types match database schema

#### Scenario: Fixing Next.js 15 API changes
**Given** Next.js 15 changed cookies to async
**And** code uses synchronous cookie access
**When** API routes are updated
**Then** all cookie access uses await
**And** no "cookies is a Promise" errors exist
**And** middleware works correctly

#### Scenario: Fixing null safety issues
**Given** code has 100+ null safety violations
**When** fixes are applied
**Then** all variables are properly null-checked
**And** optional chaining is used correctly
**And** TypeScript strict mode passes

#### Scenario: TypeScript compiles without errors
**Given** deep cleaning is complete
**When** running `pnpm typecheck`
**Then** zero errors are reported
**And** build completes successfully
**And** production bundle is type-safe

---

### Requirement: API-001 - Consolidated API Routes
**Priority:** MEDIUM
**Type:** Functional

Duplicate API routes SHALL be consolidated with a single canonical endpoint.

#### Scenario: Consolidating session routes
**Given** /api/sessions and /api/sessoes-aula both exist
**And** they provide similar functionality
**When** consolidation is performed
**Then** a single canonical route is established (/api/sessoes-aula)
**And** old route redirects or shows deprecation warning
**And** all client code uses new route

#### Scenario: Standardizing route naming
**Given** routes use mix of Portuguese and English
**When** consolidation is performed
**Then** a consistent naming convention is established
**And** all routes follow the same pattern
**And** documentation reflects canonical routes

---

### Requirement: DEAD-001 - No Unused Code
**Priority:** MEDIUM
**Type:** Non-Functional

The codebase SHALL NOT contain unused imports, components, utilities, or functions.

#### Scenario: Removing unused components
**Given** components/ contains components never imported
**When** dead code removal is performed
**Then** all unused components are deleted
**And** no import errors occur
**And** bundle size decreases

#### Scenario: Removing unused utilities
**Given** lib/utils/ contains helper functions never called
**When** dead code removal is performed
**Then** unused functions are deleted
**And** remaining functions have clear purpose
**And** each utility is referenced at least once

#### Scenario: Removing unused types
**Given** types/ contains TypeScript types never used
**When** dead code removal is performed
**Then** unused types are deleted
**And** all remaining types are referenced
**And** no "unused import" warnings exist

---

### Requirement: ERR-001 - Standardized Error Handling
**Priority:** MEDIUM
**Type:** Functional

All error handling SHALL follow a consistent pattern using the centralized logger and error handler.

#### Scenario: API route error handling
**Given** API routes catch errors
**When** an error occurs
**Then** it is logged with logger.error()
**And** a structured error response is returned
**And** error includes requestId for tracing

#### Scenario: Component error boundaries
**Given** React components may throw errors
**When** an error occurs
**Then** ErrorBoundary catches it
**And** error is logged with component context
**And** user sees friendly error message

#### Scenario: Async operation error handling
**Given** async operations (DB queries, API calls) may fail
**When** an error occurs
**Then** it is caught and logged with context
**And** user is notified appropriately
**And** operation can be retried if safe

---

## MODIFIED Requirements

None (no existing requirements modified)

---

## REMOVED Requirements

None (no requirements removed)

---

## Dependencies

### Related Capabilities
- **Depends on:** `surface-chores` (must be complete first)
- **Enables:** Future development with clean codebase
- **Enables:** Production deployment (type-safe code)

### External Dependencies
- Supabase CLI (for type generation)
- TypeScript compiler
- ESLint with TypeScript support
- depcheck (for unused dependency detection)

---

## Implementation Notes

### Console Log Replacement Strategy

**Step 1: Automated Pattern Replacement**
```bash
# Find all console.* calls
rg -n "console\.(log|error|warn|info)" --type ts --type tsx gestao_fronteira/

# Create script to replace patterns
# scripts/replace-console-logs.ts
```

**Example Replacements:**
```typescript
// BEFORE
console.error('Error fetching students', error)

// AFTER
logger.error('Error fetching students', error as Error, {
  feature: 'students',
  action: 'fetch_list',
  context: { filters, pagination }
})

// BEFORE
console.log('User logged in', userId)

// AFTER
logger.info('User logged in', {
  feature: 'auth',
  action: 'login',
  metadata: { userId }
})
```

**Step 2: Manual Review**
- Review each replacement for proper feature context
- Ensure error metadata is structured
- Add action and context where relevant
- Remove debug console.log calls entirely

**Step 3: Validation**
```bash
# Verify no console.* remains
rg "console\.(log|error|warn|info)" app/ components/ lib/

# Should return 0 matches
```

---

### TypeScript Error Fix Strategy

**Step 1: Regenerate Supabase Types**
```bash
# Using Supabase MCP (MANDATORY)
# Use mcp__supabase__generate_typescript_types tool

# Types will be generated to lib/database.types.ts
```

**Step 2: Fix Next.js 15 API Changes**
```typescript
// BEFORE (synchronous)
const cookies = headers().cookies
const value = cookies.get('session')

// AFTER (async)
const cookieStore = await cookies()
const value = cookieStore.get('session')
```

**Step 3: Fix Null Safety**
```typescript
// BEFORE (unsafe)
const name = user.profile.name

// AFTER (safe)
const name = user?.profile?.name ?? 'Unknown'

// OR with guard
if (!user?.profile) {
  throw new Error('Profile not found')
}
const name = user.profile.name
```

**Step 4: Incremental Validation**
```bash
# Fix errors in batches
pnpm typecheck 2>&1 | head -50

# Fix 50 errors, then re-check
# Repeat until zero errors
```

---

### API Route Consolidation Strategy

**Step 1: Identify Duplicate Routes**
```bash
# Find duplicate functionality
ls app/api/sessions/
ls app/api/sessoes-aula/
```

**Step 2: Choose Canonical Route**
- Decision: Use Portuguese `/api/sessoes-aula` (aligns with Brazilian domain)
- Old route: `/api/sessions` → deprecated

**Step 3: Migration Path**
```typescript
// app/api/sessions/route.ts
export async function GET() {
  return NextResponse.json({
    error: 'DEPRECATED',
    message: 'Use /api/sessoes-aula instead',
    redirectTo: '/api/sessoes-aula'
  }, { status: 410 })
}
```

**Step 4: Update Client Code**
```typescript
// BEFORE
const response = await fetch('/api/sessions')

// AFTER
const response = await fetch('/api/sessoes-aula')
```

---

### Dead Code Removal Strategy

**Step 1: Automated Detection**
```bash
# Find unused dependencies
npx depcheck gestao_fronteira/

# Find unused exports
npx ts-prune gestao_fronteira/
```

**Step 2: Manual Review**
- Review each unused file/function
- Verify it's truly unused (check for dynamic imports)
- Delete if safe

**Step 3: Validation**
```bash
# Run full test suite
pnpm test

# Run build
pnpm build

# If both pass, deletion is safe
```

---

## Estimated Effort

### Task Breakdown
1. **Console Log Replacement**: 8 hours (646 instances / ~80 per hour)
2. **TypeScript Error Fixes**: 12 hours (651 errors / ~50 per hour)
3. **API Route Consolidation**: 4 hours
4. **Dead Code Removal**: 6 hours

**Total:** 30 hours

---

## Testing Strategy

### Console Log Replacement Testing
```bash
# 1. Verify no console.* remains
rg "console\.(log|error|warn|info)" app/ components/ lib/

# 2. Verify logger is imported
rg "import.*logger.*from.*@/lib/logger" app/ components/ lib/

# 3. Run app and check logs appear in development
pnpm dev
# Trigger errors and verify structured logs appear
```

### TypeScript Fix Testing
```bash
# 1. Full typecheck
pnpm typecheck
# Expected: 0 errors

# 2. Build production bundle
pnpm build
# Expected: Success

# 3. Run test suite
pnpm test
# Expected: All pass
```

### API Consolidation Testing
```bash
# 1. Test new canonical route
curl http://localhost:3000/api/sessoes-aula

# 2. Test old route shows deprecation
curl http://localhost:3000/api/sessions
# Expected: 410 Gone with deprecation message

# 3. Verify client code uses new route
rg "/api/sessions" app/ components/
# Expected: 0 matches (all updated to /api/sessoes-aula)
```

### Dead Code Testing
```bash
# 1. Run depcheck
npx depcheck

# 2. Run build
pnpm build

# 3. Run full test suite
pnpm test

# All should pass with no errors
```

---

## Success Criteria

Deep cleaning is complete when:
- [ ] Zero console.* calls in production code (646 → 0)
- [ ] Zero TypeScript errors (651 → 0)
- [ ] No duplicate API routes
- [ ] No unused dependencies (depcheck clean)
- [ ] No unused exports (ts-prune clean)
- [ ] All tests pass
- [ ] Production build succeeds
- [ ] Bundle size decreased (dead code removed)

---

## Rollback Plan

If deep cleaning breaks production:
1. `git revert` to previous commit (surface-chores complete)
2. Fix issues incrementally
3. Re-run validation before deploying

---

## Related Specs

- **Depends on:** `surface-chores` spec (must complete first)
- **Future:** `performance-optimization` spec
- **Future:** `bundle-size-reduction` spec
