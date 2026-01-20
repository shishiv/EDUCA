# Phase 14: Legacy Page Audit - Research

**Researched:** 2026-01-20
**Domain:** Page inventory and integration analysis
**Confidence:** HIGH

## Summary

This research provides a complete inventory of all pages in the gestao_fronteira application, analyzing their integration status with the database, sidebar navigation coverage, and identifying legacy/orphan pages that require attention.

The codebase contains 57 TSX files in the app directory, comprising:
- 27 page components (page.tsx files)
- Various layout, loading, and utility files
- The sidebar navigation references 12 main menu items

**Primary findings:**
1. Several pages use mock data instead of real Supabase integration (Notas)
2. Some pages exist but are not linked in sidebar navigation (Calendario, Sessoes, Responsaveis)
3. Utility/development pages exist that should not be in production (showcase, platform-names)
4. Report pages exist under alternate route groups (/relatorios/ vs /dashboard/relatorios/)

## Complete Page Inventory

### Public/Root Pages

| Path | Status | Notes |
|------|--------|-------|
| `/` (page.tsx) | Integrated | Root landing page |
| `/login` | Integrated | Auth flow, uses Supabase auth |
| `/not-found.tsx` | Integrated | 404 handler |
| `/politica-privacidade` | Integrated | Privacy policy page |

### Development/Utility Pages (Candidates for Removal)

| Path | Status | Recommendation |
|------|--------|----------------|
| `/showcase` | Dev Only | **REMOVE** - Testing page for Task 3/4 validation |
| `/platform-names` | Dev Only | **REMOVE** - Branding exploration page |

### Dashboard Pages - In Sidebar

| Sidebar Item | Path | Status | Data Source |
|--------------|------|--------|-------------|
| Dashboard | `/dashboard` | **Integrated** | Real Supabase data |
| Alunos | `/dashboard/alunos` | **Integrated** | Real Supabase data |
| Alunos > Novo | `/dashboard/alunos/novo` | **Integrated** | Real Supabase data |
| Alunos > [id] | `/dashboard/alunos/[id]` | **Integrated** | Real Supabase data |
| Usuarios | `/dashboard/usuarios` | **Integrated** | Real Supabase data |
| Usuarios > Novo | `/dashboard/usuarios/novo` | **Integrated** | Real Supabase data |
| Usuarios > [id] | `/dashboard/usuarios/[id]` | **Integrated** | Real Supabase data |
| Escolas | `/dashboard/escolas` | **Integrated** | Real Supabase data |
| Escolas > Nova | `/dashboard/escolas/nova` | **Integrated** | Real Supabase data |
| Escolas > [id] | `/dashboard/escolas/[id]` | **Integrated** | Real Supabase data |
| Escolas > [id] > Editar | `/dashboard/escolas/[id]/editar` | **Integrated** | Real Supabase data |
| Turmas | `/dashboard/turmas` | **Integrated** | Real Supabase data |
| Turmas > Nova | `/dashboard/turmas/nova` | **Integrated** | Real Supabase data |
| Turmas > [id] | `/dashboard/turmas/[id]` | **Integrated** | Real Supabase data |
| Turmas > [id] > Chamada | `/dashboard/turmas/[id]/chamada` | **Integrated** | Real Supabase + Attendance API |
| Matriculas | `/dashboard/matriculas` | **Integrated** | Real Supabase data |
| Matriculas > Nova | `/dashboard/matriculas/nova` | **Integrated** | Real Supabase data |
| Matriculas > [id] | `/dashboard/matriculas/[id]` | **Integrated** | Real Supabase data |
| Atribuicoes | `/dashboard/atribuicoes` | **Integrated** | Real Supabase data (Phase 12-02) |
| Frequencia | `/dashboard/frequencia` | **Integrated** | FrequenciaWorkflow component |
| Diario de Classe | `/dashboard/diario` | **Integrated** | ClassDiary API |
| Notas | `/dashboard/notas` | **MOCK DATA** | Mock data only |
| Relatorios | `/dashboard/relatorios` | **Integrated** | Reports API |
| Configuracoes | `/dashboard/configuracoes` | **Integrated** | Configs API |

### Dashboard Pages - NOT in Sidebar (Orphan/Hidden)

| Path | Status | In Sidebar | Recommendation |
|------|--------|------------|----------------|
| `/dashboard/calendario` | **Integrated** | NO | Add to sidebar or document as admin-only |
| `/dashboard/sessoes` | **Integrated** | NO | Add to sidebar or document as admin-only |
| `/dashboard/responsaveis` | **Integrated** | NO | Add to sidebar under Cadastros |
| `/dashboard/responsaveis/novo` | **Integrated** | NO | Sub-page of responsaveis |
| `/dashboard/responsaveis/[id]` | **Integrated** | NO | Sub-page of responsaveis |
| `/dashboard/flags` | **Integrated** | NO | Admin-only, intentionally hidden |
| `/dashboard/perfil` | Unknown | NO | Verify existence and purpose |

### Alternate Route Group Pages

| Path | Status | Notes |
|------|--------|-------|
| `/diario` | Layout only | Route group wrapper |
| `/diario/page.tsx` | Unknown | May be duplicate |
| `/diario/frequencia` | **Integrated** | Full frequency page implementation |
| `/diario/relatorios/[alunoId]` | Unknown | Student-specific reports |
| `/relatorios/frequencia` | **Integrated** | Attendance reports with exports |
| `/relatorios/bolsa-familia` | **Integrated** | Bolsa Familia compliance reports |
| `/relatorios/conteudo` | Unknown | Content reports |

### Student Diary Sub-pages

| Path | Status | Notes |
|------|--------|-------|
| `/dashboard/alunos/[id]/diario` | Unknown | Student diary view |
| `/dashboard/alunos/[id]/diario/novo` | Unknown | New diary entry |
| `/dashboard/alunos/[id]/diario/relatorio` | Unknown | Diary report |
| `/dashboard/alunos/[id]/boletim` | Unknown | Student report card |

## Sidebar Navigation Analysis

### Current Sidebar Structure (from sidebar.tsx)

```
Principal
  - Dashboard (/dashboard)

Cadastros
  - Alunos (/dashboard/alunos)
  - Usuarios (/dashboard/usuarios) [admin only]
  - Escolas (/dashboard/escolas) [admin only]
  - Turmas (/dashboard/turmas)
  - Matriculas (/dashboard/matriculas)
  - Atribuicoes (/dashboard/atribuicoes) [admin/diretor]

Academico
  - Frequencia (/dashboard/frequencia)
  - Diario de Classe (/dashboard/diario)
  - Notas (/dashboard/notas)

Gestao
  - Relatorios (/dashboard/relatorios)
  - Configuracoes (/dashboard/configuracoes) [admin/diretor]
```

### Missing from Sidebar

1. **Responsaveis** - `/dashboard/responsaveis` exists but not in sidebar
2. **Calendario** - `/dashboard/calendario` exists but not in sidebar
3. **Sessoes** - `/dashboard/sessoes` exists but not in sidebar
4. **Flags** - `/dashboard/flags` intentionally hidden (admin-only feature flag management)

## Integration Status Details

### Fully Integrated Pages (Real Data)
- Dashboard with parallel Supabase queries
- Alunos CRUD with escola filtering
- Usuarios CRUD with role management
- Escolas CRUD
- Turmas CRUD with professor assignment
- Matriculas CRUD with turma/aluno linking
- Atribuicoes with professor-turma assignment
- Frequencia with FrequenciaWorkflow
- Diario with ClassDiary API
- Relatorios with Reports API
- Configuracoes with Configs API
- Chamada page with attendance API and compliance (18:00 lock)
- Flags with feature flag management

### Partially Integrated Pages
- `/dashboard/calendario` - Integrated with `calendario_escolar` table but requires escola_id
- `/dashboard/sessoes` - Integrated with `sessoes_aula` table

### Mock Data Pages
- `/dashboard/notas` - **Uses mockTurmasNotas constant** - No Supabase integration

### Unknown Status Pages (Need Verification)
- `/dashboard/perfil`
- `/dashboard/alunos/[id]/diario/*`
- `/dashboard/alunos/[id]/boletim`
- `/diario/page.tsx`
- `/diario/relatorios/[alunoId]`
- `/relatorios/conteudo`

## API Routes Inventory

```
/api/attendance/trends - Attendance trend data
/api/compliance/warnings - Compliance warnings
/api/frequencia/marcar - Mark attendance
/api/frequencia/sessao/[aula_id] - Session-specific attendance
/api/health - Health check
/api/search - Global search
/api/sessoes/aula/[id]/cancelar - Cancel session
/api/sessoes/aula/[id]/frequencia/batch - Batch attendance
/api/sessoes/aula/[id]/status - Session status
/api/sessoes/aula/abrir - Open session
/api/vivencias/route - Vivencias CRUD
/api/vivencias/[id] - Single vivencia
```

## Code Quality Patterns Observed

### Good Patterns (Standard)
1. **API Services Pattern** - `lib/api/*.ts` with typed returns
2. **Structured Logger** - `logger.error/info/warn` instead of console
3. **React Query** - For data fetching with staleTime configuration
4. **EscolaContext** - Admin escola selector pattern
5. **Role-based access** - `canRecordAttendance` helper
6. **Compliance integration** - 18:00 lock, immutability

### Legacy Patterns (Need Update)
1. **Mock data usage** - Notas page uses hardcoded mock data
2. **Inline Supabase queries** - Some pages query directly vs using API services
3. **Missing escola filtering** - Some pages may not respect admin escola selection

## Recommendations for Audit

### Priority 1: Remove Development Pages
1. Remove `/showcase` page
2. Remove `/platform-names` page

### Priority 2: Fix Mock Data Pages
1. **Notas page** - Requires full Supabase integration
   - Need to define `notas` table schema
   - Implement NotasApiService
   - Replace mockTurmasNotas with real queries

### Priority 3: Sidebar Navigation Cleanup
1. Decide: Add Responsaveis to sidebar OR document as hidden feature
2. Decide: Add Calendario to sidebar under Gestao OR remove page
3. Decide: Add Sessoes to sidebar under Gestao OR remove page

### Priority 4: Verify Unknown Pages
1. Verify `/dashboard/perfil` implementation
2. Verify student diary sub-pages functionality
3. Verify `/relatorios/conteudo` implementation
4. Check for duplicate route implementations

### Priority 5: Route Group Cleanup
1. Evaluate `/diario/frequencia` vs `/dashboard/frequencia` overlap
2. Evaluate `/relatorios/*` vs `/dashboard/relatorios` overlap
3. Consolidate or document intentional separation

## Data Sources

### Tables Referenced by Pages
- alunos
- escolas
- turmas
- matriculas
- users
- frequencia
- sessoes_aula
- calendario_escolar
- responsaveis
- vivencias
- configs
- feature_flags
- feature_flag_escola

### Tables NOT Found in Pages
- notas (page uses mock data)

## Audit Checklist Template

For each page, verify:
- [ ] Real Supabase data (not mock)
- [ ] Uses API service pattern
- [ ] Uses structured logger
- [ ] Respects escola context for admin
- [ ] Role-based access control
- [ ] Linked in sidebar (if user-facing)
- [ ] Loading states
- [ ] Error handling

## Open Questions

1. **Notas Schema** - Is there a `notas` table in the database? The page uses mock data but the schema may not exist yet.

2. **Route Consolidation** - Should `/diario/frequencia` and `/relatorios/*` routes be consolidated under `/dashboard/`?

3. **Responsaveis Purpose** - Is this an active feature or legacy code?

4. **Calendario Purpose** - Is this for school calendar management? Should it be promoted to sidebar?

## Metadata

**Confidence breakdown:**
- Page inventory: HIGH - Direct file system analysis
- Integration status: HIGH - Direct code review
- Sidebar analysis: HIGH - Direct sidebar.tsx review
- Recommendations: MEDIUM - Based on patterns observed

**Research date:** 2026-01-20
**Valid until:** 2026-02-20 (30 days for stable analysis)
