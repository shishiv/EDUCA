---
phase: 12-role-access-teacher-assignment
plan: 01
subsystem: attendance-access-control
tags: [role-based-access, attendance, view-only, authorization]

dependency_graph:
  requires: [07.1-escola-context, 04-chamada]
  provides: [canRecordAttendance-helper, ViewOnlyNotice-component, admin-view-only-chamada]
  affects: [12-02-atribuicoes]

tech_stack:
  added: []
  patterns:
    - Role-based action restrictions
    - View-only mode with explanatory UI

key_files:
  created:
    - gestao_fronteira/components/attendance/view-only-notice.tsx
  modified:
    - gestao_fronteira/lib/auth.ts
    - gestao_fronteira/components/attendance/index.ts
    - gestao_fronteira/app/(dashboard)/dashboard/turmas/[id]/chamada/page.tsx

decisions:
  - key: canRecordAttendance-roles
    choice: "Only professor and diretor can record attendance"
    rationale: "Separation of duties - admins audit, professors record"
  - key: view-only-styling
    choice: "Blue Alert with Shield icon"
    rationale: "Informative not warning - admin viewing is normal, just restricted from editing"
  - key: isViewOnly-state
    choice: "Local state checked via useEffect"
    rationale: "Consistent with existing canSeeBolsaFamilia pattern in chamada page"

metrics:
  duration: "~15 minutes"
  completed: "2026-01-20"
---

# Phase 12 Plan 01: Admin Attendance View-Only Mode Summary

**One-liner:** Role-based view-only mode for attendance page - admins see data but cannot record, with explanatory UI.

## What Was Done

### Task 1: canRecordAttendance Helper (lib/auth.ts)

Added a new helper function to centralize attendance recording permission logic:

```typescript
export const canRecordAttendance = (tipoUsuario: UserProfile['tipo_usuario'] | null): boolean => {
  if (!tipoUsuario) return false
  if (tipoUsuario === 'professor') return true
  if (tipoUsuario === 'diretor') return true
  return false
}
```

- Professors can record for their assigned turmas
- Diretores can record as supervisor fallback
- All other roles (admin, secretario, gestor_sme, coordenador) are view-only
- Returns false for null/undefined (safe default)

### Task 2: ViewOnlyNotice Component

Created reusable alert component at `components/attendance/view-only-notice.tsx`:

- Blue color scheme (informative, not warning)
- Shield icon for visual context
- Default message in Portuguese explaining view-only mode
- Customizable message via props
- Exported from components/attendance/index.ts

### Task 3: Chamada Page Integration

Modified `app/(dashboard)/dashboard/turmas/[id]/chamada/page.tsx`:

1. **New imports:** `canRecordAttendance` from lib/auth and `ViewOnlyNotice` from components
2. **New state:** `isViewOnly` to track if user cannot record
3. **Updated effect:** `checkUserRole` now also sets `isViewOnly` based on `canRecordAttendance()`
4. **Disabled calculation:** `isDisabled = isLocked || isFutureDate || isViewOnly`
5. **Lock reason:** Added "Modo visualizacao - apenas professores registram" for view-only users
6. **UI:** Renders `<ViewOnlyNotice />` when `isViewOnly` is true

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 5744736 | feat | Add canRecordAttendance helper function |
| 69a6239 | feat | Create ViewOnlyNotice component |
| a505d2b | feat | Implement view-only mode on chamada page |

## Verification

All verification criteria passed:

- [x] TypeScript: `pnpm typecheck` passes
- [x] Lint: `pnpm lint` passes
- [x] Build: `pnpm build` passes
- [x] Function: canRecordAttendance returns correct values
  - professor -> true
  - diretor -> true
  - admin -> false
  - secretario -> false

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria Status

- [x] Admin viewing chamada sees blue ViewOnlyNotice banner
- [x] Admin cannot click P/F/J status buttons (disabled via isDisabled)
- [x] Admin cannot save chamada (save button disabled via isDisabled)
- [x] Professor and diretor can still record normally (canRecordAttendance returns true)
- [x] Message matches requirement: "Como administrador, voce pode visualizar dados de frequencia, mas o registro e feito pelos professores."

## Next Phase Readiness

Ready for Phase 12 Plan 02 (Teacher Assignment Page):

- Role infrastructure in place
- View-only pattern established for reference
- No blockers identified
