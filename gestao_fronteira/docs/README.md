# Documentation Index - Gestao Fronteira

**Last Updated**: 2025-01-11
**Project Status**: MVP 80% Production-Ready

---

## 📚 Quick Navigation

### 🚀 Start Here
- **[CLAUDE.md](../CLAUDE.md)** - Complete project context for AI assistants
- **[PROJECT_INDEX.md](./PROJECT_INDEX.md)** - Full architecture documentation
- **[README.md](../README.md)** - Project overview and quick start

### 🐛 Before You Code
- **[BUGS-ANALYSIS.md](../BUGS-ANALYSIS.md)** - Known bugs and fixes (CHECK FIRST!)

---

## 📖 Core Documentation

### Architecture & Design
| Document | Description | Status |
|----------|-------------|--------|
| [PROJECT_INDEX.md](./PROJECT_INDEX.md) | Complete project architecture, modules, data flow | ✅ Current |
| [API_REFERENCE.md](./API_REFERENCE.md) | Server Actions & API Routes reference | ✅ Current |
| [DATABASE_SECURITY_PERFORMANCE_PLAN.md](./DATABASE_SECURITY_PERFORMANCE_PLAN.md) | Database optimization strategy | ✅ Current |

### Production & Operations
| Document | Description | Status |
|----------|-------------|--------|
| [PRODUCTION-READINESS-REPORT.md](./PRODUCTION-READINESS-REPORT.md) | Production readiness assessment | ✅ Current |
| [SECURITY_PERFORMANCE_SUMMARY.md](./SECURITY_PERFORMANCE_SUMMARY.md) | Security audit summary | ✅ Current |
| [DEPLOYMENT.md](../DEPLOYMENT.md) | Deployment instructions | ✅ Current |

### Roadmap & Planning
| Document | Description | Status |
|----------|-------------|--------|
| [ROADMAP-PORTAL-RESPONSAVEIS.md](./ROADMAP-PORTAL-RESPONSAVEIS.md) | Parent portal development roadmap | ✅ Current |
| [NEW_HOMEPAGE_DESIGN.md](./NEW_HOMEPAGE_DESIGN.md) | Homepage redesign specifications | ✅ Current |
| [UI_UX_IMPROVEMENTS.md](./UI_UX_IMPROVEMENTS.md) | UI/UX enhancement guide | ✅ Current |

---

## 📦 Archived Documentation

### October 2025 Archive (docs/archive/2025-10/)
Historical documentation from October 2025 deployment phase:
- Production readiness reports
- Deployment guides
- Migration completion docs
- Architecture analysis
- Monitoring setup guides

### Historical Archive (docs/archive/historical/)
Implementation guides and analysis from earlier project phases:
- I-Educar analysis findings
- Immediate implementation guides
- Brazilian education API references
- Actionable implementation roadmaps

### Test Results Archive (docs/archive/test-results/)
Performance and testing documentation:
- Stress test results
- E2E test results
- Performance profiling reports
- Index performance analysis

---

## 🔧 Development Guides

### Getting Started
1. Read [CLAUDE.md](../CLAUDE.md) for project context
2. Check [BUGS-ANALYSIS.md](../BUGS-ANALYSIS.md) for known issues
3. Review [PROJECT_INDEX.md](./PROJECT_INDEX.md) for architecture
4. Follow setup in [README.md](../README.md)

### Development Workflow
1. **Before Coding**: Check BUGS-ANALYSIS.md
2. **During Development**: Reference API_REFERENCE.md
3. **Before UI Changes**: Use Chrome DevTools MCP validation
4. **Before Commit**: Run `pnpm lint && pnpm typecheck`
5. **Before PR**: Run `pnpm test && pnpm test:e2e`

### Database Operations
⚠️ **CRITICAL**: Use **Supabase MCP only** for database operations
- ❌ DO NOT use local Supabase CLI (`supabase start`, `supabase db push`)
- ✅ USE `mcp__supabase__apply_migration`, `mcp__supabase__execute_sql`

---

## 📊 Project Status (2025-01-11)

### Completed Modules (100%)
- ✅ User Management (5-role RBAC)
- ✅ Student Registration (INEP-compliant)
- ✅ Onboarding Wizard (6-step initialization)

### In Progress (85%)
- 🔶 Digital Diary/Attendance ("Abrir aula" workflow)
- 🔶 Reports & Analytics (enhanced reporting)

### Database
- **Migrations**: 29 applied
- **RLS**: Enabled on all critical tables
- **Indexes**: 28 performance indexes
- **Security**: DELETE policies fixed

---

## 🌐 Brazilian Educational Compliance

### INEP Standards
- **Educacenso 2025**: Stage 1 (May-Jul 2025), Stage 2 (Feb-Mar 2026)
- **Data Points**: CPF, enrollment, attendance, teacher assignments

### Bolsa Família
- **Threshold**: 80% minimum attendance
- **Alerts**: Automated compliance warnings
- **Integration**: Official registration tracking

### Legal Compliance
- **"Não Existe o Esquecer"**: Attendance immutability after closure
- **Official Documents**: Legal attendance records
- **Audit Trail**: Complete timestamp tracking
- **Multi-School Isolation**: RLS-based data separation

---

## 🛠️ Technology Stack

| Category | Technology | Version |
|----------|-----------|---------|
| **Framework** | Next.js | 15.5.3 |
| **UI Library** | React | 18.2.0 |
| **Database** | Supabase (PostgreSQL) | 2.57.4 |
| **Language** | TypeScript | 5.2.2 |
| **UI Components** | shadcn/ui + Radix UI | Latest |
| **Styling** | Tailwind CSS | 3.3.3 |
| **State Management** | Zustand | 4.4.7 |
| **Data Fetching** | TanStack Query | 5.17.9 |
| **Forms** | React Hook Form + Zod | 7.53.0 + 3.23.8 |
| **Testing** | Jest + Playwright | 30.2.0 + 1.55.1 |
| **Package Manager** | pnpm | Latest |

---

## 📈 Performance Targets

| Operation | Target | Status |
|-----------|--------|--------|
| Dashboard Load | < 3s | ✅ Achieved |
| Attendance Marking | < 1s/student | ✅ Achieved |
| Session Open | < 2s | ✅ Achieved |
| Session Close | < 3s | ✅ Achieved |

---

## 🔗 External Resources

### Documentation
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [TanStack Query](https://tanstack.com/query)

### Brazilian Education
- INEP/Educacenso Standards (Brazilian Ministry of Education)
- Bolsa Família Program Guidelines

---

## 📝 Documentation Maintenance

### Update Frequency
- **CLAUDE.md**: After major changes or new features
- **PROJECT_INDEX.md**: On architectural changes
- **API_REFERENCE.md**: When APIs change
- **BUGS-ANALYSIS.md**: As bugs are fixed/discovered

### Archive Policy
- Move outdated docs to `archive/` with date folder
- Keep current documentation in root `docs/`
- Maintain historical reference for compliance

---

## 💡 Tips for Developers

### New to Project?
1. Start with [CLAUDE.md](../CLAUDE.md) for full context
2. Read [PROJECT_INDEX.md](./PROJECT_INDEX.md) for architecture
3. Review [BUGS-ANALYSIS.md](../BUGS-ANALYSIS.md) for known issues
4. Check [API_REFERENCE.md](./API_REFERENCE.md) for API usage

### Working on Features?
1. Create feature branch (`feature/your-feature`)
2. Check BUGS-ANALYSIS.md first
3. Use Chrome DevTools MCP for UI validation
4. Follow conventional commit format
5. Test Brazilian validation (CPF, phone, dates)

### Deploying?
1. Review [PRODUCTION-READINESS-REPORT.md](./PRODUCTION-READINESS-REPORT.md)
2. Check [SECURITY_PERFORMANCE_SUMMARY.md](./SECURITY_PERFORMANCE_SUMMARY.md)
3. Follow [DEPLOYMENT.md](../DEPLOYMENT.md) instructions
4. Verify RLS policies are enabled

---

**For Questions**: See [CLAUDE.md](../CLAUDE.md) for complete project context
**For Bugs**: Check [BUGS-ANALYSIS.md](../BUGS-ANALYSIS.md) first
**For Support**: Contact development team

---

**Last Updated**: 2025-01-11
**Maintained By**: Development Team
