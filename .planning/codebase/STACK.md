# Technology Stack

**Analysis Date:** 2026-01-18

## Languages

**Primary:**
- TypeScript 5.9.3 - Application code, types, validation
- JavaScript (ES2024) - Configuration files, build scripts

**Secondary:**
- SQL - Supabase database functions and migrations
- CSS - Tailwind CSS with custom design tokens

## Runtime

**Environment:**
- Node.js (version managed by pnpm)
- React 19.2.3 runtime

**Package Manager:**
- pnpm (primary)
- Lockfile: `pnpm-lock.yaml` (present, 350KB)
- npm lockfile also present: `package-lock.json` (legacy)

**Configuration:**
- `.npmrc` - pnpm configuration

## Frameworks

**Core:**
- Next.js 16.0.7 - Full-stack React framework with App Router
  - Turbopack enabled for dev (`next dev --turbo`)
  - Server Components (RSC) enabled
  - Server Actions enabled with allowed origins configured
  - React Strict Mode enabled

**UI Component Library:**
- shadcn/ui - Radix UI primitives with Tailwind styling
  - Configuration: `components.json`
  - Style: default
  - Components in: `components/ui/`

**State Management:**
- TanStack React Query 5.90.12 - Server state management
  - DevTools: `@tanstack/react-query-devtools` 5.91.1
  - Configuration: `lib/react-query.ts`
- Zustand 4.4.7 - Client state management

**Form Handling:**
- React Hook Form 7.68.0 - Form state management
- Zod 3.23.8 - Schema validation
- @hookform/resolvers 5.2.2 - Zod integration

**Testing:**
- Not detected in production dependencies
- Playwright test-results directory present

**Build/Dev:**
- Next.js built-in compiler
- @next/bundle-analyzer 16.0.7 - Bundle analysis (`ANALYZE=true`)
- tsx 4.21.0 - TypeScript script runner for seed scripts
- PostCSS 8.4.30 - CSS processing
- Autoprefixer 10.4.22 - CSS vendor prefixes

## Key Dependencies

**Critical:**
- `@supabase/ssr` 0.7.0 - Server-side Supabase client with cookie handling
- `@supabase/supabase-js` 2.87.1 - Supabase JavaScript client
- `next` 16.0.7 - Core framework
- `react` / `react-dom` 19.2.3 - UI library

**UI Components (Radix UI):**
- `@radix-ui/react-accordion` 1.2.0
- `@radix-ui/react-alert-dialog` 1.1.1
- `@radix-ui/react-avatar` 1.1.0
- `@radix-ui/react-checkbox` 1.1.1
- `@radix-ui/react-dialog` 1.1.1
- `@radix-ui/react-dropdown-menu` 2.1.1
- `@radix-ui/react-popover` 1.1.1
- `@radix-ui/react-select` 2.1.1
- `@radix-ui/react-tabs` 1.1.0
- `@radix-ui/react-toast` 1.2.1
- `@radix-ui/react-tooltip` 1.1.2
- Plus: label, separator, switch, toggle, toggle-group, slider, scroll-area, progress, radio-group, collapsible, slot

**Styling:**
- `tailwindcss` 3.3.3 - Utility-first CSS
- `tailwindcss-animate` 1.0.7 - Animation utilities
- `tailwind-merge` 2.5.2 - Class merging utility
- `class-variance-authority` 0.7.0 - Variant management
- `clsx` 2.1.1 - Conditional classes

**Date/Time:**
- `date-fns` 4.1.0 - Date manipulation
- `react-day-picker` 9.12.0 - Calendar picker

**Charts/Visualization:**
- `recharts` 3.5.1 - React charting library

**Document Generation:**
- `jspdf` 3.0.4 - PDF generation
- `jspdf-autotable` 5.0.2 - PDF table generation
- `exceljs` 4.4.0 - Excel file generation
- `file-saver` 2.0.5 - File download utility

**UI Utilities:**
- `lucide-react` 0.446.0 - Icon library
- `sonner` 2.0.7 - Toast notifications
- `cmdk` 1.0.0 - Command palette
- `vaul` 1.1.2 - Drawer component
- `@headlessui/react` 2.2.9 - Headless UI components
- `next-themes` 0.4.6 - Theme switching
- `input-otp` 1.2.4 - OTP input component
- `react-resizable-panels` 3.0.6 - Resizable panel layout

**Infrastructure:**
- `vercel` 48.12.1 (devDep) - Deployment CLI

## Configuration

**Environment:**
- `.env.local` - Local development environment
- `.env.production` - Production environment
- Required variables:
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
  - `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-only)
  - `NODE_ENV` - Environment mode
  - `PORT` - Server port (default: 3000)

**Build:**
- `next.config.js` - Next.js configuration
  - ESLint disabled during builds (MVP)
  - TypeScript errors ignored during builds (MVP)
  - Image optimization configured for Supabase storage
  - Security headers configured
  - Package imports optimized (lucide-react, date-fns, Radix, recharts)
- `tsconfig.json` - TypeScript configuration
  - Target: ES5
  - Module: ESNext with bundler resolution
  - Strict mode enabled
  - Path alias: `@/*` -> `./*`
- `tailwind.config.js` - Tailwind CSS configuration
  - Custom EDUCA design system colors
  - Module-specific color palette
  - Brazilian educational theme tokens
  - Custom animations and spacing
- `postcss.config.js` - PostCSS configuration
- `.eslintrc.json` - ESLint configuration
  - Extends: next/core-web-vitals, next/typescript
  - Custom rules for educational domain

**Deployment:**
- `vercel.json` - Vercel deployment configuration
  - Region: gru1 (Sao Paulo, Brazil)
  - Build command: `pnpm run build`
  - Install command: `pnpm install`
- `nixpacks.toml` - Alternative deployment config (Railway/Render)

**Component Library:**
- `components.json` - shadcn/ui configuration
  - RSC: enabled
  - TSX: enabled
  - CSS variables: enabled
  - Aliases configured for @/ paths

## Platform Requirements

**Development:**
- Node.js (LTS recommended)
- pnpm package manager
- Git for version control
- Supabase account (cloud or local)

**Production:**
- Vercel hosting (primary target)
- Supabase cloud database
- Region: South America (gru1 - Sao Paulo)
- CDN for static assets

## Scripts

```bash
pnpm dev           # Start dev server with Turbopack
pnpm build         # Production build
pnpm start         # Start production server
pnpm lint          # Run ESLint
pnpm typecheck     # TypeScript type checking
pnpm seed:dev      # Seed development database
pnpm seed:clear    # Clear seeded data
pnpm seed:superadmin # Create superadmin user
pnpm deploy        # Deploy to Vercel production
pnpm deploy:preview # Deploy to Vercel preview
```

## Type System

**Database Types:**
- Auto-generated from Supabase: `types/database.ts`
- Generation command: `supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts`
- Type helpers in `lib/supabase.ts` and `lib/supabase/server.ts`:
  - `Tables<T>` - Row type for table
  - `Inserts<T>` - Insert type for table
  - `Updates<T>` - Update type for table

**Validation Types:**
- Zod schemas in `lib/validation/`:
  - `brazilian.ts` - CPF, phone, CEP, INEP code validation
  - `brazilian-educational.ts` - Educational-specific validation
  - `attendance.ts` - Attendance validation
  - `students-validation.ts` - Student form schemas
  - `users-validation.ts` - User form schemas
  - `schools-validation.ts` - School form schemas

---

*Stack analysis: 2026-01-18*
