# Sistema de Gestão Educacional - Fronteira-MG

**Master Documentation - Single Source of Truth**
**Versão**: 1.0.0
**Última Atualização**: 2025-11-18
**Status**: 90% Production-Ready

---

## 📖 Table of Contents

### [Chapter 1: Project Overview](#chapter-1-project-overview)
- [1.1 Project Introduction](#11-project-introduction)
- [1.2 AI Assistant Instructions](#12-ai-assistant-instructions)
- [1.3 Agent Instructions](#13-agent-instructions)

### [Chapter 2: Status & Progress](#chapter-2-status--progress)
- [2.1 Bug Status & Analysis](#21-bug-status--analysis)
- [2.2 Version History (Changelog)](#22-version-history-changelog)
- [2.3 Roadmap & Next Steps](#23-roadmap--next-steps)

### [Chapter 3: Architecture](#chapter-3-architecture)
- [3.1 Services Layer](#31-services-layer)
- [3.2 Validation System](#32-validation-system)
- [3.3 Code Organization (Barrel Exports)](#33-code-organization-barrel-exports)
- [3.4 React Hooks](#34-react-hooks)
- [3.5 Identity Components](#35-identity-components)

### [Chapter 4: Product & Business](#chapter-4-product--business)
- [4.1 Mission & Vision](#41-mission--vision)
- [4.2 Product Roadmap](#42-product-roadmap)
- [4.3 Technology Stack](#43-technology-stack)

### [Chapter 5: Testing & QA](#chapter-5-testing--qa)
- [5.1 Auth Testing Documentation](#51-auth-testing-documentation)
- [5.2 UI/UX Validation (Chrome DevTools)](#52-uiux-validation-chrome-devtools)
- [5.3 Manual Test Results](#53-manual-test-results)

### [Chapter 6: Deployment & Operations](#chapter-6-deployment--operations)
- [6.1 Deployment Guide](#61-deployment-guide)
- [6.2 Migration Guide](#62-migration-guide)

### [Chapter 7: Code Guidelines](#chapter-7-code-guidelines)
- [7.1 Chrome DevTools Workflow](#71-chrome-devtools-workflow)
- [7.2 AI Development Patterns](#72-ai-development-patterns)

### [Chapter 8: Archives](#chapter-8-archives)
- [8.1 Session Reports](#81-session-reports)
- [8.2 Historical Analysis](#82-historical-analysis)
- [8.3 Assessment Reports](#83-assessment-reports)

---

# Chapter 1: Project Overview

## 1.1 Project Introduction

### Sistema de Gestão Escolar - Fronteira/MG

Sistema completo de gestão educacional desenvolvido para a **Secretaria Municipal de Educação de Fronteira/MG**. Esta plataforma moderniza a administração escolar municipal através de uma solução digital integrada que atende às necessidades específicas da educação brasileira.

**Status**: 90% Production-Ready | **Tech**: Next.js 15.5.3 + React 19.1.1 + Supabase 2.57.4

### 🎯 Objetivo Principal

Digitalizar e otimizar todos os processos da rede municipal de ensino, proporcionando:
- **Gestão eficiente** de alunos, escolas e professores
- **Conformidade legal** com a legislação educacional brasileira
- **Acessibilidade mobile** para professores em campo
- **Relatórios automatizados** para tomada de decisões

### ✨ Funcionalidades Principais

**Gestão de Usuários (100% Completo)**
- 5 tipos de usuário: Admin, Diretor, Secretário, Professor, Responsável
- Autenticação segura com Supabase Auth
- Controle de permissões baseado em roles (RBAC)
- Multi-tenancy com isolamento por escola (RLS)

**Gestão de Alunos (100% Completo)**
- Cadastro completo com dados pessoais e familiares
- Validação de CPF e telefones brasileiros
- Upload de fotos com otimização automática
- Histórico acadêmico completo
- Necessidades especiais e observações

**Administração Escolar (100% Completo)**
- Cadastro de escolas da rede municipal
- Gestão de turmas com capacidade e horários
- Atribuição de professores às disciplinas
- Controle de matrículas por ano letivo

**Frequência Digital (85% Completo)**
- Chamada eletrônica otimizada para tablets
- Workflow "Abrir aula" (em desenvolvimento)
- Registros imutáveis após salvamento
- Conformidade legal brasileira

**Relatórios e Analytics (85% Completo)**
- Dashboard executivo com métricas em tempo real
- Relatórios de frequência automáticos
- Monitoramento de 80% de presença (busca ativa)
- Exportação PDF/Excel de relatórios

### 🛠️ Stack Tecnológica

**Frontend**: Next.js 15.5.3 (App Router) + React 19.1.1 + TypeScript 5.9.2 + Tailwind CSS 3.4.17 + shadcn/ui

**Backend**: Supabase 2.57.4 (PostgreSQL + Auth + Storage) com Row Level Security (RLS)

**Forms & Validation**: React Hook Form 7.53.0 + Zod 3.23.8 + Validações brasileiras (CPF, telefone, CEP)

**State Management**: Zustand 4.4.7 + TanStack Query 5.17.9 + TanStack Table

**Reporting**: jsPDF + ExcelJS + Recharts

**Development Tools**: ESLint + Prettier + Turbopack

For complete README content, see: [README.md](./README.md)

## 1.2 AI Assistant Instructions

> **Content from CLAUDE.md will be referenced here**
>
> See: [CLAUDE.md](./CLAUDE.md) for AI assistant-specific instructions.
>
> This file is kept separate as an entry point for Claude Code.

## 1.3 Agent Instructions

> **Content from AGENTS.md will be referenced here**
>
> See: [AGENTS.md](./AGENTS.md) for agent-specific workflows and patterns.
>
> This file is kept separate as an entry point for OpenSpec agents.

---

# Chapter 2: Status & Progress

## 2.1 Bug Status & Analysis

**Current Status**: ✅ All 6 Critical Bugs RESOLVED (as of 2025-01-11)
**Production Readiness**: 90%
**Remaining Work**: 36.5 hours for enhanced features

### Resolved Bugs Summary

1. ✅ **Login Redirect Race Condition** - Profile wait logic implemented
2. ✅ **React 19 Toaster setState Error** - Dynamic import with SSR disabled
3. ✅ **Delete Operations RLS** - Migration applied with explicit DELETE policies
4. ✅ **/dashboard/escolas Blank Page** - Fixed incorrect Supabase query syntax
5. ✅ **Invalid Tailwind Utility** - Confirmed as benign warning
6. ✅ **Console Errors in Class Diary** - Replaced 9 console.error with logger

### Production Readiness Breakdown

- **User Management**: 100% complete (5-role RBAC)
- **Student Registration**: 100% complete (INEP-compliant)
- **Onboarding Wizard**: 100% complete (6-step flow)
- **Digital Diary/Attendance**: 90% complete (core functional, enhancements planned)
- **Reports & Analytics**: 90% complete (basic reporting complete)

### Remaining for 100% Production

1. Enhanced "Abrir aula" Workflow (8h)
2. Attendance Locking Mechanism (4h)
3. Multi-Guardian Management (8h)
4. INEP Integration (6h)
5. Comprehensive Audit System (4h)
6. Enhanced RLS Policies (2h)
7. Brazilian Validation Library (2.5h)
8. Advanced Reporting (2h)

For complete bug analysis and fixes, see: [BUGS-ANALYSIS.md](./BUGS-ANALYSIS.md)

## 2.2 Version History (Changelog)

**Latest Version**: 1.0.0 (2025-01-11)
**Change Model**: Semantic Versioning + Keep a Changelog format

### Recent Changes (2025-01-11)

**Added**:
- Centralized Supabase client factory
- Structured logging system with feature context
- Enhanced onboarding wizard (6-step flow)
- Login retry logic (5 attempts, 500ms intervals)
- Complete RLS policies with DELETE operations
- Audit trail system with IP tracking

**Fixed**:
- Login redirect race condition
- React 19 Toaster compatibility
- /dashboard/escolas blank page
- Delete operations not working
- Console errors (replaced with logger)

**Changed** (BREAKING):
- Removed `/onboarding` route → use `/wizard/onboarding`
- Centralized Supabase client imports
- Replaced console calls with structured logger (19 instances)

For complete version history, see: [CHANGELOG.md](./CHANGELOG.md)

## 2.3 Roadmap & Next Steps

### Short-term (Next 36.5h)

**Priority 1: Enhanced Attendance System**
- Three-phase "Abrir aula" workflow
- Automatic 18:00 session locking
- Brazilian compliance enforcement

**Priority 2: Government Integration**
- INEP Educacenso 2025 compliance
- Bolsa Família monitoring (80% threshold)
- NIS validation (Módulo 11)

**Priority 3: Data Protection**
- LGPD consent management
- Data subject rights implementation
- Comprehensive audit logging

### Medium-term

- Multi-guardian family structure support
- Enhanced RLS policies for municipal multi-tenancy
- Advanced reporting and analytics dashboard
- Performance optimization (<3s dashboard, <1s attendance)

### Long-term

- Mobile app for parents (React Native)
- Offline-first architecture for rural areas
- AI-powered attendance predictions
- Integration with national educational databases

For complete roadmap and next steps, see: [NEXT-STEPS.md](./NEXT-STEPS.md)

---

# Chapter 3: Architecture

## 3.1 Services Layer

**Purpose**: Centralized business logic services for attendance, bulk operations, immutability, and workflow management.

### Core Services

**Attendance Workflow Service** (`lib/services/attendance-workflow.ts`)
- Manages complete "Abrir aula" flow
- Validates session state transitions
- Coordinates with attendance marking

**Attendance Immutability Service** (`lib/services/attendance-immutability.ts`)
- Enforces "não existe o esquecer" principle
- Prevents retroactive modifications
- Maintains legal compliance for attendance records

**Attendance Bulk Operations** (`lib/services/attendance-bulk-operations.ts`)
- Batch processing for large class sizes
- Optimized database queries
- Transaction management for data integrity

**Attendance Locking Service** (`lib/services/attendance-locking.ts`)
- Automatic session locking at 18:00
- Prevents late modifications
- Audit trail for lock events

### Planned Services

**Audit Service** (`lib/services/planned/audit-service.ts`)
- Comprehensive audit logging
- LGPD compliance tracking
- User action history

**Attendance History** (`lib/services/planned/attendance-history.ts`)
- Historical attendance queries
- Trend analysis
- Performance metrics

For complete services documentation, see:
- [lib/services/README.md](./lib/services/README.md)
- [lib/services/SERVICES_ANALYSIS.md](./lib/services/SERVICES_ANALYSIS.md)

## 3.2 Validation System

**Purpose**: Centralized Brazilian educational data validation with Zod schemas.

### Validation Structure

**Location**: `lib/validation/`

**Brazilian Validators** (`lib/validators/brazilian.ts`)
- CPF validation with digit verification
- Brazilian phone numbers (mobile/landline)
- NIS (social program ID) validation
- INEP codes (11-digit educational IDs)

**School Validators** (`lib/validation/schools-validation.ts`)
- School registration data
- Multi-tenant isolation rules
- Capacity and resource validation

**Student Validators** (various)
- Personal data with Brazilian standards
- Guardian relationships
- Enrollment status transitions

### Integration Examples

```typescript
import { validateCPF, validateBrazilianPhone } from '@/lib/validators/brazilian'
import { schoolRegistrationSchema } from '@/lib/validation/schools-validation'

// CPF validation
if (!validateCPF('123.456.789-00')) {
  throw new Error('CPF inválido')
}

// School registration with Zod
const result = schoolRegistrationSchema.parse(formData)
```

For complete validation documentation, see:
- [lib/validation/README.md](./lib/validation/README.md)
- [lib/validation/VALIDATION_GUIDE.md](./lib/validation/VALIDATION_GUIDE.md)

## 3.3 Code Organization (Barrel Exports)

**Purpose**: Simplified imports through barrel exports for cleaner codebase.

### Barrel Export Pattern

**Benefits**:
- Single import path for related modules
- Easier refactoring
- Better tree-shaking
- Cleaner import statements

**Example**:
```typescript
// Before (multiple imports)
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form } from '@/components/ui/form'

// After (barrel export)
import { Button, Input, Form } from '@/components/ui'
```

**Implemented In**:
- `components/ui/index.ts` - shadcn/ui components
- `lib/validators/index.ts` - Brazilian validators
- `lib/api/index.ts` - API client functions

For complete barrel export implementation, see:
- [BARREL_EXPORTS_IMPLEMENTATION.md](./BARREL_EXPORTS_IMPLEMENTATION.md) (archived)

## 3.4 React Hooks

**Purpose**: Custom React hooks for shared logic and state management.

### Core Hooks

**Authentication** (`hooks/use-auth.ts`)
- User authentication state
- Role-based access control
- Auto-redirect on auth changes

**Attendance Workflow** (`lib/hooks/use-attendance-workflow.ts`)
- "Abrir aula" state machine
- Session lifecycle management
- Real-time updates

**Attendance Locking** (`lib/hooks/use-attendance-locking.ts`)
- Lock status monitoring
- Auto-lock at 18:00 detection
- Lock/unlock permissions

**Attendance History** (`lib/hooks/use-attendance-history.ts`)
- Historical attendance queries
- Filtering and pagination
- Export functionality

**Compliance Warnings** (`hooks/use-compliance-warnings.ts`)
- Bolsa Família 80% threshold detection
- INEP compliance alerts
- Real-time student monitoring

For complete hooks documentation, see:
- [hooks/README.md](./hooks/README.md)
- [lib/hooks/README.md](./lib/hooks/README.md)

## 3.5 Identity Components

**Purpose**: Municipal branding and visual identity for Fronteira-MG.

### Branding Assets

**Logo Components**:
- `components/identity/Logo.tsx` - Primary municipal logo
- `components/identity/LogoSimple.tsx` - Simplified version
- `components/identity/Brasao.tsx` - Official coat of arms

**Color Palette** (tailwind.config.js):
```javascript
colors: {
  fronteira: {
    blue: '#1D4ED8',    // Primary (brasão blue)
    green: '#16A34A',   // Secondary (brasão green)
    gold: '#F59E0B',    // Accent (brasão gold)
  }
}
```

**Assets Location**: `public/identity/`
- brasao-fronteira.svg - Vector coat of arms
- favicon.ico - Browser favicon
- logo-prefeitura.svg - City hall logo

For complete identity guidelines, see:
- [components/identity/README.md](./components/identity/README.md)
- [public/identity/README.md](./public/identity/README.md)

---

# Chapter 4: Product & Business

## 4.1 Mission & Vision

**Mission**: Modernizar a gestão educacional municipal através de tecnologia acessível, promovendo eficiência administrativa e melhores resultados educacionais para os alunos de Fronteira-MG.

**Vision**: Ser referência nacional em transformação digital educacional para municípios de pequeno porte, demonstrando que tecnologia de qualidade é acessível e transformadora.

**Core Values**:
- **Simplicidade**: Interface intuitiva para todos os perfis de usuário
- **Compliance**: 100% aderente às normas brasileiras (INEP, LGPD, Educacenso)
- **Performance**: Sistema rápido mesmo em conexões lentas
- **Acessibilidade**: Design mobile-first para professores em campo

For complete mission statement, see: [product/mission.md](./product/mission.md)

## 4.2 Product Roadmap

### Q1 2025 (Current) - Foundation Release
- ✅ User management (100%)
- ✅ Student registration (100%)
- ✅ School administration (100%)
- 🔄 Digital attendance (90%)
- 🔄 Reports & analytics (90%)

### Q2 2025 - Government Integration
- INEP Educacenso 2025 compliance
- Bolsa Família monitoring
- LGPD compliance toolkit
- Enhanced RLS policies

### Q3 2025 - Advanced Features
- Multi-guardian support
- Mobile app for parents
- Offline-first capabilities
- AI-powered insights

### Q4 2025 - Scale & Optimization
- Multi-municipality support
- Performance enhancements
- Advanced analytics dashboard
- API for third-party integrations

For complete roadmap, see: [product/roadmap.md](./product/roadmap.md)

## 4.3 Technology Stack

See Chapter 1.1 for complete tech stack overview, or [product/tech-stack.md](./product/tech-stack.md) for detailed justifications and architecture decisions.

---

# Chapter 5: Testing & QA

## 5.1 Auth Testing Documentation

**Testing Framework**: Playwright 1.55.1 + Jest 30.2.0 + React Testing Library 16.3.0

### Test Coverage

**E2E Auth Tests** (tests/e2e/auth/):
- Login flow with retry logic (5 attempts, 500ms intervals)
- Profile race condition handling
- Role-based redirection (admin, diretor, professor)
- Session persistence across page reloads
- Logout and session cleanup

**Test Results**:
- ✅ FASE 7 COMPLETE (all 7 phases passed)
- ✅ Login retry logic functioning
- ✅ Profile wait mechanism working
- ✅ No more loading spinner stuck issues

For complete auth testing documentation, see:
- [tests/e2e/auth/INDEX.md](./tests/e2e/auth/INDEX.md)
- [tests/e2e/auth/QUICK-START.md](./tests/e2e/auth/QUICK-START.md)
- [tests/e2e/auth/TEST-SUMMARY.md](./tests/e2e/auth/TEST-SUMMARY.md)

## 5.2 UI/UX Validation (Chrome DevTools)

**Philosophy**: Test-Driven Development (TDD) with UX focus

**Mandatory Checks** (using Chrome DevTools MCP):
1. **Responsiveness**: Desktop (1920x1080), Mobile (375x667), Tablet (768x1024)
2. **Color Contrast**: WCAG 2.1 AA compliance
3. **Functionality**: All links/buttons working
4. **Performance**: LCP < 2.5s, FPS > 30

**Workflow**:
- **90% of cases**: Standard UI/UX validation (screenshots + console + network)
- **10% of cases**: Performance profiling (trace + insights + optimization)

For complete Chrome DevTools workflow, see:
- [CHROME-DEVTOOLS-VALIDATION-GUIDE.md](./CHROME-DEVTOOLS-VALIDATION-GUIDE.md)
- Chapter 7.1 (Chrome DevTools Workflow) below

## 5.3 Manual Test Results

**Mobile Responsiveness** (__tests__/manual/mobile-responsiveness-check.md):
- ✅ iPhone SE (375x667) - All pages functional
- ✅ iPad (768x1024) - Optimized for teacher tablets
- ✅ Desktop (1920x1080) - Full feature set

**Abrir Aula Workflow** (__tests__/manual/abrir-aula-workflow-completion-summary.md):
- ✅ Session creation working
- ✅ Student list loading correctly
- 🔄 Attendance marking (needs bulk operations enhancement)
- 🔄 Session locking (planned for Q1 2025)

For complete manual test results, see archived documentation.

---

# Chapter 6: Deployment & Operations

## 6.1 Deployment Guide

**Platform**: Vercel (recommended) with Supabase backend

**Production URL**: `sme.fronteira.mg.gov.br`
**Development URL**: `dev.sme.fronteira.mg.gov.br`

### Quick Deploy

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy to production
vercel --prod

# 3. Configure environment variables in Vercel dashboard
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Performance Targets

- **Dashboard**: < 3s load time
- **Attendance Marking**: < 1s per student
- **Reports Generation**: < 5s

### Security Headers

All configured in `vercel.json` and `next.config.js`:
- CSP (Content Security Policy)
- CORS (Cross-Origin Resource Sharing)
- HSTS (HTTP Strict Transport Security)

For complete deployment guide, see: [DEPLOYMENT.md](./DEPLOYMENT.md)

## 6.2 Migration Guide

**Breaking Changes** (v1.0.0 - 2025-01-11):

1. **Removed /onboarding route** → Use `/wizard/onboarding`
2. **Centralized Supabase clients** → Import from `@/lib/supabase/server` or `@/lib/supabase/client`
3. **Structured logging** → Replace `console.*` with `logger.*`

**Migration Steps**:
```typescript
// Before
import { createClient } from '@supabase/supabase-js'
console.error('Error occurred', error)

// After
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
logger.error('Error occurred', error, { feature: 'my-feature' })
```

For complete migration guide, see: [MIGRATION-GUIDE.md](./MIGRATION-GUIDE.md)

---

# Chapter 7: Code Guidelines

## 7.1 Chrome DevTools Workflow

**TDD Philosophy**: Write E2E tests FIRST, implement features SECOND.

**Mandatory Validation** for all UI changes:
1. Take screenshots (desktop, mobile, tablet)
2. Check console messages (no errors/warnings)
3. Verify network requests (2xx status codes)
4. Capture accessibility snapshot
5. Validate links and interactions

**Workflow 1** (90% of cases): Visual + Functional validation
**Workflow 2** (10% of cases): Performance profiling before production

See Chapter 5.2 above or [CHROME-DEVTOOLS-VALIDATION-GUIDE.md](./CHROME-DEVTOOLS-VALIDATION-GUIDE.md) for complete workflows.

## 7.2 AI Development Patterns

**Specialist Agent Prompts** for AI-assisted development:

**Available Agents**:
- **Code Architect**: Designs feature architecture
- **Code Explorer**: Deep codebase analysis
- **Code Reviewer**: Bug detection and code quality
- **Brazilian Compliance Implementer**: INEP, LGPD, Bolsa Família features
- **Database Performance Optimizer**: N+1 queries, indexes, virtual scrolling
- **Performance Optimizer**: Bundle size, Core Web Vitals
- **Security Hardening Specialist**: Vulnerabilities, CSRF, secrets management

**Usage Pattern**:
```markdown
I need to implement [feature] following Brazilian compliance standards.
Please use the [agent-name] agent to [specific task].
```

For complete specialist agent documentation, see: [SPECIALIST-AGENTS-PROMPTS.md](./SPECIALIST-AGENTS-PROMPTS.md)

---

# Chapter 8: Archives

## 8.1 Session Reports

**SUPERSEDED** - Historical session reports from development sessions.

> **Archived from:**
> - claudedocs/CODE_IMPROVEMENTS_2025-01-11.md (2025-01-11)
> - claudedocs/TROUBLESHOOTING-SUMMARY-2025-01-11.md (2025-01-11)
>
> **Purpose**: Historical documentation of bug fixing and troubleshooting sessions.
> **Note**: Content is superseded by Chapter 2.1 (Bug Status & Analysis).

## 8.2 Historical Analysis

**SUPERSEDED** - Historical validation centralization report.

> **Archived from:**
> - VALIDATION_CENTRALIZATION_REPORT.md
>
> **Purpose**: Historical analysis of validation system consolidation.
> **Note**: Current validation architecture is documented in Chapter 3.2.

## 8.3 Assessment Reports

**SUPERSEDED** - Historical single-school readiness assessment.

> **Archived from:**
> - SINGLE-SCHOOL-READINESS-ASSESSMENT.md (25K)
>
> **Purpose**: Assessment of single-school deployment readiness performed during development.
> **Note**: Current production status is documented in Chapter 2.1.

---

## Navigation Tips

- **Quick Links**: Use the Table of Contents at the top to jump to any section
- **Cross-References**: Look for "See Chapter X.Y" links throughout the document
- **Archives**: Historical content is in Chapter 8 with SUPERSEDED markers
- **Entry Points**:
  - For AI Assistants: Start with [CLAUDE.md](./CLAUDE.md)
  - For OpenSpec Agents: Start with [AGENTS.md](./AGENTS.md)
  - For Developers: Start with Chapter 1.1 (Project Introduction)

## Document Maintenance

This master documentation is maintained through the OpenSpec change workflow:
1. Changes to documentation should go through OpenSpec proposal
2. Updates are consolidated in this file during change archival
3. Individual source files may be deleted after consolidation
4. Git history preserves all original documentation

**Last Consolidated**: 2025-11-18 (organize-codebase-foundation)
**Next Review**: As needed for major releases or architectural changes
