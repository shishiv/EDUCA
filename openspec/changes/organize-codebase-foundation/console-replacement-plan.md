# Console.* Replacement Plan - Task 10

**Status**: In Progress
**Estimated Time**: 8 hours
**Date**: 2025-11-18

---

## Executive Summary

**Total Console.* Calls**: 833 occurrences across 96 files
**Already Commented**: ~70% (583 calls)
**Active - Need Replacement**: ~20% (167 calls)
**Scripts/Tests**: ~10% (83 calls)

**Logger System**: ✅ Already implemented in `lib/logger.ts` with:
- Structured logging with educational context
- Log levels: debug, info, warn, error, critical
- Performance tracking
- Educational-specific methods
- Auto-flush and buffering

---

## Phase 1: Remove Commented Console.* (1-2h) ⚡ QUICK WIN

**Goal**: Clean up 583 commented console.* calls that are already disabled

**Pattern to remove**:
```typescript
// console.log(...)
// console.error(...)
// console.warn(...)
// console.info(...)
// console.debug(...)
```

**Files with most commented calls** (Top 10):
1. `lib/api/attendance.ts` - 12 commented
2. `lib/api/audit.ts` - 7 commented
3. `lib/api/base.ts` - 8 commented
4. `lib/api/users.ts` - 6 commented
5. `lib/api/students.ts` - 9 commented
6. `components/students/enhanced-student-registration-form.tsx` - 7 commented
7. `lib/audit.ts` - 7 commented
8. `components/classes/teacher-assignment.tsx` - 3 commented
9. `components/admin/users/bulk-user-operations.tsx` - 3 commented
10. `lib/auth.ts` - 3 commented

**Strategy**:
- Use regex to find and remove all commented console.* calls
- Verify no code breakage with `pnpm typecheck`
- Commit as "chore: remove commented console.* calls"

---

## Phase 2: Replace Active Console.* in Production Code (4-5h) 🔴 HIGH PRIORITY

**Goal**: Replace 167 active console.* calls with structured logger

### Priority 1: Error Handling (2h)

**Files with active console.error**:
1. `app/(auth)/role-selection/page.tsx:78`
   ```typescript
   // BEFORE
   console.error('Error setting role:', error)

   // AFTER
   import { logger } from '@/lib/logger'
   logger.error('Error setting role', error, {
     feature: 'auth',
     action: 'set_role',
     userId: user?.id
   })
   ```

2. `components/attendance/FecharAulaDialog.tsx:28`
   ```typescript
   // BEFORE
   console.error('Erro ao fechar aula:', error)

   // AFTER
   import { logger } from '@/lib/logger'
   logger.error('Erro ao fechar aula', error, {
     feature: 'attendance',
     action: 'close_session',
     sessionId: sessionId
   })
   ```

3. `components/attendance/AbrirAulaWorkflow.tsx:26`
   ```typescript
   // BEFORE
   console.error('Erro ao abrir aula:', error)

   // AFTER
   import { logger } from '@/lib/logger'
   logger.error('Erro ao abrir aula', error, {
     feature: 'attendance',
     action: 'open_session',
     classId: classId
   })
   ```

4. `lib/api/attendance.ts` (3 active calls: lines 476, 486, 496)
5. `lib/monitoring/metrics.ts` (4 active calls)

### Priority 2: Informational Logging (1h)

**Files with active console.log**:
1. `components/students/enhanced-student-registration-form.tsx` (4 calls)
   - Auto-save logging
   - Form submission logging
   - Draft saving
   - Validation logging

2. `components/providers/service-worker-provider.tsx:27`
   - Service worker installation success

### Priority 3: Warnings (30min)

**Files with active console.warn**:
1. `lib/ip-tracking.ts:115`
   ```typescript
   // BEFORE
   console.warn(`Invalid IP format detected: ${ip}`)

   // AFTER
   import { logger } from '@/lib/logger'
   logger.warn(`Invalid IP format detected: ${ip}`, {
     feature: 'security',
     action: 'ip_validation',
     metadata: { invalidIp: ip }
   })
   ```

### Priority 4: Bulk Replacement in API Layer (1-2h)

**Pattern for API layer**:
```typescript
// BEFORE
try {
  // API operation
} catch (error) {
  // console.error('Error message:', error)
  throw error
}

// AFTER
import { logger } from '@/lib/logger'

try {
  // API operation
} catch (error) {
  logger.error('Error message', error, {
    feature: 'api_resource',
    action: 'operation_name',
    metadata: { /* relevant context */ }
  })
  throw error
}
```

**Files to update**:
- `lib/api/attendance.ts`
- `lib/api/audit.ts`
- `lib/api/base.ts`
- `lib/api/users.ts`
- `lib/api/students.ts`
- `lib/api/classes.ts`
- `lib/api/schools.ts`
- `lib/api/reports.ts`
- `lib/api/rate-limiting.ts`
- `lib/api/multi-guardian.ts`
- `lib/api/inep-integration.ts`
- `lib/api/error-handler.ts`
- `lib/api/enhanced-attendance.ts`
- `lib/api/enhanced-base.ts`
- `lib/api/configs.ts`
- `lib/api/class-diary.ts`
- `lib/api/advanced-reports.ts`

---

## Phase 3: Scripts & Tests (1h) 🔧 MEDIUM PRIORITY

**Decision**: Keep console.* in scripts and tests for debugging, but add logging option

**Files**:
- `scripts/*.ts` - Keep console.* (48 calls)
- `__tests__/**/*.test.ts` - Keep console.* (35 calls)
- `tests/**/*.spec.ts` - Keep console.* (48 calls)
- `public/sw.js` - Keep console.* (service worker debugging)

**Exception**: Add environment check
```typescript
if (process.env.DEBUG) {
  console.log('Debug info')
}
```

---

## Phase 4: Validation & Documentation (30min)

**Checklist**:
- [ ] Run `pnpm typecheck` - ensure no TypeScript errors
- [ ] Run `pnpm lint` - ensure no linting issues
- [ ] Search for remaining console.* in production code
- [ ] Update CHANGELOG.md with breaking changes
- [ ] Update logger usage documentation
- [ ] Git commit: "feat(logging): replace console.* with structured logger"

**Expected Impact**:
- Reduced console.* calls: 833 → ~83 (scripts/tests only)
- Production code: 100% using structured logger
- Improved debugging with context and feature tracking
- Better production monitoring and error aggregation

---

## Conversion Reference

### Error Handling Pattern
```typescript
// Feature contexts by file location
const featureContexts = {
  'app/(auth)': 'auth',
  'components/attendance': 'attendance',
  'components/students': 'students',
  'components/admin': 'admin',
  'components/classes': 'classes',
  'components/schools': 'schools',
  'lib/api': 'api',
  'lib/auth': 'auth',
  'lib/audit': 'audit',
}

// Common action patterns
const actionPatterns = {
  'creating': 'create',
  'updating': 'update',
  'deleting': 'delete',
  'fetching': 'fetch',
  'loading': 'load',
  'saving': 'save',
  'validating': 'validate',
}
```

### Logger Import Pattern
```typescript
import { logger } from '@/lib/logger'

// In error handlers
logger.error(message, error, context)

// In info logging
logger.info(message, context)

// In warnings
logger.warn(message, context)

// Performance tracking
const metrics = logger.startPerformanceTracking('operation-name')
// ... operation
logger.endPerformanceTracking('operation-name', metrics, context)
```

---

## Automation Strategy

**Option 1**: Manual replacement with search/replace (safer, 8h)
**Option 2**: Automated script with verification (faster, 4h + 2h validation)

**Recommended**: Hybrid approach
1. Phase 1: Automated removal of commented calls (30min)
2. Phase 2: Manual replacement with AI assistance (4h)
3. Phase 3: Keep as-is (0h)
4. Phase 4: Validation (30min)

**Total Time**: ~5 hours (instead of 8h estimated)

---

## Risk Assessment

**Low Risk**:
- Removing commented console.* calls (already disabled)
- Adding logger imports (non-breaking)

**Medium Risk**:
- Changing error handling patterns (need thorough testing)
- Bulk replacements (potential context errors)

**Mitigation**:
- Incremental commits per file/feature
- TypeScript compilation after each change
- Manual review of each replacement
- E2E test suite run before final commit

---

## Success Criteria

✅ Zero active console.* calls in production code
✅ All error handling uses structured logger
✅ All logger calls include proper context (feature, action)
✅ TypeScript compilation succeeds
✅ No regression in existing functionality
✅ Documentation updated

---

**Next Step**: Begin Phase 1 - Remove commented console.* calls
