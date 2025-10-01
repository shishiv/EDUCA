# Spec: MVP Day 13 - Production Readiness

**Spec ID:** `2025-10-01-mvp-day13-production-readiness`
**Created:** 2025-10-01
**Target Launch:** 2025-10-13 (12 days)
**Priority:** 🔴 P0 - BLOCKING MVP LAUNCH
**Status:** Ready for Implementation

---

## 📋 Executive Summary

### Problem Statement

The **gestao_fronteira** system is 80-85% ready for MVP launch on **October 13, 2025**, but has **3 critical blockers** preventing production deployment:

1. **TypeScript Build Errors** (7 errors) - Next.js 15 async params breaking production build
2. **Missing Class Diary Feature** - Users expect diário de classe but it's 0% implemented
3. **Broken Test Configuration** - Test suite failing due to environment/dependency issues

**Without this spec:** MVP launch will miss deadline, users will be disappointed by missing diary feature, and production build will fail.

**With this spec:** All blockers resolved, minimal class diary implemented, production-ready build verified.

---

## 🎯 Goals & Success Criteria

### Primary Goals

1. **Fix TypeScript Build Errors** - Enable production build with Next.js 15
2. **Implement Class Diary (Simplified)** - Basic diary functionality for teachers
3. **Fix Test Configuration** - Restore test suite to working state
4. **E2E Testing Critical Paths** - Verify core user workflows

### Success Criteria

✅ **TypeScript:**
- [ ] `bun run typecheck` passes with 0 errors
- [ ] `bun run build` completes successfully
- [ ] All 7 API routes migrated to async params

✅ **Class Diary:**
- [ ] Teachers can view list of classes by turma/disciplina
- [ ] Teachers can add conteúdo programático per class
- [ ] Teachers can view historical attendance per student
- [ ] Page is responsive (mobile, tablet, desktop)

✅ **Tests:**
- [ ] `bun test` runs without environment errors
- [ ] Supabase client initializes correctly in tests
- [ ] Missing dependencies installed

✅ **E2E:**
- [ ] Cadastro de aluno workflow tested end-to-end
- [ ] Lançamento de presença workflow tested end-to-end
- [ ] Diário de classe workflow tested end-to-end

---

## 🔍 Technical Context

### Current State Analysis

**From initial codebase scan (2025-10-01):**

```
✅ Cadastro de Alunos: 100% complete
✅ Lançamento de Presença: 85% complete
❌ Diário de Classe: 0% complete

🔴 TypeScript Errors: 7 blocking errors
🟡 Test Suite: Failing due to env config
```

### Technology Stack

- **Frontend:** Next.js 15.5.3 + React 19.1.1 + TypeScript 5.9.2
- **Backend:** Supabase 2.57.4 (PostgreSQL + Auth)
- **State:** Zustand 5.0.8 + TanStack Query 5.87.4
- **UI:** shadcn/ui + Radix UI + Tailwind CSS 3.4.17
- **Testing:** Jest + Playwright + React Testing Library
- **Package Manager:** bun (mandatory)

### Key Files & Locations

**TypeScript Errors (7 files):**
- `app/api/aulas/[aula_id]/status/route.ts`
- `app/api/frequencia/sessao/[aula_id]/route.ts`
- `app/api/sessions/[id]/attendance/route.ts`
- `app/api/sessions/[id]/route.ts`
- `app/api/sessions/[id]/status/route.ts`
- `app/api/sessoes-aula/[id]/cancelar/route.ts`
- `app/api/sessoes-aula/[id]/frequencia/batch/route.ts`

**Diário de Classe (to be created):**
- `app/(dashboard)/dashboard/diario/page.tsx` (new)
- `components/diary/class-diary-list.tsx` (new)
- `components/diary/class-diary-detail.tsx` (new)
- `lib/api/class-diary.ts` (new)

**Test Configuration:**
- `jest.config.js`
- `tests/setup.ts`
- `.env.test`

---

## 📐 Architecture & Design

### Class Diary Data Model (Simplified)

**Uses existing tables - NO migrations needed:**
- `sessoes_aula` - Already has class session data
- `frequencia` - Already has attendance records
- `turmas` - Class/turma information
- `disciplinas` - Subject information

**New API Layer:**
```typescript
// lib/api/class-diary.ts
interface ClassDiaryEntry {
  id: string
  data_aula: string
  turma_id: string
  disciplina_id: string
  conteudo_programatico: string
  total_alunos: number
  total_presentes: number
  total_ausentes: number
  professor_nome: string
}

async function getClassDiary(turmaId: string, disciplinaId?: string)
async function getAttendanceHistory(alunoId: string, turmaId: string)
```

### UI Component Architecture

```
Page: /dashboard/diario
├── ClassDiaryFilter (turma/disciplina selectors)
├── ClassDiaryList (table of classes)
│   └── ClassDiaryRow (per class entry)
└── ClassDiaryDetail (modal/drawer)
    ├── ContentDisplay (conteúdo programático)
    ├── AttendanceStats (present/absent counts)
    └── StudentAttendanceList (per-student view)
```

### TypeScript Migration Pattern

**Before (Next.js 14 style - BROKEN):**
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  // ...
}
```

**After (Next.js 15 style - CORRECT):**
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // ...
}
```

---

## 🚀 Implementation Plan

### Task Breakdown (4 Major Tasks)

#### Task 1: Fix TypeScript Build Errors (3-4h)
- Migrate 7 API routes to async params pattern
- Verify production build succeeds
- Update any dependent code

#### Task 2: Implement Class Diary (8-10h)
- Create API layer (`class-diary.ts`)
- Build UI components (list + detail)
- Implement filters and search
- Add responsive design
- Connect to existing data

#### Task 3: Fix Test Configuration (2h)
- Install missing dependencies (`@testing-library/user-event`)
- Configure Supabase test environment
- Fix environment variable loading
- Verify test suite runs

#### Task 4: E2E Testing & Validation (4-6h)
- Write Playwright tests for cadastro workflow
- Write Playwright tests for presença workflow
- Write Playwright tests for diário workflow
- Run Chrome DevTools Lighthouse audit
- Verify WCAG 2.1 AA compliance

**Total Estimated Time:** 17-22 hours (2-3 working days)

---

## 📊 Risk Assessment

### High-Risk Items

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Async params break existing code** | 🔴 High | Medium | Thorough testing after migration |
| **Diary queries slow on large datasets** | 🟡 Medium | Low | Add database indexes if needed |
| **Test env config complex** | 🟡 Medium | Medium | Use `.env.test.example` template |
| **Timeline too aggressive (17-22h in 12 days)** | 🟢 Low | Low | Buffer exists, can extend if needed |

### Mitigation Strategies

**For async params migration:**
- Test each route individually after change
- Use TypeScript strict mode to catch errors
- Run full integration tests after all migrations

**For diary performance:**
- Start with simple queries
- Add pagination (10-20 entries per page)
- Index `sessoes_aula(turma_id, data_aula)` if slow

**For test configuration:**
- Document setup in `tests/README.md`
- Create `.env.test.example` with required vars
- Add setup validation script

---

## 📏 Acceptance Criteria

### Definition of Done

**Task 1 - TypeScript:**
- [ ] All 7 API routes migrated to async params
- [ ] `bun run typecheck` passes (0 errors)
- [ ] `bun run build` succeeds
- [ ] Postman/Thunder Client tests pass for all routes

**Task 2 - Class Diary:**
- [ ] `/dashboard/diario` page accessible to teachers
- [ ] Filters work (turma, disciplina, date range)
- [ ] List displays classes with stats (present/absent)
- [ ] Detail view shows attendance per student
- [ ] Responsive on mobile (375px), tablet (768px), desktop (1920px)
- [ ] Playwright MCP screenshots captured
- [ ] WCAG 2.1 AA compliance verified

**Task 3 - Tests:**
- [ ] `bun test` runs without import errors
- [ ] Supabase client mocks work correctly
- [ ] At least 80% of existing tests pass
- [ ] New diary API tests written

**Task 4 - E2E:**
- [ ] Cadastro workflow E2E test passes
- [ ] Presença workflow E2E test passes
- [ ] Diário workflow E2E test passes
- [ ] Chrome DevTools Lighthouse scores: Performance > 85, Accessibility > 95

---

## 🎓 Brazilian Educational Context

### Legal Compliance Requirements

**Diário de Classe (Class Diary) is a LEGAL DOCUMENT in Brazilian education:**
- Must record all classes taught (data, conteúdo programático)
- Must track attendance for Bolsa Família compliance
- Must be auditable and immutable after locking
- Must support director/secretary review

### INEP Standards Alignment

- **Educacenso 2025:** Diary data supports Stage 1 (enrollment) and Stage 2 (student status) reporting
- **Minimum Attendance:** 75% required, alert at 80% threshold
- **Attendance Tracking:** "não existe o esquecer" (cannot modify locked attendance)

### User Roles & Permissions

**For Class Diary:**
- **Professor:** View own classes, add conteúdo, view attendance
- **Diretor:** View all classes in their school
- **Secretário:** View all classes, generate reports
- **Admin:** Full system access

---

## 📅 Timeline & Milestones

### Implementation Schedule (12 days to launch)

**Days 1-2 (Oct 1-2): TypeScript Fixes + Test Config**
- Fix all 7 TypeScript errors
- Configure test environment
- Verify build and tests pass

**Days 3-5 (Oct 3-5): Class Diary Implementation**
- Build API layer
- Create UI components
- Implement filters and search
- Add responsive design

**Days 6-7 (Oct 6-7): E2E Testing**
- Write Playwright tests for all 3 workflows
- Run Chrome DevTools audits
- Fix any critical issues found

**Days 8-10 (Oct 8-10): Buffer & Polish**
- Address feedback
- Documentation updates
- Minor bug fixes

**Days 11-12 (Oct 11-12): Final Validation**
- Production build testing
- User acceptance testing
- Launch readiness check

**Day 13 (Oct 13): MVP LAUNCH** 🚀

---

## 🔗 Dependencies & Prerequisites

### External Dependencies
- None (all blockers are internal code issues)

### Internal Dependencies
- Existing `sessoes_aula` and `frequencia` tables (already in place)
- Existing attendance workflow (85% complete)
- Existing student registration (100% complete)

### Required Access
- Supabase project (development + test environments)
- Playwright browser binaries
- Test data fixtures

---

## 📖 Documentation Requirements

### User-Facing Documentation
- [ ] Diário de Classe user guide (how to view classes)
- [ ] Conteúdo programático entry guide
- [ ] Attendance history interpretation

### Developer Documentation
- [ ] Async params migration guide
- [ ] Test environment setup guide
- [ ] Class diary API documentation

---

## 🧪 Testing Strategy

### Unit Tests
- Class diary API functions
- Data transformation utilities
- Filter logic

### Integration Tests
- API routes with Supabase client
- Component rendering with mocked data
- Zustand store actions

### E2E Tests (Playwright)
- Complete cadastro workflow
- Complete presença workflow
- Complete diário workflow
- Cross-browser testing (Chrome, Firefox)

### Performance Tests
- Diary list load time (<3s for 100 entries)
- Attendance history query (<1s per student)
- Mobile responsiveness (smooth scrolling)

---

## 📞 Stakeholders & Communication

### Primary Stakeholders
- **Development Team:** Implementation
- **School Teachers:** Primary users of diary feature
- **School Directors:** Audit and review capabilities
- **Municipal Secretary:** Oversight and reporting

### Communication Plan
- Daily updates in project channel
- Demo of diary feature at Day 5 milestone
- UAT invitation at Day 8 milestone

---

## 🎯 Out of Scope

**Explicitly NOT included in this spec:**

- ❌ Advanced reporting/analytics (post-MVP)
- ❌ PDF export of diary (post-MVP)
- ❌ WhatsApp notifications (post-MVP)
- ❌ Historical data migration from i-Educar (post-MVP)
- ❌ Parent/student portal access (post-MVP)

---

## 📚 References

### Related Specs
- `2025-09-29-enhanced-abrir-aula-workflow` - Attendance system (dependency)

### External Documentation
- [Next.js 15 Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [WCAG 2.1 AA Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

### Brazilian Educational Standards
- [Educacenso 2025 Guidelines](http://portal.inep.gov.br/educacenso)
- [Bolsa Família Education Requirements](https://www.gov.br/cidadania/pt-br/acoes-e-programas/bolsa-familia)

---

## ✅ Sign-Off

**Spec Author:** Claude (Agent OS)
**Spec Reviewer:** [User Name]
**Approval Date:** [Pending]
**Implementation Start:** [Upon approval]

---

**Next Steps:**
1. Review this spec
2. Approve or request changes
3. Execute `/execute-tasks` to begin implementation
