# Tech Stack

## Context

Global tech stack defaults for Agent OS projects, overridable in project-specific `.agent-os/product/tech-stack.md`.

**Primary Production Project**: `gestao_fronteira/` (Brazilian Educational Management System)

## Core Stack

- **App Framework**: Next.js 15.5.3 with App Router
- **Language**: TypeScript 5.9.2 (strict mode)
- **Runtime**: Node.js 22 LTS
- **Package Manager**: **bun** (MANDATORY - 3x faster than npm, required for all projects)
- **Primary Database**: Supabase 2.57.4 (PostgreSQL + Auth + Storage + Real-time)
- **Frontend Framework**: React 19.1.1
- **Build Tool**: Next.js built-in (Turbopack for dev)
- **Import Strategy**: ES modules with Next.js App Router

## UI/UX Stack

- **CSS Framework**: Tailwind CSS 3.4.17
- **UI Components**: shadcn/ui + Radix UI
- **Icons**: Lucide React components
- **Font Provider**: Google Fonts
- **Font Loading**: Self-hosted for performance (Next.js font optimization)

## State Management & Forms

- **State Management**: Zustand 5.0.8 + TanStack Query 5.87.4
- **Forms**: React Hook Form 7.62.0 + Zod 4.1.8 validation
- **Validation**: Zod schemas with Brazilian data patterns (CPF, phone, educational IDs)

## Brazilian Educational Compliance

- **Domain Focus**: Brazilian educational system (INEP, Educacenso, LGPD)
- **Validation Standards**: CPF, Brazilian phone numbers, academic calendar
- **Security**: Row Level Security (RLS) with school-based multi-tenancy
- **Audit Trail**: Complete change tracking for legal compliance
- **Performance**: Dashboard < 3s, attendance < 1s per student

## Testing & Quality

- **Unit Testing**: Jest + React Testing Library
- **E2E Testing**: Playwright with educational workflow scenarios
- **Type Checking**: TypeScript strict mode
- **Linting**: ESLint with educational domain rules
- **Package Manager Commands**: All via `bun` (never npm/yarn/pnpm)

## Deployment & Infrastructure

- **Application Hosting**: Vercel (optimal for Next.js)
- **Database Hosting**: Supabase (PostgreSQL + Auth + Real-time)
- **Database Backups**: Daily automated via Supabase
- **Asset Storage**: Supabase Storage
- **CDN**: Built-in Vercel Edge Network
- **CI/CD Platform**: GitHub Actions
- **CI/CD Trigger**: Push to main/develop branches
- **Quality Gates**: TypeScript, ESLint, tests must pass
- **Production Environment**: main branch
- **Staging Environment**: develop branch

## Package Manager Requirements

**CRITICAL**: Use `bun` exclusively for all package operations:
```bash
bun install             # Install dependencies (3x faster than npm)
bun add [package]       # Add new dependencies
bun remove [package]    # Remove dependencies
bun update              # Update dependencies
bun run dev             # Development server
bun run build           # Production build
bun test               # Run tests
```

**NEVER use**: npm, yarn, or pnpm - bun is mandatory for performance and consistency.
