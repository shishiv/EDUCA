---
phase: 15-technical-debt-cleanup
plan: 04
subsystem: diario
tags: [todo-cleanup, api-migration, crud-operations]
completed: 2026-01-20
duration: 16m
requires:
  - 15-03 (CLN-01 component TODOs reference)
provides:
  - Student diary edit/delete fully functional
  - Relatorio save/finalize with API persistence
  - Class diary edit modal and API service methods
affects:
  - CLN-01 TODO completion (4 items resolved)
tech-stack:
  added: []
  patterns:
    - API service pattern for class-diary operations
key-files:
  created: []
  modified:
    - gestao_fronteira/app/(dashboard)/dashboard/alunos/[id]/diario/relatorio/page.tsx
    - gestao_fronteira/app/(dashboard)/diario/page.tsx
    - gestao_fronteira/lib/api/class-diary.ts
decisions:
  - Use API service pattern for class-diary CRUD operations
  - Use confirmation dialog for report finalization
  - Pre-populate edit forms from existing data
metrics:
  tasks: 3/3
  files-modified: 3
  todos-resolved: 4
---

# Phase 15 Plan 04: Page TODOs - Diario Edit/Delete/Save Summary

Completed TODOs for diario edit/delete and relatorio save/finalize operations per CLN-01 requirement.

## One-liner

Edit modal for class diary + save/finalize API for descriptive reports using consistent API service patterns.

## Commits

| Hash | Description |
|------|-------------|
| d24d1b7 | feat(15-04): implement save/finalize API for relatorio page |
| d491a6b | feat(15-04): implement edit modal and migrate delete to API service |

## Detailed Changes

### Task 1: Student Diary Page (alunos/[id]/diario/page.tsx)
**Status:** Already complete - no changes needed

The student diary page already had full edit/delete functionality:
- `handleEditVivencia` with modal opening
- `handleEditSubmit` calling `vivenciasApi.update`
- `handleDeleteVivencia` with confirmation dialog
- `handleDeleteConfirm` calling `vivenciasApi.delete`
- Toast notifications for success/error

No TODOs remained in this file for edit/delete operations.

### Task 2: Relatorio Page (alunos/[id]/diario/relatorio/page.tsx)
**Status:** Implemented

Replaced mock handlers with real API persistence:

1. **Load existing report on semester change:**
   - Query `relatorios_descritivos` table by matricula_id, ano_letivo, semestre
   - Set `existingReport` and `isReportFinalized` states

2. **Save draft implementation:**
   - Create or update report in `relatorios_descritivos` table
   - Map form field names to database column names
   - Status remains 'rascunho' for drafts

3. **Finalize implementation:**
   - Confirmation dialog before finalizing
   - Update status to 'finalizado'
   - Set `finalizado_em` and `finalizado_por` timestamps
   - Show read-only mode after finalization

4. **Read-only mode for finalized reports:**
   - Alert with Lock icon showing finalized status
   - `disabled` prop passed to DevelopmentReportWriter
   - Initial values populated from existing report

### Task 3: Class Diary Page (diario/page.tsx)
**Status:** Implemented

1. **Added to class-diary API service:**
   - `updateSession(supabase, sessionId, updates)` - Update session content
   - `deleteSession(supabase, sessionId)` - Delete session and associated content

2. **Edit modal implementation:**
   - State for `isEditModalOpen`, `editingLesson`, `editFormData`
   - Pre-populate form with existing tema and observacoes
   - Call `updateSession` on submit
   - Also update `conteudo_aula` if table exists

3. **Migrated delete to API service:**
   - Replaced direct Supabase query with `deleteSession` function
   - Added loading state (`isDeleting`)

## Deviations from Plan

### Auto-detected: Task 1 Already Complete
- **Found during:** Initial code review
- **Issue:** Plan expected TODO comments at lines ~119 and ~124, but the student diary page already had full edit/delete implementation with vivenciasApi calls
- **Fix:** Skipped Task 1 as it was already complete
- **Impact:** None - saved time by not duplicating work

## Verification Results

| Check | Result |
|-------|--------|
| pnpm typecheck | Pass |
| pnpm lint | Pass |
| TODO for edit/delete/save/finalize | 0 remaining |
| vivenciasApi.update usage | Present in alunos/[id]/diario/page.tsx |
| vivenciasApi.delete usage | Present in alunos/[id]/diario/page.tsx |
| deleteSession API usage | Present in diario/page.tsx |
| updateSession API usage | Present in diario/page.tsx |

## Success Criteria Verification

- [x] Student diary: Edit opens modal with data, delete confirms and removes (already complete)
- [x] Relatorio: Save persists draft, Finalize locks report
- [x] Class diary: Edit modal opens with lesson data
- [x] All direct Supabase queries migrated to API services (for delete/update)
- [x] No TODO comments remain for these features
- [x] Toast feedback on all actions (success/error)

## Next Phase Readiness

**Blockers:** None

**Ready for:**
- CLN-05: Component renaming (file renames)
- CLN-06: Large component refactoring (AttendanceGrid, FrequenciaWorkflow)
- Other TODOs from CODE-AUDIT.md

## Files Changed Summary

| File | Change Type | Lines Changed |
|------|-------------|---------------|
| `app/(dashboard)/dashboard/alunos/[id]/diario/relatorio/page.tsx` | Modified | +310/-24 |
| `app/(dashboard)/diario/page.tsx` | Modified | +120/-11 |
| `lib/api/class-diary.ts` | Modified | +88 |
