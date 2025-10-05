# 🔍 Sentry vs Grafana - Production Monitoring Analysis

**For:** Gestão Fronteira - Brazilian Educational Management System
**Date:** 2025-10-05
**Context:** Municipal deployment requiring compliance monitoring and error tracking

---

## Executive Summary

**Recommendation:** Use **both** tools in complementary roles:
- **Sentry** for application error tracking, performance monitoring, and user experience
- **Grafana** (with Prometheus) for infrastructure metrics, compliance dashboards, and custom Brazilian educational reporting

**Cost Breakdown:**
- Sentry: ~$29-79/month (paid, per-project pricing)
- Grafana: $0 (open-source, self-hosted) + infrastructure costs

---

## 📊 Side-by-Side Comparison

| Feature | Sentry (Paid SaaS) | Grafana (Open Source) |
|---------|-------------------|----------------------|
| **Primary Purpose** | Error tracking & APM | Data visualization & dashboards |
| **Deployment** | Cloud SaaS (managed) | Self-hosted (requires setup) |
| **Cost** | $29-79/month per project | Free + infrastructure (~$10-30/month) |
| **Setup Time** | 5 minutes (drop-in SDK) | 1-2 hours (full stack setup) |
| **Error Tracking** | ⭐⭐⭐⭐⭐ Built-in, automatic | ⭐⭐ Requires custom logging |
| **Performance Monitoring** | ⭐⭐⭐⭐⭐ Transactions, spans | ⭐⭐⭐ Via metrics collection |
| **Infrastructure Metrics** | ⭐⭐ Basic server stats | ⭐⭐⭐⭐⭐ Comprehensive |
| **Alerting** | ⭐⭐⭐⭐ Smart, ML-based | ⭐⭐⭐⭐⭐ Highly customizable |
| **User Impact Tracking** | ⭐⭐⭐⭐⭐ Breadcrumbs, replays | ⭐ Manual implementation |
| **Custom Dashboards** | ⭐⭐⭐ Limited customization | ⭐⭐⭐⭐⭐ Infinite flexibility |
| **Query Language** | Proprietary | PromQL, SQL, etc. |
| **Data Retention** | 90 days default | Unlimited (storage dependent) |
| **Compliance Tracking** | ⭐⭐ Generic metrics | ⭐⭐⭐⭐⭐ Custom Brazilian metrics |

---

## 🎯 Sentry - Application Performance Monitoring (APM)

### ✅ What Sentry Excels At

#### 1. **Automatic Error Tracking**
```typescript
// Setup in lib/sentry.ts
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
})

// Errors are automatically captured!
// No manual logger.error() needed in most cases
```

**Benefits:**
- Zero-config error catching
- Automatic source maps upload
- Stack traces with exact code location
- User context (who experienced the error)

#### 2. **Performance Transactions**
```typescript
// Automatically tracks:
- API route performance (/api/aulas/abrir)
- Database query timing
- External API calls
- Page load times

// Example trace:
GET /api/aulas/abrir - 245ms
  ├─ supabase.from('turmas').select() - 45ms
  ├─ supabase.rpc('abrir_aula') - 180ms
  └─ supabase.from('aulas_abertas').select() - 20ms
```

#### 3. **User Experience Monitoring**
- **Session Replays**: Watch exactly what the user did before error
- **Breadcrumbs**: Automatic tracking of user actions
- **User Feedback**: Built-in feedback widget

**Example:**
```
User: maria.santos@fronteira.mg.gov.br
Actions before error:
1. Navigated to /dashboard/frequencia
2. Clicked "Abrir Aula" button
3. Selected "Turma 5º Ano B"
4. [ERROR] Failed to open session - database locked
```

#### 4. **Smart Alerting**
- Machine learning detects unusual error patterns
- Automatic issue grouping (similar errors grouped together)
- Integrations with Slack, Email, PagerDuty

### ❌ What Sentry Lacks

1. **Infrastructure Monitoring**
   - No CPU/memory tracking
   - No database connection pool metrics
   - No custom business metrics

2. **Brazilian Educational Compliance**
   - Can't track Educacenso submission deadlines
   - No INEP compliance dashboards
   - No Bolsa Família attendance monitoring

3. **Custom Queries**
   - Limited query capabilities
   - Can't create custom educational reports
   - No SQL/PromQL flexibility

### 💰 Sentry Pricing (2025)

#### Team Plan: $29/month
- 50,000 errors/month
- 100,000 performance transactions/month
- 50 session replays/month
- 90-day data retention

#### Business Plan: $79/month
- 100,000 errors/month
- 250,000 performance transactions/month
- 500 session replays/month
- Advanced features (SSO, priority support)

**For Gestão Fronteira (1 municipality):**
- Estimated: **$29/month Team Plan**
- Scales up as more municipalities adopt

### 🚀 Sentry Setup (5 minutes)

```bash
# Install Sentry SDK
bun add @sentry/nextjs

# Initialize Sentry
npx @sentry/wizard@latest -i nextjs

# Add environment variable
NEXT_PUBLIC_SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz
```

**Files Auto-Generated:**
- `sentry.client.config.ts` - Client-side monitoring
- `sentry.server.config.ts` - Server-side monitoring
- `sentry.edge.config.ts` - Edge runtime monitoring

**Integration with existing logger:**
```typescript
// lib/logger.ts
import * as Sentry from '@sentry/nextjs'

export const logger = {
  error: (message: string, context?: any) => {
    console.error(message, context)

    // Automatically send to Sentry
    Sentry.captureException(new Error(message), {
      extra: context,
      level: 'error'
    })
  },

  warn: (message: string, context?: any) => {
    console.warn(message, context)
    Sentry.captureMessage(message, {
      extra: context,
      level: 'warning'
    })
  },

  // debug/info not sent to Sentry (noise reduction)
  debug: (message: string, context?: any) => {
    console.log(message, context)
  }
}
```

---

## 📈 Grafana - Data Visualization Platform

### ✅ What Grafana Excels At

#### 1. **Infrastructure Monitoring**
```yaml
# prometheus.yml - Metrics collection
scrape_configs:
  - job_name: 'nextjs-app'
    static_configs:
      - targets: ['localhost:3000']

  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:5432']

  - job_name: 'supabase'
    static_configs:
      - targets: ['supabase:9000']
```

**Metrics Available:**
- **System**: CPU, memory, disk, network
- **Application**: Request rate, response time, error rate
- **Database**: Query performance, connection pool, cache hit rate
- **Business**: Active users, sessions opened, attendance marked

#### 2. **Custom Educational Dashboards**

**Brazilian Compliance Dashboard:**
```
┌─────────────────────────────────────────────┐
│ 📊 Educacenso Deadline Tracker              │
├─────────────────────────────────────────────┤
│ Days Remaining: 45                          │
│ Data Completeness: 87% ⚠️                   │
│ Missing CPFs: 23 students                   │
│ Missing Phone Numbers: 12 responsáveis      │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 🎯 Bolsa Família Attendance Risk            │
├─────────────────────────────────────────────┤
│ < 80% Attendance: 5 students 🔴             │
│ 80-85% Attendance: 12 students ⚠️           │
│ > 85% Attendance: 456 students ✅           │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 📚 Active Sessions by School                │
├─────────────────────────────────────────────┤
│ EMEF João Silva: 8 sessions                │
│ CEMEI Pequenos Passos: 4 sessions          │
│ EMEI Jardim: 6 sessions                    │
└─────────────────────────────────────────────┘
```

#### 3. **Advanced Alerting**

**PromQL Alert Examples:**
```yaml
# Alert when students drop below 80% attendance
- alert: BolsaFamiliaAttendanceRisk
  expr: student_attendance_percentage < 80
  for: 1h
  labels:
    severity: critical
  annotations:
    summary: "Student {{ $labels.student_name }} at risk"
    description: "Attendance: {{ $value }}%"

# Alert when API error rate spikes
- alert: HighAPIErrorRate
  expr: |
    rate(http_requests_total{status=~"5.."}[5m])
    / rate(http_requests_total[5m]) > 0.05
  for: 5m
  labels:
    severity: warning

# Alert when database connections are exhausted
- alert: PostgresConnectionPoolFull
  expr: pg_stat_database_numbackends / pg_settings_max_connections > 0.9
  for: 2m
  labels:
    severity: critical
```

#### 4. **Audit Trail Visualization**

**Track who changed what:**
```sql
-- Query audit_logs table
SELECT
  timestamp,
  user_name,
  action,
  table_name,
  record_id
FROM audit_logs
WHERE created_at > now() - interval '24 hours'
ORDER BY created_at DESC
```

**Grafana Dashboard:**
```
Time Series: User Actions Over Time
Bar Chart: Top 10 Most Active Users
Table: Recent Audit Events (live updating)
```

### ❌ What Grafana Lacks

1. **No Built-in Error Tracking**
   - Requires manual instrumentation
   - No stack traces out of the box
   - No source map support

2. **Steep Learning Curve**
   - Requires Prometheus knowledge
   - PromQL query language
   - Complex setup (Grafana + Prometheus + Exporters)

3. **Self-Hosting Overhead**
   - Need to manage servers
   - Setup backups
   - Handle updates/security

### 💰 Grafana Costs (Self-Hosted)

#### Open Source (Free)
- **Software**: $0
- **Infrastructure** (estimated):
  - Small VPS (Grafana + Prometheus): $10-15/month
  - Database metrics exporter: Included in Supabase
  - Application metrics: Built into Next.js
  - **Total**: ~$10-15/month

#### Grafana Cloud (Managed SaaS)
- **Free Tier**: 10,000 metrics, 50GB logs
- **Pro**: $49/month - 100,000 metrics, 100GB logs
- **Advanced**: $299/month - 1M metrics, 500GB logs

**Recommendation:** Self-hosted for cost savings

### 🚀 Grafana Setup (1-2 hours)

```bash
# 1. Install Prometheus
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v ./prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus

# 2. Install Grafana
docker run -d \
  --name grafana \
  -p 3001:3000 \
  grafana/grafana-oss

# 3. Install Next.js metrics exporter
bun add prom-client

# 4. Create metrics endpoint
// app/api/metrics/route.ts
import { register } from 'prom-client'

export async function GET() {
  const metrics = await register.metrics()
  return new Response(metrics, {
    headers: { 'Content-Type': register.contentType }
  })
}
```

---

## 🎯 Recommendation for Gestão Fronteira

### Option 1: **Sentry Only** (Fastest, Lowest Setup Time)
**Best for:** Quick production launch, minimal DevOps resources

**Pros:**
- ✅ 5-minute setup
- ✅ Zero maintenance
- ✅ Immediate error tracking
- ✅ User experience monitoring

**Cons:**
- ❌ No infrastructure monitoring
- ❌ No custom educational compliance dashboards
- ❌ $29/month recurring cost

**Use Case:**
- Small team deploying to 1-3 municipalities
- Want to focus on feature development, not monitoring setup
- Budget allows for SaaS tools

---

### Option 2: **Grafana Only** (Most Control, Zero Recurring Cost)
**Best for:** Larger deployments, in-house DevOps team

**Pros:**
- ✅ $0 software cost
- ✅ Unlimited custom dashboards
- ✅ Brazilian educational compliance tracking
- ✅ Full data control

**Cons:**
- ❌ 1-2 hours setup time
- ❌ Requires Prometheus knowledge
- ❌ Manual error instrumentation
- ❌ Self-hosting maintenance

**Use Case:**
- Deploying to 5+ municipalities
- Have DevOps team for setup/maintenance
- Need custom Brazilian compliance dashboards

---

### Option 3: **Hybrid (Sentry + Grafana)** ⭐ RECOMMENDED
**Best for:** Production-grade monitoring with full visibility

**Setup:**
```
┌─────────────────────────────────────────┐
│         USER EXPERIENCE                 │
│   ┌─────────────────────────────┐       │
│   │  Next.js Application        │       │
│   │  (Gestão Fronteira)         │       │
│   └─────────────────────────────┘       │
│              │          │                │
│              │          └─────────┐      │
│              ▼                    ▼      │
│   ┌──────────────────┐  ┌─────────────┐ │
│   │   SENTRY         │  │  GRAFANA    │ │
│   │  (APM & Errors)  │  │ (Metrics &  │ │
│   │                  │  │  Compliance)│ │
│   └──────────────────┘  └─────────────┘ │
│          │                     │         │
│          ▼                     ▼         │
│   Error Alerts          Compliance      │
│   Performance           Dashboards      │
│   User Replays          INEP Tracking   │
└─────────────────────────────────────────┘
```

**Division of Responsibilities:**

**Sentry Handles:**
- ❌ JavaScript errors in browser
- ❌ API route failures
- ⏱️ Page load performance
- 👤 User session replays
- 🔔 Error alerting

**Grafana Handles:**
- 📊 Infrastructure health (CPU, memory, disk)
- 📈 Business metrics (students, sessions, attendance)
- 🇧🇷 Brazilian compliance (Educacenso, INEP, Bolsa Família)
- 📝 Audit trail visualization
- ⏰ Compliance deadline tracking

**Cost:**
- Sentry Team: $29/month
- Grafana (self-hosted): ~$10/month VPS
- **Total**: ~$39/month

**Benefits:**
- ✅ Complete visibility (errors + infrastructure)
- ✅ Best of both worlds
- ✅ Specialized tools for specialized tasks
- ✅ Scalable to multiple municipalities

---

## 📝 Implementation Roadmap

### Phase 1: Quick Win (Week 1) - Sentry Only
```bash
# Day 1: Setup Sentry
bun add @sentry/nextjs
npx @sentry/wizard@latest -i nextjs

# Day 2: Configure logger integration
# Update lib/logger.ts to send to Sentry

# Day 3: Test error tracking
# Deploy to production
# Monitor errors in Sentry dashboard

# Day 4-7: Tune alerting
# Configure Slack notifications
# Set up error assignment workflow
```

**Result:** Immediate error visibility with minimal effort

---

### Phase 2: Complete Solution (Month 1) - Add Grafana
```bash
# Week 1: Setup Prometheus + Grafana
docker-compose up grafana prometheus

# Week 2: Create custom dashboards
# - Brazilian Compliance Dashboard
# - Infrastructure Health Dashboard
# - Audit Trail Dashboard

# Week 3: Configure alerts
# - Bolsa Família attendance risks
# - Educacenso deadline warnings
# - Database performance alerts

# Week 4: Documentation & training
# - Train municipal staff on dashboards
# - Document alert response procedures
```

**Result:** Complete monitoring solution tailored to Brazilian educational needs

---

## 🇧🇷 Brazilian Educational Compliance - Grafana Dashboards

### Dashboard 1: Educacenso Compliance Tracker

**Metrics to Track:**
```yaml
# Students without CPF (critical for INEP)
students_without_cpf{escola="EMEF João Silva"}

# Incomplete enrollment data
enrollment_completeness_percentage{escola="EMEI Jardim"}

# Days until Educacenso deadline
days_until_educacenso_deadline

# Data quality score (0-100)
educacenso_data_quality_score
```

**Dashboard Panels:**
1. **Countdown Timer**: Days until deadline (big number)
2. **Completeness Gauge**: % of data ready for submission
3. **Missing Data Table**: Students/classes needing updates
4. **Historical Trend**: Submission readiness over time

---

### Dashboard 2: Bolsa Família Attendance Monitor

**Metrics to Track:**
```yaml
# Students below 80% threshold
students_below_bolsa_familia_threshold

# Attendance percentage by student
student_attendance_percentage{student_id="xxx"}

# At-risk students by escola
at_risk_students_count{escola="CEMEI Pequenos Passos"}
```

**Dashboard Panels:**
1. **Critical Alert**: Students < 80% attendance (red)
2. **Warning Zone**: Students 80-85% attendance (yellow)
3. **Safe Zone**: Students > 85% attendance (green)
4. **Trend**: Attendance changes over semester

---

### Dashboard 3: System Health & Performance

**Metrics to Track:**
```yaml
# API performance
http_request_duration_seconds{route="/api/aulas/abrir"}

# Database connections
pg_stat_database_numbackends

# Active sessions
active_class_sessions_total

# Error rate
http_requests_total{status=~"5.."}
```

---

## 🎓 Learning Resources

### For Sentry:
- **Official Docs**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Setup Time**: 30 minutes to read docs + 5 min setup
- **Skill Level**: Beginner-friendly

### For Grafana:
- **Official Docs**: https://grafana.com/docs/grafana/latest/
- **Prometheus Guide**: https://prometheus.io/docs/introduction/overview/
- **Setup Time**: 2-3 hours to learn + 1-2 hours setup
- **Skill Level**: Intermediate (requires basic DevOps knowledge)

---

## 🚀 Final Recommendation

### For Gestão Fronteira: **Hybrid Approach (Sentry + Grafana)**

**Why:**
1. **Immediate Value**: Sentry catches errors from day 1
2. **Complete Visibility**: Grafana provides infrastructure + compliance monitoring
3. **Reasonable Cost**: $39/month for complete solution
4. **Brazilian Compliance**: Custom dashboards for INEP, Educacenso, Bolsa Família
5. **Scalability**: Both tools scale as you add municipalities

**Implementation Order:**
1. **Week 1**: Deploy Sentry (quick win, immediate error tracking)
2. **Month 1**: Add Grafana (complete solution)
3. **Month 2**: Create Brazilian compliance dashboards
4. **Month 3**: Fine-tune alerts and train municipal staff

**Expected Outcomes:**
- ✅ Zero critical errors go unnoticed
- ✅ INEP compliance always visible
- ✅ Municipal staff have real-time educational metrics
- ✅ Infrastructure issues detected before users notice
- ✅ Complete audit trail for legal compliance

---

**Questions to Consider:**

1. **Do you have a DevOps team?**
   - Yes → Hybrid approach
   - No → Sentry only (initially)

2. **How many municipalities will use this?**
   - 1-3 → Sentry only is fine
   - 5+ → Need Grafana for cost efficiency

3. **Is Brazilian compliance tracking critical?**
   - Yes → Need Grafana for custom dashboards
   - No → Sentry provides enough

4. **Budget constraints?**
   - Tight → Grafana only (self-hosted, $10/month)
   - Flexible → Hybrid approach ($39/month)

---

**Next Steps:**
1. Start with Sentry this week (5-minute setup)
2. Plan Grafana implementation for next month
3. Document alert response procedures
4. Train municipal staff on monitoring dashboards

**ROI Estimate:**
- **Cost**: $468/year (Sentry + Grafana)
- **Value**:
  - Prevent 1 critical outage → Save 4 hours downtime
  - Catch INEP compliance issues early → Avoid penalties
  - Reduce debugging time → Save 10 hours/month
  - **Total Value**: ~$5,000+/year in time saved

**Monitoring is an investment, not an expense.** 📊
