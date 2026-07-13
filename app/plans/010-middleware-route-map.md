# Plan 010: Align auth middleware with real App Router routes

> Drift check: `git diff --stat 7e696f8..HEAD -- middleware.ts lib/middleware/auth-middleware.ts app/(dashboard)`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (wrong map = lock out real users)
- **Depends on**: **011** strongly recommended first (roles). Can soft-land map-only after 011.
- **Category**: security
- **Planned at**: commit `7e696f8`, 2026-07-11

## Why this matters

`lib/middleware/auth-middleware.ts` defines route protection for paths that **do not exist** in the app:

- `/admin`, `/dashboard/students`, `/dashboard/enrollment`, `/dashboard/classes`, English names, etc.

Real routes are Portuguese App Router paths, e.g.:

- `/dashboard/alunos`, `/dashboard/matriculas`, `/dashboard/turmas`, `/dashboard/notas`, `/diario`, `/relatorios/bolsa-familia`, …

Additionally:

```ts
pathname.startsWith('/api') // → skip middleware entirely
```

So edge middleware never enforces auth on APIs. Default for unknown authenticated paths is **allow** (`return { hasAccess: true }`).

Net: RBAC at the edge is largely non-functional; only client `AuthGuard` + some route handlers check roles.

## Current state

- `middleware.ts` → calls `authMiddleware`
- `routeProtection` object ~lines 102–152
- `checkRouteAccess` ~154–187
- Dashboard layout: `AuthGuard allowedRoles={['admin','diretor','secretario','professor']}` — **excludes `responsavel` and `gestor_sme`**

## Commands

| Purpose | Command | Expected |
|---------|---------|----------|
| List routes | `find app -path '*page.tsx' \| sed 's|app||;s|/page.tsx||;s|(dashboard)||;s|(auth)||' ` | inventory |
| Typecheck | `pnpm typecheck` | 0 |
| E2E auth | `pnpm test:e2e tests/e2e/auth/` if env | pass |

## Scope

**In scope**:

- `lib/middleware/auth-middleware.ts`
- `middleware.ts` only if matcher needs tweak
- Optional: `app/(dashboard)/layout.tsx` AuthGuard roles to include `gestor_sme` after 011
- Short comment in file documenting “edge RBAC is defense in depth; RLS + handlers are primary”

**Out of scope**:

- Implementing full API middleware auth for every route (handlers already call `getUser` — keep that; optional light “must be logged in” for `/api/*` except `/api/health`)
- Redesigning IA / renaming routes

## Steps

### Step 1: Inventory real paths

From `app/` cwd, list every `page.tsx` under `(dashboard)` and `(auth)`. Build a table path → minimum role.

Suggested minimum (adjust only with evidence from UI):

| Path prefix | Min role |
|-------------|----------|
| `/login` | public |
| `/` | public (or redirect) |
| `/politica-privacidade` | public |
| `/dashboard` | authenticated staff (not responsavel unless product says so) |
| `/dashboard/usuarios`, `/dashboard/flags`, `/dashboard/escolas` | admin / gestor_sme / diretor as product requires |
| `/dashboard/alunos`, `/matriculas`, `/responsaveis` | secretario+ |
| `/dashboard/turmas/.../chamada`, `/diario`, attendance | professor+ |
| `/relatorios/*` | diretor / secretario / admin |
| `/unauthorized` | authenticated |

Read sidebar (`components/layout/sidebar.tsx`) for the real nav → roles.

### Step 2: Replace fictional `routeProtection`

- Delete English ghost paths
- Use actual prefixes with `pathname.startsWith`
- Map middleware role keys to **`tipo_usuario` strings** (`admin`, `diretor`, …) — not `director`/`secretary` English keys. Today `checkRoleHierarchy(userRole, role)` compares user `tipo_usuario` to keys `admin|director|secretary|teacher|parent` — **broken**. Fix by using Portuguese keys only.

### Step 3: API skip policy

Choose one (document in code comment):

**A (recommended minimal):** keep skip for `/api/health` and `/api/health` HEAD only; for other `/api/*` require session (not full RBAC) via middleware, handlers still enforce roles.

**B:** keep full `/api` skip but add integration test that every route file calls `getUser`.

Implement A unless STOP.

### Step 4: Unauthorized page

`redirectTo: '/unauthorized'` — ensure a page exists or change to `/login` / dashboard. Grep for `unauthorized`. If missing, create minimal page or redirect to `/login`.

### Step 5: Verify

```bash
pnpm typecheck && pnpm test
```

Manual: login professor cannot open `/dashboard/usuarios` if restricted; can open chamada.

## Done criteria

- [ ] No ghost English routes in `routeProtection`
- [ ] Hierarchy keys match `tipo_usuario`
- [ ] Real dashboard prefixes covered or explicitly default-deny for staff areas
- [ ] `/unauthorized` works or redirects fixed
- [ ] typecheck + tests green
- [ ] README updated

## STOP conditions

- Unclear product rules for `responsavel` portal — ask human; do not invent parent UX
- Middleware session read causes perf regression (getUser every request) — keep cookie-only pattern already noted in file comments

## Maintenance notes

- When adding a `page.tsx`, update `routeProtection` in the same PR.
