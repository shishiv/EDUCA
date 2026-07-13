# Plan 011: Unifyify `tipo_usuario` across app and database

> Drift check: `git diff --stat 7e696f8..HEAD -- lib/auth.ts lib/middleware/auth-middleware.ts lib/supabase/server.ts components/layout/auth-guard.tsx`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none (blocks clean 010)
- **Category**: correctness
- **Planned at**: commit `7e696f8`, 2026-07-11

## Why this matters

Three sources of truth disagree:

| Layer | Roles |
|-------|--------|
| SQL helpers | `responsavel`, `professor`, `secretario`, `diretor`, `gestor_sme`, `admin` |
| TS unions (`auth-guard`, `verifyUserRole`, `createUserProfile`) | omit `gestor_sme` (and sometimes `coordenador` only in comments) |
| Middleware hierarchy keys | English: `parent`, `teacher`, `secretary`, `director`, `admin` |

Effects:

- `gestor_sme` users fail type checks / AuthGuard / hierarchy (level 0)
- Middleware role matching never aligns with `tipo_usuario`
- Comments mention `coordenador` without schema support

## Current state

- `lib/auth.ts` — `roleHierarchy` without `gestor_sme`; comments mention it in `canRecordAttendance`
- `lib/supabase/server.ts` — `verifyUserRole(allowedRoles: ('admin'|…|'responsavel')[])`
- `components/layout/auth-guard.tsx` — same union; dashboard layout omits `gestor_sme`
- SQL: `auth_has_role_or_higher` array includes `gestor_sme`

## Commands

| Purpose | Command | Expected |
|---------|---------|----------|
| Typecheck | `pnpm typecheck` | 0 |
| Test | `pnpm test` | pass |
| Grep | `rg -n "gestor_sme|director|secretary|tipo_usuario" lib components app` | clean after |

## Scope

**In scope**:

- New shared module `lib/auth/roles.ts` (no `'use client'`) exporting:
  - `UserRole` type
  - `ROLE_HIERARCHY` numeric map
  - `hasPermission`, `hasHigherRole`, `canRecordAttendance`, `isStaffRole`, `isMunicipalAdmin`
- Update `lib/auth.ts` to re-export from roles (keep client entry working)
- Update middleware, auth-guard, server `verifyUserRole`, dashboard layout allowedRoles
- Fix any switch/if that misses `gestor_sme`

**Out of scope**:

- DB enum migration (column is free TEXT — OK)
- Renaming roles in production data
- Full permission matrix UI

## Steps

### Step 1: Create `lib/auth/roles.ts`

```ts
export const USER_ROLES = [
  'responsavel',
  'professor',
  'secretario',
  'diretor',
  'gestor_sme',
  'admin',
] as const

export type UserRole = (typeof USER_ROLES)[number]

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  responsavel: 1,
  professor: 2,
  secretario: 3,
  diretor: 4,
  gestor_sme: 5,
  admin: 6,
}

export function isUserRole(v: string): v is UserRole { … }

export function hasPermission(userRole: string, required: UserRole[]): boolean {
  return required.includes(userRole as UserRole)
}

export function hasHigherOrEqualRole(userRole: string, required: UserRole): boolean {
  if (!isUserRole(userRole)) return false
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[required]
}

export function canRecordAttendance(tipo: string | null): boolean {
  return tipo === 'professor' || tipo === 'diretor'
}

export function isMunicipalAdmin(tipo: string | null): boolean {
  return tipo === 'admin' || tipo === 'gestor_sme'
}
```

Match SQL hierarchy order (gestor_sme below admin).

### Step 2: Wire imports

- `lib/auth.ts`: re-export; deprecate duplicate `roleHierarchy` object or make it alias
- `auth-middleware.ts`: use `hasHigherOrEqualRole` + Portuguese route role requirements
- `auth-guard.tsx`: `allowedRoles?: UserRole[]`
- `lib/supabase/server.ts`: `allowedRoles: UserRole[]` — remove `as any` on includes if possible
- `(dashboard)/layout.tsx`: include `gestor_sme` in AuthGuard if SME users need dashboard

### Step 3: Tests

Extend `tests/unit/validation` or new `tests/unit/auth/roles.test.ts`:

- hierarchy: admin > gestor_sme > diretor
- canRecordAttendance matrix
- isMunicipalAdmin

### Step 4: Verify

```bash
pnpm typecheck && pnpm test
rg -n "director:|secretary:|teacher:|parent:" lib/middleware
# must be empty
```

## Done criteria

- [ ] Single `UserRole` type used by guard, middleware, server verify
- [ ] `gestor_sme` in hierarchy and dashboard access policy explicit
- [ ] No English role keys in middleware hierarchy
- [ ] Tests cover hierarchy
- [ ] README updated

## STOP conditions

- Production data uses unexpected role strings (`coordenador`, `superadmin`) — inventory with SQL `SELECT DISTINCT tipo_usuario FROM users` before changing guards
- Changing hierarchy breaks E2E fixtures — update fixtures, do not weaken checks

## Maintenance notes

- New roles require SQL helper update + `USER_ROLES` + tests in one PR
