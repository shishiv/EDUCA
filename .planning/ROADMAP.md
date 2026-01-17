# Roadmap: EDUCA UI/UX Refactoring

## Overview

Refatorar a interface do sistema EDUCA Fronteira em 5 fases incrementais: estabelecer design tokens e componentes base, criar shell de layout, refatorar telas existentes (Login, Dashboard, Turmas, Chamada, Aluno), e implementar novo módulo de Diário Infantil BNCC.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (1.1, 1.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Design System Foundation** - Tokens CSS + componentes primitivos ✓
- [x] **Phase 2: Layout & Composites** - Shell da aplicação + padrões compostos ✓
- [x] **Phase 3: Login & Dashboard** - Primeiras telas refatoradas ✓
- [ ] **Phase 4: Turmas & Chamada** - Telas de gestão de turma
- [ ] **Phase 5: Aluno & Diário Infantil** - Perfil + módulo BNCC novo

## Phase Details

### Phase 1: Design System Foundation
**Goal**: Estabelecer fundação do design system com tokens e componentes primitivos
**Depends on**: Nothing (first phase)
**Requirements**: DS-01, DS-02, DS-03, DS-04, COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, COMP-06, ACESS-02, ACESS-03
**Success Criteria** (what must be TRUE):
  1. CSS variables render correctly in browser (colors, typography, spacing)
  2. Button component renders with primary/secondary/ghost variants
  3. Card, Input, Avatar, Badge, Label components styled per mockups
  4. Form fields have visible focus states and associated labels
  5. Error messages display below fields (not just red border)
**Research**: Likely (browser validation for Tailwind v4 in municipal schools)
**Research topics**: Safari/Chrome version support in school computers
**Plans**: TBD

Plans:
- [x] 01-01: CSS tokens + Tailwind config ✓
- [x] 01-02: Primitive components (Button, Card, Input, Avatar, Badge, Label) ✓

### Phase 2: Layout & Composites
**Goal**: Criar shell da aplicação e padrões de componentes compostos
**Depends on**: Phase 1
**Requirements**: LAY-01, LAY-02, LAY-03, LAY-04, LAY-05, COMP-07, COMP-08, COMP-09, COMP-10, ACESS-01
**Success Criteria** (what must be TRUE):
  1. Sidebar displays hierarchical navigation, collapses on mobile
  2. Header shows global search field
  3. Header shows notification bell indicator
  4. Header shows user dropdown with quick actions
  5. Layout is responsive (desktop 1200+, tablet 768-1199, mobile <768)
  6. StatCard, AlertItem, AttendanceTable, CampoExperiencia components functional
  7. All text has minimum 4.5:1 contrast ratio
**Research**: Unlikely (internal patterns, builds on Phase 1)
**Plans**: TBD

Plans:
- [x] 02-01: Sidebar + Header layout ✓
- [x] 02-02: Composite components (StatCard, AlertItem, AttendanceTable, CampoExperiencia) ✓

### Phase 3: Login & Dashboard
**Goal**: Refatorar Login e Dashboard seguindo design system
**Depends on**: Phase 2
**Requirements**: LOGIN-01, LOGIN-02, LOGIN-03, LOGIN-04, LOGIN-05, DASH-01, DASH-02, DASH-03, DASH-04
**Success Criteria** (what must be TRUE):
  1. Login shows split layout (gradient hero left, form right)
  2. EDUCA logo displays with gradient + yellow wave
  3. Login form has visible focus states and "manter conectado" ON by default
  4. Password reset link is visible
  5. Dashboard stats grid is responsive (4→2→1 columns)
  6. Turmas list shows color indicators by série
  7. Alerts panel displays with semantic colors (warning/error/info)
  8. Quick actions section is accessible
**Research**: Unlikely (internal refactor using established components)
**Plans**: TBD

Plans:
- [x] 03-01: Login screen refactor ✓
- [x] 03-02: Dashboard screen refactor ✓

### Phase 4: Turmas & Chamada
**Goal**: Refatorar telas de gestão de turma com card grid e chamada streamlined (crítico para compliance)
**Depends on**: Phase 3
**Requirements**: TURM-01, TURM-02, TURM-03, TURM-04, CHAM-01, CHAM-02, CHAM-03, CHAM-04, CHAM-05
**Success Criteria** (what must be TRUE):
  1. Turmas displays as card grid (3→2→1 columns)
  2. Turma card shows serie color band (pink/orange/violet), stats, action buttons
  3. Cards have hover effects (shadow + translate)
  4. Chamada header shows turma info + date picker
  5. Student rows display photo and name
  6. Attendance P/F/J toggle buttons with proper colors
  7. Frequency percentage shows color coding (green >75%, yellow 60-75%, red <60%)
  8. Batch save with dirty state indicator (per CONTEXT.md decision)
  9. New chamada starts with all Present
  10. Future dates view-only, 18:00 lock enforced
**Research**: Complete (04-RESEARCH.md)
**Plans**: 2 plans

Plans:
- [ ] 04-01-PLAN.md — Turmas card grid (TurmaCard, TurmaCardGrid, page refactor)
- [ ] 04-02-PLAN.md — Chamada screen (P/F/J toggle, date nav, batch save, compliance)

### Phase 5: Aluno & Diário Infantil
**Goal**: Completar perfil do aluno e implementar módulo BNCC (greenfield)
**Depends on**: Phase 4
**Requirements**: ALUN-01, ALUN-02, ALUN-03, DIAR-01, DIAR-02, DIAR-03, DIAR-04, DIAR-05
**Success Criteria** (what must be TRUE):
  1. Perfil shows avatar + name + info + stats header
  2. Two-column grid displays dados pessoais and histórico
  3. Tags display turma/turno/bolsa família
  4. Campo de Experiência selector shows 5 BNCC colors
  5. Vivência form captures text description with date
  6. Child observation cards group by date
  7. Faixa etária indicator works (Bebês, Crianças bem pequenas, Crianças pequenas)
  8. Development report generates descriptive text (never grades)
**Research**: Partial (confirm BNCC colors with official MEC materials)
**Research topics**: Cores oficiais dos Campos de Experiência
**Plans**: TBD

Plans:
- [ ] 05-01: Perfil do Aluno refactor
- [ ] 05-02: Diário Infantil module (Campo selector, Vivência form)
- [ ] 05-03: Diário Infantil reports (observations, development report)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Design System Foundation | 2/2 | Complete | 2026-01-17 |
| 2. Layout & Composites | 2/2 | Complete | 2026-01-17 |
| 3. Login & Dashboard | 2/2 | Complete | 2026-01-17 |
| 4. Turmas & Chamada | 0/2 | Planned | - |
| 5. Aluno & Diário Infantil | 0/3 | Not started | - |

---
*Roadmap created: 2026-01-17*
*Total v1 requirements: 48 (all mapped)*
