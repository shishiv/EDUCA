# Vercel Deployment Guide - Sistema de Gestão Escolar Fronteira/MG

## 📋 Pre-Deployment Checklist

✅ **Completed:**
- [x] Production build successful (compiled in 14.2s)
- [x] Vercel CLI authenticated (user: shishiv)
- [x] Next.js 15.5.3 configuration optimized
- [x] 38 routes generated successfully
- [x] Bundle analyzer configured
- [x] Security headers configured

⚠️ **Required:**
- [ ] Supabase production database URL
- [ ] Supabase production anon key
- [ ] Supabase service role key (for migrations)

---

## 🚀 Deployment Steps

### Step 1: Deploy to Vercel

Run the deployment command from the project directory:

```bash
cd gestao_fronteira
bun run deploy
```

This will trigger an interactive setup. Answer the prompts as follows:

```
? Set up and deploy "~/gestao_fronteira"? [Y/n] Y
? Which scope do you want to deploy to? [Your Team Name]
? Link to existing project? [y/N] N
? What's your project's name? sistema-gestao-escolar-fronteira-mg
? In which directory is your code located? ./
? Want to modify these settings? [y/N] N
```

### Step 2: Configure Environment Variables

After the initial deployment, configure environment variables in Vercel Dashboard:

**Navigate to:** `https://vercel.com/[your-team]/sistema-gestao-escolar-fronteira-mg/settings/environment-variables`

**Add the following variables:**

#### Production Environment Variables:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Production, Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key | Production, Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key | Production only |
| `NEXTAUTH_URL` | https://[your-domain].vercel.app | Production |
| `NEXTAUTH_SECRET` | Generate with: `openssl rand -base64 32` | Production, Preview |

**Get Supabase credentials:**
```bash
# Get project URL and keys from your Supabase dashboard
# Or use Supabase CLI:
npx supabase projects list
npx supabase projects api-keys --project-ref [your-project-ref]
```

### Step 3: Redeploy with Environment Variables

After adding environment variables, trigger a new deployment:

```bash
cd gestao_fronteira
bun run deploy
```

Or from the Vercel Dashboard:
- Go to the Deployments tab
- Click "Redeploy" on the latest deployment

---

## 🌎 Regional Configuration

The project is configured to deploy to **São Paulo, Brazil (gru1)** region for optimal performance for Brazilian educational institutions.

**Configured in:** [vercel.json:11](vercel.json#L11)

---

## 🔐 Security Checklist

After deployment, verify:

- [ ] Environment variables are set correctly (check Vercel Dashboard)
- [ ] HTTPS is enabled (automatic with Vercel)
- [ ] Security headers are present (test with: https://securityheaders.com/)
- [ ] Supabase Row Level Security (RLS) policies are active
- [ ] Authentication flow works correctly
- [ ] API routes are protected with middleware

---

## 📊 Post-Deployment Verification

### 1. Test Core Functionality

Visit your deployment URL and verify:

```bash
# Get your deployment URL
cd gestao_fronteira
npx vercel ls
```

**Test checklist:**
- [ ] Homepage loads (`/`)
- [ ] Login page works (`/login`)
- [ ] Dashboard accessible (`/dashboard`) - should redirect to login
- [ ] Authentication flow completes successfully
- [ ] Student registration form loads (`/dashboard/alunos/novo`)
- [ ] Attendance page loads (`/dashboard/frequencia`)

### 2. Performance Testing

Use Chrome DevTools or Vercel Analytics:

**Target Metrics:**
- **Dashboard Load Time:** < 3 seconds
- **Attendance Marking:** < 1 second per student
- **First Load JS:** ~120kB (achieved ✓)
- **Lighthouse Score:** > 90

### 3. API Health Check

Test the health endpoint:

```bash
curl https://[your-domain].vercel.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-05T...",
  "database": "connected"
}
```

---

## 🔄 Continuous Deployment

The project is configured for automatic deployments:

- **Production:** Deploys automatically on push to `main` branch
- **Preview:** Deploys automatically on pull requests

**Vercel GitHub Integration:**
1. Go to Vercel Dashboard → Settings → Git
2. Connect your GitHub repository
3. Configure branch protection rules

---

## 📱 Custom Domain Setup (Optional)

To use a custom domain like `sme.fronteira.mg.gov.br`:

1. Go to Vercel Dashboard → Settings → Domains
2. Add custom domain: `sme.fronteira.mg.gov.br`
3. Configure DNS records as instructed by Vercel:
   ```
   Type: A
   Name: sme
   Value: 76.76.21.21 (Vercel IP)
   ```
4. Wait for DNS propagation (up to 48 hours)

**For municipal government domains:**
- Contact IT department for DNS access
- Provide Vercel DNS configuration
- Set up SSL certificate (automatic with Vercel)

---

## 🐛 Troubleshooting

### Build Failures

**Issue:** Build fails with "Module not found"
```bash
# Clear node_modules and reinstall
cd gestao_fronteira
rm -rf node_modules .next
bun install
bun run build
```

**Issue:** Environment variables not available during build
- Verify variables are set in Vercel Dashboard
- Ensure variable names match exactly (case-sensitive)
- Check that variables are assigned to correct environments

### Runtime Errors

**Issue:** "Invalid Supabase URL"
- Verify `NEXT_PUBLIC_SUPABASE_URL` is set correctly
- Check Supabase project is not paused
- Ensure URL includes `https://` protocol

**Issue:** Authentication not working
- Verify `NEXTAUTH_URL` matches deployment URL
- Check `NEXTAUTH_SECRET` is set
- Ensure Supabase auth is enabled

### Performance Issues

**Issue:** Slow page loads
- Enable Vercel Analytics to identify bottlenecks
- Check Supabase database region (should be São Paulo)
- Review network tab for slow API calls
- Verify images are using Next.js Image optimization

---

## 📚 Additional Resources

- [Vercel Next.js Deployment Docs](https://vercel.com/docs/frameworks/nextjs)
- [Supabase Environment Variables](https://supabase.com/docs/guides/api)
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [CLAUDE.md - Project Instructions](./CLAUDE.md)

---

## 🎯 Brazilian Educational Compliance

After deployment, verify Brazilian educational compliance:

- [ ] INEP integration endpoints accessible
- [ ] Educacenso data export functionality working
- [ ] Bolsa Família attendance tracking active
- [ ] LGPD data protection policies enforced
- [ ] CPF validation working correctly
- [ ] Multi-school data isolation (RLS) enforced

---

## 📧 Support

**Deployment Issues:**
- Vercel Support: https://vercel.com/support
- GitHub Issues: [Create an issue](https://github.com/your-repo/issues)

**Production Support:**
- Municipal IT Contact: [Add contact info]
- Educational System Support: [Add contact info]

---

**Deployment Status:** 🟡 Ready to Deploy

**Last Updated:** 2025-10-05
**Next.js Version:** 15.5.3
**Vercel CLI Version:** 48.2.0
