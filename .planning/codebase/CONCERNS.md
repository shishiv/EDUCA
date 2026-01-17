# Codebase Concerns

**Analysis Date:** 2026-01-16

## Tech Debt

**Stub implementations with TODO comments:**
- Issue: Multiple critical features are stub implementations that always return empty data
- Files:
  - `gestao_fronteira/hooks/use-compliance-warnings.ts:16` - always returns `[]`
  - `gestao_fronteira/components/attendance/AbrirAulaWorkflow.tsx:23` - no actual implementation
  - `gestao_fronteira/app/(dashboard)/diario/page.tsx:375` - edit modal not implemented
  - `gestao_fronteira/app/(dashboard)/dashboard/alunos/[id]/boletim/page.tsx:438` - PDF export stub
  - `gestao_fronteira/lib/api/schools.ts:311` - missing audit logging for status changes
  - `gestao_fronteira/lib/logger.ts:197` - monitoring service integration not implemented
- Impact: Compliance warnings not working, teachers cannot properly open class sessions, edit lesson functionality broken
- Fix approach: Prioritize implementing compliance warnings (critical for Bolsa Familia tracking), then class session opening

**Excessive use of `any` type:**
- Issue: 40+ instances of `as any` type casts, bypassing TypeScript safety
- Files:
  - `gestao_fronteira/middleware.ts:3` - request parameter typed as `any`
  - `gestao_fronteira/components/classes/teacher-assignment.tsx:45-47` - state typed as `any[]`
  - `gestao_fronteira/lib/utils/export.ts:282,319,349,360,446` - jspdf internal API casts
  - `gestao_fronteira/hooks/use-diary-query.ts:229,345,616` - Supabase client typed as `any`
  - `gestao_fronteira/lib/services/attendance-locking.ts:396,560,692` - session data untyped
- Impact: Runtime type errors possible, bugs not caught at compile time, code harder to refactor
- Fix approach: Define proper types for jspdf extensions, update Supabase table types for `conteudo_aula` table, fix middleware request type

**Large component files:**
- Issue: Several files exceed 600-1000 lines, indicating complex components that should be split
- Files:
  - `gestao_fronteira/components/attendance/AttendanceGrid.tsx` - 1078 lines
  - `gestao_fronteira/app/(dashboard)/relatorios/conteudo/page.tsx` - 915 lines
  - `gestao_fronteira/lib/api/advanced-reports.ts` - 806 lines
  - `gestao_fronteira/components/students/student-form.tsx` - 806 lines
  - `gestao_fronteira/app/(dashboard)/diario/relatorios/[alunoId]/page.tsx` - 787 lines
  - `gestao_fronteira/lib/services/attendance-locking.ts` - 774 lines
- Impact: Hard to test, hard to maintain, cognitive load for developers
- Fix approach: Extract sub-components, move business logic to custom hooks or services

## Known Bugs

**Silent error swallowing:**
- Symptoms: Operations fail silently without user feedback or logging
- Files:
  - `gestao_fronteira/lib/auth.ts:61-62` - empty catch block
  - `gestao_fronteira/app/(dashboard)/diario/page.tsx:386-388` - catch with no error handling
  - `gestao_fronteira/hooks/use-diary-query.ts:237,352,617` - empty catch blocks
  - `gestao_fronteira/hooks/use-auth.ts:32` - silent auth error
  - `gestao_fronteira/app/(dashboard)/dashboard/sessoes/page.tsx:228,242` - empty catch
- Trigger: Any error in the caught operations
- Workaround: Check browser console for errors
- Fix approach: Add proper error logging and user-facing toast notifications

**Missing `conteudo_aula` table in types:**
- Symptoms: Supabase client must be cast to `any` to access lesson content table
- Files:
  - `gestao_fronteira/hooks/use-diary-query.ts:229` - `(supabase as any).from('conteudo_aula')`
  - `gestao_fronteira/components/diary/NewLessonModal.tsx:207`
  - `gestao_fronteira/app/(dashboard)/diario/page.tsx:202,328,385`
  - `gestao_fronteira/app/(dashboard)/dashboard/alunos/[id]/boletim/page.tsx:348` - `'relatorios_descritivos' as any`
- Trigger: Any operations with lesson content
- Workaround: Type casts mask the issue
- Fix approach: Regenerate Supabase types with `supabase gen types typescript`

## Security Considerations

**CRITICAL: Production secrets committed to git:**
- Risk: Supabase service role key exposed, allows bypassing RLS completely
- Files: `gestao_fronteira/.env.production` - contains `SUPABASE_SERVICE_ROLE_KEY`
- Current mitigation: None - file is tracked in git history
- Recommendations:
  1. Rotate ALL Supabase keys immediately
  2. Add `.env.production` to `.gitignore`
  3. Use Vercel environment variables for production secrets
  4. Run `git filter-branch` or BFG to remove from history
  5. Consider enabling Supabase's "Confirm email" for auth

**`.env.production` not in .gitignore:**
- Risk: Production credentials exposed in version control
- Files: `gestao_fronteira/.gitignore` - only ignores `.env` and `.env*.local`, not `.env.production`
- Current mitigation: None
- Recommendations: Add `.env.production` and `.env*` patterns to .gitignore

**Rate limiting uses in-memory store:**
- Risk: Rate limiting resets on server restart, doesn't work across multiple instances
- Files: `gestao_fronteira/lib/api/rate-limiting.ts:17` - `const rateLimitStore = new Map<...>()`
- Current mitigation: Comment notes "in production, use Redis"
- Recommendations: Implement Redis-based rate limiting for Vercel deployment

**API routes skip middleware auth:**
- Risk: API routes at `/api/*` are excluded from auth middleware
- Files: `gestao_fronteira/lib/middleware/auth-middleware.ts:212` - `pathname.startsWith('/api')`
- Current mitigation: Each API route manually checks auth via `supabase.auth.getUser()`
- Recommendations: Ensure consistent auth checks in all API routes, consider centralized API auth middleware

## Performance Bottlenecks

**No database indexes documented:**
- Problem: No migration files present to verify index strategy
- Files: `gestao_fronteira/supabase/migrations/` - directory empty or non-existent
- Cause: Schema managed directly in Supabase dashboard without version control
- Improvement path: Export schema to migrations, add indexes for common queries (turma_id, aluno_id, data_aula)

**Client-side data fetching in pages:**
- Problem: Many pages fetch data in useEffect instead of server components
- Files:
  - `gestao_fronteira/app/(dashboard)/dashboard/turmas/page.tsx`
  - `gestao_fronteira/app/(dashboard)/dashboard/matriculas/page.tsx`
  - `gestao_fronteira/app/(dashboard)/dashboard/alunos/[id]/page.tsx`
  - 73 files use useState, 62 files use useEffect
- Cause: Pattern established before Next.js 15 App Router adoption
- Improvement path: Migrate to Server Components with `async` page functions, use React Query for mutations only

**Large type files loaded at runtime:**
- Problem: Database types file is 1689 lines, loaded in client bundles
- Files: `gestao_fronteira/lib/database.types.ts` (1689 lines)
- Cause: Auto-generated types include all tables
- Improvement path: Tree-shake types, use dynamic imports for types not needed client-side

## Fragile Areas

**Attendance locking logic:**
- Files: `gestao_fronteira/lib/services/attendance-locking.ts`
- Why fragile: Complex time-based logic with Brazilian timezone handling, grace periods, and multiple lock states
- Safe modification: Always test with Brazil timezone edge cases (18:00 lock time, DST transitions)
- Test coverage: No test files found in codebase

**Diary/lesson content operations:**
- Files:
  - `gestao_fronteira/hooks/use-diary-query.ts` (689 lines)
  - `gestao_fronteira/app/(dashboard)/diario/page.tsx`
- Why fragile: Heavy reliance on `as any` casts, operations on tables not in TypeScript types
- Safe modification: Regenerate types first, then refactor
- Test coverage: None

**Multi-file auth patterns:**
- Files:
  - `gestao_fronteira/lib/auth.ts` - client auth
  - `gestao_fronteira/lib/supabase.ts` - browser client
  - `gestao_fronteira/lib/supabase/server.ts` - server client
  - `gestao_fronteira/lib/middleware/auth-middleware.ts` - middleware auth
  - `gestao_fronteira/hooks/use-auth.ts` - React hook
- Why fragile: Auth logic spread across 5+ files, easy to miss security checks
- Safe modification: Create unified auth service, test all auth flows
- Test coverage: None

## Scaling Limits

**In-memory rate limiting:**
- Current capacity: Resets on every deploy or server restart
- Limit: Doesn't work in Vercel serverless (no shared memory)
- Scaling path: Implement Vercel KV or Upstash Redis for distributed rate limiting

**localStorage for audit logs:**
- Current capacity: ~5MB browser limit, 100 entries max
- Limit: Logs lost on browser storage clear, not accessible server-side
- Scaling path: Implement server-side audit_logs table, already noted in code comments

## Dependencies at Risk

**Next.js 16 (beta):**
- Risk: Using pre-release version `"next": "^16.0.7"` in production
- Impact: Potential breaking changes, limited community support for issues
- Migration plan: Pin to stable Next.js 15 LTS or wait for Next.js 16 stable release

**React 19 (cutting edge):**
- Risk: Using React 19.2.3, which is very new
- Impact: Third-party library compatibility issues possible
- Migration plan: Monitor for issues, test thoroughly before updating dependencies

## Missing Critical Features

**No unit/integration tests:**
- Problem: Zero test files found in codebase (`find . -name "*.test.*"` returns 0)
- Blocks: Cannot safely refactor, cannot verify compliance logic, no regression protection
- Priority: High - especially for attendance locking (legal compliance)

**Compliance warnings not implemented:**
- Problem: `use-compliance-warnings.ts` returns empty array
- Blocks: Bolsa Familia attendance tracking (<80% alerts), LGPD compliance alerts, enrollment deadline warnings
- Priority: Critical - directly affects legal compliance for social program recipients

**PDF export incomplete:**
- Problem: Boletim PDF export shows toast "em desenvolvimento"
- Blocks: Teachers cannot provide official grade reports to parents
- Priority: Medium

## Test Coverage Gaps

**Entire codebase:**
- What's not tested: All business logic, all components, all API routes
- Files: Every file in `gestao_fronteira/`
- Risk:
  - Attendance immutability ("nao existe o esquecer") cannot be verified
  - 18:00 auto-lock cannot be verified
  - Role-based access control cannot be verified
  - Bolsa Familia 80% threshold alerts cannot be verified
- Priority: High - legal compliance features must be tested

**Brazilian validation functions:**
- What's not tested: CPF, CNPJ, NIS, CEP, phone number validation
- Files: `gestao_fronteira/lib/validation/brazilian.ts`, `gestao_fronteira/lib/validation/schools-validation.ts`
- Risk: Invalid student/school data could enter system
- Priority: Medium

---

*Concerns audit: 2026-01-16*
