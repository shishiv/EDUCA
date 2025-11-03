# Hooks Structure & Organization Guide

**Document Version:** 1.0
**Date:** November 3, 2025
**Status:** Ready for Implementation

This document defines the consolidated structure and organization convention for all custom React hooks in the gestao_fronteira application.

---

## Overview

The project has **10 custom hooks** organized across two directories with clear responsibilities:

- **`hooks/`** (6 hooks) - UI & generic patterns
- **`lib/hooks/`** (4 hooks) - Educational domain logic

## Directory Organization

### hooks/ - UI & Generic Hooks

**Location:** `/c/Repos/SRE/gestao_fronteira/hooks/`

Generic, reusable hooks focused on UI patterns, browser APIs, and common functionality.

#### Hooks Classification

| Hook | Purpose | Type | Dependencies | Domain Specificity |
|------|---------|------|--------------|-------------------|
| `use-auth.ts` | User authentication & profile | UI + Auth | `@supabase/supabase-js` | Generic (works with any Supabase project) |
| `use-toast.ts` | Toast notification management | UI | React built-in | Generic (reusable pattern) |
| `use-aula-realtime.ts` | Real-time session status | Realtime | `@supabase/supabase-js` | Medium (attendance-aware but not logic-specific) |
| `use-service-worker.ts` | Service Worker & offline support | Browser API | Browser APIs, IndexedDB | Generic (applies to any offline scenario) |
| `use-compliance-warnings.ts` | Compliance alerts system | Data Query | `@tanstack/react-query` | Medium (compliance domain but generic alerts) |
| `use-users-query.ts` | User CRUD with React Query | Data Query | `@tanstack/react-query`, `sonner` | Generic (user management pattern) |

**Total: 6 hooks**

### lib/hooks/ - Educational Domain Hooks

**Location:** `/c/Repos/SRE/gestao_fronteira/lib/hooks/`

Specialized hooks implementing complex business logic specific to the educational domain.

#### Hooks Classification

| Hook | Purpose | Type | Dependencies | Domain Specificity |
|------|---------|------|--------------|-------------------|
| `use-attendance-workflow.ts` | 3-phase attendance workflow | Domain Logic | `@tanstack/react-query`, `sonner` | High (Brazilian "Abrir aula" workflow) |
| `use-attendance-locking.ts` | Immutability & locking rules | Domain Logic | `@tanstack/react-query`, `sonner` | High (LGPD, "não existe o esquecer") |
| `use-attendance-history.ts` | Audit trail & compliance reports | Domain Logic | `@tanstack/react-query`, `sonner` | High (Brazilian compliance) |
| `use-realtime-attendance.ts` | Concurrent teacher coordination | Domain Logic | `@supabase/supabase-js` | High (educational scenario) |

**Total: 4 hooks**

---

## Organizational Rules

### Rule 1: Use `hooks/` for Generic Patterns

Add new hooks to **`hooks/`** when:
- ✅ It's a reusable UI pattern (forms, modals, dialogs)
- ✅ It handles browser APIs (local storage, sensors, service workers)
- ✅ It's generic state management
- ✅ Can be used in multiple features/projects
- ✅ NOT specific to education domain

**Examples:** `use-form-state`, `use-local-storage`, `use-modal`, `use-theme`

### Rule 2: Use `lib/hooks/` for Domain Logic

Add new hooks to **`lib/hooks/`** when:
- ✅ It's specific to educational domain
- ✅ Implements business logic for attendance/enrollment/compliance
- ✅ Integrates with domain services (lib/services/)
- ✅ Implements Brazilian educational standards
- ✅ NOT reusable in other contexts

**Examples:** `use-enrollment-workflow`, `use-student-compliance`, `use-grade-calculation`

---

## Hook Categories

### UI-Focused Hooks (hooks/)

Hooks that manage visual state, user interactions, or notifications.

```
hooks/
├── use-toast.ts              ← Notification UI state
└── use-compliance-warnings.ts ← Warning alerts UI
```

**Characteristics:**
- Handle visual/UX state
- Manage user feedback
- No complex business logic
- Reusable across features

### Authentication Hooks (hooks/)

Hooks for user authentication and profile management.

```
hooks/
└── use-auth.ts ← User authentication state
```

**Characteristics:**
- Current user & profile
- Auth state changes
- Sign in/out logic
- Generic across projects

### Realtime Hooks (hooks/ vs lib/hooks/)

**Realtime UI Hooks** - `hooks/use-aula-realtime.ts`
- Monitors session status in real-time
- Generic Supabase subscriptions
- Not business logic specific
- Can be used for other entity types

**Realtime Domain Hooks** - `lib/hooks/use-realtime-attendance.ts`
- Attendance-specific coordination
- Conflict prevention for educators
- Educational domain logic
- Specialized for attendance scenarios

### Data Query Hooks (hooks/)

Hooks for data fetching with React Query.

```
hooks/
├── use-users-query.ts ← User CRUD operations
└── use-compliance-warnings.ts ← Compliance data
```

**Characteristics:**
- Query/mutation management
- Optimistic updates
- Cache invalidation
- Reusable patterns

### Domain Workflow Hooks (lib/hooks/)

Hooks for complex educational workflows with multiple phases.

```
lib/hooks/
├── use-attendance-workflow.ts    ← 3-phase marking
├── use-attendance-locking.ts     ← Immutability
├── use-attendance-history.ts     ← Audit trails
└── use-realtime-attendance.ts    ← Conflict handling
```

**Characteristics:**
- Complex multi-phase workflows
- Compliance enforcement
- Business rule validation
- Educational domain specific

---

## Directory Structure

```
gestao_fronteira/
├── hooks/                           ← UI & Generic Hooks (6 hooks)
│   ├── index.ts                     ← Barrel export (NEW)
│   ├── README.md                    ← Documentation (NEW)
│   ├── use-auth.ts                  ← Authentication
│   ├── use-toast.ts                 ← Toast notifications
│   ├── use-aula-realtime.ts         ← Session realtime
│   ├── use-service-worker.ts        ← Offline support
│   ├── use-compliance-warnings.ts   ← Compliance alerts
│   └── use-users-query.ts           ← User CRUD
│
├── lib/
│   ├── hooks/                       ← Domain Hooks (4 hooks)
│   │   ├── index.ts                 ← Barrel export (NEW)
│   │   ├── README.md                ← Documentation (NEW)
│   │   ├── use-attendance-workflow.ts
│   │   ├── use-attendance-locking.ts
│   │   ├── use-attendance-history.ts
│   │   └── use-realtime-attendance.ts
│   │
│   ├── services/                    ← Business Logic Services
│   │   ├── attendance-workflow.ts
│   │   ├── attendance-locking.ts
│   │   ├── attendance-history.ts
│   │   └── ...
│   │
│   ├── api/                         ← API Clients
│   ├── stores/                      ← Global State (Zustand)
│   └── ...
│
├── components/
│   ├── attendance/                  ← Attendance UI Components
│   ├── students/                    ← Student UI Components
│   └── ...
│
└── docs/
    ├── HOOKS_STRUCTURE.md           ← This file (NEW)
    └── ...
```

---

## Hook Statistics

### By Category

| Category | Count | Location |
|----------|-------|----------|
| Authentication | 1 | hooks/ |
| UI/Notifications | 2 | hooks/ |
| Realtime (Generic) | 1 | hooks/ |
| Data Queries | 2 | hooks/ |
| Domain Workflows | 4 | lib/hooks/ |
| **TOTAL** | **10** | - |

### By Type

| Type | Count | Location |
|------|-------|----------|
| State Management | 3 | Mixed |
| Data Fetching | 3 | hooks/ |
| Realtime | 2 | Mixed |
| Business Logic | 2 | lib/hooks/ |

### Dependencies

| Library | Hooks | Count |
|---------|-------|-------|
| `@supabase/supabase-js` | 3 | Auth, Aula Realtime, Attendance Realtime |
| `@tanstack/react-query` | 5 | Users Query, Compliance, Attendance Workflow, Locking, History |
| `sonner` | 3 | Users Query, Attendance Workflow/Locking/History |
| React (built-in) | All | - |

---

## Import Patterns

### Barrel Exports

Use the new barrel exports for cleaner imports:

```tsx
// hooks/ - UI & Generic
import {
  useAuth,
  useToast,
  useServiceWorker,
  useAulaRealtime,
  useComplianceWarnings,
  useUsersWithSchool
} from '@/hooks'

// lib/hooks/ - Domain
import {
  useAttendanceWorkflow,
  useAttendanceLocking,
  useAttendanceHistory,
  useRealtimeAttendance
} from '@/lib/hooks'
```

### Direct Imports

If you need only specific hooks:

```tsx
import { useAuth } from '@/hooks/use-auth'
import { useAttendanceWorkflow } from '@/lib/hooks/use-attendance-workflow'
```

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Components                        │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          useAttendanceWorkflow() [lib/hooks/]       │  │
│  │        (3-phase attendance workflow state)          │  │
│  └────────────────────────┬─────────────────────────────┘  │
│                           │                                  │
│                           ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         AttendanceWorkflowManager [lib/services/]    │  │
│  │          (Business logic & validation)              │  │
│  └────────────────────────┬─────────────────────────────┘  │
│                           │                                  │
│                           ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   Supabase Client [lib/supabase.ts]                 │  │
│  │   (Database & Real-time API)                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

Layers:
1. Components   → Use hooks for state management
2. Hooks        → Use services/stores for business logic
3. Services     → Use API clients for data operations
4. API Clients  → Use Supabase for database/realtime
```

---

## Implementation Checklist

- [x] Created `/hooks/index.ts` - Barrel export for UI hooks
- [x] Created `/lib/hooks/index.ts` - Barrel export for domain hooks
- [x] Created `/hooks/README.md` - Documentation for UI hooks
- [x] Created `/lib/hooks/README.md` - Documentation for domain hooks
- [x] Created `/docs/HOOKS_STRUCTURE.md` - This reference document
- [ ] Update existing code to use barrel exports
- [ ] Add new hooks following these conventions
- [ ] Document any new domain hooks in lib/hooks/README.md
- [ ] Document any new generic hooks in hooks/README.md

---

## Migration Guide

### For Existing Code

Gradually update imports to use barrel exports:

**Before:**
```tsx
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { useAttendanceWorkflow } from '@/lib/hooks/use-attendance-workflow'
```

**After:**
```tsx
import { useAuth, useToast } from '@/hooks'
import { useAttendanceWorkflow } from '@/lib/hooks'
```

### For New Code

Always use barrel exports:

```tsx
// Always prefer barrel exports
import { useAuth, useToast, useServiceWorker } from '@/hooks'
import { useAttendanceWorkflow, useAttendanceLocking } from '@/lib/hooks'

// Only use direct imports if needed for specific reasons
import { useAuth } from '@/hooks/use-auth'
```

---

## Common Questions

### Q: Where should I add a hook for student registration?

**A:** If it's a generic form/validation pattern → `hooks/`
If it's specific student enrollment workflow → `lib/hooks/`

### Q: Can I import from lib/hooks/ in hooks/?

**A:** No. `hooks/` should be independent and not depend on domain-specific code.
Import direction: Components → hooks/ → lib/hooks/ → lib/services/

### Q: Where do I put a hook for offline student data caching?

**A:** `hooks/` (with `use-service-worker.ts`)
It's a generic offline pattern, not domain-specific.

### Q: Should attendance history queries go in hooks/?

**A:** No. `use-attendance-history` in `lib/hooks/` is correct.
It's domain-specific business logic.

### Q: Can I create a hook in lib/hooks/ that doesn't use domain services?

**A:** Not ideal. All `lib/hooks/` should integrate with `lib/services/`.
If it's generic → move to `hooks/`

---

## Best Practices

### Naming Convention

- **UI Hooks:** `use-[feature-name]` (e.g., `use-modal`, `use-form`)
- **Domain Hooks:** `use-[domain]-[operation]` (e.g., `use-attendance-workflow`)
- **Query Hooks:** `use-[entity]-[query-type]` (e.g., `use-students-query`)

### File Organization

Each hook should be in its own file:
```
hooks/
├── use-auth.ts              ← One hook per file
├── use-toast.ts
├── use-service-worker.ts
└── index.ts                 ← Barrel export
```

### Documentation

Every hook file should have:
```tsx
/**
 * Hook name and brief description
 *
 * @example
 * ```tsx
 * const { data, loading } = useMyHook(options)
 * ```
 */
export function useMyHook() { ... }
```

### TypeScript

All hooks must have:
- ✅ TypeScript strict mode
- ✅ Typed parameters and return values
- ✅ Exported interfaces for options/return types
- ✅ JSDoc comments

---

## References

- **Project Guidelines:** `/CLAUDE.md`
- **UI Components:** `/components/` (shadcn/ui)
- **Domain Services:** `/lib/services/`
- **API Clients:** `/lib/api/`
- **Global State:** `/lib/stores/`

---

## Changelog

### v1.0 - November 3, 2025

Initial structure definition and documentation:
- Created barrel exports for both `hooks/` and `lib/hooks/`
- Documented 10 existing hooks with classification
- Defined organizational rules and conventions
- Created README files for both directories
- Established import patterns and best practices
