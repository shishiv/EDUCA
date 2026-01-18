---
phase: 05-aluno-diario-infantil
plan: 01
subsystem: students
completed: 2026-01-17
duration: 8 min
tags:
  - student-profile
  - faixa-etaria
  - responsive-layout
  - bncc

dependency-graph:
  requires:
    - 04-02 (Chamada Screen - established responsive patterns)
    - design-system (Avatar, Badge, Card components)
  provides:
    - StudentProfileHeader component (large avatar + name + stats)
    - StudentTags component (turma/turno/BF chips)
    - StudentInfoGrid component (two-column responsive grid)
    - FaixaEtariaIndicator component (age group badge)
    - calculateFaixaEtaria utility function
  affects:
    - 05-02 (Diario Infantil - uses faixa etaria)
    - 05-03 (Development Report - uses student components)

tech-stack:
  added: []
  patterns:
    - BNCC faixa etaria calculation (0-18, 19-47, 48-71 months)
    - Responsive two-column grid (lg:grid-cols-2)
    - Profile header with large avatar (~120px)

key-files:
  created:
    - gestao_fronteira/lib/utils/faixa-etaria.ts
    - gestao_fronteira/components/students/FaixaEtariaIndicator.tsx
    - gestao_fronteira/components/students/StudentProfileHeader.tsx
    - gestao_fronteira/components/students/StudentTags.tsx
    - gestao_fronteira/components/students/StudentInfoGrid.tsx
  modified:
    - gestao_fronteira/components/students/index.ts
    - gestao_fronteira/app/(dashboard)/dashboard/alunos/[id]/page.tsx

decisions:
  - key: faixa-etaria-dynamic
    summary: Calculate faixa etaria dynamically from birth date
    rationale: Age changes over time; static calculation would be stale
  - key: diario-button-conditional
    summary: Show Diario Infantil button only for Infantil-age students
    rationale: Feature irrelevant for older students (grades exist for them)
  - key: hide-grades-infantil
    summary: Hide grades table for Infantil students
    rationale: BNCC explicitly prohibits numerical grades for Educacao Infantil

metrics:
  tasks-completed: 3
  files-created: 5
  files-modified: 2
  lines-added: ~600
---

# Phase 5 Plan 1: Student Profile Refactor Summary

Refactored student profile page with modern layout featuring large avatar header, tag chips, two-column info grid, and faixa etaria indicator for Infantil students using BNCC age group definitions.

## Objectives Met

- [x] Create FaixaEtaria utilities with BNCC age group calculations
- [x] Create FaixaEtariaIndicator component with colored badge and tooltip
- [x] Create StudentProfileHeader with ~120px avatar and stats row
- [x] Create StudentTags with turma/turno/BF chips
- [x] Create StudentInfoGrid with two-column responsive layout
- [x] Refactor alunos/[id]/page.tsx to use new components
- [x] Add Diario Infantil button for young students

## Implementation Summary

### Task 1: Faixa Etaria Utilities

Created `lib/utils/faixa-etaria.ts` with:
- `FaixaEtaria` type: 'bebes' | 'criancas-bem-pequenas' | 'criancas-pequenas'
- `FAIXA_ETARIA_CONFIG`: BNCC-compliant age ranges (0-18, 19-47, 48-71 months)
- `calculateFaixaEtaria()`: Uses date-fns differenceInMonths
- `isInfantilAge()`: Boolean check for Infantil age range

Created `components/students/FaixaEtariaIndicator.tsx`:
- Colored badge based on age group (orange/violet/sky)
- Tooltip with age range description and stage (Creche/Pre-escola)
- Returns null for students outside 0-71 months range

### Task 2: Profile Components

**StudentProfileHeader**: Large avatar (~120px on desktop) with name, age, and optional stats row (frequencia %, vivencias count).

**StudentTags**: Flex-wrap layout of colored Badge chips for turma (blue), turno (gray), status (green/gray), and Bolsa Familia (yellow, conditional).

**StudentInfoGrid**: Two-column responsive grid (lg:grid-cols-2) with:
- Left: Dados Pessoais card, Responsavel card
- Right: Frequencia summary with progress bar, Matriculas history

### Task 3: Page Integration

Refactored `alunos/[id]/page.tsx`:
- Replaced inline layout with new components
- Added Diario Infantil button for Infantil-age students
- Hides grades table for Infantil students (BNCC compliance)
- Simplified from ~670 lines to ~410 lines

## Verification

- [x] TypeScript compiles without errors
- [x] All components export correctly via index.ts
- [x] Profile header shows avatar (~120px) + name + stats
- [x] Tags display turma/turno chips below name
- [x] Layout is responsive (stacks to single column on mobile)
- [x] FaixaEtariaIndicator shows for young students

## Deviations from Plan

None - plan executed as written.

## Technical Notes

### Faixa Etaria Color Scheme

| Faixa | Age Range | Color | Stage |
|-------|-----------|-------|-------|
| Bebes | 0-18 months | orange-500 | Creche |
| Criancas bem pequenas | 19-47 months | violet-500 | Creche |
| Criancas pequenas | 48-71 months | sky-500 | Pre-escola |

### Responsive Breakpoints

- Mobile (< lg): Single column, smaller avatar (96px)
- Desktop (lg+): Two columns, larger avatar (120px)

## Next Phase Readiness

Ready for 05-02 (Diario Infantil components). The faixa etaria utilities and student profile structure are in place.

## Commits

| Hash | Message |
|------|---------|
| cf006b2 | feat(05-01): add faixa etaria utilities and indicator component |
| 0dc3ec4 | feat(05-02): add VivenciaForm and VivenciaCard components (includes Task 2 files) |
| c6d0aa7 | feat(05-02): add VivenciasTimeline and Diario pages (includes Task 3 page refactor) |
