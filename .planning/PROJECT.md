# PROJECT.md

## Project: EDUCA - Sistema de Gestao Escolar

**Status:** v2.0 In Progress
**Started:** 2026-01-16
**Type:** School Management System (Brownfield)

---

## Current Milestone: v2.0 Architecture & Launch Prep

**Goal:** Auditar codebase completo, padronizar arquitetura, implementar feature flags, e preparar sistema para piloto em 1-2 escolas.

**Context:** Sistema construido por multiplos workflows com padroes inconsistentes. Precisa de auditoria profunda antes de adicionar novas features.

**Target outcomes:**
- Mapeamento completo: codigo existente vs roadmap planejado
- Identificacao de padroes inconsistentes e tech debt
- Arquitetura padronizada para suportar features futuras
- Feature flags via Supabase config (Nutricao, Estoque Escolar)
- Checklist de launch readiness para piloto

---

## Current State

### v1.0 SHIPPED (2026-01-18)

UI/UX overhaul following EDUCA design system:
- Design system foundation (CSS variables, Tailwind, typography)
- Responsive layout (Sidebar, Header, MobileNav)
- Screens: Login, Dashboard, Turmas, Chamada, Aluno
- New module: Diario Infantil (BNCC-compliant, mock API)

### Known Issues

**Code Quality:**
- Multiple coding styles (different workflows/developers)
- Inconsistent patterns across modules
- Unknown coverage of original roadmap features

**Tech Debt (from v1.0):**
- 2 orphaned components (AttendanceButton, CampoExperiencia)
- Frequency percentage hardcoded at 85%
- Vivencias API not implemented (mock data)
- PDF export not implemented

**Unknown Status:**
- Compliance features (LGPD, backups, encryption)
- Core features from original roadmap (Fase 0-1)
- Data import/export functionality

---

## Vision

Sistema de gestao escolar completo para a rede municipal de Fronteira, MG. Gerencia alunos, frequencia, diarios de classe, nutricao, transporte e relatorios para MEC/Bolsa Familia.

---

## Goals

### v2.0 Goals

1. **Codebase Audit**
   - Mapear codigo existente vs roadmap original
   - Identificar o que funciona, o que esta incompleto, o que falta
   - Documentar padroes de codigo encontrados

2. **Architecture Standardization**
   - Definir padroes de codigo unificados
   - Identificar refatoracoes necessarias
   - Priorizar por impacto no piloto

3. **Feature Flags System**
   - Tabela de configuracao no Supabase
   - Toggle por escola
   - Preparar para: Nutricao, Estoque Escolar

4. **Launch Readiness**
   - Checklist para piloto em 1-2 escolas
   - Validar fluxos E2E criticos
   - Compliance basico (LGPD, seguranca)

### Previous Goals (v1.0 - Complete)

- Design System EDUCA
- Layout Principal (Sidebar, Header)
- Telas Refatoradas (Login, Dashboard, Turmas, Chamada, Aluno)
- Diario Infantil BNCC

---

## Requirements

### Validated (v1.0)

48 UI/UX requirements across:
- Design System (4), Layout (5), Components (10)
- Login (5), Dashboard (4), Turmas (4), Chamada (5)
- Aluno (3), Diario Infantil (5), Accessibility (3)

### Active (v2.0)

To be defined after codebase audit. Expected categories:
- Audit: Codebase mapping, pattern analysis
- Standardization: Code patterns, refactoring priorities
- Feature Flags: Infrastructure, admin UI
- Launch: E2E flows, compliance, documentation

### Out of Scope (v2.0)

| Feature | Reason |
|---------|--------|
| Novos modulos (Nutricao, Estoque) | Feature flags apenas, implementacao futura |
| Integracao WhatsApp | Complexidade alta, deferida |
| Edicao retroativa de frequencia | Compliance brasileiro proibe |

---

## Constraints

- Must maintain existing Supabase API contracts
- Must preserve Brazilian compliance (attendance immutability, auto-lock)
- Must work offline-first (existing PWA)
- Must support Portuguese language
- Pilot in 1-2 schools before full rollout

---

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| v1.0: CSS variables as tokens | Enables runtime theming | Good |
| v1.0: Sort in JS not Supabase | Nested relation ordering | Good |
| v2.0: Supabase feature flags | Per-school toggle, no external deps | Pending |
| v2.0: Audit before new features | Unknown codebase state | Pending |

---

## Source of Truth

**Original roadmap:** `/docs/educa-roadmap(1).html`
**Design mockups:** `/docs/*.html`
**Codebase:** `gestao_fronteira/`

---

*Last updated: 2026-01-18 after v2.0 milestone start*
