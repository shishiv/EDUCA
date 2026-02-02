# Page Audit: EDUCA Application

**Audited:** 2026-01-20 (Updated: 2026-01-20)
**Total Pages:** 43 page.tsx files (after cleanup)
**Phase:** 14-legacy-page-audit
**Based on:** 14-RESEARCH.md

**Correction (2026-01-20):** Removed `/dashboard/frequencia` (legacy session-based workflow) - sidebar now points to `/diario/frequencia` (canonical implementation with AttendanceGrid)

## Summary

| Status | Count | Action Required |
|--------|-------|-----------------|
| Functional | 38 | None |
| Partial | 2 | Monitor |
| Mock Data | 1 | Future integration |
| Orphan | 2 | Document (Calendario, Sessoes) |
| ~~Dev-Only~~ | ~~3~~ | REMOVED (showcase, platform-names, dashboard/frequencia) |

**Total:** 43 pages (after cleanup)

## Classification Legend

- **Functional**: Fully integrated with Supabase, follows patterns, properly linked
- **Partial**: Works but missing escola context or incomplete integration
- **Mock Data**: Uses hardcoded data instead of Supabase queries
- **Orphan**: Page exists but not accessible via sidebar navigation
- **Dev-Only**: Development/testing page, should be removed from production

## Sidebar Navigation Reference

Current sidebar structure from `components/layout/sidebar.tsx`:

| Group | Item | Path | Roles |
|-------|------|------|-------|
| Principal | Dashboard | `/dashboard` | admin, diretor, secretario, professor |
| Cadastros | Alunos | `/dashboard/alunos` | admin, diretor, secretario |
| Cadastros | Usuarios | `/dashboard/usuarios` | admin |
| Cadastros | Escolas | `/dashboard/escolas` | admin |
| Cadastros | Turmas | `/dashboard/turmas` | admin, diretor, secretario |
| Cadastros | Matriculas | `/dashboard/matriculas` | admin, diretor, secretario |
| Cadastros | Atribuicoes | `/dashboard/atribuicoes` | admin, diretor |
| Cadastros | Responsáveis | `/dashboard/responsaveis` | admin, diretor, secretario |
| Academico | Frequencia | `/diario/frequencia` | admin, diretor, secretario, professor |
| Academico | Diario de Classe | `/dashboard/diario` | admin, diretor, secretario, professor |
| Academico | Notas | `/dashboard/notas` | admin, diretor, secretario, professor |
| Gestao | Relatorios | `/dashboard/relatorios` | admin, diretor, secretario |
| Gestao | Configuracoes | `/dashboard/configuracoes` | admin, diretor |

---

## Page Inventory

### 1. Public Pages

| Path | File | Status | Notes |
|------|------|--------|-------|
| `/` | `app/page.tsx` | **Functional** | Root landing page with auth redirect |
| `/login` | `app/(auth)/login/page.tsx` | **Functional** | Supabase auth flow |
| `/politica-privacidade` | `app/politica-privacidade/page.tsx` | **Functional** | Privacy policy (updated Phase 10) |

### 2. Development Pages (REMOVE)

| Path | File | Status | Recommendation |
|------|------|--------|----------------|
| `/showcase` | `app/showcase/page.tsx` | **Dev-Only** | DELETE - Component testing page |
| `/platform-names` | `app/platform-names/page.tsx` | **Dev-Only** | DELETE - Branding exploration |

### 3. Dashboard - In Sidebar (Functional)

| Sidebar Item | Path | File | Status | Data Source |
|--------------|------|------|--------|-------------|
| Dashboard | `/dashboard` | `app/(dashboard)/dashboard/page.tsx` | **Functional** | Supabase parallel queries |
| Alunos | `/dashboard/alunos` | `app/(dashboard)/dashboard/alunos/page.tsx` | **Functional** | Supabase + escola filter |
| Usuarios | `/dashboard/usuarios` | `app/(dashboard)/dashboard/usuarios/page.tsx` | **Functional** | Supabase (admin only) |
| Escolas | `/dashboard/escolas` | `app/(dashboard)/dashboard/escolas/page.tsx` | **Functional** | Supabase (admin only) |
| Turmas | `/dashboard/turmas` | `app/(dashboard)/dashboard/turmas/page.tsx` | **Functional** | Supabase + escola filter |
| Matriculas | `/dashboard/matriculas` | `app/(dashboard)/dashboard/matriculas/page.tsx` | **Functional** | Supabase + escola filter |
| Atribuicoes | `/dashboard/atribuicoes` | `app/(dashboard)/dashboard/atribuicoes/page.tsx` | **Functional** | Supabase (Phase 12-02) |
| Frequencia | `/diario/frequencia` | `app/(dashboard)/diario/frequencia/page.tsx` | **Functional** | Full frequency with AttendanceGrid |
| Diario de Classe | `/dashboard/diario` | `app/(dashboard)/dashboard/diario/page.tsx` | **Functional** | ClassDiary API |
| Notas | `/dashboard/notas` | `app/(dashboard)/dashboard/notas/page.tsx` | **Mock Data** | mockTurmasNotas |
| Relatorios | `/dashboard/relatorios` | `app/(dashboard)/dashboard/relatorios/page.tsx` | **Functional** | Reports API |
| Configuracoes | `/dashboard/configuracoes` | `app/(dashboard)/dashboard/configuracoes/page.tsx` | **Functional** | Configs API |

### 4. Dashboard - CRUD Sub-pages (Functional)

| Parent | Path | File | Status | Notes |
|--------|------|------|--------|-------|
| Alunos | `/dashboard/alunos/novo` | `app/(dashboard)/dashboard/alunos/novo/page.tsx` | **Functional** | Create student form |
| Alunos | `/dashboard/alunos/[id]` | `app/(dashboard)/dashboard/alunos/[id]/page.tsx` | **Functional** | View/edit student |
| Usuarios | `/dashboard/usuarios/novo` | `app/(dashboard)/dashboard/usuarios/novo/page.tsx` | **Functional** | Create user form |
| Usuarios | `/dashboard/usuarios/[id]` | `app/(dashboard)/dashboard/usuarios/[id]/page.tsx` | **Functional** | View/edit user |
| Escolas | `/dashboard/escolas/nova` | `app/(dashboard)/dashboard/escolas/nova/page.tsx` | **Functional** | Create school form |
| Escolas | `/dashboard/escolas/[id]` | `app/(dashboard)/dashboard/escolas/[id]/page.tsx` | **Functional** | View school |
| Escolas | `/dashboard/escolas/[id]/editar` | `app/(dashboard)/dashboard/escolas/[id]/editar/page.tsx` | **Functional** | Edit school form |
| Turmas | `/dashboard/turmas/nova` | `app/(dashboard)/dashboard/turmas/nova/page.tsx` | **Functional** | Create class form |
| Turmas | `/dashboard/turmas/[id]` | `app/(dashboard)/dashboard/turmas/[id]/page.tsx` | **Functional** | View/edit class |
| Turmas | `/dashboard/turmas/[id]/chamada` | `app/(dashboard)/dashboard/turmas/[id]/chamada/page.tsx` | **Functional** | Attendance (Phase 12-01) |
| Matriculas | `/dashboard/matriculas/nova` | `app/(dashboard)/dashboard/matriculas/nova/page.tsx` | **Functional** | Create enrollment |
| Matriculas | `/dashboard/matriculas/[id]` | `app/(dashboard)/dashboard/matriculas/[id]/page.tsx` | **Functional** | View enrollment |
| Responsaveis | `/dashboard/responsaveis/novo` | `app/(dashboard)/dashboard/responsaveis/novo/page.tsx` | **Functional** | Create guardian |
| Responsaveis | `/dashboard/responsaveis/[id]` | `app/(dashboard)/dashboard/responsaveis/[id]/page.tsx` | **Functional** | View guardian |

### 5. Dashboard - NOT in Sidebar

| Path | File | Status | Sidebar | Recommendation |
|------|------|--------|---------|----------------|
| `/dashboard/calendario` | `app/(dashboard)/dashboard/calendario/page.tsx` | **Partial** | Missing | Add to Gestao or document as admin-only |
| `/dashboard/sessoes` | `app/(dashboard)/dashboard/sessoes/page.tsx` | **Partial** | Missing | Add to Gestao or document as admin-only |
| `/dashboard/responsaveis` | `app/(dashboard)/dashboard/responsaveis/page.tsx` | **Orphan** | Missing | Add to Cadastros for diretor/secretario |
| `/dashboard/perfil` | `app/(dashboard)/dashboard/perfil/page.tsx` | **Functional** | Hidden-Intentional | User profile - accessed via header dropdown |
| `/dashboard/flags` | `app/(dashboard)/dashboard/flags/page.tsx` | **Functional** | Hidden-Intentional | Admin feature flag management (Phase 9) |

### 6. Student Diary Sub-pages

| Path | File | Status | Notes |
|------|------|--------|-------|
| `/dashboard/alunos/[id]/diario` | `app/(dashboard)/dashboard/alunos/[id]/diario/page.tsx` | **Functional** | Student diary list |
| `/dashboard/alunos/[id]/diario/novo` | `app/(dashboard)/dashboard/alunos/[id]/diario/novo/page.tsx` | **Functional** | New diary entry |
| `/dashboard/alunos/[id]/diario/relatorio` | `app/(dashboard)/dashboard/alunos/[id]/diario/relatorio/page.tsx` | **Functional** | Diary report |
| `/dashboard/alunos/[id]/boletim` | `app/(dashboard)/dashboard/alunos/[id]/boletim/page.tsx` | **Functional** | Student report card |

### 7. Alternate Route Groups

#### /diario/ Route Group

| Path | File | Status | Notes |
|------|------|--------|-------|
| `/diario` | `app/(dashboard)/diario/page.tsx` | **Functional** | Alternate diary entry point |
| `/diario/frequencia` | `app/(dashboard)/diario/frequencia/page.tsx` | **Functional** | **CANONICAL** frequency page (sidebar points here) |
| `/diario/relatorios/[alunoId]` | `app/(dashboard)/diario/relatorios/[alunoId]/page.tsx` | **Functional** | Student-specific reports |

#### /relatorios/ Route Group

| Path | File | Status | Notes |
|------|------|--------|-------|
| `/relatorios/frequencia` | `app/(dashboard)/relatorios/frequencia/page.tsx` | **Functional** | Attendance reports with exports |
| `/relatorios/bolsa-familia` | `app/(dashboard)/relatorios/bolsa-familia/page.tsx` | **Functional** | Bolsa Familia compliance reports |
| `/relatorios/conteudo` | `app/(dashboard)/relatorios/conteudo/page.tsx` | **Functional** | Content reports |

---

## Sidebar Navigation Gaps

Pages that exist but are not in sidebar navigation:

| Page | Path | Current State | Recommendation |
|------|------|---------------|----------------|
| ~~Responsaveis~~ | ~~`/dashboard/responsaveis`~~ | ~~Orphan~~ | ✓ Added to sidebar (Phase 14-02) |
| Calendario | `/dashboard/calendario` | **Partial** | Keep as internal admin tool |
| Sessoes | `/dashboard/sessoes` | **Partial** | Keep as internal admin tool |
| Perfil | `/dashboard/perfil` | Hidden-Intentional | Keep hidden - accessed via header dropdown |
| Flags | `/dashboard/flags` | Hidden-Intentional | Keep hidden - admin-only feature |

---

## Development Pages ~~(Priority: REMOVE)~~ ✓ REMOVED

| Path | Purpose | Status | Removed In |
|------|---------|--------|------------|
| `/showcase` | Component testing | ✓ DELETED | Phase 14-02 |
| `/platform-names` | Branding exploration | ✓ DELETED | Phase 14-02 |
| `/dashboard/frequencia` | Legacy session-based workflow | ✓ DELETED | Post-audit correction |

**Note:** All development/legacy pages have been removed. Sidebar Frequência now points to `/diario/frequencia`.

---

## Mock Data Pages (Priority: Future Integration)

| Path | Current State | Required Work | Effort |
|------|---------------|---------------|--------|
| `/dashboard/notas` | mockTurmasNotas constant | Database schema + NotasApiService | High |

**Details for Notas page:**
- Currently imports `mockTurmasNotas` from inline constant
- Requires:
  1. Database table design: `notas` table with (aluno_id, turma_id, disciplina, bimestre, valor)
  2. Supabase migration for table creation
  3. NotasApiService following VivenciasApiService pattern
  4. React Query hooks for data fetching
  5. Replace mock data with real queries

**Note:** Notas integration is NOT in current v2.0 scope. Tracked for future release.

---

## Route Duplication Analysis

### /diario/ vs /dashboard/diario

| Route | Purpose | Verdict |
|-------|---------|---------|
| `/dashboard/diario` | Main diary entry (sidebar) | Primary |
| `/diario/` | Alternate route group | Intentional - different layout |
| `/diario/frequencia` | Teacher frequency workflow | Specialized flow |

**Analysis:** Route groups under `/diario/` and `/relatorios/` appear intentional - they provide different layouts and user flows separate from the main dashboard. No consolidation needed.

---

## Recommendations by Priority

### Priority 1: Remove Development Pages (Phase 14)

- [ ] Delete `app/showcase/` folder
- [ ] Delete `app/platform-names/` folder

**Effort:** 5 minutes
**Risk:** None - pages not linked

### Priority 2: Sidebar Navigation Decisions (Phase 14)

| Page | Decision Options |
|------|-----------------|
| Responsaveis | A) Add to Cadastros group for diretor/secretario roles |
|              | B) Document as hidden feature for later |
| Calendario | A) Add to Gestao group |
|            | B) Keep as internal/admin-only feature |
| Sessoes | A) Add to Gestao group |
|         | B) Keep as internal/admin-only feature |

**Recommendation:** Add Responsaveis to sidebar (it has full CRUD). Defer Calendario/Sessoes as they are admin utilities.

### Priority 3: Mock Data Integration (Future Phase)

- [ ] Design `notas` table schema
- [ ] Create Supabase migration
- [ ] Implement NotasApiService
- [ ] Update Notas page with real data

**Effort:** 2-3 days
**Note:** Not in v2.0 scope

### Priority 4: Route Group Review (Future Phase)

- [ ] Evaluate user journeys for `/diario/` routes
- [ ] Evaluate user journeys for `/relatorios/` routes
- [ ] Document intentional separation or consolidate

**Note:** Low priority - current structure appears intentional

---

## Integration Status Summary

### By Status (After Cleanup)

| Status | Count | Percentage |
|--------|-------|------------|
| Functional | 38 | 88.4% |
| Partial | 2 | 4.7% |
| Mock Data | 1 | 2.3% |
| Orphan | 2 | 4.7% |
| ~~Dev-Only~~ | 0 | 0% (removed) |

**Total:** 43 pages

### By Sidebar Visibility

| Visibility | Count | Percentage |
|------------|-------|------------|
| In Sidebar | 13 | 30.2% |
| Sub-page of Sidebar Item | 18 | 41.9% |
| Hidden-Intentional | 2 | 4.7% |
| Alternate Route Group | 5 | 11.6% |
| Orphan/Missing | 2 | 4.7% |
| Public | 3 | 7.0% |
| ~~Dev-Only~~ | 0 | 0% (removed) |

---

## Technical Notes

### Good Patterns Observed

1. **API Services Pattern** - `lib/api/*.ts` with typed returns (VivenciasApiService exemplar)
2. **Structured Logger** - `logger.error/info/warn` instead of console (Phase 8)
3. **React Query** - Consistent data fetching with staleTime configuration
4. **EscolaContext** - Admin escola selector pattern (Phase 7.1)
5. **Role-based access** - `canRecordAttendance` helper (Phase 12)
6. **Compliance integration** - 18:00 lock, immutability (Phase 12)

### Legacy Patterns (Monitor)

1. **Mock data** - Notas page only
2. **Partial escola filtering** - Calendario/Sessoes pages may not fully respect admin selection

---

## Audit Checklist (for future pages)

For each new page, verify:

- [ ] Real Supabase data (not mock)
- [ ] Uses API service pattern from `lib/api/`
- [ ] Uses structured logger from `lib/logger.ts`
- [ ] Respects escola context for admin users
- [ ] Role-based access control if needed
- [ ] Linked in sidebar (if user-facing)
- [ ] Loading states implemented
- [ ] Error handling with user-friendly messages

---

## Metadata

**Created by:** Phase 14 Legacy Page Audit
**Based on:** 14-RESEARCH.md
**Verified against:** File system glob of `app/**/page.tsx`
**Sidebar reference:** `components/layout/sidebar.tsx`

**Audit date:** 2026-01-20
**Valid until:** 2026-02-20 (30 days for stable inventory)

---

*Page audit complete. 46 pages inventoried and classified.*
