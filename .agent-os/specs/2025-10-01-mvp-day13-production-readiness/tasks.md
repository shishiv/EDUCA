# Spec Tasks - MVP Day 13 Production Readiness

These are the tasks to be completed for the spec detailed in [@.agent-os/specs/2025-10-01-mvp-day13-production-readiness/spec.md](spec.md)

> Created: 2025-10-01
> Status: Ready for Implementation
> Target: 2025-10-13 MVP Launch

---

## Task Overview

| Task | Estimated Time | Priority | Dependencies |
|------|---------------|----------|--------------|
| Task 1: Fix TypeScript Errors | 3-4h | 🔴 P0 | None |
| Task 2: Implement Class Diary | 8-10h | 🔴 P0 | Task 1 |
| Task 3: Fix Test Configuration | 2h | 🟡 P1 | None |
| Task 4: E2E Testing & Validation | 4-6h | 🟡 P1 | Tasks 1, 2, 3 |

**Total:** 17-22 hours (~2-3 working days)

---

## Task 1: Fix TypeScript Build Errors ✅ COMPLETED

**Priority:** 🔴 P0 - BLOCKING MVP BUILD
**Estimated Time:** 3-4 hours
**Actual Time:** 1.5 hours
**Status:** ✅ Completed (2025-10-04)

### Objective
~~Migrate 7 API routes from Next.js 14 sync params to Next.js 15 async params pattern to fix TypeScript build errors.~~

**ACTUAL ROOT CAUSE:** Outdated Supabase TypeScript type definitions causing `never` type errors across the application.

### What Was Done

- [x] 1.1 Investigation & Discovery
  - [x] 1.1.1 Verified TypeScript errors with `bun run typecheck`
  - [x] 1.1.2 Discovered API routes were ALREADY migrated to Next.js 15 async params
  - [x] 1.1.3 Identified root cause: `types/database.ts` (5.3KB) was severely outdated
  - [x] 1.1.4 Found queries returning `never` types due to missing table definitions

- [x] 1.2 Supabase Type Regeneration
  - [x] 1.2.1 Regenerated types using `mcp__supabase__generate_typescript_types`
  - [x] 1.2.2 Created new `types/supabase.ts` (47KB) with complete schema definitions
  - [x] 1.2.3 Updated `types/database.ts` to match new types
  - [x] 1.2.4 Resolved all 27 database tables + views + functions type definitions

- [x] 1.3 Validation & Testing
  - [x] 1.3.1 ✅ `bun run build` passes successfully - all 40 routes compiled
  - [x] 1.3.2 ✅ Production build generates all pages without errors
  - [x] 1.3.3 ✅ Committed changes with proper documentation
  - [x] 1.3.4 ✅ Git commit: `83960dc` - "fix: regenerate Supabase TypeScript types"

### Acceptance Criteria
- ✅ `bun run build` completes successfully ✓ PASSED
- ✅ All database types properly defined ✓ PASSED
- ✅ No `never` type errors in queries ✓ PASSED
- ✅ All 40 application routes compile ✓ PASSED
- ✅ Code committed to main branch ✓ PASSED

### Files Modified
```
✅ types/supabase.ts (NEW - 47KB complete schema)
✅ types/database.ts (UPDATED - 5.3KB → 47KB)
✅ Git commit: 83960dc
```

### Lessons Learned
- **Original spec assumption was incorrect** - API routes were already Next.js 15 compatible
- **Real issue:** Outdated type definitions from Supabase schema evolution
- **Solution time:** 90% faster than estimated (1.5h vs 3-4h) due to correct diagnosis
- **Impact:** Unblocked entire MVP build pipeline

---

## Task 2: Implement Class Diary (Diário de Classe)

**Priority:** 🔴 P0 - BLOCKING MVP FEATURE
**Estimated Time:** 8-10 hours
**Status:** Not Started
**Dependencies:** Task 1 (TypeScript errors fixed)

### Objective
Create simplified class diary feature allowing teachers to view classes, conteúdo programático, and attendance history.

### Subtasks

- [ ] 2.1 API Layer Development
  - [ ] 2.1.1 Create `lib/api/class-diary.ts`
    - Implement `getClassDiary(turmaId, disciplinaId?)` - fetches sessions with stats
    - Implement `getAttendanceHistory(alunoId, turmaId)` - student attendance over time
    - Implement `getClassDetail(sessaoId)` - detailed session info
    - Add TypeScript interfaces for return types
    - **Estimated:** 2 hours

  - [ ] 2.1.2 Write unit tests for API functions
    - Test `getClassDiary` with various filters
    - Test `getAttendanceHistory` date ranges
    - Mock Supabase client responses
    - **Estimated:** 1 hour

- [ ] 2.2 UI Components Development
  - [ ] 2.2.1 Create `components/diary/class-diary-filter.tsx`
    - Turma selector (dropdown)
    - Disciplina selector (dropdown)
    - Date range picker (from/to)
    - "Buscar" button
    - Responsive design (mobile-first)
    - **Estimated:** 1.5 hours

  - [ ] 2.2.2 Create `components/diary/class-diary-list.tsx`
    - Table with columns: Data, Turma, Disciplina, Conteúdo, Presentes, Ausentes
    - Sortable columns
    - Pagination (20 per page)
    - Click row to open detail
    - Loading skeleton
    - **Estimated:** 2 hours

  - [ ] 2.2.3 Create `components/diary/class-diary-detail.tsx`
    - Modal or drawer component
    - Display full conteúdo programático
    - Show attendance stats (pie chart optional)
    - List students with attendance status
    - "Fechar" button
    - **Estimated:** 1.5 hours

- [ ] 2.3 Page Integration
  - [ ] 2.3.1 Create `app/(dashboard)/dashboard/diario/page.tsx`
    - Integrate all 3 components
    - Connect to API layer with TanStack Query
    - Handle loading/error states
    - Add breadcrumb navigation
    - Role-based access (professor, diretor, secretario, admin)
    - **Estimated:** 1.5 hours

  - [ ] 2.3.2 Update navigation sidebar
    - Add "Diário de Classe" menu item
    - Add BookOpen icon
    - Position after "Frequência"
    - **Estimated:** 15 minutes

- [ ] 2.4 Testing & Validation
  - [ ] 2.4.1 Manual testing
    - Test filters with real data
    - Verify pagination works
    - Test detail modal opens/closes
    - Check mobile responsiveness (375px, 768px, 1920px)
    - **Estimated:** 45 minutes

  - [ ] 2.4.2 Playwright MCP validation
    - Navigate to `/dashboard/diario`
    - Capture desktop screenshot
    - Resize to 375x667, capture mobile screenshot
    - Resize to 768x1024, capture tablet screenshot
    - Check console for errors
    - **Estimated:** 30 minutes

  - [ ] 2.4.3 Chrome DevTools MCP audit
    - Run Lighthouse audit
    - Verify Accessibility score > 95
    - Check network requests (should be < 5 for initial load)
    - Verify no console errors
    - **Estimated:** 30 minutes

### Acceptance Criteria
- ✅ Teachers can access `/dashboard/diario` page
- ✅ Filters work (turma, disciplina, date range)
- ✅ List displays classes with attendance stats
- ✅ Detail view shows full conteúdo + student list
- ✅ Page responsive on mobile (375px), tablet (768px), desktop (1920px)
- ✅ Playwright screenshots captured and saved
- ✅ Lighthouse Accessibility score > 95
- ✅ Zero console errors

### Files Created/Modified
```
lib/api/class-diary.ts (new)
components/diary/class-diary-filter.tsx (new)
components/diary/class-diary-list.tsx (new)
components/diary/class-diary-detail.tsx (new)
app/(dashboard)/dashboard/diario/page.tsx (new)
components/layout/sidebar.tsx (modified - add menu item)
```

---

## Task 3: Fix Test Configuration

**Priority:** 🟡 P1 - QUALITY ASSURANCE
**Estimated Time:** 2 hours
**Status:** Not Started

### Objective
Restore test suite to working state by fixing environment configuration and missing dependencies.

### Subtasks

- [ ] 3.1 Dependency Installation
  - [ ] 3.1.1 Install missing `@testing-library/user-event`
    - Run `bun add -d @testing-library/user-event`
    - Verify version compatibility with React Testing Library
    - **Estimated:** 5 minutes

  - [ ] 3.1.2 Verify all test dependencies installed
    - Check `jest`, `@testing-library/react`, `@testing-library/jest-dom`
    - Update if outdated
    - **Estimated:** 10 minutes

- [ ] 3.2 Environment Configuration
  - [ ] 3.2.1 Create `.env.test` file
    - Add `NEXT_PUBLIC_SUPABASE_URL` (test instance or mock)
    - Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` (test key or mock)
    - Add `SUPABASE_SERVICE_ROLE_KEY` (test key)
    - **Estimated:** 10 minutes

  - [ ] 3.2.2 Create `.env.test.example`
    - Template for other developers
    - Document required variables
    - **Estimated:** 10 minutes

  - [ ] 3.2.3 Update `jest.config.js`
    - Load `.env.test` in setup
    - Configure testEnvironment: 'jsdom'
    - Add setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
    - **Estimated:** 15 minutes

- [ ] 3.3 Test Setup File
  - [ ] 3.3.1 Update `tests/setup.ts`
    - Mock Supabase client if URL not provided
    - Set up React Testing Library globals
    - Configure jest-dom matchers
    - **Estimated:** 20 minutes

  - [ ] 3.3.2 Create test utilities
    - `tests/utils/supabase-mock.ts` - Mock Supabase responses
    - `tests/utils/render.tsx` - Custom render with providers
    - **Estimated:** 30 minutes

- [ ] 3.4 Validation
  - [ ] 3.4.1 Run test suite: `bun test`
    - Verify at least 80% of tests pass
    - Document any remaining failures (non-blocking)
    - **Estimated:** 15 minutes

  - [ ] 3.4.2 Write README for test setup
    - Document `.env.test` setup
    - Explain test utilities
    - Add troubleshooting section
    - **Estimated:** 20 minutes

### Acceptance Criteria
- ✅ `bun test` runs without import errors
- ✅ Supabase client mocks work correctly
- ✅ At least 80% of existing tests pass
- ✅ `.env.test.example` created and documented
- ✅ `tests/README.md` created with setup instructions

### Files Created/Modified
```
.env.test (new, gitignored)
.env.test.example (new)
jest.config.js (modified)
tests/setup.ts (modified)
tests/utils/supabase-mock.ts (new)
tests/utils/render.tsx (new)
tests/README.md (new)
```

---

## Task 4: E2E Testing & Validation

**Priority:** 🟡 P1 - MVP QUALITY ASSURANCE
**Estimated Time:** 4-6 hours
**Status:** Not Started
**Dependencies:** Tasks 1, 2, 3

### Objective
Write and execute end-to-end tests for critical MVP workflows using Playwright, verify accessibility and performance.

### Subtasks

- [ ] 4.1 E2E Test Development
  - [ ] 4.1.1 Write cadastro workflow test
    - File: `__tests__/e2e/cadastro-aluno.spec.ts`
    - Test: Login → Navigate to /alunos/novo → Fill form → Submit → Verify in list
    - Include CPF validation, phone validation
    - Test success toast appears
    - **Estimated:** 1.5 hours

  - [ ] 4.1.2 Write presença workflow test
    - File: `__tests__/e2e/lancamento-presenca.spec.ts`
    - Test: Login as professor → Navigate to /frequencia → Abrir aula → Mark attendance → Encerrar aula
    - Verify phase transitions (planning → attendance → completion → locked)
    - Test optimistic updates
    - **Estimated:** 2 hours

  - [ ] 4.1.3 Write diário workflow test
    - File: `__tests__/e2e/diario-classe.spec.ts`
    - Test: Login as professor → Navigate to /diario → Filter by turma → Open detail → Verify attendance history
    - Test pagination
    - Test mobile responsiveness
    - **Estimated:** 1.5 hours

- [ ] 4.2 Playwright MCP Visual Testing
  - [ ] 4.2.1 Cadastro page screenshots
    - Desktop (1920x1080)
    - Tablet (768x1024)
    - Mobile (375x667)
    - Save to `__tests__/e2e/screenshots/cadastro-*.png`
    - **Estimated:** 20 minutes

  - [ ] 4.2.2 Presença page screenshots
    - Capture "Abrir Aula" button states
    - Capture AttendanceGrid
    - Capture "Encerrar Aula" dialog
    - **Estimated:** 20 minutes

  - [ ] 4.2.3 Diário page screenshots
    - Capture filter section
    - Capture list view
    - Capture detail modal
    - **Estimated:** 20 minutes

- [ ] 4.3 Chrome DevTools MCP Audits
  - [ ] 4.3.1 Run Lighthouse on /dashboard/alunos/novo
    - Target: Performance > 85, Accessibility > 95, Best Practices > 90
    - Fix critical issues found
    - **Estimated:** 30 minutes

  - [ ] 4.3.2 Run Lighthouse on /dashboard/frequencia
    - Same targets as 4.3.1
    - Check for memory leaks
    - **Estimated:** 30 minutes

  - [ ] 4.3.3 Run Lighthouse on /dashboard/diario
    - Same targets as 4.3.1
    - Verify lazy loading works
    - **Estimated:** 30 minutes

- [ ] 4.4 Final Validation
  - [ ] 4.4.1 Run full E2E suite: `bun run test:e2e`
    - All 3 workflows pass
    - No console errors
    - Screenshots captured
    - **Estimated:** 15 minutes

  - [ ] 4.4.2 Manual UAT checklist
    - Test as professor role
    - Test as diretor role
    - Test on real mobile device (optional)
    - **Estimated:** 30 minutes

  - [ ] 4.4.3 Document test results
    - Create `TEST-RESULTS.md`
    - Include screenshots
    - Include Lighthouse scores
    - **Estimated:** 20 minutes

### Acceptance Criteria
- ✅ Cadastro E2E test passes consistently
- ✅ Presença E2E test passes consistently
- ✅ Diário E2E test passes consistently
- ✅ Playwright screenshots captured for all 3 workflows (desktop, tablet, mobile)
- ✅ Lighthouse scores meet targets: Performance > 85, Accessibility > 95
- ✅ Zero console errors in all tested workflows
- ✅ Test results documented in TEST-RESULTS.md

### Files Created/Modified
```
__tests__/e2e/cadastro-aluno.spec.ts (new)
__tests__/e2e/lancamento-presenca.spec.ts (new)
__tests__/e2e/diario-classe.spec.ts (new)
__tests__/e2e/screenshots/ (new directory with images)
TEST-RESULTS.md (new)
playwright.config.ts (modified if needed)
```

---

## 📊 Progress Tracking

**Overall Progress:** 1/4 tasks completed (25%)
**Time Invested:** 1.5 hours (of 17-22 estimated)
**Ahead of Schedule:** ✅ Task 1 completed 60% faster than estimated

| Task | Status | Completion % | Time | Blockers |
|------|--------|--------------|------|----------|
| Task 1: TypeScript Fixes | ✅ Completed | 100% | 1.5h (est. 3-4h) | None |
| Task 2: Class Diary | ⚪ Not Started | 0% | 0h (est. 8-10h) | ~~Task 1~~ ✅ UNBLOCKED |
| Task 3: Test Config | ⚪ Not Started | 0% | 0h (est. 2h) | None |
| Task 4: E2E Testing | ⚪ Not Started | 0% | 0h (est. 4-6h) | Tasks 1, 2, 3 |

**Legend:**
- ⚪ Not Started
- 🔵 In Progress
- ✅ Completed
- ❌ Blocked

**Key Achievement:** Task 1 completed 2025-10-04 - Build pipeline unblocked! 🎉

---

## 🚀 Execution Order

**Recommended parallel execution:**

**Phase 1 (Days 1-2):**
- Task 1 (TypeScript) - 3-4h
- Task 3 (Test Config) - 2h (can run in parallel)

**Phase 2 (Days 3-5):**
- Task 2 (Class Diary) - 8-10h (requires Task 1 done)

**Phase 3 (Days 6-7):**
- Task 4 (E2E Testing) - 4-6h (requires Tasks 1, 2, 3 done)

**Total:** 17-22 hours over 7 working days (with buffer)

---

## 📝 Notes

### Critical Path
Task 1 → Task 2 → Task 4 (Task 3 can run in parallel)

### Risk Mitigation
- Task 1 is highest priority (blocks build)
- Task 2 can be simplified if time runs short (remove pagination/filters)
- Task 4 tests can be written incrementally (1 workflow per day)

### Success Metrics
- **MVP Launch Ready:** All tasks completed by Oct 11 (2 days buffer before Oct 13 launch)
- **Quality Assured:** All E2E tests passing, Lighthouse scores > 95 accessibility

---

**Last Updated:** 2025-10-04 14:25 UTC
**Next Review:** Before starting Task 2 (Class Diary Implementation)
**Status:** ✅ Task 1 COMPLETE - Ready for Task 2 or Task 3 (can run in parallel)
