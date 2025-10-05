# UI/UX Validation Issues

> **Spec**: 2025-10-04-ui-ux-validation-chrome-devtools
> **Created**: 2025-10-04
> **Last Updated**: 2025-10-04

---

## Issue Summary

| Priority | Count | Description |
|----------|-------|-------------|
| 🔴 P0-Critical | 0 | Blocking functionality (console errors, broken forms, 404 pages) |
| 🟡 P1-Important | 0 | UX degradation (layout breaks, poor contrast, slow loading) |
| 🟢 P2-Enhancement | 0 | Visual polish (spacing, icons, typography improvements) |
| **Total** | **0** | **All issues** |

---

## Issues by Module

### Authentication Module

#### Login Page (`/login`)

**Status**: Not yet validated

**Desktop** (1920x1080): _No screenshot_
**Mobile** (375x667): _No screenshot_
**Tablet** (768x1024): _No screenshot_

**Console Errors**: Not captured
**Network Errors**: Not captured

---

### Dashboard Module

#### Dashboard Home (`/dashboard`)

**Status**: Not yet validated

**Desktop** (1920x1080): _No screenshot_
**Mobile** (375x667): _No screenshot_
**Tablet** (768x1024): _No screenshot_

**Console Errors**: Not captured
**Network Errors**: Not captured

---

### Students Module

#### Students List (`/dashboard/alunos`)

**Status**: Not yet validated

**Desktop** (1920x1080): _No screenshot_
**Mobile** (375x667): _No screenshot_
**Tablet** (768x1024): _No screenshot_

**Console Errors**: Not captured
**Network Errors**: Not captured

#### New Student (`/dashboard/alunos/novo`)

**Status**: Not yet validated

**Desktop** (1920x1080): _No screenshot_
**Mobile** (375x667): _No screenshot_
**Tablet** (768x1024): _No screenshot_

**Console Errors**: Not captured
**Network Errors**: Not captured

---

### Classes Module

#### Classes List (`/dashboard/turmas`)

**Status**: Not yet validated

**Desktop** (1920x1080): _No screenshot_
**Mobile** (375x667): _No screenshot_
**Tablet** (768x1024): _No screenshot_

**Console Errors**: Not captured
**Network Errors**: Not captured

---

### Attendance Module

#### Attendance List (`/dashboard/frequencia`)

**Status**: Not yet validated

**Desktop** (1920x1080): _No screenshot_
**Mobile** (375x667): _No screenshot_
**Tablet** (768x1024): _No screenshot_

**Console Errors**: Not captured
**Network Errors**: Not captured

---

### Class Diary Module

#### Diario de Classe (`/dashboard/diario`)

**Status**: ⚠️ Partially validated (previous session)

**Desktop** (1920x1080): _No screenshot_
**Mobile** (375x667): _No screenshot_
**Tablet** (768x1024): _No screenshot_

**Known Issues from Previous Session**:

##### 🟡 P1-Important: Select.Item Empty Value Error (FIXED)
- **Description**: Shadcn/ui Select component rejected empty string values in filter dropdowns
- **Location**: `components/diary/class-diary-filter.tsx:122`
- **Status**: ✅ FIXED (changed `value=""` to `value="all"`)
- **Screenshot**: None available
- **Console Error**: `A <Select.Item /> must have a value prop that is not an empty string`

##### 🔴 P0-Critical: Database Schema Mismatch (FIXED)
- **Description**: SQL queries referenced non-existent column `turmas.ano` instead of `turmas.serie`
- **Location**: `lib/api/class-diary.ts`
- **Status**: ✅ FIXED (changed all `ano` references to `serie`)
- **Screenshot**: None available
- **Console Error**: `{"code":"42703","message":"column turmas_1.ano does not exist"}`

---

## Known Pre-Existing TypeScript Errors

The following TypeScript errors exist in the codebase but are unrelated to UI/UX validation:

- Student form date type mismatch (`app/(dashboard)/dashboard/alunos/novo/page.tsx:100`)
- School edit form type errors (`app/(dashboard)/dashboard/escolas/[id]/editar/page.tsx`)
- Missing validation libraries (`@/lib/validators/brazilian/cpf`, `@/lib/validators/brazilian/phone`)
- E2E test type issues (`tests/e2e/stress/concurrent-attendance-realistic.spec.ts`)

These errors do not block development server functionality or runtime behavior.

---

## Issue Template

```markdown
### [Page Name] (`/route`)

#### 🔴 P0-Critical
- **Description**: [What is broken and how it affects users]
- **Location**: [File path and line number]
- **Reproduction Steps**:
  1. [Step 1]
  2. [Step 2]
  3. [Observed behavior]
- **Expected Behavior**: [What should happen]
- **Screenshot**: [Link to desktop/mobile/tablet screenshot]
- **Console Error**: [Error message if applicable]
- **Network Error**: [API failure if applicable]

#### 🟡 P1-Important
- [Same format as above]

#### 🟢 P2-Enhancement
- [Same format as above]
```

---

## Notes

This document will be populated with findings as the UI/UX validation progresses. Each issue should include:
- Clear description of the problem
- Severity classification (P0/P1/P2)
- Screenshot evidence at relevant viewports
- Console or network error details
- Reproduction steps for developers
