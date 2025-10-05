# Deployment Guide - Gestão Fronteira

**Status:** ✅ Ready for Production Deployment
**Platform:** Vercel (Recommended)
**Estimated Time:** 15-20 minutes

---

## 🚀 Quick Deployment (Vercel)

### Prerequisites
- [x] Vercel CLI installed ✅
- [x] Production build passing ✅
- [x] Supabase project created
- [ ] Vercel account (free tier works)

### Step 1: Login to Vercel

```bash
cd gestao_fronteira
bun run vercel:login
```

This will open your browser to authenticate with Vercel.

### Step 2: Environment Variables

Create a `.env.production` file with your production Supabase credentials:

```bash
# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Optional: Monitoring (Free Tier)
GRAFANA_CLOUD_URL=https://prometheus-prod-XX-prod-us-east-0.grafana.net
GRAFANA_CLOUD_API_KEY=your-grafana-api-key
```

**Where to find Supabase keys:**
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings > API
4. Copy `Project URL` and `anon/public` key

### Step 3: Initial Deployment (Preview)

Test deployment first with a preview:

```bash
bun run deploy:preview
```

This creates a preview URL for testing (e.g., `gestao-fronteira-abc123.vercel.app`)

**What Vercel does automatically:**
- ✅ Detects Next.js framework
- ✅ Installs dependencies with bun
- ✅ Runs `bun run build`
- ✅ Deploys to global CDN
- ✅ Generates preview URL

### Step 4: Production Deployment

Once preview is verified, deploy to production:

```bash
bun run deploy
```

This deploys to your production domain (e.g., `gestao-fronteira.vercel.app`)

### Step 5: Configure Custom Domain (Optional)

In Vercel dashboard:
1. Go to Settings > Domains
2. Add your custom domain: `educacao.fronteira.mg.gov.br`
3. Follow DNS configuration instructions
4. Vercel automatically provisions SSL certificate

---

## 🔧 Environment Variables in Vercel Dashboard

After deployment, configure environment variables in Vercel dashboard:

1. Go to your project in Vercel
2. Settings > Environment Variables
3. Add the following:

| Name | Value | Environments |
|------|-------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Production, Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Production, Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Production only |
| `GRAFANA_CLOUD_URL` | `https://...` | Production (optional) |
| `GRAFANA_CLOUD_API_KEY` | `glc_...` | Production (optional) |

**Security Note:** Never commit `.env.production` to git! It's in `.gitignore`.

---

## 📊 Post-Deployment Verification

### 1. Health Check

Visit your deployed URL + `/api/health`:
```
https://your-app.vercel.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-05T...",
  "responseTime": "145ms",
  "checks": [
    { "name": "database", "status": "healthy" },
    { "name": "compliance_metrics", "status": "healthy" }
  ]
}
```

### 2. Test Core Flows

- [ ] Visit `/login` - Should load without errors
- [ ] Login with test credentials
- [ ] Navigate to `/dashboard` - Should show dashboard
- [ ] Test `/api/search?query=test` - Should return results
- [ ] Check browser console - Should have no errors

### 3. Performance Check

Use Vercel Analytics (automatically enabled):
1. Go to your project in Vercel
2. Click "Analytics" tab
3. Monitor:
   - **Real User Monitoring (RUM)**
   - **Core Web Vitals** (LCP, FID, CLS)
   - **Geographic distribution**

**Expected Performance:**
- LCP (Largest Contentful Paint): < 2.5s ✅
- FID (First Input Delay): < 100ms ✅
- CLS (Cumulative Layout Shift): < 0.1 ✅

---

## 🌍 Database Migration

### Connect Production Database

Your Supabase production database needs the same schema as development.

**Option 1: Push Local Migrations (Recommended)**

```bash
# Link to production project
supabase link --project-ref your-production-project-ref

# Push migrations
supabase db push

# Verify
supabase db diff
```

**Option 2: Manual Migration**

1. Go to Supabase Dashboard > SQL Editor
2. Copy contents of `gestao_fronteira/supabase/migrations/20250628095207_wild_block.sql`
3. Run the migration
4. Verify tables created

### Verify RLS Policies

```sql
-- Check RLS is enabled on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false;
-- Should return no rows (all tables should have RLS enabled)
```

---

## 📈 Monitoring Setup (Optional - Free)

### 1. UptimeRobot (Free Tier)

**Setup Time:** 5 minutes

1. Sign up at [uptimerobot.com](https://uptimerobot.com)
2. Create HTTP(s) monitor:
   - **URL:** `https://your-app.vercel.app/api/health`
   - **Friendly Name:** Gestão Fronteira - Health Check
   - **Monitoring Interval:** 5 minutes
   - **Monitor Type:** HTTP(s)
   - **Alert Contacts:** Your email

3. Create additional monitors:
   - **Login Page:** `https://your-app.vercel.app/login`
   - **Dashboard:** `https://your-app.vercel.app/dashboard`

**Free Tier:** 50 monitors, 5-minute intervals

### 2. Grafana Cloud (Free Tier)

**Setup Time:** 10 minutes

Follow the comprehensive guide in [FREE-MONITORING-SETUP.md](FREE-MONITORING-SETUP.md)

**Quick Setup:**
```bash
# 1. Sign up at grafana.com (free tier)
# 2. Create stack (US East region closest to Brazil)
# 3. Get API key from Configuration > API Keys
# 4. Add to Vercel environment variables:
GRAFANA_CLOUD_URL=https://prometheus-prod-24-prod-us-east-0.grafana.net
GRAFANA_CLOUD_API_KEY=your-key-here
# 5. Metrics automatically start flowing
```

**Free Tier:** 10k metrics, 50GB logs, 14-day retention

---

## 🔒 Security Checklist

Before going live:

- [ ] **Environment Variables:** All secrets in Vercel dashboard (not committed)
- [ ] **RLS Policies:** Enabled on all Supabase tables
- [ ] **HTTPS:** Enabled (Vercel does this automatically)
- [ ] **CORS:** Configured if using custom domain
- [ ] **Rate Limiting:** Verify API routes have proper limits
- [ ] **Supabase Auth:** Email verification enabled
- [ ] **Database Backups:** Enabled in Supabase (automatic with Pro plan)

---

## 🎯 Deployment Commands Reference

```bash
# Development
bun run dev              # Start dev server (localhost:3000)

# Testing
bun run build           # Verify production build
bun run test            # Run unit tests
bun run test:e2e        # Run E2E tests

# Deployment
bun run vercel:login    # Authenticate with Vercel
bun run deploy:preview  # Deploy preview (testing)
bun run deploy          # Deploy to production
bun run vercel:env      # Pull environment variables

# Monitoring
curl https://your-app.vercel.app/api/health  # Check health
```

---

## 🚨 Rollback Procedure

If deployment has issues:

### In Vercel Dashboard:
1. Go to Deployments tab
2. Find previous working deployment
3. Click "⋯" (three dots)
4. Select "Promote to Production"

### Via CLI:
```bash
vercel rollback
```

**Vercel keeps all deployments** - You can roll back to any previous version instantly.

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue 1: Build Fails**
```bash
# Solution: Clear cache and rebuild
vercel --force
```

**Issue 2: Environment Variables Not Working**
```bash
# Solution: Pull latest env vars
bun run vercel:env
```

**Issue 3: Database Connection Error**
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check Supabase project is not paused (free tier pauses after inactivity)
- Verify RLS policies allow access

**Issue 4: Slow Performance**
- Check Vercel Analytics for bottlenecks
- Verify Edge Functions are deployed in Brazil region (São Paulo)
- Enable Vercel Edge Caching

### Get Help

- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)
- **Supabase Docs:** [supabase.com/docs](https://supabase.com/docs)
- **Next.js Docs:** [nextjs.org/docs](https://nextjs.org/docs)
- **Project Issues:** GitHub Issues (if applicable)

---

## 🎓 Training Materials

After deployment, train users:

### For Directors (Diretores)
- Dashboard overview
- Viewing attendance reports
- Monitoring compliance (Bolsa Família, INEP)

### For Secretaries (Secretários)
- Student enrollment
- Educacenso export (CSV format)
- Report generation (PDF/Excel)

### For Teachers (Professores)
- Attendance marking workflow
- "Abrir aula" process
- Viewing student trends

### For Parents (Responsáveis)
- Accessing student information
- Viewing attendance records
- Understanding compliance status

---

## 📋 Post-Deployment Checklist

Week 1:
- [ ] Monitor error rates in Vercel
- [ ] Check database query performance
- [ ] Verify all user roles work correctly
- [ ] Test on mobile devices (tablets used by teachers)
- [ ] Gather initial user feedback

Week 2:
- [ ] Fine-tune based on feedback
- [ ] Add monitoring alerts
- [ ] Configure backup procedures
- [ ] Document common user questions

Month 1:
- [ ] Review Vercel Analytics data
- [ ] Optimize slow queries
- [ ] Plan next features based on usage
- [ ] Celebrate successful launch! 🎉

---

## 🎉 Success Criteria

Your deployment is successful when:

✅ **Uptime:** > 99.5% (UptimeRobot shows green)
✅ **Performance:** LCP < 2.5s (Vercel Analytics)
✅ **Errors:** < 1% error rate
✅ **User Satisfaction:** Positive feedback from teachers/directors
✅ **Compliance:** All Brazilian educational requirements met
✅ **Data Integrity:** No data loss, RLS working correctly

---

## 📖 Additional Resources

- [100-PERCENT-PRODUCTION-READY.md](100-PERCENT-PRODUCTION-READY.md) - Complete feature list
- [FREE-MONITORING-SETUP.md](FREE-MONITORING-SETUP.md) - Monitoring configuration
- [CLAUDE.md](CLAUDE.md) - Project guidelines and architecture

---

**Deployment Status:** ✅ **READY TO DEPLOY**

The system has been thoroughly tested and is ready for production use by the Municipality of Fronteira, Minas Gerais, Brazil.

**Estimated Total Deployment Time:** 15-20 minutes
**Ongoing Maintenance Time:** 15 minutes per week

Good luck with your deployment! 🚀
