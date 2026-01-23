# Roadmap: EDUCA v2.0 Architecture & Launch Prep

**Created:** 2026-01-18
**Milestone:** v2.0
**Phases:** 6-12 (continuing from v1.0)

---

## Overview

Auditar e padronizar codebase para suportar features futuras e preparar piloto em 1-2 escolas.

| Phase | Name | Requirements | Goal |
|-------|------|--------------|------|
| 6 | Build & Quality | BLD-01..04 | Habilitar type checking e lint no build |
| 7 | Data Integrity | DAT-01..03 | Substituir dados mock por dados reais |
| 8 | Code Standards | STD-01..04 | Padronizar data fetching e logging |
| 9 | Feature Flags | FLG-01..04 | Sistema de flags por escola no Supabase |
| 10 | Security & Compliance | SEC-01..03 | Migrations versionadas e RLS documentado |
| 11 | Testing | TST-01..03 | Framework de testes com cobertura critica |
| 12 | Role Access & Assignments | ROL-01..02 | Restrições por perfil e atribuição professor-turma |
| 13 | Admin Demo Assignment | DMO-01 | Admin pode se atribuir escola/turma para demo |
| 14 | Legacy Page Audit | AUD-01..02 | Auditar páginas legadas não integradas |
| 15 | Technical Debt Cleanup | CLN-01..08 | Zero mocks, zero TODOs, zero queries diretas |

| 15.1 | Dead Code Audit | DCA-01..03 | Remover código morto via LSP findReferences |

**Total:** 11 phases | 37 requirements

---

## Phase 6: Build & Quality ✓

**Goal:** Habilitar TypeScript type checking e ESLint no build para prevenir erros em produção.

**Requirements:**
- BLD-01: TypeScript type checking habilitado no build
- BLD-02: ESLint habilitado no build
- BLD-03: Zero erros de TypeScript no `pnpm typecheck`
- BLD-04: Zero erros de lint no `pnpm lint`

**Plans:** 4 plans completed

Plans:
- [x] 06-01-PLAN.md - Migrate ESLint to flat config format (completed 2026-01-19)
- [x] 06-02-PLAN.md - Enable build enforcement (completed 2026-01-19)
- [x] 06-03-PLAN.md - Remove dead code causing build failure (completed 2026-01-19)
- [x] 06-04-PLAN.md - Create CI pipeline (completed 2026-01-19)

**Success Criteria:**
- [x] `next.config.js` sem `ignoreBuildErrors: true`
- [x] `next.config.js` sem `ignoreDuringBuilds: true`
- [x] `pnpm build` executa sem erros de tipo ou lint
- [x] CI pipeline valida typecheck e lint

**Dependencies:** None (foundational)

**Status:** Complete (2026-01-19)

---

## Phase 7: Data Integrity ✓

**Goal:** Substituir dados mock por dados reais do Supabase em todas as telas.

**Requirements:**
- DAT-01: Frequencia calculada de dados reais (nao hardcoded 85%)
- DAT-02: Dashboards usando dados reais (nao mock data)
- DAT-03: Diario Infantil Vivencias com API funcional

**Plans:** 4 plans completed

Plans:
- [x] 07-01-PLAN.md — Create Vivencias API and service layer (completed 2026-01-19)
- [x] 07-02-PLAN.md — Replace dashboard mock stats with real Supabase data (completed 2026-01-19)
- [x] 07-03-PLAN.md — Replace mock student data and calculate real attendance (completed 2026-01-19)
- [x] 07-04-PLAN.md — Connect Diario Infantil pages to vivencias API (completed 2026-01-19)

**Success Criteria:**
- [x] Frequencia reflete attendance records reais por aluno
- [x] AdminDashboard mostra stats agregadas do Supabase
- [x] CRUD de vivencias funcional em `/api/vivencias`
- [x] Telas de Diario Infantil consomem API real

**Dependencies:** Phase 6 (build must pass first)

**Status:** Complete (2026-01-19)

---

## Phase 7.1: Admin School Selector (INSERTED) ✓

**Goal:** Seletor de escola persistente para perfis admin conseguirem acessar dados escola-scoped (turmas, alunos, etc).

**Requirements:**
- ADM-01: Seletor de escola no header/sidebar para perfis admin
- ADM-02: Seleção persistente em sessionStorage/context global
- ADM-03: Páginas escola-scoped usam selectedEscolaId quando disponível

**Plans:** 3 plans completed

Plans:
- [x] 07.1-01-PLAN.md — Create EscolaContext provider and useEscola hook (completed 2026-01-19)
- [x] 07.1-02-PLAN.md — Create UI components and integrate in layout/sidebar (completed 2026-01-19)
- [x] 07.1-03-PLAN.md — Update escola-scoped pages to use context (completed 2026-01-19)

**Success Criteria:**
- [x] Admin pode selecionar escola no dashboard
- [x] Seleção persiste durante navegação
- [x] `/turmas`, `/alunos`, etc. funcionam com escola selecionada
- [x] Admin pode alternar entre escolas sem re-login

**Dependencies:** Phase 7 (data integrity first)

**Status:** Complete (2026-01-19)

---

## Phase 8: Code Standards ✓

**Goal:** Padronizar data fetching e logging para manutenibilidade.

**Requirements:**
- STD-01: Padrao unico de data fetching documentado (React Query + API layer)
- STD-02: Padrao unico de filtros (valor default: 'todos')
- STD-03: Queries Supabase centralizadas em lib/api/
- STD-04: Console.error substituido por lib/logger.ts estruturado

**Plans:** 4 plans completed

Plans:
- [x] 08-01-PLAN.md — Document data fetching and filter patterns in CONVENTIONS.md (completed 2026-01-19)
- [x] 08-02-PLAN.md — Migrate console.error to logger in lib/ files (completed 2026-01-19)
- [x] 08-03-PLAN.md — Centralize Supabase queries in report and chamada pages (completed 2026-01-19)
- [x] 08-04-PLAN.md — Centralize remaining page queries and complete logger migration (completed 2026-01-19)

**Success Criteria:**
- [x] CONVENTIONS.md atualizado com data fetching pattern
- [x] Filtros usando 'todos' como default em toda a app
- [x] Queries inline migradas para lib/api/*.ts
- [x] 70+ console.error calls substituidas por logger

**Dependencies:** Phase 7.1 (admin school selector first)

**Status:** Complete (2026-01-19)

---

## Phase 9: Feature Flags ✓

**Goal:** Sistema de feature flags por escola para rollout gradual de modulos.

**Requirements:**
- FLG-01: Tabela `feature_flags` no Supabase com schema (escola_id, flag_name, enabled)
- FLG-02: Hook `useFeatureFlag(flagName)` para check no frontend
- FLG-03: UI admin para toggle de flags por escola em /admin/flags
- FLG-04: Flags criados para modulos futuros: nutricao, estoque_escolar

**Plans:** 3 plans completed

Plans:
- [x] 09-01-PLAN.md — Create database migration and TypeScript types (completed 2026-01-19)
- [x] 09-02-PLAN.md — Create API service and React Query hook (completed 2026-01-19)
- [x] 09-03-PLAN.md — Create admin UI at /dashboard/flags (completed 2026-01-19)

**Success Criteria:**
- [x] Migration criada para tabela feature_flags
- [x] Hook useFeatureFlag com caching (React Query)
- [x] Admin UI lista escolas x flags com toggle
- [x] Flags nutricao e estoque_escolar criados (disabled)

**Dependencies:** Phase 8 (patterns established)

**Status:** Complete (2026-01-19)

---

## Phase 10: Security & Compliance ✓

**Goal:** Versionar migrations e documentar RLS policies para auditoria.

**Requirements:**
- SEC-01: Supabase migrations versionadas em supabase/migrations/
- SEC-02: RLS policies documentadas em .planning/codebase/RLS-POLICIES.md
- SEC-03: Placeholder de telefone removido da politica de privacidade

**Plans:** 3 plans completed

Plans:
- [x] 10-01-PLAN.md — Supabase CLI setup and baseline migration export (completed 2026-01-19)
- [x] 10-02-PLAN.md — Document RLS policies with security matrix and diagrams (completed 2026-01-19)
- [x] 10-03-PLAN.md — Update privacy policy with real contact information (completed 2026-01-19)

**Success Criteria:**
- [x] Supabase CLI configurado no projeto
- [x] Schema atual exportado como migration inicial
- [x] Documento RLS-POLICIES.md com todas as policies
- [x] Telefone real na pagina de privacidade

**Dependencies:** Phase 9 (feature flags table needs migration)

**Status:** Complete (2026-01-19)

---

## Phase 11: Testing ✓

**Goal:** Framework de testes com cobertura dos fluxos criticos.

**Requirements:**
- TST-01: Framework de testes configurado (Vitest)
- TST-02: Testes unitarios para attendance workflow
- TST-03: E2E basico com Playwright para fluxos criticos

**Plans:** 3 plans completed

Plans:
- [x] 11-01-PLAN.md — Configure Vitest with jsdom, path aliases, and global mocks (completed 2026-01-20)
- [x] 11-02-PLAN.md — Create unit tests for attendance workflow and locking (completed 2026-01-20)
- [x] 11-03-PLAN.md — Configure Playwright (E2E smoke tests deferred) (completed 2026-01-20)

**Success Criteria:**
- [x] Vitest configurado com scripts em package.json
- [x] Testes para attendance-workflow.ts, attendance-locking.ts
- [ ] Playwright E2E: smoke tests para paginas criticas (deferred - environment issues)
- [ ] CI executa testes unitarios automaticamente (deferred)

**Dependencies:** Phase 10 (security patterns in place)

**Status:** Complete (2026-01-20) - E2E deferred to future phase

---

## Phase 12: Role Access & Assignments ✓

**Goal:** Restrições de ações por perfil (admin visualiza, professor registra) e tela de atribuição professor-turma.

**Requirements:**
- ROL-01: Restrição de registro de frequência para perfil admin (view-only com mensagem explicativa)
- ROL-02: Tela de gestão para atribuir professor/perfil a turmas

**Note:** ROL-01 (active role selector for multi-role admins) deferred to v2.1 per research recommendation. For MVP, admin is always view-only for attendance.

**Plans:** 2 plans completed

Plans:
- [x] 12-01-PLAN.md — Attendance view-only mode for admin users (completed 2026-01-20)
- [x] 12-02-PLAN.md — Teacher-class assignment management page (completed 2026-01-20)

**Success Criteria:**
- [x] Admin ao tentar registrar frequência vê mensagem: "Como administrador, você pode visualizar dados de frequência, mas o registro é feito pelos professores"
- [x] UI de atribuição professor-turma em /dashboard/atribuicoes
- [x] Admin pode atribuir qualquer perfil a turmas
- [x] Sidebar mostra link Atribuicoes para admin/diretor

**Dependencies:** Phase 11 (testing framework in place)

**Status:** Complete (2026-01-20)

---

## Phase 13: Admin Demo Assignment ✓

**Goal:** Permitir que admin entre em modo demonstracao para executar acoes como professor (chamada) durante treinamentos.

**Requirements:**
- DMO-01: Admin pode se atribuir temporariamente a escola/turma para demonstrar funcionalidades

**Plans:** 1 plan completed

Plans:
- [x] 13-01-PLAN.md — Create demo mode context, banner, and page integrations (completed 2026-01-20)

**Success Criteria:**
- [x] Admin pode entrar em "modo demonstracao" a partir da pagina de atribuicoes
- [x] Em modo demo, admin pode registrar chamada (botoes habilitados)
- [x] Banner roxo distintivo mostra modo demo ativo
- [x] Acoes em modo demo registradas com user_id do admin (audit trail)
- [x] Admin pode sair do modo demo a qualquer momento

**Dependencies:** Phase 12 (role access in place)

**Status:** Complete (2026-01-20)

---

## Phase 14: Legacy Page Audit ✓

**Goal:** Auditar todas as páginas para identificar sistemas legados não integrados/costurados.

**Requirements:**
- AUD-01: Inventário completo de páginas existentes com status de integração
- AUD-02: Lista de páginas órfãs ou com funcionalidade incompleta

**Plans:** 2 plans completed

Plans:
- [x] 14-01-PLAN.md — Create PAGE-AUDIT.md with complete page inventory (completed 2026-01-20)
- [x] 14-02-PLAN.md — Remove dev pages and update sidebar navigation (completed 2026-01-20)

**Success Criteria:**
- [x] Documento listando todas as rotas/páginas da aplicação
- [x] Cada página classificada: funcional, parcial, órfã, legada
- [x] Recomendações de ação para cada página problemática
- [x] Sidebar/navegação reflete apenas páginas funcionais

**Dependencies:** Phase 13 (demo mode helps testing)

**Status:** Complete (2026-01-20)

---

## Phase 15: Technical Debt Cleanup ✓

**Goal:** Resolver todos os achados dos audits - mocks, TODOs, naming, refactors, queries diretas.

**Requirements:**
- CLN-01: Completar TODOs em pages (diário edit/delete, relatório save, PDF exports)
- CLN-02: Completar TODOs em components (dashboard calculations, AbrirAulaWorkflow)
- CLN-03: Completar TODOs em lib/ (compliance warnings, attendance frequency, audit logging)
- CLN-04: Substituir mock data em Notas por Supabase real
- CLN-05: Renomear 5 componentes kebab-case para PascalCase
- CLN-06: Refatorar componentes grandes (AttendanceGrid, FrequenciaWorkflow >600 LOC)
- CLN-07: Mover queries Supabase diretas para API services (dashboard, diario pages)
- CLN-08: Integrar PostHog para analytics e error tracking

**Plans:** 9 plans in 2 waves

Plans:
- [x] 15-01-PLAN.md — Create DashboardStatsApiService and migrate dashboard page (Wave 1) (completed 2026-01-20)
- [x] 15-02-PLAN.md — Rename 5 kebab-case components to PascalCase (Wave 1) (completed 2026-01-20)
- [x] 15-03-PLAN.md — Integrate Notas page with existing GradesApiService (Wave 1) (completed 2026-01-20)
- [x] 15-04-PLAN.md — Complete TODOs in pages (diario edit/delete, relatorio save) (Wave 1) (completed 2026-01-20)
- [x] 15-05-PLAN.md — Complete TODOs in components (dashboard calcs, AbrirAulaWorkflow) (Wave 1) (completed 2026-01-20)
- [x] 15-06-PLAN.md — Complete TODOs in lib/ (compliance, frequency, audit) (Wave 1) (completed 2026-01-20)
- [x] 15-07-PLAN.md — Refactor AttendanceGrid into subcomponents (Wave 2) (completed 2026-01-20)
- [x] 15-08-PLAN.md — Integrate PostHog for analytics and error tracking (Wave 2) (completed 2026-01-21)
- [x] 15-09-PLAN.md — Refactor FrequenciaWorkflow into subcomponents (Wave 2) (completed 2026-01-20)

**Success Criteria:**
- [x] Zero TODOs/FIXMEs no codebase
- [x] Zero mock data - todas páginas usam Supabase real
- [x] 100% componentes seguem naming convention (PascalCase)
- [x] Nenhum componente >500 LOC
- [x] Zero queries Supabase diretas em pages (tudo via API service)
- [x] Error tracking em produção funcionando

**Dependencies:** Phase 14 (audits identify issues)

**Status:** Complete (2026-01-21)

---

## Phase 15.1: Dead Code Audit via LSP (INSERTED)

**Goal:** Use LSP findReferences to identify and remove unreachable/unused code across the codebase.

**Requirements:**
- DCA-01: Audit unused exports (functions, types, constants) via LSP findReferences
- DCA-02: Remove confirmed dead code with git history preservation
- DCA-03: Document audit methodology and findings

**Plans:** 3 plans in 2 waves

Plans:
- [ ] 15.1-01-PLAN.md — Audit lib/ directory (84 files) with knip and LSP (Wave 1)
- [ ] 15.1-02-PLAN.md — Audit components/ directory (141 files) with LSP (Wave 1)
- [ ] 15.1-03-PLAN.md — Audit types/ directory (9 files) and create audit report (Wave 2)

**Success Criteria:**
- [ ] All exported symbols verified for usage via LSP
- [ ] Dead code removed with atomic commits
- [ ] Audit report documenting findings and removals

**Dependencies:** Phase 15 (codebase standardized first)

**Status:** Planned (2026-01-23)

---

## Execution Order

```
Phase 6 (Build)
    |
Phase 7 (Data)
    |
Phase 7.1 (Admin Selector) <-- INSERTED
    |
Phase 8 (Standards)
    |
Phase 9 (Flags)
    |
Phase 10 (Security)
    |
Phase 11 (Testing)
    |
Phase 12 (Role Access)
    |
Phase 13 (Admin Demo)
    |
Phase 14 (Legacy Audit)
    |
Phase 15 (Tech Debt Cleanup)
    |
Phase 15.1 (Dead Code Audit) <-- INSERTED
```

Linear dependency chain - each phase builds on previous.

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| TypeScript errors overwhelming | Fix incrementally by file/folder |
| Mock data removal breaks UI | Add loading/empty states before removing mocks |
| Pattern migration scope creep | Document pattern, migrate only critical paths |
| Testing slows velocity | Start with critical paths only (chamada) |
| Dead code removal breaks runtime | Verify with typecheck/lint/build after each removal |

---

*Roadmap created: 2026-01-18*
*Based on: .planning/REQUIREMENTS.md, .planning/codebase/CONCERNS.md*
*Gap closure plans added: 2026-01-19*
*Phase 7 planned: 2026-01-19*
*Phase 7.1 planned: 2026-01-19*
*Phase 8 planned: 2026-01-19*
*Phase 9 planned: 2026-01-19*
*Phase 10 planned: 2026-01-19*
*Phase 11 planned: 2026-01-19*
*Phase 12 planned: 2026-01-20 (Role Access & Assignments - 2 plans)*
*Phase 12 complete: 2026-01-20*
*Phase 13 added: 2026-01-20 (Admin Demo Assignment)*
*Phase 13 planned: 2026-01-20 (Admin Demo Mode - 1 plan)*
*Phase 14 planned: 2026-01-20 (Legacy Page Audit - 2 plans)*
*Phase 14 complete: 2026-01-20*
*Phase 15 added: 2026-01-20 (Technical Debt Cleanup - 8 requirements from audits)*
*Phase 15 planned: 2026-01-20 (Technical Debt Cleanup - 8 plans in 2 waves)*
*Phase 15 revised: 2026-01-20 (9 plans - added FrequenciaWorkflow refactor)*
*Phase 15 complete: 2026-01-21*
*Phase 15.1 planned: 2026-01-23 (Dead Code Audit - 3 plans in 2 waves)*
