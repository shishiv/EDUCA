# External Integrations

**Analysis Date:** 2026-01-16

## APIs & External Services

**Database & Backend:**
- Supabase - PostgreSQL database, authentication, realtime, storage
  - SDK: `@supabase/supabase-js` 2.87.1, `@supabase/ssr` 0.7.0
  - Auth: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - Clients:
    - Browser: `gestao_fronteira/lib/supabase.ts`
    - Server: `gestao_fronteira/lib/supabase/server.ts`

**Monitoring (Optional):**
- Grafana Cloud - Metrics collection
  - Implementation: `gestao_fronteira/lib/monitoring/metrics.ts`
  - Auth: `GRAFANA_CLOUD_URL`, `GRAFANA_CLOUD_API_KEY`
  - Features: Counter, gauge, timing metrics with Prometheus format

## Data Storage

**Databases:**
- Supabase PostgreSQL
  - Connection: `NEXT_PUBLIC_SUPABASE_URL` (API), `DATABASE_URL` (direct)
  - Client: Supabase JS SDK with typed queries
  - Types: `gestao_fronteira/types/database.ts` (auto-generated)
  - Tables: alunos, turmas, escolas, frequencia, matriculas, users, audit_logs, etc.

**File Storage:**
- Supabase Storage (configured for images)
  - Pattern: `*.supabase.co/storage/v1/object/**`
  - Use: Student photos, municipal assets

**Caching:**
- TanStack Query (client-side)
- IndexedDB (offline attendance via service worker)
  - Database: `GestaoEducacional`
  - Store: `offline-attendance`

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (built-in)
  - Implementation: `gestao_fronteira/lib/auth.ts`
  - Server auth: `gestao_fronteira/lib/supabase/server.ts`
  - Features:
    - Email/password sign-in
    - Session management via cookies
    - Role-based access control (admin, diretor, secretario, professor, responsavel)
    - School-scoped data access (RLS)
  - Audit logging: IP tracking, user agent, action logging

## Real-time Features

**WebSocket Connections:**
- Supabase Realtime
  - Implementation: `gestao_fronteira/lib/realtime/session-realtime.ts`
  - Channels:
    - `session-updates-*` - Lesson session changes
    - `attendance-updates-*` - Attendance marking
    - `dashboard-*` - Administrative overview
    - `broadcast-*` - Client-to-client messages
  - Tables monitored: `aula_sessions`, `frequencia`

## Monitoring & Observability

**Error Tracking:**
- Custom logger with structured logging
  - Implementation: `gestao_fronteira/lib/logger.ts`
  - Levels: debug, info, warn, error, critical
  - Features: Performance tracking, educational compliance events
  - Buffer: Auto-flush every 30s, max 100 entries

**Logs:**
- Custom logger to `/api/logs` endpoint
- localStorage storage in development
- Grafana Cloud integration (optional)

**Health Checks:**
- Endpoint: `/api/health`
  - Checks: Database connectivity, compliance metrics
  - Metrics: Total students, active teachers, open sessions
  - Formats: JSON (GET), status-only (HEAD)

## CI/CD & Deployment

**Hosting:**
- Vercel (primary)
  - Config: Automatic via `vercel.json` (not found, uses defaults)
  - Scripts: `pnpm deploy`, `pnpm deploy:preview`
  - Allowed origins: `*.vercel.app`, `*.netlify.app`

**CI Pipeline:**
- Not detected (no GitHub Actions or similar)

**Production Domain:**
- Target: `sme.fronteira.mg.gov.br`
- Municipal subdomains: `*.fronteira.mg.gov.br`

## Environment Configuration

**Required env vars:**
```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Auth (required)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=

# Optional
DATABASE_URL=                    # Direct PostgreSQL for local dev
GRAFANA_CLOUD_URL=              # Monitoring
GRAFANA_CLOUD_API_KEY=          # Monitoring auth
```

**Secrets location:**
- Local: `.env.local` (gitignored)
- Production: Vercel environment variables
- Template: `gestao_fronteira/.env.example`

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- `/api/logs` - Log shipping (internal)

## Offline Support

**Service Worker:**
- Implementation: `gestao_fronteira/lib/service-worker.ts`
- Static file: `gestao_fronteira/public/sw.js`
- Features:
  - Offline attendance marking
  - Background sync (`attendance-sync`)
  - IndexedDB for offline queue
  - Auto-update notifications

**Provider:**
- `gestao_fronteira/components/providers/service-worker-provider.tsx`
- Hook: `gestao_fronteira/hooks/use-service-worker.ts`

## Brazilian Compliance Integrations

**Data Validation:**
- CPF validation: `gestao_fronteira/lib/validation/brazilian.ts`
- Phone formatting: Brazilian mobile/landline formats
- CEP (postal code): 8-digit validation
- INEP school codes: 8-digit educational institution IDs
- NIS (Bolsa Familia): Welfare program identifier

**Bolsa Familia Monitoring:**
- API: `gestao_fronteira/lib/api/bolsa-familia.ts`
- Reports: `gestao_fronteira/lib/reports/bolsa-familia-reports.ts`
- Database view: `vw_bolsa_familia_frequencia`
- RPC: `get_bolsa_familia_students_at_risk`, `calculate_bolsa_familia_frequency`
- Threshold: 80% minimum attendance for benefits

**Attendance Immutability:**
- Auto-lock: 18:00 Brazil time (Sao Paulo)
- Audit trail: `audit_sessoes_aula`, `audit_trail` tables
- Hash verification for integrity

## Image Configuration

**Remote Patterns (next.config.js):**
```javascript
[
  { hostname: 'localhost' },
  { hostname: 'fronteira.localhost' },
  { hostname: '*.supabase.co', pathname: '/storage/v1/object/**' },
  { hostname: '*.fronteira.mg.gov.br' }
]
```

**Formats:** WebP, AVIF
**Device sizes:** 320, 420, 768, 1024, 1200

---

*Integration audit: 2026-01-16*
