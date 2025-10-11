# Free Monitoring Setup Guide

**Cost:** $0/month (100% Free)
**Alternative to:** Sentry ($29/month) + Grafana self-hosted ($10/month) = **Save $468/year**

---

## 🎯 Monitoring Stack Overview

We'll use a combination of free services that together provide enterprise-grade monitoring:

| Component | Service | Free Tier | Value |
|-----------|---------|-----------|-------|
| **Error Tracking** | Supabase Logs + Vercel | Included | $29/month equivalent |
| **Metrics** | Grafana Cloud | 10k series, 50GB logs | $10/month equivalent |
| **Uptime Monitoring** | UptimeRobot | 50 monitors | $7/month equivalent |
| **Performance** | Vercel Analytics | Included | $10/month equivalent |
| **Brazilian Compliance** | Custom Dashboards | Self-built | Priceless |

**Total Value:** ~$56/month | **Actual Cost:** $0

---

## 📊 Part 1: Grafana Cloud Free Tier Setup

### What You Get Free
- **10,000 metrics series** (plenty for our app)
- **50GB logs** per month
- **50GB traces** per month
- **14-day retention**
- **Unlimited users**
- **Pre-built dashboards**
- **Alerting**

### Step 1: Sign Up for Grafana Cloud

```bash
# 1. Visit https://grafana.com/auth/sign-up/create-user
# 2. Choose "Free Forever" plan
# 3. Create stack (choose region closest to Brazil: US East)
```

### Step 2: Get API Key

```bash
# In Grafana Cloud dashboard:
# 1. Go to Configuration > API Keys
# 2. Create new API key with "MetricsPublisher" role
# 3. Save the key (you'll only see it once)
```

### Step 3: Install Grafana Agent on Server

```bash
# For Vercel/serverless, we'll use HTTP API instead
# Add to .env.local:
GRAFANA_CLOUD_INSTANCE_ID=your_instance_id
GRAFANA_CLOUD_API_KEY=your_api_key
GRAFANA_CLOUD_URL=https://prometheus-prod-24-prod-us-east-0.grafana.net
```

---

## 🔍 Part 2: Supabase Built-in Monitoring (Free)

### What's Included
- **Database metrics** (connections, queries, slow queries)
- **API request logs**
- **Real-time subscriptions monitoring**
- **Storage usage**
- **Auth metrics**

### Setup Dashboard Access

```typescript
// File: lib/monitoring/supabase-monitor.ts
import { supabase } from '@/lib/supabase'

/**
 * Get database performance metrics from Supabase
 */
export async function getSupabaseMetrics() {
  // These are available in Supabase Dashboard
  // We can query them via SQL for custom dashboards

  const { data: slowQueries } = await supabase.rpc('pg_stat_statements', {
    order_by: 'total_time',
    limit: 10
  })

  const { data: activeConnections } = await supabase
    .rpc('pg_stat_activity')

  const { data: databaseSize } = await supabase
    .rpc('pg_database_size', { database_name: 'postgres' })

  return {
    slowQueries,
    activeConnections: activeConnections?.length || 0,
    databaseSize
  }
}
```

### Access Logs via Supabase CLI

```bash
# Install Supabase CLI
bun add -g supabase

# Login
supabase login

# View real-time logs
supabase logs --follow

# View specific service logs
supabase logs --service postgres
supabase logs --service auth
supabase logs --service api
```

---

## 📈 Part 3: Custom Metrics Collection

Create a lightweight metrics endpoint that pushes to Grafana Cloud:

```typescript
// File: lib/monitoring/metrics.ts
interface Metric {
  name: string
  value: number
  labels?: Record<string, string>
  timestamp?: number
}

class MetricsCollector {
  private metrics: Metric[] = []
  private flushInterval = 60000 // 1 minute

  constructor() {
    if (typeof window === 'undefined') {
      // Server-side: Auto-flush every minute
      setInterval(() => this.flush(), this.flushInterval)
    }
  }

  /**
   * Record a metric
   */
  record(name: string, value: number, labels?: Record<string, string>) {
    this.metrics.push({
      name,
      value,
      labels: {
        environment: process.env.NODE_ENV || 'development',
        ...labels
      },
      timestamp: Date.now()
    })

    // Auto-flush if buffer is large
    if (this.metrics.length >= 100) {
      this.flush()
    }
  }

  /**
   * Increment a counter
   */
  increment(name: string, labels?: Record<string, string>) {
    this.record(name, 1, labels)
  }

  /**
   * Record timing in milliseconds
   */
  timing(name: string, durationMs: number, labels?: Record<string, string>) {
    this.record(`${name}_duration_ms`, durationMs, labels)
  }

  /**
   * Flush metrics to Grafana Cloud
   */
  private async flush() {
    if (this.metrics.length === 0) return

    const metricsToSend = [...this.metrics]
    this.metrics = []

    try {
      // Convert to Prometheus format
      const prometheusMetrics = this.convertToPrometheus(metricsToSend)

      // Send to Grafana Cloud
      await fetch(`${process.env.GRAFANA_CLOUD_URL}/api/v1/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GRAFANA_CLOUD_API_KEY}`
        },
        body: JSON.stringify({
          streams: [{
            stream: { job: 'gestao_fronteira' },
            values: prometheusMetrics.map(m => [
              String(m.timestamp * 1000000), // nanoseconds
              JSON.stringify(m)
            ])
          }]
        })
      })
    } catch (error) {
      console.error('Failed to send metrics:', error)
      // Don't throw - we don't want monitoring to break the app
    }
  }

  private convertToPrometheus(metrics: Metric[]) {
    return metrics.map(m => ({
      ...m,
      timestamp: m.timestamp || Date.now()
    }))
  }
}

// Singleton instance
export const metrics = new MetricsCollector()

// Convenience functions
export const recordMetric = (name: string, value: number, labels?: Record<string, string>) =>
  metrics.record(name, value, labels)

export const incrementCounter = (name: string, labels?: Record<string, string>) =>
  metrics.increment(name, labels)

export const recordTiming = (name: string, durationMs: number, labels?: Record<string, string>) =>
  metrics.timing(name, durationMs, labels)
```

---

## 🎓 Part 4: Brazilian Compliance Dashboards

### Dashboard 1: Bolsa Família Compliance Monitor

Create Grafana dashboard with panels:

```yaml
# Grafana Dashboard JSON (import this)
dashboard:
  title: "Bolsa Família - Compliance Monitor"
  panels:
    - title: "Students Below 80% Attendance (CRITICAL)"
      type: stat
      targets:
        - query: 'count(student_attendance_percentage{threshold="below_80"})'
      thresholds:
        - color: green
          value: 0
        - color: orange
          value: 1
        - color: red
          value: 5

    - title: "Students 80-85% Attendance (WARNING)"
      type: stat
      targets:
        - query: 'count(student_attendance_percentage{threshold="warning_80_85"})'

    - title: "Attendance Trend (Last 30 Days)"
      type: graph
      targets:
        - query: 'avg_over_time(student_attendance_percentage[30d])'

    - title: "At-Risk Students by School"
      type: bar
      targets:
        - query: 'sum by (escola) (student_attendance_percentage{threshold="below_80"})'
```

### Dashboard 2: INEP Minimum Compliance (75%)

```yaml
dashboard:
  title: "INEP - Minimum Attendance 75%"
  panels:
    - title: "Students Below 75% (Failing)"
      type: stat
      color: red
      targets:
        - query: 'count(student_attendance_percentage < 75)'

    - title: "Students at Risk (75-80%)"
      type: stat
      color: orange
      targets:
        - query: 'count(student_attendance_percentage >= 75 AND student_attendance_percentage < 80)'

    - title: "Attendance Distribution"
      type: heatmap
      targets:
        - query: 'histogram_quantile(0.95, student_attendance_percentage)'
```

### Dashboard 3: Educacenso Deadline Tracker

```yaml
dashboard:
  title: "Educacenso - Data Collection Status"
  panels:
    - title: "Days Until Deadline (July 31, 2025)"
      type: stat
      targets:
        - query: 'days_until_deadline{event="educacenso_stage1"}'

    - title: "Data Completeness (%)"
      type: gauge
      min: 0
      max: 100
      targets:
        - query: 'data_completeness_percentage'

    - title: "Missing CPF Records"
      type: stat
      color: orange
      targets:
        - query: 'count(students_missing_cpf)'

    - title: "Incomplete Student Registrations"
      type: table
      targets:
        - query: 'students_incomplete_registration'
```

---

## 🚨 Part 5: Free Alerting Setup

### UptimeRobot Configuration

```bash
# Sign up: https://uptimerobot.com (Free: 50 monitors)

# Add monitors:
1. Dashboard uptime: https://your-app.vercel.app/dashboard
2. API health: https://your-app.vercel.app/api/health
3. Database: Monitor Supabase dashboard URL
4. Auth: https://your-app.vercel.app/login

# Alert channels (all free):
- Email notifications
- Webhook to Slack/Discord
- SMS (limited free tier)
```

### Grafana Cloud Alerts

```yaml
# Alert Rule 1: Students Below Bolsa Família Threshold
alert:
  name: "Bolsa Família - Students at Risk"
  condition: 'count(student_attendance_percentage < 80) > 5'
  for: 1h
  annotations:
    summary: "{{ $value }} students below 80% attendance"
    description: "Immediate action required for Bolsa Família compliance"
  notifications:
    - email: diretor@fronteira.mg.gov.br
    - slack: #compliance-alerts

# Alert Rule 2: INEP Minimum Violation
alert:
  name: "INEP - Attendance Below Minimum"
  condition: 'count(student_attendance_percentage < 75) > 1'
  for: 30m
  annotations:
    summary: "{{ $value }} students failing due to attendance"
    description: "Students at risk of failing year due to INEP 75% minimum"

# Alert Rule 3: Educacenso Deadline Approaching
alert:
  name: "Educacenso - Deadline Warning"
  condition: 'days_until_deadline{event="educacenso_stage1"} < 14'
  annotations:
    summary: "Educacenso deadline in {{ $value }} days"
    description: "Only {{ $value }} days until data collection deadline"

# Alert Rule 4: Database Performance
alert:
  name: "Slow Database Queries"
  condition: 'avg(query_duration_ms) > 1000'
  for: 5m
  annotations:
    summary: "Average query time: {{ $value }}ms"
    description: "Database queries taking longer than 1 second"

# Alert Rule 5: API Error Rate
alert:
  name: "High API Error Rate"
  condition: 'rate(http_requests_total{status=~"5.."}[5m]) > 0.05'
  for: 5m
  annotations:
    summary: "API error rate: {{ $value }}%"
    description: "More than 5% of API requests failing"
```

---

## 📱 Part 6: Vercel Analytics (Free)

### Enable Vercel Analytics

```bash
# Install Vercel Analytics
cd gestao_fronteira
bun add @vercel/analytics

# Add to app layout
# File: app/layout.tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

### What You Get Free
- **Real User Monitoring (RUM)**
- **Core Web Vitals** (LCP, FID, CLS)
- **Page view analytics**
- **Traffic sources**
- **Top pages**
- **Device and browser breakdown**

---

## 🔧 Part 7: Custom Health Check Endpoint

Create a health check endpoint for monitoring:

```typescript
// File: app/api/health/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET() {
  const startTime = Date.now()

  try {
    // Check database connection
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          }
        }
      }
    )

    const { error: dbError } = await supabase
      .from('escolas')
      .select('id')
      .limit(1)

    if (dbError) throw new Error('Database check failed')

    // Check Brazilian compliance metrics
    const { data: studentsAtRisk } = await supabase.rpc(
      'get_students_below_attendance_threshold',
      { threshold_percentage: 80 }
    )

    const responseTime = Date.now() - startTime

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      checks: {
        database: 'ok',
        api: 'ok',
        compliance: studentsAtRisk ? 'ok' : 'unknown'
      },
      metrics: {
        students_below_80_percent: studentsAtRisk?.length || 0
      }
    })

  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 })
  }
}
```

---

## 📊 Part 8: Implementation Checklist

### Week 1: Basic Monitoring
- [ ] Sign up for Grafana Cloud (free tier)
- [ ] Sign up for UptimeRobot (free tier)
- [ ] Install Vercel Analytics
- [ ] Create health check endpoint
- [ ] Test health check with UptimeRobot

### Week 2: Metrics Collection
- [ ] Implement metrics collector
- [ ] Add metrics to critical endpoints (login, attendance, search)
- [ ] Create first Grafana dashboard
- [ ] Test metrics flow to Grafana Cloud

### Week 3: Brazilian Compliance Dashboards
- [ ] Create Bolsa Família dashboard
- [ ] Create INEP compliance dashboard
- [ ] Create Educacenso deadline tracker
- [ ] Add attendance calculation functions

### Week 4: Alerting
- [ ] Configure Grafana Cloud alerts
- [ ] Setup email notifications
- [ ] Test alert triggers
- [ ] Create alert runbook

---

## 💰 Cost Comparison

### Paid Solution (Previous Recommendation)
- Sentry Team Plan: $29/month
- Grafana Self-hosted (VPS): $10/month
- **Total:** $39/month = **$468/year**

### Free Solution (This Guide)
- Grafana Cloud Free Tier: $0/month
- Supabase Monitoring: $0/month (included)
- UptimeRobot Free: $0/month
- Vercel Analytics: $0/month (included)
- **Total:** $0/month = **$0/year**

**Savings:** $468/year

---

## 📈 Feature Comparison

| Feature | Paid Solution | Free Solution |
|---------|--------------|---------------|
| Error Tracking | Sentry (best-in-class) | Supabase Logs + Custom |
| Performance Monitoring | Sentry APM | Vercel Analytics |
| Infrastructure Metrics | Grafana | Grafana Cloud Free |
| Log Storage | 10GB | 50GB |
| Retention | 90 days | 14 days |
| Users | Unlimited | Unlimited |
| Alerting | Full featured | Full featured |
| Brazilian Dashboards | Custom | Custom |
| Support | Email support | Community |

**Verdict:** Free solution provides 90% of paid features at $0 cost.

---

## 🎯 Next Steps

1. **Start with Week 1 tasks** - Get basic monitoring running
2. **Monitor for 1 week** - Ensure data is flowing correctly
3. **Build dashboards incrementally** - Add one dashboard per week
4. **Tune alerts** - Adjust thresholds to avoid alert fatigue
5. **Train staff** - Show directors/secretários how to read dashboards

**Estimated Setup Time:** 4-6 hours over 4 weeks

**Maintenance Time:** 15 minutes per week

---

## 📚 Additional Resources

- [Grafana Cloud Free Tier Docs](https://grafana.com/docs/grafana-cloud/billing-and-usage/free-tier/)
- [Supabase Monitoring Guide](https://supabase.com/docs/guides/platform/logs)
- [Vercel Analytics Docs](https://vercel.com/docs/analytics)
- [UptimeRobot Setup Guide](https://uptimerobot.com/help/)
- [Prometheus Metrics Format](https://prometheus.io/docs/concepts/metric_types/)

---

**Summary:** This free monitoring stack provides enterprise-grade observability for the Gestão Fronteira system without any monthly costs, saving $468/year while maintaining Brazilian educational compliance tracking.
