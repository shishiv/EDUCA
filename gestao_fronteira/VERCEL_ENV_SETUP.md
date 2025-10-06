# 🔐 Vercel Environment Variables Setup

## Current Deployment Status

✅ **Deployment Successful!**
- **URL**: https://sistema-gestao-escolar-fronteira-gukroks8k-myke-matos-projects.vercel.app
- **Status**: Ready (deployed 5 minutes ago)
- **Build Time**: 1 minute
- **Build Output**: 38 routes successfully generated

⚠️ **Current Issue**: HTTP 401 error due to missing environment variables

---

## 🎯 Quick Setup (Web Dashboard - Recommended)

### Step 1: Access Environment Variables Page

1. **Open Vercel Dashboard**: https://vercel.com/myke-matos-projects/sistema-gestao-escolar-fronteira-mg/settings/environment-variables

2. **Or navigate manually**:
   - Go to: https://vercel.com/
   - Click on `sistema-gestao-escolar-fronteira-mg` project
   - Click **Settings** tab
   - Click **Environment Variables** in sidebar

### Step 2: Add Environment Variables

Click **"Add New"** button for each variable below:

#### Required Variables:

##### 1. NEXT_PUBLIC_SUPABASE_URL
```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://wxvxlybwpvpenqveycon.supabase.co
Environments: ✓ Production ✓ Preview ✓ Development
```

##### 2. NEXT_PUBLIC_SUPABASE_ANON_KEY
```
Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnhseWJ3cHZwZW5xdmV5Y29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MjI4ODUsImV4cCI6MjA3MzA5ODg4NX0.7XHUFE98qFeWKfA_5VlioMUT2qJAr0u8qw3NdCfQaNo
Environments: ✓ Production ✓ Preview ✓ Development
```

##### 3. SUPABASE_SERVICE_ROLE_KEY
```
Name: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnhseWJ3cHZwZW5xdmV5Y29uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUyMjg4NSwiZXhwIjoyMDczMDk4ODg1fQ.fY1Snl6cK4W15fN_YkfQ9CZeekalwGy2MHVyZd_dU8s
Environments: ✓ Production only (CRITICAL: Do not expose in Preview/Development)
```

##### 4. NEXTAUTH_URL (Generate this)
```
Name: NEXTAUTH_URL
Value: https://sistema-gestao-escolar-fronteira-gukroks8k-myke-matos-projects.vercel.app
Environments: ✓ Production
```

##### 5. NEXTAUTH_SECRET (Generate this)
```bash
# Generate a secure random secret:
openssl rand -base64 32

# Example output:
# Xj3K9mN2pQ7rS8tU5vW6xY7zA1bC2dE3fG4hI5jK6lM=
```

```
Name: NEXTAUTH_SECRET
Value: [paste the generated secret above]
Environments: ✓ Production ✓ Preview
```

##### 6. NODE_ENV
```
Name: NODE_ENV
Value: production
Environments: ✓ Production
```

### Step 3: Redeploy

After adding all environment variables:

1. **Option A - Automatic Redeploy (Recommended)**:
   - Vercel will prompt you to redeploy after adding variables
   - Click **"Redeploy"** button

2. **Option B - Manual CLI Redeploy**:
   ```bash
   cd gestao_fronteira
   bun run deploy --yes
   ```

3. **Option C - Dashboard Redeploy**:
   - Go to **Deployments** tab
   - Click on latest deployment
   - Click **"Redeploy"** button

---

## 🚀 Alternative: CLI Setup (Advanced)

If you prefer using the CLI:

```bash
cd gestao_fronteira

# Add environment variables one by one
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Paste: https://wxvxlybwpvpenqveycon.supabase.co

npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

npx vercel env add NEXTAUTH_URL production
# Paste: https://sistema-gestao-escolar-fronteira-gukroks8k-myke-matos-projects.vercel.app

npx vercel env add NEXTAUTH_SECRET production
# Paste: [your generated secret]

npx vercel env add NODE_ENV production
# Paste: production

# Redeploy
bun run deploy --yes
```

---

## ✅ Verification Checklist

After redeployment, verify the following:

### 1. Deployment Status
```bash
cd gestao_fronteira
npx vercel ls
```
Expected: Status shows "● Ready"

### 2. Test Homepage
Visit: https://sistema-gestao-escolar-fronteira-gukroks8k-myke-matos-projects.vercel.app

Expected: Should load without 401 error

### 3. Test Login Page
Visit: https://sistema-gestao-escolar-fronteira-gukroks8k-myke-matos-projects.vercel.app/login

Expected: Login form should appear

### 4. Test API Health
```bash
curl https://sistema-gestao-escolar-fronteira-gukroks8k-myke-matos-projects.vercel.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-06T...",
  "database": "connected"
}
```

### 5. Check Environment Variables
Go to: https://vercel.com/myke-matos-projects/sistema-gestao-escolar-fronteira-mg/settings/environment-variables

Expected: All 6 variables should be listed with green checkmarks

### 6. Check Deployment Logs
```bash
npx vercel logs sistema-gestao-escolar-fronteira-gukroks8k-myke-matos-projects.vercel.app
```

Expected: No errors related to missing environment variables

---

## 🔐 Security Best Practices

### ✅ DO:
- Use different Supabase projects for production vs. development
- Rotate `NEXTAUTH_SECRET` regularly (every 90 days)
- Store sensitive keys in Vercel's encrypted environment variables
- Use Vercel's secret management for API keys
- Limit `SUPABASE_SERVICE_ROLE_KEY` to Production only

### ❌ DON'T:
- Never commit `.env.local` or `.env.production` to git
- Never share service role keys in public channels
- Never use production keys in development/preview environments
- Never expose service role keys to client-side code

---

## 📊 Performance Monitoring

After successful deployment with environment variables:

### 1. Enable Vercel Analytics
```bash
bun add @vercel/analytics
```

Update `app/layout.tsx`:
```typescript
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### 2. Monitor Real User Metrics (RUM)
- Go to: https://vercel.com/myke-matos-projects/sistema-gestao-escolar-fronteira-mg/analytics
- Track: LCP, FID, CLS, TTFB
- Target: All metrics in "Good" range

### 3. Setup Alerts
- Navigate to: Project Settings → Monitoring
- Configure alerts for:
  - Build failures
  - Runtime errors
  - Performance degradation (LCP > 2.5s)

---

## 🐛 Troubleshooting

### Issue: Still getting 401 after adding env vars

**Solution**:
1. Verify all 6 environment variables are added
2. Check that variables are assigned to "Production" environment
3. Wait 2-3 minutes for Vercel to propagate changes
4. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
5. Try incognito/private browsing mode

### Issue: "Invalid Supabase URL" error

**Solution**:
1. Verify `NEXT_PUBLIC_SUPABASE_URL` includes `https://` protocol
2. Check Supabase project is not paused (go to Supabase dashboard)
3. Verify the URL matches your Supabase project exactly

### Issue: Authentication not working

**Solution**:
1. Verify `NEXTAUTH_URL` matches your deployment URL exactly
2. Check `NEXTAUTH_SECRET` is at least 32 characters
3. Clear browser cookies and try again
4. Check Vercel deployment logs for auth errors

### Issue: Database connection errors

**Solution**:
1. Verify Supabase Row Level Security (RLS) policies are active
2. Check that `SUPABASE_SERVICE_ROLE_KEY` is correct
3. Test database connection from Supabase dashboard
4. Verify database region matches Vercel deployment region (both São Paulo)

---

## 📱 Custom Domain Setup (Future)

When ready to use `sme.fronteira.mg.gov.br`:

1. **Add Domain in Vercel**:
   - Settings → Domains → Add
   - Enter: `sme.fronteira.mg.gov.br`

2. **Configure DNS**:
   - Contact municipal IT department
   - Add CNAME record:
     ```
     Type: CNAME
     Name: sme
     Value: cname.vercel-dns.com
     ```

3. **Update NEXTAUTH_URL**:
   ```
   Name: NEXTAUTH_URL
   Value: https://sme.fronteira.mg.gov.br
   ```

4. **SSL Certificate**: Automatic with Vercel (Let's Encrypt)

---

## 📚 Next Steps

After environment variables are configured:

- [ ] Test all authentication flows (login, logout, role-based access)
- [ ] Verify student registration form works end-to-end
- [ ] Test attendance marking workflow
- [ ] Check all API endpoints respond correctly
- [ ] Run Lighthouse audit (target: score > 90)
- [ ] Setup Vercel Analytics for production monitoring
- [ ] Configure alerts for build failures and errors
- [ ] Plan custom domain migration (sme.fronteira.mg.gov.br)

---

**Status**: 🟡 Awaiting Environment Variable Configuration

**Last Updated**: 2025-10-06
**Deployment URL**: https://sistema-gestao-escolar-fronteira-gukroks8k-myke-matos-projects.vercel.app
