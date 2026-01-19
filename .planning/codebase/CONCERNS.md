# Codebase Concerns

**Analysis Date:** 2026-01-18

## Tech Debt

**Build Configuration - TypeScript/ESLint Disabled:**
- Issue: TypeScript type checking and ESLint are disabled during builds (`ignoreBuildErrors: true`, `ignoreDuringBuilds: true`)
- Files: `gestao_fronteira/next.config.js:8-14`
- Impact: Type errors and lint violations can ship to production, causing runtime bugs and code quality degradation
- Fix approach: Gradually enable build-time checks; run `pnpm typecheck` and `pnpm lint` to identify and fix violations, then re-enable in config

**Compliance Warnings Hook - Empty Implementation:**
- Issue: `useComplianceWarnings()` returns empty array with TODO comment, compliance monitoring not functional
- Files: `gestao_fronteira/hooks/use-compliance-warnings.ts:15-18`
- Impact: System cannot alert users to LGPD, attendance, or reporting compliance issues as advertised
- Fix approach: Implement actual compliance logic connecting to `/api/compliance/warnings` endpoint which already exists

**Diario Infantil Pages - Mock Data Still in Use:**
- Issue: Several Ed. Infantil diary pages use hardcoded MOCK_VIVENCIAS arrays instead of real API calls
- Files:
  - `gestao_fronteira/app/(dashboard)/dashboard/alunos/[id]/diario/page.tsx:45-81` (MOCK_VIVENCIAS)
  - `gestao_fronteira/app/(dashboard)/dashboard/alunos/[id]/diario/relatorio/page.tsx:66-125` (MOCK_VIVENCIAS)
  - `gestao_fronteira/app/(dashboard)/dashboard/alunos/[id]/diario/novo/page.tsx:88` (TODO: Implement API call)
- Impact: Ed. Infantil diary features non-functional with real data; cannot track child observations (vivencias)
- Fix approach: Create API endpoints for vivencias CRUD, replace mock data with real Supabase queries

**Multiple TODO Comments Indicating Incomplete Features:**
- Issue: 15+ TODO comments scattered across codebase indicating unfinished implementations
- Files:
  - `gestao_fronteira/app/(dashboard)/diario/page.tsx:375` - Edit modal not implemented
  - `gestao_fronteira/app/(dashboard)/dashboard/alunos/[id]/boletim/page.tsx:438` - PDF export not implemented
  - `gestao_fronteira/app/(dashboard)/dashboard/alunos/[id]/page.tsx:327` - Role check hardcoded
  - `gestao_fronteira/components/attendance/AbrirAulaWorkflow.tsx:23` - Session opening logic incomplete
  - `gestao_fronteira/lib/logger.ts:197` - No monitoring service integration
  - `gestao_fronteira/lib/api/schools.ts:311` - Missing audit logging
- Impact: Features appear complete in UI but have missing backend functionality
- Fix approach: Triage TODOs by priority, create tasks to complete each

**Role-Specific Dashboards Using Mock Data:**
- Issue: AdminDashboard and other role dashboards use setTimeout mock data instead of real API calls
- Files: `gestao_fronteira/components/dashboard/role-specific-dashboards.tsx:68-83`
- Impact: Dashboard statistics not accurate; shows hardcoded values (1245 students, 8 schools)
- Fix approach: Connect to real aggregate queries from Supabase

**Help System - Placeholder Only:**
- Issue: HelpSystem component shows "Sistema de ajuda em desenvolvimento..." with no actual content
- Files: `gestao_fronteira/components/help/HelpSystem.tsx:1-28`
- Impact: Users have no in-app help documentation despite help button being visible
- Fix approach: Implement topic-based help content, FAQs, and contextual tooltips

## Known Bugs

**Frequency Calculation Hardcoded:**
- Symptoms: All students show 85% frequency in chamada page regardless of actual attendance
- Files: `gestao_fronteira/app/(dashboard)/dashboard/turmas/[id]/chamada/page.tsx:225`
- Trigger: View any student attendance in turma chamada
- Workaround: None - displays incorrect data

**Privacy Policy Contact Placeholder:**
- Symptoms: Contact phone shows "Telefone: (34) XXXX-XXXX" placeholder
- Files: `gestao_fronteira/app/politica-privacidade/page.tsx:182`
- Trigger: Visit privacy policy page
- Workaround: None - users cannot contact data controller

## Security Considerations

**No Database Migrations Versioning:**
- Risk: No Supabase migrations directory detected; schema changes not tracked in version control
- Files: No `gestao_fronteira/supabase/migrations/` directory
- Current mitigation: Unknown - schema likely managed directly in Supabase dashboard
- Recommendations: Set up Supabase CLI with migrations for schema version control and RLS policy auditing

**RLS Policies Not In Codebase:**
- Risk: Row Level Security policies exist only in Supabase, not auditable in code review
- Files: References to RLS in comments (`gestao_fronteira/lib/supabase/server.ts:59-62`, `gestao_fronteira/app/actions/attendance/open-session.ts:9`)
- Current mitigation: Manual Supabase dashboard review
- Recommendations: Export RLS policies to migrations; add RLS policy documentation

**Sensitive Data Not Encrypted at Rest:**
- Risk: CPF, NIS, health data stored as plaintext in database
- Files: Schema types show plaintext fields (`gestao_fronteira/types/supabase.ts`)
- Current mitigation: Supabase encryption at infrastructure level
- Recommendations: Implement application-level encryption for CPF, NIS per LGPD requirements (noted in roadmap as "Criptografia de Dados Sensiveis")

**Service Role Key Bypass Warning:**
- Risk: Admin client bypasses ALL RLS policies; improper use could expose data
- Files: `gestao_fronteira/lib/supabase/server.ts:59-65`
- Current mitigation: Comments warn about proper use
- Recommendations: Add audit logging to all service role operations; restrict usage to specific admin functions

## Performance Bottlenecks

**Large Page Components:**
- Problem: Several pages exceed 500+ lines with inline data fetching and complex state
- Files:
  - `gestao_fronteira/app/(dashboard)/relatorios/conteudo/page.tsx` (915 lines)
  - `gestao_fronteira/app/(dashboard)/diario/relatorios/[alunoId]/page.tsx` (787 lines)
  - `gestao_fronteira/app/(dashboard)/relatorios/bolsa-familia/page.tsx` (691 lines)
  - `gestao_fronteira/app/(dashboard)/dashboard/notas/page.tsx` (688 lines)
  - `gestao_fronteira/app/(dashboard)/dashboard/alunos/novo/page.tsx` (672 lines)
  - `gestao_fronteira/app/(dashboard)/dashboard/turmas/[id]/chamada/page.tsx` (657 lines)
- Cause: Monolithic components with data fetching, state management, and UI in single file
- Improvement path: Extract data hooks, split into smaller components, add React.memo for lists

**Console.error Statements in Production Code:**
- Problem: 30+ console.error calls that could affect performance and leak sensitive info
- Files: Throughout `gestao_fronteira/app/` and `gestao_fronteira/lib/` directories
- Cause: Debug logging not removed or gated by environment
- Improvement path: Replace with structured logger (`lib/logger.ts`) that respects log levels

## Fragile Areas

**Attendance Workflow State Machine:**
- Files:
  - `gestao_fronteira/lib/services/attendance-workflow.ts`
  - `gestao_fronteira/lib/services/attendance-locking.ts`
  - `gestao_fronteira/lib/services/attendance-immutability.ts`
- Why fragile: Complex multi-phase workflow with time-based locking, session states, and compliance rules ("nao existe o esquecer")
- Safe modification: Must maintain Brazilian compliance rules; test all state transitions; verify 18:00 auto-lock
- Test coverage: Limited automated tests detected

**Supabase Query Patterns:**
- Files: All `app/(dashboard)/**/*.tsx` pages with inline Supabase queries
- Why fragile: Queries scattered across UI components, not centralized in API layer
- Safe modification: Changes to schema require updating multiple files
- Test coverage: No apparent integration tests for queries

## Scaling Limits

**Real-time Subscriptions:**
- Current capacity: Multiple subscription channels per user session
- Limit: Supabase free tier limits concurrent connections
- Scaling path: Implement connection pooling in `lib/realtime/connection-manager.ts`; batch subscription updates

## Dependencies at Risk

**Duplicate Database Types Files:**
- Risk: Three files with overlapping database types that can drift out of sync
- Impact: Type mismatches causing runtime errors
- Files:
  - `gestao_fronteira/types/supabase.ts`
  - `gestao_fronteira/types/database.ts`
  - `gestao_fronteira/lib/database.types.ts`
- Migration plan: Consolidate to single source of truth; use Supabase CLI to auto-generate

## Missing Critical Features (vs Roadmap)

**Phase 2 - LGPD & Compliance (Roadmap: Critical):**
- Consentimento checkbox exists but Term of Consent (Termo de Consentimento) with digital signature NOT implemented
- Automated backup system NOT implemented (roadmap: "Backup Automatico")
- Data encryption at rest NOT implemented (roadmap: "Criptografia de Dados Sensiveis")

**Phase 3 - Auxiliary Modules (Roadmap: Planned):**
- Transporte Escolar module NOT implemented (no files found)
- Nutricao/Merenda module NOT implemented (no files found)
- Educacenso export UI NOT implemented (API exists in `lib/api/inep-integration.ts` but no user-facing UI)

**Phase 4 - UX & Communication (Roadmap: Planned):**
- WhatsApp integration NOT implemented (roadmap mentions Evolution API)
- Onboarding/Tour NOT implemented (TutorialOverlay component exists but not functional)
- Central de Ajuda NOT implemented (placeholder only)

**Phase 5 - Role-Specific Dashboards (Roadmap: Planned):**
- Dashboard Diretor - Uses mock data, needs real stats
- Dashboard Coordenador - Not implemented
- Dashboard Gestor (Secretaria) - Partial with mock data
- Dashboard Nutricionista - Not implemented
- A4 Print Layout - Not verified across all reports

## Test Coverage Gaps

**No Unit/Integration Tests Detected:**
- What's not tested: All application code
- Files: No `*.test.ts`, `*.spec.ts` files found in `gestao_fronteira/` (only in node_modules)
- Risk: Regressions undetected; compliance rules could break silently
- Priority: High - Brazilian educational compliance requires verifiable correctness

**Missing E2E Test Suite:**
- What's not tested: User workflows, attendance marking, report generation
- Files: No Playwright/Cypress config detected
- Risk: Critical paths (chamada digital, INEP export) not validated
- Priority: High for compliance-critical features

## Inconsistent Patterns (Multi-Workflow Codebase)

**Data Fetching Approaches:**
- Pattern 1: Inline Supabase queries in page components (`app/(dashboard)/**/*.tsx`)
- Pattern 2: Centralized API services in `lib/api/*.ts`
- Pattern 3: Server Actions in `app/actions/*.ts`
- Pattern 4: React Query hooks in `hooks/use-*.ts`
- Impact: Difficult to maintain; no clear guidance on when to use which
- Recommendation: Standardize on React Query + API layer; document in CONVENTIONS.md

**State Management:**
- Pattern 1: useState + useEffect for data fetching
- Pattern 2: React Query with queryKey patterns
- Pattern 3: Context providers (SearchContext, SessionRealtimeContext)
- Impact: Inconsistent loading/error states; code duplication
- Recommendation: Adopt React Query consistently for server state

**Filter State Naming:**
- Some filters use `'todos'` as default value
- Some use `''` (empty string)
- Some use `'all'`
- Files: Various filter dropdowns across `app/(dashboard)/dashboard/*.tsx`
- Impact: Inconsistent UX; harder to implement global filter reset
- Recommendation: Standardize on single approach (suggest `'todos'` for Portuguese UI)

---

*Concerns audit: 2026-01-18*
