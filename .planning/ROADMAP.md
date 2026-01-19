# Roadmap: EDUCA v2.0 Architecture & Launch Prep

**Created:** 2026-01-18
**Milestone:** v2.0
**Phases:** 6-11 (continuing from v1.0)

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

**Total:** 6 phases | 21 requirements

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

## Phase 7.1: Admin School Selector (INSERTED)

**Goal:** Seletor de escola persistente para perfis admin conseguirem acessar dados escola-scoped (turmas, alunos, etc).

**Requirements:**
- ADM-01: Seletor de escola no header/sidebar para perfis admin
- ADM-02: Seleção persistente em sessionStorage/context global
- ADM-03: Páginas escola-scoped usam selectedEscolaId quando disponível

**Plans:** 3 plans in 3 waves

Plans:
- [ ] 07.1-01-PLAN.md — Create EscolaContext provider and useEscola hook
- [ ] 07.1-02-PLAN.md — Create UI components and integrate in layout/sidebar
- [ ] 07.1-03-PLAN.md — Update escola-scoped pages to use context

**Success Criteria:**
- [ ] Admin pode selecionar escola no dashboard
- [ ] Seleção persiste durante navegação
- [ ] `/turmas`, `/alunos`, etc. funcionam com escola selecionada
- [ ] Admin pode alternar entre escolas sem re-login

**Dependencies:** Phase 7 (data integrity first)

**Status:** Planned (2026-01-19)

---

## Phase 8: Code Standards

**Goal:** Padronizar data fetching e logging para manutenibilidade.

**Requirements:**
- STD-01: Padrao unico de data fetching documentado (React Query + API layer)
- STD-02: Padrao unico de filtros (valor default: 'todos')
- STD-03: Queries Supabase centralizadas em lib/api/
- STD-04: Console.error substituido por lib/logger.ts estruturado

**Success Criteria:**
- [ ] CONVENTIONS.md atualizado com data fetching pattern
- [ ] Filtros usando 'todos' como default em toda a app
- [ ] Queries inline migradas para lib/api/*.ts
- [ ] 30+ console.error calls substituidas por logger

**Dependencies:** Phase 7.1 (admin school selector first)

---

## Phase 9: Feature Flags

**Goal:** Sistema de feature flags por escola para rollout gradual de modulos.

**Requirements:**
- FLG-01: Tabela `feature_flags` no Supabase com schema (escola_id, flag_name, enabled)
- FLG-02: Hook `useFeatureFlag(flagName)` para check no frontend
- FLG-03: UI admin para toggle de flags por escola em /admin/flags
- FLG-04: Flags criados para modulos futuros: nutricao, estoque_escolar

**Success Criteria:**
- [ ] Migration criada para tabela feature_flags
- [ ] Hook useFeatureFlag com caching (React Query)
- [ ] Admin UI lista escolas x flags com toggle
- [ ] Flags nutricao e estoque_escolar criados (disabled)

**Dependencies:** Phase 8 (patterns established)

---

## Phase 10: Security & Compliance

**Goal:** Versionar migrations e documentar RLS policies para auditoria.

**Requirements:**
- SEC-01: Supabase migrations versionadas em supabase/migrations/
- SEC-02: RLS policies documentadas em .planning/codebase/RLS-POLICIES.md
- SEC-03: Placeholder de telefone removido da politica de privacidade

**Success Criteria:**
- [ ] Supabase CLI configurado no projeto
- [ ] Schema atual exportado como migration inicial
- [ ] Documento RLS-POLICIES.md com todas as policies
- [ ] Telefone real na pagina de privacidade

**Dependencies:** Phase 9 (feature flags table needs migration)

---

## Phase 11: Testing

**Goal:** Framework de testes com cobertura dos fluxos criticos.

**Requirements:**
- TST-01: Framework de testes configurado (Vitest)
- TST-02: Testes unitarios para attendance workflow
- TST-03: E2E basico com Playwright para fluxos criticos

**Success Criteria:**
- [ ] Vitest configurado com scripts em package.json
- [ ] Testes para attendance-workflow.ts, attendance-locking.ts
- [ ] Playwright E2E: login -> dashboard -> chamada -> salvar
- [ ] CI executa testes automaticamente

**Dependencies:** Phase 10 (security patterns in place)

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

---

*Roadmap created: 2026-01-18*
*Based on: .planning/REQUIREMENTS.md, .planning/codebase/CONCERNS.md*
*Gap closure plans added: 2026-01-19*
*Phase 7 planned: 2026-01-19*
*Phase 7.1 planned: 2026-01-19*
