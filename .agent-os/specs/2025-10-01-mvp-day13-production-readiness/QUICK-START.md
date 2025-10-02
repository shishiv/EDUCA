# Quick Start Guide - MVP Day 13 Production Readiness

**🎯 Goal:** Resolve 3 critical blockers for MVP launch on October 13, 2025

---

## TL;DR - What Needs to Be Done

| Task | Time | Priority | Status |
|------|------|----------|--------|
| 1. Fix TypeScript Errors (7 files) | 3-4h | 🔴 P0 | Not Started |
| 2. Implement Class Diary | 8-10h | 🔴 P0 | Not Started |
| 3. Fix Test Configuration | 2h | 🟡 P1 | Not Started |
| 4. E2E Testing | 4-6h | 🟡 P1 | Not Started |

**Total:** 17-22 hours (2-3 working days with buffer)

---

## Quick Commands

### Start Implementation
```bash
cd gestao_fronteira/

# 1. Create feature branch
git checkout -b feat/mvp-day13-production-ready

# 2. Verify current errors
bun run typecheck  # Should show 7 errors

# 3. Start dev server
bun run dev
```

### Task 1: Fix TypeScript (3-4h)
```bash
# Pattern to apply in 7 files:
# CHANGE: { params }: { params: { id: string } }
# TO:     { params }: { params: Promise<{ id: string }> }
# CHANGE: const { id } = params
# TO:     const { id } = await params

# Files to fix:
# - app/api/aulas/[aula_id]/status/route.ts
# - app/api/frequencia/sessao/[aula_id]/route.ts
# - app/api/sessions/[id]/attendance/route.ts
# - app/api/sessions/[id]/route.ts
# - app/api/sessions/[id]/status/route.ts
# - app/api/sessoes-aula/[id]/cancelar/route.ts
# - app/api/sessoes-aula/[id]/frequencia/batch/route.ts

# Verify after each file:
bun run typecheck
```

### Task 2: Implement Class Diary (8-10h)
```bash
# Create API layer
touch lib/api/class-diary.ts

# Create components
mkdir -p components/diary
touch components/diary/class-diary-filter.tsx
touch components/diary/class-diary-list.tsx
touch components/diary/class-diary-detail.tsx

# Create page
mkdir -p app/\(dashboard\)/dashboard/diario
touch app/\(dashboard\)/dashboard/diario/page.tsx

# Test page
# Navigate to http://localhost:3000/dashboard/diario
```

### Task 3: Fix Tests (2h)
```bash
# Install missing dependency
bun add -d @testing-library/user-event

# Create test env file
touch .env.test
# Add: NEXT_PUBLIC_SUPABASE_URL=mock
# Add: NEXT_PUBLIC_SUPABASE_ANON_KEY=mock

# Run tests
bun test
```

### Task 4: E2E Testing (4-6h)
```bash
# Write tests
touch __tests__/e2e/cadastro-aluno.spec.ts
touch __tests__/e2e/lancamento-presenca.spec.ts
touch __tests__/e2e/diario-classe.spec.ts

# Run E2E suite
bun run test:e2e
```

---

## Critical Success Criteria

### ✅ Task 1 Complete When:
- [ ] `bun run typecheck` passes (0 errors)
- [ ] `bun run build` succeeds
- [ ] All 7 API routes tested manually

### ✅ Task 2 Complete When:
- [ ] Page accessible at `/dashboard/diario`
- [ ] Filters work (turma, disciplina)
- [ ] List shows classes with stats
- [ ] Detail modal shows attendance
- [ ] Responsive (mobile, tablet, desktop)

### ✅ Task 3 Complete When:
- [ ] `bun test` runs without import errors
- [ ] At least 80% of tests pass

### ✅ Task 4 Complete When:
- [ ] All 3 E2E tests pass
- [ ] Lighthouse Accessibility > 95
- [ ] Zero console errors

---

## Timeline

**Today (Oct 1):** Tasks 1 + 3 in parallel (5-6h)
**Tomorrow (Oct 2-3):** Task 2 (8-10h)
**Day After (Oct 4-5):** Task 4 (4-6h)
**Buffer (Oct 6-11):** Bug fixes, polish
**Launch (Oct 13):** 🚀 MVP goes live

---

## Emergency Contacts

**If blocked, check:**
1. `.agent-os/specs/2025-10-01-mvp-day13-production-readiness/spec.md` - Full spec
2. `.agent-os/specs/2025-10-01-mvp-day13-production-readiness/tasks.md` - Detailed tasks
3. `.agent-os/specs/2025-10-01-mvp-day13-production-readiness/sub-specs/` - Technical guides

**Rollback plan:**
```bash
git checkout main
git branch -D feat/mvp-day13-production-ready
```

---

## Next Steps

**Right now:**
1. Review full spec: [@spec.md](spec.md)
2. Review task breakdown: [@tasks.md](tasks.md)
3. If approved, run: `/execute-tasks` to start implementation

---

**Created:** 2025-10-01
**Target:** 2025-10-13 MVP Launch
**Status:** ✅ Spec Complete - Awaiting Approval
