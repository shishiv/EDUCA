# External Integrations

**Analysis Date:** 2026-01-18

## APIs & External Services

**Supabase (Primary Backend):**
- Database, authentication, and real-time subscriptions
- SDK/Client: `@supabase/supabase-js` 2.87.1, `@supabase/ssr` 0.7.0
- Auth: Cookie-based with SSR support
- Env vars:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

**Vercel (Deployment):**
- Hosting and CI/CD
- SDK/Client: `vercel` 48.12.1 CLI
- Region: gru1 (Sao Paulo, Brazil)

**Brazilian Government APIs (Prepared):**
- INEP/Educacenso - Data export prepared, not live integrated
  - Implementation: `lib/api/inep-integration.ts`
  - Educacenso export formats ready
  - INEP code validation implemented
- Bolsa Familia - Compliance tracking implemented
  - Implementation: `lib/api/bolsa-familia.ts`
  - 80% attendance threshold monitoring
  - No direct API integration (internal tracking)

## Data Storage

**Databases:**
- Supabase PostgreSQL (managed)
  - Connection: Via Supabase client (no direct connection string exposed)
  - Client: `@supabase/supabase-js` with SSR support
  - RLS (Row Level Security): Enabled for data isolation per school

**Database Schema (Key Tables):**
- `users` - System users (admin, diretor, secretario, professor, responsavel)
- `escolas` - Schools
- `alunos` - Students
- `responsaveis` - Guardians
- `aluno_responsaveis` - Student-guardian relationships
- `turmas` - Classes
- `matriculas` - Enrollments
- `frequencia` - Attendance records
- `notas` - Grades
- `sessoes_aula` - Lesson sessions
- `aulas_abertas` - Open class sessions
- `disciplinas` - Subjects
- `audit_logs` / `audit_trail` / `audit_sessoes_aula` - Audit tables
- `codigos_inep` - INEP codes
- `educacenso_exports` - Educacenso export records
- `configs` - System configuration

**Database Views:**
- `vw_frequencia_completa` - Complete attendance view
- `audit_summary` - Audit log summary
- `vw_bolsa_familia_frequencia` - Bolsa Familia attendance view (referenced)

**Database Functions:**
- `abrir_aula` - Open class session
- `fechar_aula` - Close class session
- `get_aula_status` - Get class session status
- `marcar_frequencia_lote` - Batch attendance marking
- `travar_frequencias_aula` - Lock attendance records
- `get_session_phase` - Get session phase
- `is_session_editable` - Check if session is editable
- `calculate_bolsa_familia_frequency` - Calculate Bolsa Familia frequency
- `get_bolsa_familia_students_at_risk` - Get at-risk students

**File Storage:**
- Supabase Storage (referenced in image config)
  - Pattern: `*.supabase.co/storage/v1/object/**`
  - Used for: Student photos, documents

**Caching:**
- TanStack Query client-side caching
  - Stale time: 5 minutes
  - GC time: 10 minutes
  - Configuration: `lib/react-query.ts`

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (built-in)
  - Implementation: `lib/auth.ts` (client), `lib/supabase/server.ts` (server)
  - Cookie-based sessions with SSR support
  - Auto-refresh disabled in middleware (Edge Runtime compatibility)

**User Types:**
- `admin` - System administrator
- `diretor` - School director
- `secretario` - School secretary
- `professor` - Teacher
- `responsavel` - Parent/guardian

**Role Hierarchy:**
```
admin (5) > diretor (4) > secretario (3) > professor (2) > responsavel (1)
```

**Route Protection:**
- Middleware: `lib/middleware/auth-middleware.ts`
- Public routes: `/login`, `/`
- Protected routes by role defined in middleware
- School-based data isolation via RLS

**Session Management:**
- Cookie-based authentication
- Browser client: `lib/supabase.ts` (createBrowserClient)
- Server client: `lib/supabase/server.ts` (createClient)
- Admin client: `lib/supabase/server.ts` (createAdminClient - bypasses RLS)

## Monitoring & Observability

**Error Tracking:**
- Custom logger: `lib/logger.ts`
- Console-based logging in development
- Structured logging format

**Logs:**
- Application logs via custom logger
- Audit logs stored in database (`audit_logs`, `audit_trail`, `audit_sessoes_aula`)
- Compliance logging for Brazilian educational requirements

**Performance Monitoring:**
- Connection manager metrics: `lib/realtime/connection-manager.ts`
  - Connection attempts, success/failure counts
  - Average latency tracking
  - Uptime/downtime tracking

**Real-time Monitoring:**
- Supabase Realtime subscriptions
- Connection state tracking (connected, disconnected, reconnecting, error, degraded)
- Automatic reconnection with exponential backoff

## CI/CD & Deployment

**Hosting:**
- Vercel (primary)
  - Region: gru1 (Sao Paulo, Brazil)
  - Build: `pnpm run build`
  - Install: `pnpm install`

**CI Pipeline:**
- Vercel automatic deployments
- Preview deployments for branches

**Deployment Commands:**
```bash
pnpm deploy         # Production deployment
pnpm deploy:preview # Preview deployment
vercel login        # Authenticate with Vercel
vercel env pull     # Pull environment variables
```

## Environment Configuration

**Required env vars:**
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Application Settings
NODE_ENV=development|production
PORT=3000
```

**Optional env vars:**
```env
# Bundle Analysis
ANALYZE=true
```

**Secrets location:**
- Local: `.env.local` (gitignored)
- Production: Vercel environment variables
- `.env.production` contains non-sensitive defaults

## Webhooks & Callbacks

**Incoming:**
- None detected (no webhook endpoints implemented)

**Outgoing:**
- None detected (no external webhook calls)

## Real-time Features

**Supabase Realtime:**
- Connection management: `lib/realtime/connection-manager.ts`
- Session subscriptions: `lib/realtime/session-realtime.ts`
- Open class listener: `lib/realtime/aulas-abertas-listener.ts`
- Performance optimizer: `lib/realtime/performance-optimizer.ts`

**Use Cases:**
- Real-time attendance updates
- Lesson session status changes
- Multi-user collaboration on attendance

**Connection Recovery:**
- Exponential backoff reconnection (1s base, 30s max)
- Maximum 10 reconnection attempts
- Health check every 30 seconds
- Latency check every 5 seconds

## Document Export

**PDF Generation:**
- Library: jspdf 3.0.4 with jspdf-autotable 5.0.2
- Implementation: `lib/export/pdf-utils.ts`, `lib/export/attendance-pdf.ts`, `lib/export/content-pdf.ts`
- Features:
  - Attendance reports
  - Bolsa Familia reports
  - Student reports
  - Content/lesson reports

**Excel Generation:**
- Library: exceljs 4.4.0
- Implementation: `lib/export/attendance-excel.ts`
- Features:
  - Attendance spreadsheets
  - Bolsa Familia reports

## Brazilian Compliance Integrations

**INEP/Educacenso (Prepared):**
- Implementation: `lib/api/inep-integration.ts`
- INEP code management (escola, aluno, professor, turma)
- Educacenso export generation:
  - Student situation (situacao_aluno)
  - School data (dados_escola)
  - Class data (turma)
  - Teacher data (docente)
  - Manager data (gestor)
- Data compliance checking
- File hash verification

**Bolsa Familia Monitoring:**
- Implementation: `lib/api/bolsa-familia.ts`
- 80% attendance threshold for benefit compliance
- Risk status calculation (adequado, alerta, critico)
- NIS-based student tracking
- Reports for compliance monitoring

**Data Validation:**
- CPF validation and formatting
- Phone number validation (Brazilian format)
- CEP (postal code) validation
- INEP code validation (8 digits for schools)
- Educational age validation by level

## API Layer

**Internal APIs:**
- `app/api/` - Next.js API routes
- Key endpoints:
  - `api/frequencia/` - Attendance operations
  - `api/sessoes/aula/` - Class session operations
  - `api/attendance/trends/` - Attendance analytics
  - `api/compliance/warnings/` - Compliance alerts
  - `api/search/` - Global search
  - `api/health/` - Health check

**API Helpers:**
- `lib/api/base.ts` - Base API service class
- `lib/api/enhanced-base.ts` - Enhanced base with error handling
- `lib/api/error-handler.ts` - Centralized error handling
- `lib/api/rate-limiting.ts` - Rate limiting utilities

---

*Integration audit: 2026-01-18*
