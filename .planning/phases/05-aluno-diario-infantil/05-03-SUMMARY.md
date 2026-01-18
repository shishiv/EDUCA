---
phase: 05-aluno-diario-infantil
plan: 03
subsystem: diario-infantil
tags: [bncc, development-report, vivencias, sidebar, descriptive-education]

dependency-graph:
  requires: [05-02]
  provides: [development-report-writer, vivencias-reference-sidebar, relatorio-page]
  affects: []

tech-stack:
  added: []
  patterns:
    - "Sidebar sync pattern (campo focus triggers filter)"
    - "Mobile sheet for sidebar content"
    - "Expand/collapse card pattern"

key-files:
  created:
    - gestao_fronteira/components/diary/VivenciasReference.tsx
    - gestao_fronteira/components/diary/DevelopmentReportWriter.tsx
    - gestao_fronteira/app/(dashboard)/dashboard/alunos/[id]/diario/relatorio/page.tsx
  modified:
    - gestao_fronteira/components/diary/index.ts

decisions:
  - key: sidebar-sync
    choice: "Campo focus in writer triggers filter in sidebar"
    reason: "Teacher sees relevant vivencias when writing specific campo"
  - key: min-chars-finalization
    choice: "50 characters minimum per campo for finalization"
    reason: "Ensures meaningful observations (lower than 150 in original form for flexibility)"
  - key: mobile-sheet
    choice: "Vivencias sidebar in Sheet on mobile"
    reason: "Space-efficient, consistent with other mobile patterns"
  - key: semester-selector
    choice: "Simple dropdown for 1o/2o semestre selection"
    reason: "Reports are per-semester, current semester as default"

metrics:
  duration: 9 min
  completed: 2026-01-18
---

# Phase 5 Plan 3: Development Report Writer Summary

**One-liner:** Report writing interface with 5 campo textareas and vivencias reference sidebar for teachers to write BNCC-compliant descriptive development reports.

## What Was Built

### 1. VivenciasReference Sidebar Component
Scrollable sidebar for referencing vivencias while writing reports:
- Sticky header with "Vivencias Registradas" title and count badge
- Filter tabs for each Campo de Experiencia with count indicators
- Compact vivencia cards showing date, campo badges, truncated description
- Click to expand/collapse full description
- Empty state when no vivencias match filter
- Fixed width suitable for sidebar layout (~350px)

### 2. DevelopmentReportWriter Component
Form for writing descriptive reports per Campo de Experiencia:
- 5 textareas, one for each BNCC Campo de Experiencia
- Campo headers with color, emoji, and description
- Character count indicator (50 chars minimum for finalization)
- Progress indicator (X/5 campos filled)
- General observations textarea (optional)
- Save Draft button (always enabled)
- Finalize button (enabled when all 5 campos have min content)
- onCampoFocus callback for sidebar sync
- CRITICAL: No grades, scores, or numerical indicators (BNCC compliant)

### 3. Relatorio Page
Report writing interface with vivencias reference:
- Two-column layout on desktop (writer + sidebar)
- Single column on mobile with Sheet for vivencias access
- Campo focus syncs with sidebar filter automatically
- Semester selection dropdown (defaults to current semester)
- Export/Print button (placeholder for future PDF export)
- Back navigation to diario page

## Key Implementation Details

### Sidebar Sync Pattern
When teacher focuses on a campo textarea, the sidebar automatically filters to show only vivencias tagged with that campo. This provides contextual reference while writing.

### BNCC Compliance
The component explicitly avoids any numerical grades, scores, or indicators. Only descriptive text is captured, following BNCC requirements for Educacao Infantil.

### Responsive Design
- Desktop: Side-by-side layout with sticky sidebar
- Mobile: Single column with vivencias accessible via Sheet component
- Responsive header with semester selector

## Verification Results

- [x] VivenciasReference renders sidebar with vivencias list
- [x] Sidebar filters by campo when tab clicked
- [x] DevelopmentReportWriter renders 5 campo textareas
- [x] Progress indicator shows X/5 completion
- [x] No grades, scores, or numerical indicators anywhere
- [x] Relatorio page shows side-by-side layout on desktop
- [x] Campo focus syncs with sidebar filter
- [x] Mobile layout works (single column + sheet)
- [x] TypeScript compiles without errors

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| c318020 | feat | Add VivenciasReference sidebar component |
| 493e5e2 | feat | Add DevelopmentReportWriter component |
| e2d6e7e | feat | Add Relatorio de Desenvolvimento page |

## Next Phase Readiness

Phase 5 is now complete. All 3 plans executed:
- 05-01: Student Profile Refactor
- 05-02: Diario Infantil Module
- 05-03: Development Report Writer (this plan)

**Project Status:** 11/11 plans complete (100%)

## Files Reference

```
gestao_fronteira/
  components/
    diary/
      VivenciasReference.tsx    # NEW - Sidebar component
      DevelopmentReportWriter.tsx # NEW - Report writer form
      index.ts                  # MODIFIED - Added exports
  app/(dashboard)/dashboard/
    alunos/[id]/diario/
      relatorio/
        page.tsx                # NEW - Report page
```
