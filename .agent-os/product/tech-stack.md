# Technical Stack

> Last Updated: 2025-09-16
> Version: 2.0.0 - Brazilian Educational Management System

## Application Framework

- **Framework:** Next.js 15.5.3 with App Router
- **Runtime:** React 19.1.1 with concurrent features
- **Language:** TypeScript 5.9.2 (strict mode enabled)
- **Build Tool:** Turbopack (development), Webpack (production)

## Database & Backend

- **Primary Database:** PostgreSQL via Supabase 2.57.4
- **Database Schema:** gestao_fronteira with Row Level Security (RLS)
- **Authentication:** Supabase Auth with JWT tokens
- **Real-time Features:** Supabase real-time subscriptions
- **File Storage:** Supabase Storage for student photos and documents

## Package Management

- **Package Manager:** npm (primary project: gestao_fronteira)
- **Import Strategy:** node (ES modules)

## Styling & UI

- **CSS Framework:** Tailwind CSS 3.4.17 with educational theme
- **UI Component Library:** shadcn/ui (Radix UI primitives)
- **Icon Library:** Lucide React 0.544.0
- **Fonts Provider:** Inter (Google Fonts)

## State Management & Data Fetching

- **Global State:** Zustand 5.0.8 for client-side state
- **Server State:** TanStack Query 5.87.4 for server state management
- **Form Handling:** React Hook Form 7.62.0
- **Validation:** Zod schemas for Brazilian data validation

## Brazilian-Specific Features

- **CPF Validation:** Custom algorithms for Brazilian taxpayer ID validation
- **Phone Formatting:** Brazilian phone number patterns (11) 99999-9999
- **CEP Integration:** Postal code address lookup via ViaCEP API
- **PDF Generation:** jsPDF 3.0.2 for official reports
- **Excel Export:** exceljs 4.4.0 for government compliance reports
- **Charts & Analytics:** recharts 3.2.0 for attendance visualization

## Development & Testing

- **Testing Framework:** Jest with React Testing Library
- **E2E Testing:** Playwright with accessibility testing
- **Visual Regression:** Playwright snapshots for Brazilian UI components
- **Linting:** ESLint with Brazilian educational domain rules
- **Type Checking:** TypeScript strict mode with Supabase generated types

## Mobile & Performance

- **Mobile Strategy:** Responsive design with tablet-first attendance interface
- **Performance Monitoring:** Built-in performance metrics for classroom usage
- **Offline Support:** Service Worker for attendance marking without internet
- **Bundle Optimization:** Code splitting and lazy loading for mobile performance

## Hosting & Infrastructure

- **Application Hosting:** Vercel (planned) or Supabase hosting
- **Database Hosting:** Supabase (managed PostgreSQL)
- **Asset Hosting:** Supabase Storage for student photos and documents
- **Deployment Solution:** Automated deployment via GitHub Actions

## Repository

- **Code Repository URL:** https://github.com/shishiv/SRE (current)
- **Primary Project:** gestao_fronteira/ (80% MVP ready)
- **Reference Architecture:** i-educar-reference/ (cloned from portabilis/i-educar)

## Development Environment

- **Local Database:** Supabase CLI with local development environment
- **Environment Variables:** Next.js environment configuration
- **Hot Reload:** Turbopack for instant development feedback
- **Database Migrations:** Supabase migration system
- **Type Generation:** Automated TypeScript types from Supabase schema

## Security & Compliance

- **Multi-tenancy:** School-based Row Level Security (RLS) policies
- **Audit Logging:** Complete change tracking for all educational data
- **LGPD Compliance:** Brazilian data protection law compliance
- **Session Management:** Secure JWT token handling via Supabase Auth
- **Input Validation:** Comprehensive Zod schemas for Brazilian educational data