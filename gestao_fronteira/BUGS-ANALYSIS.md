# 🐛 Bugs Analysis & Fixes

**Generated:** 2025-10-05
**Source:** BUGS FOUND.md + Codebase Investigation

---

## 🔴 CRITICAL BUG #1: Login Stuck on Loading - No Dashboard Redirect

### Symptoms:
- After successful login, page shows loading spinner indefinitely
- Never redirects to `/dashboard`
- User sees toast "Login realizado com sucesso!" but stays on login page

### Root Cause Analysis:

#### Issue 1: Missing /onboarding in Public Routes
**File:** `lib/middleware/auth-middleware.ts:97`
**Status:** ✅ FIXED

```typescript
// BEFORE:
public: ['/login', '/'],

// AFTER:
public: ['/login', '/onboarding', '/'],
```

#### Issue 2: Database Profile Not Found After Supabase Auth Creation
**File:** `app/onboarding/page.tsx:107-136`
**Explanation:**
- Onboarding creates Supabase Auth user with `auth.signUp()`
- Then immediately creates database profile with matching UUID
- **But**: If there's a delay or the profile isn't created, middleware redirects back to login
- **Fallback**: `lib/auth.ts:124-150` creates mock admin profile, but this happens AFTER middleware check

#### Issue 3: Potential Race Condition in Auth State
**File:** `hooks/use-auth.ts:37-60`
**Problem:**
- `onAuthStateChange` callback might fire before database profile is created
- Middleware runs synchronously and doesn't wait for profile creation

### Recommended Fix:

**Option A: Wait for Profile in Login Handler** (RECOMMENDED)
```typescript
// app/(auth)/login/page.tsx:56-58
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  setError('')

  try {
    const result = await signIn(email, password)

    // Wait for profile to be available before redirecting
    if (result.user) {
      let retries = 0
      const maxRetries = 5
      let profile = null

      while (retries < maxRetries && !profile) {
        profile = await getUserProfile(result.user.id)
        if (!profile) {
          await new Promise(resolve => setTimeout(resolve, 500)) // Wait 500ms
          retries++
        }
      }
    }

    toast.success('Login realizado com sucesso!')
    router.push('/dashboard')
  } catch (err: any) {
    setError(err.message || 'Erro ao fazer login')
    toast.error('Erro ao fazer login')
  } finally {
    setLoading(false)
  }
}
```

**Option B: Server-Side Redirect After Login**
Use Next.js server actions to handle login and redirect server-side

**Option C: Refresh Session After Profile Creation**
In onboarding, after creating profile, force session refresh:
```typescript
// After creating user profile
await supabase.auth.refreshSession()
```

### Status: 🟡 PARTIALLY FIXED
- [x] Added `/onboarding` to public routes
- [ ] Need to implement profile wait logic in login handler
- [ ] Need to test with fresh user creation

---

## 🔴 BUG #2: Toaster setState Error During Render

### Symptoms:
```
Cannot update a component (ForwardRef) while rendering a different component (ForwardRef)
at Providers (app/providers.tsx:25:9)
```

### Root Cause:
**File:** `app/providers.tsx:25`
**Problem:** React 19 strict mode detects setState during render

```typescript
<Toaster position="top-right" richColors closeButton />
```

### Fix:
Move Toaster outside the main render tree or use `useEffect`:

```typescript
// app/providers.tsx
export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ServiceWorkerProvider>
        {children}
      </ServiceWorkerProvider>
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  )
}
```

**OR** use Sonner's recommended pattern for Next.js 15:
```typescript
'use client'
import dynamic from 'next/dynamic'

const Toaster = dynamic(
  () => import('sonner').then((mod) => mod.Toaster),
  { ssr: false }
)
```

### Status: 🔴 NOT FIXED YET

---

## 🔴 BUG #3: /dashboard/escolas Doesn't Load Component

### Symptoms:
- Page loads but shows blank/empty content
- No error in console
- Route exists but component doesn't render

### Investigation Needed:
Check these files:
1. `app/(dashboard)/dashboard/escolas/page.tsx` - Does it exist?
2. Component export - Is it default export?
3. Data fetching - Is API returning data?

### Status: 🔴 NEEDS INVESTIGATION

---

## ✅ BUG #4: Delete Operations Not Working - FIXED

### Affected Routes:
- `/turmas/2` - Delete button doesn't work
- `/matriculas` - Delete button doesn't work

### Root Cause (IDENTIFIED):
**RLS Policies:** Row Level Security policies used `FOR ALL` which only applies to SELECT by default. No explicit DELETE policies existed for turmas and matriculas tables.

**Evidence:**
1. `supabase/migrations/20250115000001_enable_rls_security.sql` lines 77-92 and 95-112
2. Policy "turmas_school_isolation" and "matriculas_school_isolation" used `FOR ALL`
3. Attendance table has correct explicit DELETE denial (lines 237-240)
4. But turmas/matriculas had NO DELETE policies at all

### Fix Applied:
**Migration:** `supabase/migrations/20250116000000_fix_delete_rls_policies.sql`

**Changes:**
1. Created explicit DELETE policies for turmas:
   - Admins can delete any class
   - Directors can delete classes from their school
   - Secretaries can delete classes from their school
   - Teachers CANNOT delete classes

2. Created explicit DELETE policies for matriculas:
   - Admins can delete any enrollment
   - Directors can delete enrollments from their school
   - Secretaries can delete enrollments from their school

3. Split generic "FOR ALL" policies into specific operations:
   - SELECT (view data)
   - INSERT (create new records)
   - UPDATE (modify existing records)
   - DELETE (remove records)

4. Fixed logger.error signature bug in matriculas/page.tsx line 288:
   ```typescript
   // BEFORE (WRONG):
   logger.error('Error deleting matricula', { error, errorMessage, ... })

   // AFTER (CORRECT):
   logger.error('Error deleting matricula', error, { metadata: { errorMessage, ... } })
   ```

### Migration Application:
**⚠️ IMPORTANT:** Apply this migration to your Supabase database:

```bash
# Option 1: Via Supabase Dashboard
# Go to: SQL Editor → New Query
# Paste contents of: supabase/migrations/20250116000000_fix_delete_rls_policies.sql
# Click "Run"

# Option 2: Via Supabase CLI (if locally configured)
supabase db push

# Option 3: Via MCP Server (if available)
# Use mcp__supabase__apply_migration tool
```

### Testing Required:
- [ ] Test delete as admin (should work for all tables)
- [ ] Test delete as diretor (should work only for their school)
- [ ] Test delete as secretario (should work only for their school)
- [ ] Test delete as professor (should fail - no permission)
- [ ] Verify foreign key constraints still prevent deletes with dependencies
- [ ] Confirm audit_logs table captures delete events

### Security Impact:
✅ Maintains multi-tenant isolation (school-based access control)
✅ Follows Brazilian compliance standards (audit logging preserved)
✅ Prevents accidental data loss (teachers can't delete)
✅ Respects role hierarchy (admin > diretor > secretario > professor)

### Status: ✅ FIXED - Migration ready, needs database application

---

## 🟡 BUG #5: Invalid Tailwind Utility Warning

### Symptoms:
```
warn - The utility `bg-[radial-gradient(circle_at_center,theme(colors.fronteira-blue),transparent_60%)]` contains an invalid theme value
```

### Root Cause:
**Problem:** Theme color `fronteira-blue` not defined in `tailwind.config.ts`

### Fix:
```typescript
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      colors: {
        'fronteira-primary': '#1e40af',
        'fronteira-blue': '#3b82f6',  // ADD THIS
        'fronteira-green': '#10b981',
        // ... other colors
      }
    }
  }
}
```

### Status: 🟡 EASY FIX

---

## 🟡 BUG #6: Console Errors in Class Diary

### Symptoms:
```
Error fetching class diary: {}
at fetchEntries (app/(dashboard)/dashboard/diario/page.tsx:117:17)
at getClassDiary (lib/api/class-diary.ts:179:15)
```

### Root Cause:
1. **Empty Error Object**: Error is `{}` which means Supabase query failed silently
2. **console.error**: Should be replaced with logger (part of our cleanup)
3. **Data Not Found**: Likely the database is empty (we cleaned all data)

### Fix:
```typescript
// lib/api/class-diary.ts:179
// BEFORE:
console.error('Error fetching class diary:', error)

// AFTER:
import { logger } from '@/lib/logger'
logger.error('Error fetching class diary', { error, filters })
```

### Status: 🟡 PART OF CONSOLE.LOG CLEANUP TASK

---

## 📋 Bug Fix Priority

### CRITICAL (Fix Immediately):
1. ✅ Login redirect stuck - Partially fixed (added /onboarding to public routes)
2. 🔴 Login redirect stuck - Still need profile wait logic
3. 🔴 Toaster setState error - Blocking React 19 compatibility

### HIGH (Fix This Sprint):
4. 🔴 /dashboard/escolas blank page
5. 🔴 Delete operations not working (turmas, matriculas)

### MEDIUM (Fix Next Sprint):
6. 🟡 Invalid Tailwind utility
7. 🟡 Console errors in class diary

---

## 🔧 Recommended Action Plan

### Phase 1: Critical Login Fix (1-2 hours)
1. Implement profile wait logic in login handler
2. Add retry mechanism with exponential backoff
3. Test with fresh user creation via onboarding
4. Fix Toaster setState error with dynamic import

### Phase 2: Route Fixes (2-3 hours)
1. Investigate /dashboard/escolas blank page
2. Check component exports and data fetching
3. Fix delete operations (RLS policies + foreign keys)
4. Test all CRUD operations

### Phase 3: Polish (30 min)
1. Add missing Tailwind color
2. Replace console.error with logger in class-diary.ts
3. Update BUGS FOUND.md with resolution status

**Total Estimated Time:** 4-6 hours

---

## ✅ Bugs Fixed So Far

1. ✅ Hydration error in login page (fixed by returning null when !mounted)
2. ✅ Missing /onboarding in public routes (added to middleware)
3. ✅ Removed 220 lines of mock Supabase code (security fix)
4. ✅ Fixed onboarding plaintext password storage
5. ✅ Removed seed data from migration file

---

**Next Update:** After implementing Phase 1 fixes
