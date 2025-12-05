# Performance Audit - Diario de Classe

**Date:** 2025-12-05
**Task:** 5.2.1 - Auditar performance com Chrome DevTools
**Status:** Code Analysis Complete

## Executive Summary

This document captures the performance audit findings for the Diario de Classe feature. Due to environment constraints, the audit was performed through code analysis rather than live Chrome DevTools profiling. The findings and recommendations are based on code review and industry best practices.

---

## 1. Current State Analysis

### 1.1 Pages Analyzed

| Page | File | Data Fetching Pattern |
|------|------|----------------------|
| Diario Principal | `app/(dashboard)/diario/page.tsx` | useEffect + Supabase direct |
| Frequencia | `app/(dashboard)/diario/frequencia/page.tsx` | useEffect + Supabase direct |
| Relatorios | `app/(dashboard)/relatorios/frequencia/page.tsx` | useEffect + Supabase direct |

### 1.2 Current Data Fetching Issues Identified

1. **No React Query caching** - Diario pages use direct Supabase calls without caching
2. **Waterfall requests** - Sequential fetches for turmas, sessions, then content
3. **N+1 queries** - Loading attendance stats for each lesson individually
4. **No pagination** - Loading up to 50 lessons at once (hardcoded limit)
5. **Missing loading states** - Some components don't show skeleton during data fetch

---

## 2. Performance Metrics Estimates

Based on code analysis, estimated performance characteristics:

### 2.1 Diario Principal Page (`/diario`)

| Metric | Estimated | Target | Status |
|--------|-----------|--------|--------|
| LCP | 2.0-3.5s | < 2.5s | NEEDS IMPROVEMENT |
| FID | < 100ms | < 100ms | OK |
| CLS | < 0.1 | < 0.1 | OK |
| Time to Interactive | 2.5-4.0s | < 3.5s | NEEDS IMPROVEMENT |

**Bottlenecks Identified:**
- Turmas query + Sessions query + Content query (sequential)
- N+1 queries for attendance stats per lesson
- Large lesson list without virtualization

### 2.2 Frequencia Page (`/diario/frequencia`)

| Metric | Estimated | Target | Status |
|--------|-----------|--------|--------|
| LCP | 1.5-3.0s | < 2.5s | NEEDS IMPROVEMENT |
| FID | < 100ms | < 100ms | OK |
| CLS | < 0.1 | < 0.1 | OK |
| Time to Interactive | 2.0-3.5s | < 3.5s | OK |

**Bottlenecks Identified:**
- Session lookup/creation sequential with turma loading
- Risk calculation loads all attendance records
- Real-time subscription adds connection overhead

### 2.3 AttendanceGrid Component

| Metric | Estimated | Target | Status |
|--------|-----------|--------|--------|
| Initial Render | 200-500ms | < 300ms | NEEDS IMPROVEMENT |
| Status Toggle | < 50ms | < 100ms | OK |
| FPS during scroll | 45-60 | > 30 | OK |

**Bottlenecks Identified:**
- Re-renders on each attendance change
- Large student lists not virtualized
- Lock status recalculated every minute

---

## 3. Network Analysis

### 3.1 API Calls Pattern (Diario Page)

```
1. GET turmas (escola filter) --------------- ~150ms
2. GET sessoes_aula (turma filter) ---------- ~200ms
3. GET conteudo_aula (per session) ---------- ~50ms x N
4. GET frequencia (per session) ------------- ~50ms x N
```

**Total estimated time for 10 lessons:** 150 + 200 + (50 * 10) + (50 * 10) = **1350ms**

### 3.2 Recommended Pattern

```
1. GET turmas (cached) ---------------------- ~0ms (cache hit)
2. GET sessoes_aula with joins -------------- ~250ms (single query with stats)
```

**Total estimated time:** ~250ms (5x improvement)

---

## 4. Recommendations

### 4.1 High Priority - Implement React Query Caching

**Files to modify:**
- Create `hooks/use-diary-query.ts`
- Update `app/(dashboard)/diario/page.tsx`
- Update `app/(dashboard)/diario/frequencia/page.tsx`

**Benefits:**
- Cache turmas and sessions (staleTime: 2-5 minutes)
- Automatic background refetching
- Optimistic updates for attendance
- Deduplication of concurrent requests

### 4.2 High Priority - Optimize Database Queries

**Current N+1 Issue:**
```sql
-- Currently: 1 query for sessions + N queries for attendance
SELECT * FROM sessoes_aula WHERE turma_id = $1;
-- Then for each session:
SELECT * FROM frequencia WHERE sessao_id = $2;
```

**Recommended: Single Query with Aggregation**
```sql
SELECT
  s.*,
  c.tema,
  c.objetivo,
  COUNT(f.id) as total_alunos,
  COUNT(f.id) FILTER (WHERE f.status_presenca = 'P') as total_presentes,
  COUNT(f.id) FILTER (WHERE f.status_presenca = 'F') as total_ausentes,
  COUNT(f.id) FILTER (WHERE f.status_presenca = 'A') as total_atestados
FROM sessoes_aula s
LEFT JOIN conteudo_aula c ON c.sessao_id = s.id
LEFT JOIN frequencia f ON f.sessao_id = s.id
WHERE s.turma_id = $1
GROUP BY s.id, c.id
ORDER BY s.data_aula DESC
LIMIT 50;
```

### 4.3 Medium Priority - Add Database Indexes

**Recommended indexes for Diario de Classe:**

```sql
-- Already likely exists, but verify:
CREATE INDEX IF NOT EXISTS idx_sessoes_aula_turma_data
  ON sessoes_aula(turma_id, data_aula DESC);

CREATE INDEX IF NOT EXISTS idx_frequencia_sessao_status
  ON frequencia(sessao_id, status_presenca);

CREATE INDEX IF NOT EXISTS idx_conteudo_aula_sessao
  ON conteudo_aula(sessao_id);

CREATE INDEX IF NOT EXISTS idx_frequencia_matricula_sessao
  ON frequencia(matricula_id, sessao_id);

-- For risk calculation:
CREATE INDEX IF NOT EXISTS idx_frequencia_matricula_status
  ON frequencia(matricula_id, status_presenca);
```

### 4.4 Medium Priority - Implement Pagination

**Current:** Loading 50 lessons at once
**Recommended:**
- Initial load: 10 lessons
- Infinite scroll or "Load more" button
- Use cursor-based pagination for better performance

### 4.5 Low Priority - Component Optimizations

1. **Memoize expensive calculations:**
   - Attendance statistics in AttendanceGrid
   - Filtered student lists
   - Date formatting

2. **Use React.memo for list items:**
   - LessonCard
   - AttendanceRowSkeleton

3. **Virtualize long lists:**
   - For classes with > 30 students
   - For lesson history > 20 items

---

## 5. Implementation Plan

### Phase 1: React Query Integration (Task 5.2.3)
- Create `hooks/use-diary-query.ts` with cached queries
- Integrate with diario pages
- Estimated improvement: 40-60% faster subsequent page loads

### Phase 2: Database Optimization
- Create optimized view or function for lesson list with stats
- Add recommended indexes
- Estimated improvement: 30-50% faster initial loads

### Phase 3: UI Optimizations
- Implement pagination
- Add list virtualization for large datasets
- Estimated improvement: 20-30% faster for large data sets

---

## 6. Acceptance Criteria Status

| Criteria | Target | Current Estimate | After Optimization |
|----------|--------|------------------|-------------------|
| LCP | < 2.5s | 2.0-3.5s | < 2.0s |
| FPS | > 30 | 45-60 | > 50 |
| Loading states | All async ops | Partial | Full coverage |

---

## 7. Files Created/Modified

### Created:
- `components/diary/DiarySkeletons.tsx` - Comprehensive skeleton components
- `PERFORMANCE-AUDIT.md` - This document

### To Be Modified:
- `app/(dashboard)/diario/page.tsx` - Add React Query
- `app/(dashboard)/diario/frequencia/page.tsx` - Add React Query
- `lib/react-query.ts` - Add diary query keys

---

## 8. Testing Recommendations

After implementing optimizations:

1. **Lighthouse Audit:**
   - Run Lighthouse on `/diario` and `/diario/frequencia`
   - Target Performance score > 80

2. **Chrome DevTools Performance Tab:**
   - Record page load with CPU throttling (4x)
   - Verify no long tasks > 50ms

3. **Network Tab:**
   - Verify single aggregated query instead of N+1
   - Check cache headers are working

4. **Real Device Testing:**
   - Test on tablet with slow network
   - Verify touch responsiveness

---

*Audit performed by: Claude Code Agent*
*Date: 2025-12-05*
