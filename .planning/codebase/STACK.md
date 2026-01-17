# Technology Stack

**Analysis Date:** 2026-01-16

## Languages

**Primary:**
- TypeScript 5.9.3 - Application code (`gestao_fronteira/**/*.ts`, `gestao_fronteira/**/*.tsx`)
- JavaScript ES5 (target) - Build output

**Secondary:**
- SQL - Database queries via Supabase
- CSS - Tailwind CSS classes

## Runtime

**Environment:**
- Node.js (version managed via project)
- Browser (React 19 client-side)

**Package Manager:**
- pnpm
- Lockfile: `gestao_fronteira/pnpm-lock.yaml` (present)

## Frameworks

**Core:**
- Next.js 16.0.7 - Full-stack React framework with App Router
- React 19.2.3 - UI library
- React DOM 19.2.3 - DOM rendering

**State Management:**
- Zustand 4.4.7 - Global state
- TanStack React Query 5.90.12 - Server state/caching

**Testing:**
- Not detected (no test framework in dependencies)

**Build/Dev:**
- Turbopack - Development server (`next dev --turbo`)
- PostCSS 8.4.30 - CSS processing
- ESLint 9.39.1 - Linting
- tsx 4.21.0 - TypeScript execution for scripts

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.87.1 - Database client
- `@supabase/ssr` 0.7.0 - Server-side Supabase auth
- `zod` 3.23.8 - Schema validation (Brazilian data validation)
- `react-hook-form` 7.68.0 - Form state management
- `@hookform/resolvers` 5.2.2 - Zod integration for forms

**UI Components:**
- `@radix-ui/react-*` - Headless UI primitives (dialog, dropdown, tabs, etc.)
- `lucide-react` 0.446.0 - Icon library
- `class-variance-authority` 0.7.0 - Component variant styling
- `tailwind-merge` 2.5.2 - Tailwind class merging
- `clsx` 2.1.1 - Conditional classnames
- `sonner` 2.0.7 - Toast notifications
- `vaul` 1.1.2 - Drawer component
- `cmdk` 1.0.0 - Command palette
- `recharts` 3.5.1 - Charts/graphs

**Document Generation:**
- `jspdf` 3.0.4 - PDF generation
- `jspdf-autotable` 5.0.2 - PDF tables
- `exceljs` 4.4.0 - Excel export
- `file-saver` 2.0.5 - File downloads

**Date/Time:**
- `date-fns` 4.1.0 - Date utilities
- `react-day-picker` 9.12.0 - Date picker component

**Infrastructure:**
- `next-themes` 0.4.6 - Dark mode support
- `@next/bundle-analyzer` 16.0.7 - Bundle analysis (dev)
- `vercel` 48.12.1 - Deployment CLI (dev)

## Configuration

**Environment:**
- `.env.example` template provided
- Required variables:
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
  - `SUPABASE_SERVICE_ROLE_KEY` - Admin operations key
  - `DATABASE_URL` - Direct PostgreSQL connection (local dev)
  - `NEXTAUTH_URL` - Application URL
  - `NEXTAUTH_SECRET` - Auth secret
- Optional monitoring:
  - `GRAFANA_CLOUD_URL` - Metrics endpoint
  - `GRAFANA_CLOUD_API_KEY` - Metrics auth

**TypeScript:**
- Config: `gestao_fronteira/tsconfig.json`
- Strict mode enabled
- Module resolution: bundler
- Path alias: `@/*` maps to project root

**Build:**
- `gestao_fronteira/next.config.js` - Next.js configuration
- `gestao_fronteira/tailwind.config.js` - Tailwind configuration
- `gestao_fronteira/postcss.config.js` - PostCSS configuration

## Styling

**Framework:**
- Tailwind CSS 3.3.3
- `tailwindcss-animate` 1.0.7 - Animation utilities

**Design System:**
- Custom "EDUCA" design tokens in `tailwind.config.js`
- Module-specific colors (Google Classroom style)
- Attendance status colors (WCAG 2.1 AA compliant)
- Custom educational typography scales

**Theme:**
- Dark mode via `next-themes` (class-based)
- CSS variables for dynamic theming

## Platform Requirements

**Development:**
- Node.js (LTS recommended)
- pnpm package manager
- Git for version control

**Production:**
- Vercel (primary deployment target)
- Supabase (database and auth)
- Brazil timezone support (America/Sao_Paulo)

## Scripts

```bash
pnpm dev              # Start dev server with Turbopack
pnpm build            # Production build
pnpm start            # Start production server
pnpm lint             # Run ESLint
pnpm typecheck        # TypeScript type checking
pnpm seed:dev         # Seed development database
pnpm seed:clear       # Clear seed data
pnpm seed:superadmin  # Create superadmin user
pnpm deploy           # Deploy to Vercel production
pnpm deploy:preview   # Deploy to Vercel preview
```

---

*Stack analysis: 2026-01-16*
