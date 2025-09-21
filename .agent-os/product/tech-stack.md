# Technical Stack

> Last Updated: 2025-09-20
> Version: 4.0.0 - Production Brazilian Educational Management System
> Analysis: Based on gestao_fronteira package.json and comprehensive codebase review

## Application Framework

- **Framework:** Next.js 15.5.3 with App Router and Turbopack
- **Runtime:** React 19.1.1 with concurrent features and server components
- **Language:** TypeScript 5.9.2 (strict mode enabled)
- **Build Tool:** Turbopack (development), SWC for production builds

## Database & Backend

- **Primary Database:** PostgreSQL via Supabase 2.57.4
- **Database Schema:** gestao_fronteira with Row Level Security (RLS)
- **Authentication:** Supabase Auth (@supabase/ssr 0.7.0) with JWT tokens
- **Real-time Features:** Supabase real-time subscriptions for live attendance
- **File Storage:** Supabase Storage for student photos and documents

## Package Management

- **Package Manager:** pnpm 9.12.0 (specified in package.json packageManager)
- **Node Version:** >=18.0.0 (engines specification)
- **Import Strategy:** ES modules with Next.js path aliases
- **Performance:** 3x faster installs, workspace support for multi-project repo

## Styling & UI

- **CSS Framework:** Tailwind CSS 3.4.17 with tailwindcss-animate 1.0.7
- **UI Component Library:** shadcn/ui (Complete Radix UI suite)
  - 25+ Radix components including accordion, dialog, select, tabs
  - Custom Brazilian educational theme with municipal identity
- **Icon Library:** Lucide React 0.544.0 (544 icons available)
- **Theme System:** next-themes 0.4.6 for dark/light mode support

## State Management & Data Fetching

- **Global State:** Zustand 5.0.8 for client-side state management
- **Server State:** TanStack Query 5.87.4 with devtools 5.87.4
- **Table Management:** TanStack Table 8.21.3 for complex data tables
- **Form Handling:** React Hook Form 7.62.0 with @hookform/resolvers 5.2.2
- **Validation:** Zod 4.1.8 for Brazilian data validation schemas

## Brazilian Educational Compliance Stack

- **Brazilian Document Validation:**
  - CPF, CNPJ validation with proper formatting
  - Brazilian phone number patterns
  - Educational ID validation (INEP codes)
- **INEP Integration:**
  - Government code management system
  - Educacenso export generation
  - MEC standards compliance validation
- **LGPD Compliance:**
  - Granular consent management
  - Data subject rights implementation
  - Comprehensive audit trail system
- **Attendance Legal Compliance:**
  - "Não existe o esquecer" enforcement
  - Automatic locking at 18:00 daily
  - Immutable record architecture
- **Multi-Guardian Support:**
  - Complex family structure management
  - Responsibility types (legal, educational, emergency)
  - Priority-based hierarchy with LGPD consent

## Brazilian Reporting & Export Libraries

- **PDF Generation:** jsPDF 3.0.2 with jspdf-autotable 5.0.2
- **Excel Export:** exceljs 4.4.0 for government-compliant spreadsheets
- **Charts & Analytics:** recharts 3.2.0 for attendance analytics
- **Date Handling:** date-fns 4.1.0 with Brazilian locale support

## UI Enhancement Libraries

- **Date Picker:** react-day-picker 9.9.0 with Brazilian calendar
- **Notifications:** sonner 2.0.7 for toast notifications
- **OTP Input:** input-otp 1.4.2 for secure authentication
- **Carousel:** embla-carousel-react 8.6.0 for image galleries
- **Panels:** react-resizable-panels 3.0.6 for dashboard layouts
- **Mobile Drawer:** vaul 1.1.2 for mobile-optimized interfaces
- **Command Palette:** cmdk 1.1.1 for quick actions

## Development & Testing

- **Testing Framework:** Jest with React Testing Library
- **E2E Testing:** Playwright with accessibility testing
- **Visual Regression:** Playwright snapshots for Brazilian UI components
- **Linting:** ESLint 9.35.0 with eslint-config-next 15.5.3
- **Type Checking:** TypeScript strict mode with Supabase generated types
- **Bundle Analysis:** @next/bundle-analyzer 15.5.3

## Utility Libraries

- **Styling Utilities:**
  - clsx 2.1.1 for conditional classes
  - tailwind-merge 3.3.1 for class merging
  - class-variance-authority 0.7.1 for component variants
- **Scroll Areas:** @radix-ui/react-scroll-area 1.2.10
- **Node Types:** @types/node 24.4.0, @types/react 19.1.13, @types/react-dom 19.1.9

## Mobile & Performance

- **Mobile Strategy:** Responsive design with tablet-first attendance interface
- **Performance Targets:**
  - Dashboard loading: <3 seconds
  - Attendance marking: <1 second per student
  - Report generation: <10 seconds
- **Offline Support:** Service Worker for attendance marking without internet
- **Bundle Optimization:**
  - Next.js automatic code splitting
  - Lazy loading for Brazilian educational modules
  - Tree shaking with ES modules

## Hosting & Infrastructure

- **Application Hosting:** Vercel (optimized) or Supabase hosting
- **Database Hosting:** Supabase (managed PostgreSQL with RLS)
- **Asset Hosting:** Supabase Storage for student photos and documents
- **CDN:** Vercel Edge Network for Brazilian users
- **Deployment:** Automated deployment via GitHub Actions

## Repository Architecture

- **Code Repository:** Multi-project structure with gestao_fronteira as primary
- **Primary Project:** gestao_fronteira/ (80% MVP ready, production candidate)
- **Reference Architecture:** Comprehensive i-educar patterns integrated
- **Package Manager:** Unified pnpm workspace for all projects

## Development Environment

- **Local Database:** Supabase CLI with local development environment
- **Environment Configuration:** Next.js environment variables
- **Hot Reload:** Turbopack for instant development feedback
- **Database Migrations:** Supabase migration system with versioning
- **Type Generation:** Automated TypeScript types from Supabase schema

## Enhanced Security & Compliance

- **Advanced Multi-tenancy:**
  - Enhanced RLS policies with granular permissions
  - School-based data isolation at database level
  - Municipal oversight with aggregated reporting
- **Comprehensive Audit System:**
  - Complete operation tracking with timestamps
  - Security incident monitoring and alerting
  - LGPD compliance verification
- **Immutability Enforcement:**
  - Database triggers for automatic attendance locking
  - API-level validation for non-retroactive changes
  - Comprehensive audit trail for all modifications
- **Brazilian Legal Compliance:**
  - Full INEP, Educacenso alignment
  - Educational law compliance verification
  - Government reporting automation
- **Session Security:**
  - JWT with role-based access control
  - Automatic session management
  - School-based permission scoping

## Performance Monitoring & Optimization

- **Real-time Metrics:** Built-in performance monitoring for classroom usage
- **Database Optimization:** Indexed queries for Brazilian educational patterns
- **Caching Strategy:** TanStack Query with 5-minute stale time for educational data
- **Mobile Optimization:** Touch-friendly interfaces with 44px+ touch targets
- **Bundle Size:** Optimized for Brazilian mobile networks and classroom tablets