# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a multi-project educational management system repository for the Municipality of Fronteira, Brazil. The repository contains multiple Next.js and React projects in various stages of development, targeting digital transformation of student registration, attendance tracking, and educational reporting.

**🎯 This project prioritizes Brazilian educational compliance and modern development practices.**

## Project Structure

### Primary Production Project:
- **`gestao_fronteira/`** - Next.js 15.5.3 + React 19.1.1 + Supabase 2.57.4 (80% MVP ready)
  - **PRIMARY PRODUCTION CANDIDATE** for municipal deployment
  - Complete Brazilian educational compliance implementation
  - Modern technology stack with performance optimization
  - Production-ready database schema with RLS policies

### Development Resources:
- **`i-educar-reference/`** - Brazilian education software reference implementation
  - Production-tested patterns for educational compliance
  - INEP, Educacenso, and government integration examples
  - Advanced security and multi-tenant architecture patterns
  - Used for pattern reference and compliance validation

### Documentation & Analysis:
- **`agent-findings/`** - Multi-agent analysis results and technical findings
- **`.agent-os/`** - Agent OS configuration and product documentation
- **`docs/`** - Project specifications and development documentation

## Technology Stack

### gestao_fronteira (Production Stack):
- **Frontend**: Next.js 15.5.3 with App Router + React 19.1.1
- **Database**: Supabase 2.57.4 (PostgreSQL + Auth + Storage + Real-time)
- **UI Library**: shadcn/ui + Radix UI + Tailwind CSS 3.4.17
- **Forms**: React Hook Form 7.62.0 + Zod 4.1.8 validation
- **State Management**: Zustand 5.0.8 + TanStack Query 5.87.4
- **Testing**: Jest + React Testing Library + Playwright
- **TypeScript**: 5.9.2 (strict mode)
- **Package Manager**: **bun** (MANDATORY - 3x faster than npm, required for all projects)

## Development Commands

### ⚠️ MANDATORY: Use bun for ALL package management operations

**CRITICAL: Claude Code MUST use bun exclusively. Never use npm, yarn, or pnpm. All commands should use bun.**

### gestao_fronteira (Primary Production Project):
```bash
cd gestao_fronteira/

# Package management (ALWAYS use bun, never npm/yarn/pnpm)
bun install             # Install dependencies (3x faster than npm)
bun add [package]       # Add new dependencies
bun remove [package]    # Remove dependencies
bun update              # Update dependencies

# Development
bun run dev             # Next.js dev server (http://localhost:3000)
bun run build           # Production build
bun run start           # Production server
bun run lint            # ESLint check
bun run typecheck       # TypeScript validation

# Testing
bun test               # Unit tests with Jest (fast execution)
bun test:watch         # Unit tests in watch mode
bun run test:e2e       # End-to-end tests with Playwright
bun run test:coverage  # Test coverage report

# Database
supabase start          # Start local Supabase
supabase db reset       # Reset local database
supabase db push        # Apply migrations to remote
supabase gen types typescript --project-id YOUR_PROJECT_ID
```

## Git Workflow Agent (@agent-git-workflow)

This repository integrates with Claude Code's git-workflow agent for streamlined development processes.

### Capabilities:
- **Branch Management**: Automatic feature branch creation and management
- **Commit Automation**: Intelligent commit message generation with proper formatting
- **PR Creation**: Automated pull request creation with comprehensive descriptions
- **Merge Operations**: Safe merge and rebase operations
- **Change Tracking**: Detailed change analysis and impact assessment

### Workflow Integration:
```bash
# The git-workflow agent automatically handles:
git checkout -b feature/new-attendance-workflow
git add .
git commit -m "feat(attendance): implement Abrir aula workflow

Authored-By: Myke Matos <myke.matos@gmail.com>"
git push -u origin feature/new-attendance-workflow
gh pr create --title "feat: Abrir aula workflow" --body "..."
```

### Best Practices:
- Conventional commits with Brazilian education context
- Automated change impact analysis
- Performance regression detection
- Brazilian compliance validation in PRs

## Brazilian Educational Standards & Compliance

### INEP (Instituto Nacional de Estudos e Pesquisas Educacionais) Integration

This project follows official Brazilian educational standards as defined by INEP:

#### Educacenso 2025 Compliance:
- **Data Collection Timeline**:
  - Stage 1 (Initial Enrollment): May 28 - July 31, 2025
  - Stage 2 (Student Status): February 2 - March 13, 2026
- **Required Data Points**:
  - Student individualized data (CPF, enrollment status, attendance)
  - Teacher classroom assignments and qualifications
  - Class structure and academic calendar alignment
  - Educational establishment information

#### Bolsa Família Program Integration:
- **Education Conditionalities**: Minimum school attendance tracking
- **Data Integration**: Real-time attendance monitoring for social program compliance
- **Frequency Monitoring**: Automated alerts for students below 80% attendance threshold
- **Unique Registration System**: Each student has official registration number for social program access

#### Key Compliance Requirements:
- **Non-retroactive Attendance**: "não existe o esquecer" - attendance cannot be modified after submission
- **Legal Documentation**: Attendance records are official legal documents ("único documento oficial")
- **Multi-school Isolation**: Complete data separation between educational institutions
- **Audit Trail**: Complete timestamp and user tracking for all educational data changes

### Validation & Business Rules

#### Brazilian Educational Data:
- **CPF Validation**: Proper formatting and digit verification
- **Brazilian Phone Numbers**: Mobile/landline format validation
- **Academic Calendar**: Date validations aligned with Brazilian school year
- **Attendance Calculations**: Minimum 75% attendance, alerting at 80% threshold
- **Grade Requirements**: Quarterly grading system with semester observations

#### Educational Domain Rules:
- Students can only be enrolled in one active class per academic year
- "Abrir aula" workflow mandatory before attendance marking
- Attendance can only be marked by assigned teachers
- Semester observations required for students below performance thresholds
- Role-based data access with school-level isolation

## Database Architecture (gestao_fronteira)

### Core Schema Structure:
**Location**: `gestao_fronteira/supabase/migrations/20250628095207_wild_block.sql`

```sql
-- Core Educational Entities
users         -- 5-role RBAC: admin, diretor, secretario, professor, responsavel
escolas       -- Schools with municipal multi-tenancy
alunos        -- Students with INEP compliance and Brazilian validation
responsaveis  -- Multi-guardian family structure support
turmas        -- Classes with teacher assignments and academic calendar
matriculas    -- Student enrollments with transfer tracking
frequencia    -- Daily attendance with legal immutability enforcement
notas         -- Quarterly grades with Brazilian educational standards
```

### Security & Compliance:
- **Row Level Security (RLS)**: School-based data isolation for municipal use
- **LGPD Compliance**: Data subject rights and consent management
- **Audit Trail**: Complete change tracking for legal compliance
- **Brazilian Validation**: CPF, phone, educational ID patterns

## System Architecture

### gestao_fronteira Application Structure:
```
gestao_fronteira/
├── app/                    # Next.js 15 App Router
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Main application
│   └── api/               # API routes and server actions
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── attendance/       # Attendance workflow components
│   ├── students/         # Student management
│   └── auth/             # Authentication components
├── lib/                  # Utilities and configurations
│   ├── supabase.ts       # Database client
│   ├── validation/       # Brazilian data validation
│   └── utils.ts          # Helper functions
├── hooks/                # Custom React hooks
├── types/                # TypeScript definitions
└── supabase/            # Database schema and migrations
```

### Core Educational Modules (Current Status):
1. **User Management**: ✅ 100% complete (5-role RBAC system)
2. **Student Registration**: ✅ 100% complete (INEP-compliant)
3. **Digital Diary/Attendance**: 🔶 85% complete ("Abrir aula" workflow in progress)
4. **Reports & Analytics**: 🔶 85% complete (enhanced reporting planned)

## Development Guidelines

### Constitutional Principles

This project follows strict constitutional principles:

#### 1. Educational Domain Focus
- All development must align with Brazilian educational system requirements
- Attendance tracking is the critical legal document ("único documento oficial")
- Non-retroactive attendance marking is mandatory ("não existe o esquecer")
- Multi-school data isolation with Row Level Security (RLS)

#### 2. Technology Standards
- TypeScript strict mode across all projects
- React Hook Form + Zod validation for Brazilian data (CPF, phone)
- shadcn/ui components for consistent design
- Supabase for database, authentication, and real-time features
- Use gestao_fronteira as primary foundation (80% MVP ready)

#### 3. Quality Gates
- Performance: Dashboard < 3s, attendance < 1s per student
- Mobile-responsive design for teacher tablet/phone use
- 100% attendance record immutability after save
- All 5 user roles (admin, diretor, secretario, professor, responsavel)

### Code Style:
- **TypeScript**: Strict mode enabled across all projects
- **ESLint**: Consistent configuration with educational domain rules
- **Components**: shadcn/ui for consistency, custom components for domain logic
- **Validation**: Zod schemas for Brazilian educational data (CPF, phone, etc.)

### Component Organization Principles:
```typescript
// High Reusability - Use across features
components/ui/           // shadcn/ui base components
components/auth/         // Authentication & authorization
components/layout/       // Navigation, headers, sidebars

// Feature-Specific - Domain-focused components
components/attendance/   // "Abrir aula" workflow, frequency marking
components/students/     // Registration, enrollment, transfers
components/reports/      // Analytics, exports, government compliance

// Brazilian Compliance - Specialized validation
lib/validation/         // CPF, phone, educational ID validation
lib/brazilian-standards/ // INEP, Educacenso, Bolsa Família patterns
```

## Testing Strategy with Playwright MCP Tools

### Comprehensive Testing Framework

This project implements a multi-layered testing approach using Playwright MCP tools for thorough quality assurance:

#### 1. User Experience Verification
- **End-to-End Workflows**: Complete user journeys from login to task completion
- **Accessibility Testing**: WCAG 2.1 AA compliance verification
- **Cross-browser Compatibility**: Testing across Chrome, Firefox, Safari
- **Responsive Design**: Mobile, tablet, and desktop viewport testing

#### 2. Quality Assurance Tests
- **Performance Testing**: Page load times, API response times
- **Visual Regression**: Screenshot comparisons for UI consistency
- **Form Validation**: Brazilian data validation (CPF, phone, dates)
- **Error Handling**: Graceful error states and user feedback

#### 3. App Functionality Correctness
- **Attendance Workflow**: Complete "Abrir aula" process testing
- **Student Registration**: Full CRUD operations with validation
- **Role-based Access**: Permission testing for all 5 user roles
- **Data Persistence**: Database operations and RLS policy enforcement

#### 4. Stress Testing
- **Load Testing**: Concurrent user simulations
- **Data Volume Testing**: Large class sizes and bulk operations
- **Network Conditions**: Slow connection and offline scenarios
- **Memory Usage**: Performance under extended use

### Playwright MCP Integration

```bash
# Run comprehensive test suite
bun run test:e2e                    # Full end-to-end tests
bun run test:accessibility          # Accessibility compliance
bun run test:performance            # Performance benchmarks
bun run test:stress                 # Load and stress tests

# Specific testing scenarios
bun run test:attendance             # Attendance workflow tests
bun run test:roles                  # Role-based access tests
bun run test:mobile                 # Mobile responsiveness
```

### Test Automation with Claude Code:
- **Automated Test Generation**: AI-powered test case creation
- **Visual Regression Detection**: Automatic screenshot comparisons
- **Performance Monitoring**: Continuous performance regression detection
- **Brazilian Compliance Testing**: Educational domain-specific test scenarios

## Changelog Tracking & Time Estimation

### Development Metrics

This project maintains detailed development tracking for accurate project management:

#### Time Estimation Framework:
- **Feature Development**:
  - Small features (UI updates): 2-4 hours
  - Medium features (new components): 1-2 days
  - Large features (workflow changes): 3-5 days
  - Brazilian compliance features: +25% time buffer

#### Changelog Management:
```markdown
## [Version] - YYYY-MM-DD

### Added
- New features with time invested
- Brazilian compliance enhancements
- Performance improvements

### Changed
- Modified workflows and components
- Updated dependencies and security patches

### Fixed
- Bug fixes with root cause analysis
- Performance optimizations with metrics

### Time Investment
- Development: X hours
- Testing: Y hours
- Documentation: Z hours
- Total: XYZ hours
```

#### Development Velocity Tracking:
- **Velocity Metrics**: Story points per sprint with actual time correlation
- **Complexity Indicators**: Brazilian education requirements complexity scoring
- **Risk Assessment**: Time buffers for compliance and integration challenges
- **Learning Curve**: New technology adoption time tracking

### Automated Time Tracking:
- Git commit analysis for actual development time
- PR review time and iteration cycles
- Testing and bug fix time correlation
- Documentation and compliance verification time

## GitHub Actions & PR Review Automation

### Automated CI/CD Pipeline

```yaml
# .github/workflows/pr-review.yml
name: PR Review & Quality Gates

on:
  pull_request:
    branches: [master, develop]

jobs:
  quality-gates:
    runs-on: ubuntu-latest
    steps:
      - name: Code Quality
        run: |
          bun run lint
          bun run typecheck
          bun run test

      - name: Brazilian Compliance Check
        run: |
          bun run test:compliance
          bun run validate:cpf-patterns

      - name: Performance Testing
        run: |
          bun run test:performance
          bun run audit:bundle-size

      - name: Security Audit
        run: |
          bun audit
          bun run security:rls-policies
```

### Automated PR Reviews:
- **Code Quality Gates**: ESLint, TypeScript, and test coverage requirements
- **Brazilian Compliance**: Automatic validation of educational data patterns
- **Performance Regression**: Bundle size and runtime performance monitoring
- **Security Scanning**: Dependency vulnerabilities and RLS policy validation
- **Documentation Updates**: Automatic CLAUDE.md updates for significant changes

### Review Automation Features:
- **Educational Domain Validation**: Brazilian education workflow compliance
- **Accessibility Checks**: WCAG 2.1 AA compliance verification
- **Mobile Responsiveness**: Tablet and phone interface validation
- **Database Migration Review**: Schema changes and RLS policy impacts

## Reusable Components

### High Reusability (use across projects):
- `AuthGuard` - Route protection with Brazilian role validation
- `LoginForm` - User authentication with CPF support
- `Sidebar` - Navigation with educational module structure
- `AttendanceGrid` - Touch-friendly attendance marking interface
- `CPFInput` - Brazilian CPF validation and formatting
- `BrazilianPhoneInput` - Phone number validation and formatting
- All shadcn/ui components (forms, tables, dialogs, etc.)

### Medium Reusability (adapt when using):
- `StudentForm` - Student registration with INEP compliance
- `ClassSelector` - Class/turma selection with academic calendar
- `UserCreateForm` - Admin user management with role validation
- `AttendanceReport` - Frequency reports with Bolsa Família integration

## Performance Considerations

### Database:
- Indexes on foreign keys and query patterns already implemented
- RLS policies optimized for school-based filtering
- Real-time subscriptions for live attendance updates
- INEP data export optimization for large datasets

### Frontend:
- **Bundle Size**: Code splitting configured in Next.js projects
- **Loading States**: Skeleton components for educational workflows
- **Caching**: React Query with 5-minute stale time for educational data
- **Mobile**: Touch-friendly interface optimized for classroom tablets
- **Offline Support**: Service worker for attendance marking in poor connectivity

## Export & Reporting

### Available Libraries:
```json
// All projects support these export formats
"jspdf": "^2.5.1",           // PDF generation for official reports
"jspdf-autotable": "^3.8.2", // PDF tables for attendance reports
"xlsx": "^0.18.5",           // Excel export for INEP integration
"recharts": "^2.12.7"        // Charts for educational analytics
```

### Report Types:
- **INEP Compliance Reports**: Educacenso-ready data exports
- **Bolsa Família Integration**: Attendance compliance reports
- **Frequency Reports**: Class and individual student attendance
- **Active Search Reports**: At-risk students (below 80% attendance)
- **Academic Performance**: Grade and progression analysis
- **Official Documentation**: Legal compliance and audit reports

## Environment Configuration

### Required Environment Variables:
```bash
# Supabase Configuration (all projects)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database (local development)
DATABASE_URL=postgresql://postgres:password@localhost:54322/postgres

# Brazilian Education APIs
INEP_API_KEY=your_inep_api_key
EDUCACENSO_INTEGRATION_TOKEN=your_token

# Performance Monitoring
PERFORMANCE_MONITORING_KEY=your_key
```

### Development Setup:
1. **Install bun globally** (REQUIRED):
   ```bash
   # Windows
   powershell -c "irm bun.sh/install.ps1 | iex"

   # macOS/Linux
   curl -fsSL https://bun.sh/install | bash
   ```
2. Clone repository and choose target project
3. Install dependencies (`bun install`) - NEVER use npm/yarn/pnpm
4. Copy `.env.example` to `.env.local` and configure Supabase
5. Run `supabase start` for local database
6. Apply migrations: `supabase db push`
7. Start development server with `bun run dev`

## Development Workflow with Agent OS

### Available Specialized Agents:

#### Core Development Agents:
- **`@agent-codebase-analyzer`** - Comprehensive codebase analysis and architecture review
- **`@agent-git-workflow`** - Automated git operations, branch management, and PR creation
- **`@agent-design-review`** - UI/UX review with accessibility and performance testing
- **`@agent-nextjs-edu-brazil-dev`** - Brazilian educational system development specialist

#### Agent OS Native Workflow:
```bash
# 1. Analysis and Planning
@agent-codebase-analyzer    # Understand current implementation status

# 2. Development
@agent-nextjs-edu-brazil-dev # Implement Brazilian compliance features

# 3. Quality Assurance
@agent-design-review        # UI/UX validation and accessibility testing

# 4. Deployment
@agent-git-workflow         # Automated git operations and PR creation
```

### Key Agent Capabilities:
- **Brazilian Compliance**: INEP, Educacenso, LGPD implementation patterns
- **Performance Optimization**: Database queries, bundle size, mobile responsiveness
- **Security Enhancement**: RLS policies, multi-school data isolation
- **Workflow Automation**: Git operations with educational context awareness

## Production Readiness Status

### Current Implementation (gestao_fronteira):
- **User Management**: ✅ 100% complete (5-role RBAC with RLS)
- **Student Registration**: ✅ 100% complete (INEP-compliant with Brazilian validation)
- **Digital Diary/Attendance**: 🔶 85% complete (needs "Abrir aula" workflow completion)
- **Reports & Analytics**: 🔶 85% complete (needs INEP integration enhancement)

### Path to 100% Production Ready (36.5 hours):
1. **Enhanced "Abrir aula" Workflow** (8h) - Three-phase attendance system
2. **Attendance Locking Mechanism** (4h) - Legal compliance enforcement
3. **Multi-Guardian Management** (8h) - Complex family structure support
4. **INEP Integration** (6h) - Government reporting system
5. **Comprehensive Audit System** (4h) - LGPD compliance
6. **Enhanced RLS Policies** (2h) - Multi-school security
7. **Brazilian Validation Library** (2.5h) - Government standards
8. **Advanced Reporting** (2h) - Analytics and exports

### Implementation Reference:
- **Patterns**: See `i-educar-reference/` for production-tested implementations
- **Analysis**: See `agent-findings/` for detailed technical specifications
- **Roadmap**: See `.agent-os/product/roadmap.md` for complete timeline

## Quick Start Development Workflow

```bash
# 1. Setup development environment
cd gestao_fronteira/
bun install
supabase start

# 2. Start development
bun run dev          # http://localhost:3000

# 3. Development cycle
bun run typecheck    # TypeScript validation
bun run lint         # Code quality
bun run test         # Unit tests

# 4. Ready for production
bun run build        # Production build
bun run test:e2e     # End-to-end tests
```

## Changelog Management & Documentation Requirements

### Mandatory Changelog Documentation

**Every change to the codebase MUST be documented in CHANGELOG.md** following the Keep a Changelog format:

```markdown
# CHANGELOG.md

## [Unreleased]

### Added
- New features with detailed description and impact
- Brazilian compliance enhancements with legal references
- Performance improvements with metrics

### Changed
- Modified workflows and components with reasoning
- Updated dependencies with security implications
- Enhanced user interfaces with accessibility improvements

### Fixed
- Bug fixes with root cause analysis
- Performance optimizations with before/after metrics
- Security patches with vulnerability descriptions

### Implementation Details
- Development time invested (actual hours)
- Testing coverage and validation approach
- Breaking changes and migration requirements
```

### Changelog Standards

**Required Information for Each Entry:**
- **Impact Assessment**: How the change affects users and system performance
- **Brazilian Compliance**: Legal and regulatory implications
- **Time Investment**: Actual development and testing hours
- **Dependencies**: External library or system changes
- **Migration Notes**: Steps required for existing deployments

**Change Categories:**
- **Feature**: New educational functionality or workflow
- **Enhancement**: Improvements to existing features
- **Compliance**: Brazilian educational law or LGPD requirements
- **Performance**: Speed, memory, or efficiency optimizations
- **Security**: Authentication, authorization, or data protection
- **Infrastructure**: Database, deployment, or configuration changes

### Integration with Development Workflow

```bash
# Before any commit
1. Update CHANGELOG.md with changes
2. Include time investment tracking
3. Document compliance implications
4. Add performance impact notes

# Example changelog entry
## [2025-09-20] - Enhanced Attendance System

### Added
- Multi-guardian management system (8h development)
- INEP integration with government code validation (6h development)
- Enhanced "Abrir aula" workflow with three-phase process (8h development)

### Changed
- Attendance locking mechanism now enforces "não existe o esquecer" principle
- Database schema enhanced with 4 new tables for compliance
- Performance improved: attendance marking now <1s per student

### Fixed
- Retroactive attendance modification vulnerability (legal compliance)
- Mobile interface touch targets now meet accessibility standards
- LGPD consent management granularity improved

### Implementation Details
- Total time investment: 36.5 hours over 10 working days
- Database migration required: enhanced_attendance_and_guardian_management.sql
- Breaking changes: Multi-guardian API requires client updates
- Performance impact: 85% improvement in database query optimization
```

## Development Principles

### Core Requirements:
1. **Brazilian Educational Compliance**: INEP standards, LGPD data protection, "não existe o esquecer" principle
2. **Performance Standards**: Dashboard < 3s, attendance marking < 1s per student
3. **Security Architecture**: RLS policies with school-based multi-tenancy
4. **Mobile-Responsive Design**: Tablet-optimized for classroom environments
5. **Comprehensive Testing**: Unit, integration, and E2E testing with Playwright

### Quality Gates:
- TypeScript strict mode with comprehensive type coverage
- ESLint and code quality validation
- Brazilian data validation (CPF, phone, educational IDs)
- Accessibility compliance (WCAG 2.1 AA)
- Performance regression testing

### Documentation Standards:
- **CHANGELOG.md**: Required for all changes with time investment tracking
- **Code Comments**: Brazilian compliance context and business rules
- **API Documentation**: Government integration and educational workflows

**Focus**: Leverage `gestao_fronteira` as the production foundation with 80% MVP completion. Prioritize Brazilian educational domain compliance and municipal deployment readiness.