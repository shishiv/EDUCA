# TypeScript Migration Guide - Next.js 15 Async Params

**Sub-Spec for:** MVP Day 13 Production Readiness
**Focus:** Task 1 - Fix TypeScript Build Errors
**Created:** 2025-10-01

---

## Overview

Next.js 15 changed the API route handler signature to make `params` **asynchronous** (returns `Promise`). This breaks TypeScript compilation for routes using the old synchronous pattern.

---

## Migration Pattern

### Before (Next.js 14 - BROKEN ❌)

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params // ❌ TypeScript error: Property 'id' is missing in type 'Promise<{ id: string }>'

  // ... rest of handler
}
```

### After (Next.js 15 - CORRECT ✅)

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params // ✅ Await the promise

  // ... rest of handler
}
```

---

## Step-by-Step Migration Process

### Step 1: Update Type Signature

**Change:**
```typescript
{ params }: { params: { id: string } }
```

**To:**
```typescript
{ params }: { params: Promise<{ id: string }> }
```

### Step 2: Await Params Destructuring

**Change:**
```typescript
const { id } = params
```

**To:**
```typescript
const { id } = await params
```

### Step 3: Verify All Usages

Check if `params` is used anywhere else in the function. If so, await it there too:

```typescript
// ❌ WRONG
if (params.id === 'special') { ... }

// ✅ CORRECT
const resolvedParams = await params
if (resolvedParams.id === 'special') { ... }
```

---

## Affected Files (7 Total)

### 1. `app/api/aulas/[aula_id]/status/route.ts`

**Current (BROKEN):**
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { aula_id: string } }
) {
  const { aula_id } = params
  // ...
}
```

**Fixed:**
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ aula_id: string }> }
) {
  const { aula_id } = await params
  // ...
}
```

---

### 2. `app/api/frequencia/sessao/[aula_id]/route.ts`

**Same pattern as #1** - Change `params` type to `Promise<{ aula_id: string }>` and await destructuring.

---

### 3. `app/api/sessions/[id]/attendance/route.ts`

**Current (BROKEN):**
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  // ...
}
```

**Fixed:**
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // ...
}
```

---

### 4. `app/api/sessions/[id]/route.ts`

**Same pattern as #3** - Change `params` type to `Promise<{ id: string }>` and await destructuring.

---

### 5. `app/api/sessions/[id]/status/route.ts`

**Same pattern as #3** - Change `params` type to `Promise<{ id: string }>` and await destructuring.

---

### 6. `app/api/sessoes-aula/[id]/cancelar/route.ts`

**Current (BROKEN - PUT method):**
```typescript
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  // ...
}
```

**Fixed:**
```typescript
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // ...
}
```

---

### 7. `app/api/sessoes-aula/[id]/frequencia/batch/route.ts`

**Current (BROKEN - POST method):**
```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  // ...
}
```

**Fixed:**
```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // ...
}
```

---

## Testing After Migration

### 1. TypeScript Validation

```bash
cd gestao_fronteira/
bun run typecheck
```

**Expected output:**
```
✓ TypeScript compilation successful (0 errors)
```

### 2. Build Validation

```bash
bun run build
```

**Expected output:**
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization
```

### 3. Runtime Testing

Test each route with Thunder Client or Postman:

**Example for `/api/sessions/[id]`:**
```bash
curl http://localhost:3000/api/sessions/123
```

**Expected:** Valid JSON response (or 404 if session doesn't exist)

---

## Common Pitfalls

### ❌ Pitfall 1: Forgetting to Await

```typescript
const { id } = params // ❌ WRONG - params is a Promise
```

**Error:**
```
Property 'id' does not exist on type 'Promise<{ id: string }>'
```

**Fix:**
```typescript
const { id } = await params // ✅ CORRECT
```

---

### ❌ Pitfall 2: Awaiting Twice

```typescript
const resolvedParams = await params
const { id } = await resolvedParams // ❌ WRONG - already awaited
```

**Fix:**
```typescript
const { id } = await params // ✅ CORRECT - await once
```

---

### ❌ Pitfall 3: Using Params Before Awaiting

```typescript
if (params.id === 'special') { // ❌ WRONG
  const { id } = await params
  // ...
}
```

**Fix:**
```typescript
const { id } = await params // ✅ CORRECT - await first
if (id === 'special') {
  // ...
}
```

---

## Rollback Plan

If migration causes issues:

1. **Revert files:**
   ```bash
   git checkout HEAD -- app/api/**/*route.ts
   ```

2. **Downgrade Next.js (NOT RECOMMENDED):**
   ```bash
   bun remove next
   bun add next@14.2.5
   ```

3. **Report issue:**
   - Document specific error
   - Check Next.js GitHub issues
   - Consult Next.js 15 migration guide

---

## Verification Checklist

After completing all migrations:

- [ ] All 7 files updated with async params pattern
- [ ] `bun run typecheck` passes (0 errors)
- [ ] `bun run build` succeeds
- [ ] All API routes tested manually (Thunder Client/Postman)
- [ ] Existing API integration tests pass: `bun test tests/api/`
- [ ] No console errors in browser when calling routes
- [ ] Commit message: `fix: migrate 7 API routes to Next.js 15 async params`

---

## References

- [Next.js 15 Release Notes](https://nextjs.org/blog/next-15)
- [Next.js Route Handlers Documentation](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [TypeScript Promise Types](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-5.html#awaited-type-and-promise-improvements)

---

**Last Updated:** 2025-10-01
**Verified By:** [Pending]
