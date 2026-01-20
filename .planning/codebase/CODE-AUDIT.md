# Code Audit: EDUCA Application

**Audited:** 2026-01-20
**Codebase Health:** 68/100 (Moderate)
**Phase:** Post-14 (Legacy Code Assessment)

**Complement to:** PAGE-AUDIT.md (page-level inventory)

---

## Executive Summary

| Metric | Value |
|--------|-------|
| API Services | 22 (10,228 LOC) |
| Large Components (>600 LOC) | 3 |
| Direct Supabase in Pages | 2 instances |
| console.log remaining | 21 instances |
| `any` type usage | 32 instances |
| React Query adoption | 42% (31/94 files) |
| useEffect data fetching | 63 files |

**Primary Technical Debt:**
1. Direct Supabase queries in dashboard pages
2. Large component files needing refactor
3. Mixed error handling patterns

---

## 1. URL/Slug Patterns

### Current State: UUID-Only Routes

| Route | Example URL | Characters |
|-------|-------------|------------|
| `/dashboard/alunos/[id]` | `/dashboard/alunos/550e8400-e29b-41d4-a716-446655440000` | 36 (ID only) |
| `/dashboard/escolas/[id]` | Same pattern | 36 |
| `/dashboard/turmas/[id]` | Same pattern | 36 |
| `/dashboard/matriculas/[id]` | Same pattern | 36 |
| `/dashboard/usuarios/[id]` | Same pattern | 36 |
| `/dashboard/responsaveis/[id]` | Same pattern | 36 |
| `/dashboard/turmas/[id]/chamada` | Nested | 36 |
| `/diario/relatorios/[alunoId]` | Uses `alunoId` | 36 |

**Total:** 14 dynamic routes using raw UUIDs

### Issues

| Issue | Severity | Impact |
|-------|----------|--------|
| URLs not shareable/readable | Low | User experience |
| Inconsistent naming (`id` vs `alunoId`) | Low | Developer confusion |
| No slug generation utilities | Gap | N/A |

### Recommendation

**Priority:** LOW (defer to Phase 15+)
**Effort:** Medium (20-30h)

**Pattern to implement (if needed):**
```
/dashboard/alunos/[uuid]-[slugified-name]
/dashboard/alunos/550e8400-joao-silva
```

**Current acceptability:** ACCEPTABLE - Routes work correctly

---

## 2. Component Analysis

### File Naming Violations

**Convention:** PascalCase for feature components

| File | Location | Issue |
|------|----------|-------|
| demo-mode-banner.tsx | components/attendance/ | kebab-case |
| view-only-notice.tsx | components/attendance/ | kebab-case |
| class-diary-detail.tsx | components/diary/ | kebab-case |
| class-diary-filter.tsx | components/diary/ | kebab-case |
| class-diary-list.tsx | components/diary/ | kebab-case |

**Total:** 5 files violating naming convention
**Effort to fix:** Low (1-2h)

### Large Components (>600 LOC)

| Component | Lines | Issue | Recommendation |
|-----------|-------|-------|----------------|
| AttendanceGrid.tsx | 1,078 | Too large | Split into 3-4 subcomponents |
| FrequenciaWorkflow.tsx | 622 | Too large | Extract status bar, controls |
| NewLessonModal.tsx | 533 | Borderline | Monitor |

**Effort to refactor:** Medium (10-15h)

### Barrel Export Gaps

| Directory | Has index.ts? | Status |
|-----------|---------------|--------|
| components/attendance/ | Yes | 11 exports, maintained |
| components/diary/ | No | MISSING |
| components/ui/ | Yes | shadcn components |

---

## 3. API Patterns

### Pattern Compliance: 88%

**API Services (lib/api/):** 22 services, 10,228 LOC

| Service | Lines | Pattern | Notes |
|---------|-------|---------|-------|
| base.ts | - | EXEMPLAR | Generic CRUD |
| vivencias.ts | - | GOOD | Structured, typed |
| attendance.ts | - | GOOD | Domain-specific |
| grades.ts | 781 | GOOD | |
| advanced-reports.ts | 806 | GOOD | Largest |
| enhanced-attendance.ts | 602 | GOOD | |

### Critical: Direct Supabase in Pages

**Violation 1:** `app/(dashboard)/dashboard/page.tsx`
```typescript
// Lines 104-130: Direct Supabase queries
const [alunosResult, escolasResult, ...] = await Promise.all([
  supabase.from('alunos').select(...),
  supabase.from('escolas').select(...),
  // 5 more direct queries
])
```

**Violation 2:** `app/(dashboard)/diario/page.tsx`
```typescript
const { error } = await supabase.from('sessoes_aula').delete().eq('id', lesson.id)
```

**Impact:** Violates three-layer architecture
**Fix:** Create DashboardStatsApiService
**Effort:** High (8-12h)

### Error Handling Inconsistency

| Pattern | Count | Example |
|---------|-------|---------|
| Silent throw | 52 | `throw error` (no logging) |
| Log + throw | 67 | `logger.error(...); throw error` |
| Error handler | 23 | `handleApiError(error)` |

**Recommendation:** Enforce "log + throw" pattern
**Effort:** Medium (6-8h)

### console.log Remaining

**Count:** 21 instances

**Locations:**
- components/admin/users/user-form.tsx
- components/reports/DescriptiveReportForm.tsx
- contexts/search-context.tsx
- contexts/session-realtime-context.tsx
- hooks/use-aula-realtime.ts
- lib/api/enhanced-attendance.ts
- lib/api/error-handler.ts
- lib/api/multi-guardian.ts

**Effort to fix:** Low (2-3h)

### `any` Type Usage

**Count:** 32 instances

**High-risk locations:**
- lib/api/error-handler.ts (8 instances)
- lib/api/multi-guardian.ts
- contexts/search-context.tsx

**Effort to fix:** Low (4-5h)

---

## 4. Data Fetching Patterns

### Current State: 3 Approaches

| Pattern | Files | Percentage | Status |
|---------|-------|------------|--------|
| useEffect + useState | 63 | 67% | LEGACY |
| React Query | 31 | 33% | PREFERRED |
| Server Components | 8 | - | VALID |

### Recommendation

**Target:** React Query as primary pattern
**Effort:** High (15-20h for full migration)
**Timeline:** Phase 15+ (gradual)

---

## 5. State Management

### Current: 4 Approaches

| Approach | Usage | Files |
|----------|-------|-------|
| useState | Local state | 63+ |
| React Query | Server state | 31 |
| React Context | Global UI | 4 (demo-mode, escola, search, session) |
| Zustand | Global stores | 2 (app-store, attendance-session) |

**Recommendation:** Document decision framework
- **Server state:** React Query
- **Global app state:** Zustand
- **UI state:** Context (sparingly)
- **Local state:** useState

---

## Priority Matrix

### TIER 1: Critical (Block Production)

| Task | Effort | Impact |
|------|--------|--------|
| Fix Direct Supabase in pages | 8-12h | Architecture consistency |
| Standardize error handling | 6-8h | Observability |

### TIER 2: High (Next 2-3 Sprints)

| Task | Effort | Impact |
|------|--------|--------|
| Fix component file naming | 1-2h | Code consistency |
| Refactor large components | 10-15h | Maintainability |
| Remove console.log | 2-3h | Production cleanliness |

### TIER 3: Medium (3-4 Sprints)

| Task | Effort | Impact |
|------|--------|--------|
| Unify data fetching | 15-20h | Developer experience |
| Add barrel exports | 0.5-1h | Clean imports |
| Replace `any` types | 4-5h | Type safety |

### TIER 4: Low (Defer)

| Task | Effort | Impact |
|------|--------|--------|
| Implement semantic URL slugs | 20-30h | URL readability |
| Remove commented blocks | 3-4h | Code cleanliness |

---

## Totals

| Category | Items | Total Effort |
|----------|-------|--------------|
| TIER 1 (Critical) | 2 | 14-20h |
| TIER 2 (High) | 3 | 13-20h |
| TIER 3 (Medium) | 3 | 20-26h |
| TIER 4 (Low) | 2 | 23-34h |
| **TOTAL** | **10** | **70-100h** |

---

## Metadata

**Audit date:** 2026-01-20
**Files analyzed:** 94 pages, 22 API services, 100+ components
**Valid until:** 2026-02-20 (30 days)
**Based on:** CONVENTIONS.md patterns

*Code audit complete. Technical debt documented for future phases.*
