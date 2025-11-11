# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a multi-project educational management system repository for the Municipality of Fronteira, Brazil. The repository contains multiple Next.js and React projects in various stages of development, targeting digital transformation of student registration, attendance tracking, and educational reporting.

**🎯 This project prioritizes Brazilian educational compliance and modern development practices.**

## Project Structure

### Primary Production Project:
- **`gestao_fronteira/`** - Next.js 15.5.3 + React 18.2.0 + Supabase 2.57.4 (90% Production-Ready ✅)
  - **PRIMARY PRODUCTION CANDIDATE** for municipal deployment
  - **All 6 critical bugs RESOLVED** (as of 2025-01-11)
  - Complete Brazilian educational compliance implementation
  - Modern technology stack with performance optimization
  - Production-ready database schema with RLS policies
  - **Remaining work**: 36.5 hours for 100% (see BUGS-ANALYSIS.md)

### Documentation & Analysis:
- **`docs/`** - Project specifications and development documentation
- **`docs/archive/`** - Historical analysis and completed session logs
- **`gestao_fronteira/BUGS-ANALYSIS.md`** - **SINGLE SOURCE OF TRUTH** for project status

## Technology Stack

### gestao_fronteira (Production Stack):
- **Frontend**: Next.js 15.5.3 with App Router + React 18.2.0
- **Database**: Supabase 2.57.4 (PostgreSQL + Auth + Storage + Real-time)
  - **⚠️ CRITICAL**: Database access is through **Supabase MCP** only
  - **DO NOT** use local Supabase CLI commands (`supabase start`, `supabase db push`, etc.)
  - All database operations (migrations, queries, schema changes) must use **MCP tools**
  - Available MCP tools: `mcp__supabase__apply_migration`, `mcp__supabase__execute_sql`, `mcp__supabase__list_tables`
- **UI Library**: shadcn/ui + Radix UI + Tailwind CSS 3.3.3
- **Forms**: React Hook Form 7.53.0 + Zod 3.23.8 validation
- **State Management**: Zustand 4.4.7 + TanStack Query 5.17.9
- **Testing**: Jest 30.2.0 + React Testing Library 16.3.0 + Playwright 1.55.1
- **TypeScript**: 5.2.2 (strict mode)
- **Package Manager**: **pnpm** (fast, disk-efficient package manager)

## MCP Servers Configuration

This project uses the following MCP servers (configured in `.mcp.json`):

### Active MCP Servers:
1. **Supabase MCP** (`@supabase/mcp-server-supabase`)
   - **MANDATORY** for all database operations
   - Project reference: SUPABASE-PROJECT-REF
   - Handles migrations, SQL queries, table operations

2. **Chrome DevTools MCP** (`chrome-devtools-mcp`)
   - **MANDATORY** for UI/UX validation and testing
   - Real browser automation and performance profiling
   - See detailed workflow documentation below

3. **shadcn-ui MCP** (`@jpisnice/shadcn-ui-mcp-server`)
   - Component generation and documentation
   - shadcn/ui best practices and patterns
   - Use for creating new UI components

4. **Context7 MCP** (`@upstash/context7-mcp`)
   - Documentation and code pattern lookup
   - Framework-specific guidance
   - Use for technical documentation needs

### MCP Server Usage Priority:
1. **Database operations** → Always use Supabase MCP
2. **UI/UX validation** → Always use Chrome DevTools MCP
3. **Component creation** → Prefer shadcn-ui MCP
4. **Documentation lookup** → Use Context7 MCP

## Development Commands

### gestao_fronteira (Primary Production Project):
```bash
cd gestao_fronteira/

# Package management (using pnpm)
pnpm install             # Install dependencies
pnpm add [package]       # Add new dependencies
pnpm remove [package]    # Remove dependencies
pnpm update              # Update dependencies

# Development
pnpm dev                 # Next.js dev server (http://localhost:3000)
pnpm build               # Production build
pnpm start               # Production server
pnpm lint                # ESLint check
pnpm typecheck           # TypeScript validation

# Testing
pnpm test                # Unit tests with Jest
pnpm test:watch          # Unit tests in watch mode
pnpm test:e2e            # End-to-end tests with Playwright
pnpm test:e2e:ui         # Playwright tests with UI
pnpm test:coverage       # Test coverage report

# Database (via Supabase MCP - DO NOT use CLI commands)
# Use MCP tools instead:
# - mcp__supabase__apply_migration: Apply database migrations
# - mcp__supabase__execute_sql: Run SQL queries
# - mcp__supabase__list_tables: List database tables
# - mcp__supabase__generate_typescript_types: Generate TypeScript types

# Seeding (development only)
pnpm seed:dev            # Seed development data
pnpm seed:clear          # Clear development data
pnpm seed:superadmin     # Create superadmin user
```

## UI/UX Quality Assurance com Chrome DevTools MCP

### 🎯 Filosofia Central: TDD com Foco em UX

**PRIORIDADE MÁXIMA:** A qualidade do código (limpeza e testes) e a experiência do usuário (UI/UX) são a prioridade máxima do projeto.

### Fluxo de Trabalho Obrigatório

1. **Test-Driven Development (TDD)**
   - Antes de implementar qualquer nova funcionalidade ou fluxo de usuário, **primeiro escreva os testes de ponta a ponta (E2E)** focados no comportamento
   - Testes devem validar o fluxo de usuário, não detalhes de implementação

2. **Gestão de Código**
   - Sempre crie uma nova branch para funcionalidades ou correções (`feature/*` ou `fix/*`)
   - **NUNCA** faça push diretamente para a branch main

### Chrome DevTools MCP: Ferramenta Unificada de QA

**O Chrome DevTools MCP fornece visão visual completa da UI, debugging profundo, e performance profiling - tudo em uma única ferramenta integrada.**

**Versão:** `chrome-devtools-mcp@latest`
**Status:** Production-ready

#### Quando Usar (OBRIGATÓRIO):

Sempre que você:
- ✅ Criar uma nova página
- ✅ Alterar o front-end existente
- ✅ Implementar um novo fluxo de usuário
- ✅ Modificar estilos ou layout
- ✅ Adicionar componentes visuais
- ✅ Otimizar performance
- ✅ Preparar deploy para produção

**VOCÊ DEVE usar o Chrome DevTools MCP** para validação completa de UI/UX.

#### Verificações Essenciais de UI/UX

O Chrome DevTools MCP deve garantir **em todas as páginas e links**:

1. **Responsividade**
   - Boa aparência no desktop (1920x1080, 1366x768)
   - Boa aparência no mobile (375x667, 414x896)
   - Boa aparência no tablet (768x1024, 1024x768)
   - Teste com `resize_page` do Chrome DevTools MCP

2. **Contraste de Cores e Acessibilidade**
   - Verifique contraste usando DevTools (inspeção computada)
   - Não utilize combinações ruins (ex: fonte escura em fundo escuro)
   - Garantir conformidade WCAG 2.1 AA
   - Lighthouse audits automatizados

3. **Formatação e Profissionalismo**
   - Sem quebras de linha inesperadas
   - Sem desalinhamentos ou elementos sobrepostos
   - Sem textos truncados ou cortados
   - Aparência profissional e polida

4. **Funcionalidade Completa**
   - Todos os links funcionam
   - Todos os botões respondem
   - Formulários validam corretamente
   - Mensagens de erro são claras e úteis

5. **Performance**
   - LCP (Largest Contentful Paint) < 2.5s
   - FPS (Frames Per Second) > 30
   - Sem memory leaks
   - Network requests otimizados

### Workflow 1: Validação UI/UX Padrão (90% dos casos)

**Use este workflow para:** Mudanças de UI, novos componentes, alterações de estilo, novos fluxos de usuário

#### Passo 1: Validação Visual
```bash
# 1. Navegue para a página
mcp__chrome_devtools__navigate_page(url: "http://localhost:3000/sua-pagina")

# 2. Capture screenshot desktop
mcp__chrome_devtools__take_screenshot(filename: "page-desktop.png")

# 3. Teste responsividade mobile
mcp__chrome_devtools__resize_page(width: 375, height: 667)
mcp__chrome_devtools__take_screenshot(filename: "page-mobile.png")

# 4. Teste responsividade tablet
mcp__chrome_devtools__resize_page(width: 768, height: 1024)
mcp__chrome_devtools__take_screenshot(filename: "page-tablet.png")
```

#### Passo 2: Validação Funcional
```bash
# 1. Verifique console para erros JavaScript
mcp__chrome_devtools__list_console_messages()

# 2. Analise network requests (status codes, timing)
mcp__chrome_devtools__list_network_requests()

# 3. Capture accessibility snapshot
mcp__chrome_devtools__take_snapshot()
```

#### Passo 3: Critérios de Aprovação
- ✅ Screenshots responsivos OK (desktop, mobile, tablet)
- ✅ Console sem errors/warnings
- ✅ Network requests retornam 2xx (200, 201, 204)
- ✅ Accessibility snapshot estruturado corretamente
- ✅ Todos links e botões interativos funcionam

**Se TODOS critérios atendidos:** ✅ PRONTO - Commit em feature branch

### Workflow 2: Performance Profiling (10% dos casos)

**Use este workflow para:** Antes de produção, página com lentidão, otimização de bundle, investigação de memory leaks

#### Passo 1: Baseline Visual
Execute **Workflow 1** completo primeiro.

#### Passo 2: Emulation de Condições Adversas
```bash
# 1. Simule rede lenta (Slow 3G)
mcp__chrome_devtools__emulate_network(throttlingOption: "Slow 3G")

# 2. Simule CPU lento (4x throttling)
mcp__chrome_devtools__emulate_cpu(throttlingRate: 4)
```

#### Passo 3: Performance Tracing
```bash
# 1. Inicie gravação de trace com reload automático
mcp__chrome_devtools__performance_start_trace(reload: true, autoStop: true)

# 2. Pare gravação (se autoStop: false)
mcp__chrome_devtools__performance_stop_trace()
```

#### Passo 4: Análise de Insights
```bash
# 1. Analise Largest Contentful Paint (LCP)
mcp__chrome_devtools__performance_analyze_insight(insightName: "LCPBreakdown")

# 2. Analise Document Latency
mcp__chrome_devtools__performance_analyze_insight(insightName: "DocumentLatency")

# 3. Verifique console para erros profundos
mcp__chrome_devtools__list_console_messages()
```

#### Passo 5: Network Deep Dive (se necessário)
```bash
# 1. Liste todas requisições
mcp__chrome_devtools__list_network_requests()

# 2. Inspecione requisição problemática em detalhe
mcp__chrome_devtools__get_network_request(url: "https://api.exemplo.com/endpoint-lento")
```

#### Passo 6: Critérios de Performance
- ✅ LCP < 2.5s (Core Web Vital)
- ✅ FPS > 30 (sem drops significativos)
- ✅ No memory leaks (heap size estável)
- ✅ Network requests < 1s (otimizados)
- ✅ Funciona em Slow 3G + CPU throttling

**Se TODOS critérios atendidos:** ✅ PRONTO - Performance validada para produção

### Ferramentas Disponíveis no Chrome DevTools MCP

#### 📋 Navegação (7 tools)
```typescript
navigate_page(url: string, timeout?: number)
navigate_page_history(navigate: "back" | "forward")
list_pages()
new_page(url: string)
close_page(pageIdx: number)
select_page(pageIdx: number)
wait_for(text?: string, textGone?: string, time?: number)
```

#### 🎯 Interações (7 tools)
```typescript
click(uid: string, dblClick?: boolean)
fill(uid: string, value: string)
fill_form(elements: Array<{uid, value}>)
hover(uid: string)
drag(from_uid: string, to_uid: string)
upload_file(uid: string, filePath: string)
handle_dialog(action: "accept" | "dismiss", promptText?: string)
```

#### 📸 Visual Testing (2 tools)
```typescript
take_screenshot(filename?: string, fullPage?: boolean, uid?: string)
take_snapshot() // Accessibility tree
```

#### 🔍 Debugging (4 tools)
```typescript
list_console_messages(onlyErrors?: boolean)
list_network_requests(resourceTypes?: Array, pageIdx?: number, pageSize?: number)
get_network_request(url: string)
evaluate_script(function: string, args?: Array)
```

#### ⚡ Performance (3 tools)
```typescript
performance_start_trace(reload?: boolean, autoStop?: boolean)
performance_stop_trace()
performance_analyze_insight(insightName: string)
```

#### 🌐 Emulation (3 tools)
```typescript
resize_page(width: number, height: number)
emulate_cpu(throttlingRate: 1-20) // 1 = normal, 20 = 20x slower
emulate_network(throttlingOption: "Slow 3G" | "Fast 3G" | "Slow 4G" | "Fast 4G")
```

### Debugging Avançado

#### Contexto do Navegador
Em caso de bug de front-end que não consegue identificar apenas olhando o código:
1. Use `take_snapshot()` para capturar HTML renderizado e accessibility tree
2. Use `list_console_messages()` para capturar JavaScript errors com stack traces
3. Use `list_network_requests()` para identificar API calls falhando
4. Use `evaluate_script()` para inspecionar estado interno do DOM/JavaScript

#### Screenshots para Análise
- Utilize `take_screenshot()` com fullPage: true para documentar problemas visuais
- Compare before/after screenshots para validar fixes
- Use `take_screenshot(uid: "elemento-específico")` para focar em componentes

#### Performance Insights
Chrome DevTools MCP oferece análise automatizada de performance:
- **LCPBreakdown**: Identifica o que está atrasando o Largest Contentful Paint
- **DocumentLatency**: Analisa tempo de carregamento do documento
- **RenderBlocking**: Detecta recursos bloqueando renderização
- **SlowCSSSelector**: Identifica seletores CSS lentos

### Checklist de Qualidade UI/UX

Antes de considerar qualquer alteração de UI completa, verifique:

- [ ] Testes E2E criados com foco no fluxo de usuário
- [ ] Chrome DevTools MCP validou desktop, mobile, tablet (screenshots)
- [ ] Console limpo (sem errors/warnings)
- [ ] Network requests retornam 2xx (sem 4xx/5xx)
- [ ] Accessibility snapshot estruturado corretamente
- [ ] Contraste de cores validado (WCAG AA)
- [ ] Todos os links e botões funcionam
- [ ] Formulários validam corretamente
- [ ] Mensagens de erro são claras
- [ ] Screenshots documentam estado final
- [ ] Branch criada (não commit direto em main)

#### Checklist Performance (Antes de Produção):
- [ ] LCP < 2.5s (Largest Contentful Paint)
- [ ] FPS > 30 (sem drops significativos)
- [ ] No memory leaks (heap size estável)
- [ ] Network requests < 1s (otimizados)
- [ ] Funciona em Slow 3G + CPU throttling (4x)
- [ ] Performance insights analisados e otimizados

### ⚠️ Regras Críticas

1. **NUNCA** sugira alternativas de auth simplificada - sempre use MCP para logar
2. **SEMPRE** use Chrome DevTools MCP para validar UI (visual + funcional + performance)
3. **NUNCA** faça push direto para main sem validação UI/UX completa
4. **SEMPRE** priorize acessibilidade e experiência do usuário
5. **SEMPRE** execute Workflow 2 (Performance) antes de deploy em produção

---

## Git Workflow & Version Control

### Branch Strategy

- **Main Branch** (`main`): Production-ready code only
- **Feature Branches** (`feature/*`): New features and enhancements
- **Fix Branches** (`fix/*`): Bug fixes and corrections
- **NEVER** commit directly to `main` - always use pull requests

### Conventional Commits

All commits follow conventional commit format with Brazilian education context:

```bash
feat(attendance): implement Abrir aula workflow
fix(students): correct CPF validation for edge cases
perf(database): optimize RLS policies for attendance queries
docs(api): update student registration endpoint documentation
test(e2e): add Brazilian compliance validation tests

Authored-By: [Developer Name] <email@example.com>
```

**Commit Types:**
- `feat`: New feature or functionality
- `fix`: Bug fix
- `perf`: Performance improvement
- `refactor`: Code refactoring without behavior change
- `test`: Adding or updating tests
- `docs`: Documentation changes
- `chore`: Maintenance tasks (dependencies, config, etc.)

**Scopes (Brazilian Education Context):**
- `attendance`: Frequency/attendance system
- `students`: Student registration and management
- `schools`: School management
- `classes`: Class/turma management
- `reports`: Reporting and analytics
- `compliance`: INEP, LGPD, Educacenso compliance
- `database`: Schema, migrations, queries
- `auth`: Authentication and authorization

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
**Location**: `gestao_fronteira/supabase/migrations/`

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
│   ├── onboarding/        # New user setup wizard
│   ├── wizard/            # Multi-step onboarding flow
│   ├── actions/           # Server actions
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── attendance/       # Attendance workflow components
│   ├── students/         # Student management
│   ├── auth/             # Authentication components
│   ├── admin/            # Admin-specific components
│   ├── charts/           # Data visualization
│   ├── classes/          # Class management
│   ├── compliance/       # Brazilian compliance components
│   ├── dashboard/        # Dashboard widgets
│   ├── diary/            # Class diary components
│   ├── forms/            # Form components
│   └── identity/         # User identity components
├── lib/                  # Utilities and configurations
│   ├── supabase.ts       # Database client
│   ├── validation/       # Brazilian data validation
│   ├── api/              # API client functions
│   └── utils.ts          # Helper functions
├── hooks/                # Custom React hooks
├── types/                # TypeScript definitions
└── supabase/            # Database schema and migrations
```

### Core Educational Modules (Current Status - 90% Ready):
1. **User Management**: ✅ 100% complete (5-role RBAC system)
2. **Student Registration**: ✅ 100% complete (INEP-compliant)
3. **Onboarding Wizard**: ✅ 100% complete (6-step school setup)
4. **Digital Diary/Attendance**: ✅ 90% complete (core workflows functional, enhancements planned)
5. **Reports & Analytics**: ✅ 90% complete (basic reporting complete, INEP integration planned)

## Known Issues & Bug Tracking

**Current Status**: ✅ **All 6 Critical Bugs RESOLVED** (as of 2025-01-11)
**Production Readiness**: **90%**
**Remaining Work**: 36.5 hours for 100% (enhanced features)

### All Critical Bugs Fixed ✅:
1. ✅ **Login Redirect Race Condition** - FIXED (2025-01-11)
   - Profile wait logic with retry mechanism implemented

2. ✅ **React 19 Toaster setState Error** - FIXED
   - Dynamic import with SSR disabled already in place

3. ✅ **Delete Operations Not Working** - FIXED (2025-01-10)
   - RLS policies migration applied with explicit DELETE permissions

4. ✅ **`/dashboard/escolas` Blank Page** - FIXED (2025-01-11)
   - Corrected Supabase query syntax in schools API

5. ✅ **Invalid Tailwind Utility Warning** - RESOLVED
   - Confirmed as benign warning, no action needed

6. ✅ **Console Errors in Class Diary** - FIXED (2025-01-11)
   - Replaced 9 console.error calls with structured logger

**📋 For detailed bug analysis, fixes, and testing requirements:**
**See**: `gestao_fronteira/BUGS-ANALYSIS.md`

### Before Making Changes:
1. Read `gestao_fronteira/BUGS-ANALYSIS.md` for complete project status
2. Check if your work affects resolved bugs (regression risk)
3. Update BUGS-ANALYSIS.md if you discover new issues
4. Follow established patterns (logging, Supabase client, etc.)

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
components/admin/        // Administrative functions
components/classes/      // Class management
components/diary/        // Class diary and lesson planning

// Brazilian Compliance - Specialized validation
lib/validation/         // CPF, phone, educational ID validation
components/compliance/  // INEP, Educacenso, Bolsa Família components
```

## Testing Strategy

### Comprehensive Testing Framework

This project implements a multi-layered testing approach using Playwright for thorough quality assurance:

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

### Playwright Integration

```bash
# Run comprehensive test suite
pnpm test:e2e                    # Full end-to-end tests
pnpm test:e2e:ui                 # Playwright tests with UI
pnpm test:e2e:headed             # Run tests in headed mode

# Unit testing
pnpm test                        # Unit tests with Jest
pnpm test:watch                  # Unit tests in watch mode
pnpm test:coverage               # Test coverage report
```

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
"jspdf": "^3.0.3",           // PDF generation for official reports
"jspdf-autotable": "^5.0.2", // PDF tables for attendance reports
"xlsx": "0.18.5",            // Excel export for INEP integration
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

# Brazilian Education APIs (optional)
INEP_API_KEY=your_inep_api_key
EDUCACENSO_INTEGRATION_TOKEN=your_token

# Performance Monitoring (optional)
PERFORMANCE_MONITORING_KEY=your_key
```

### Development Setup:
1. **Install pnpm globally** (if not already installed):
   ```bash
   npm install -g pnpm
   ```
2. Clone repository and choose target project
3. Install dependencies with `pnpm install`
4. Copy `.env.example` to `.env.local` and configure Supabase
5. Start development server with `pnpm dev`
6. For database operations, use Supabase MCP tools (not CLI)

## Production Readiness Status

### Current Implementation (gestao_fronteira) - 90% Production-Ready ✅:
- **User Management**: ✅ 100% complete (5-role RBAC with RLS)
- **Student Registration**: ✅ 100% complete (INEP-compliant with Brazilian validation)
- **Onboarding Wizard**: ✅ 100% complete (6-step school initialization)
- **Digital Diary/Attendance**: ✅ 90% complete (core workflows functional, all bugs fixed)
- **Reports & Analytics**: ✅ 90% complete (basic reporting complete)
- **Bug Status**: ✅ All 6 critical bugs RESOLVED (2025-01-11)

### Path to 100% Production Ready (36.5 hours remaining):
1. **Enhanced "Abrir aula" Workflow** (8h) - Three-phase attendance system
2. **Attendance Locking Mechanism** (4h) - Legal compliance enforcement
3. **Multi-Guardian Management** (8h) - Complex family structure support
4. **INEP Integration** (6h) - Government reporting system
5. **Comprehensive Audit System** (4h) - LGPD compliance
6. **Enhanced RLS Policies** (2h) - Multi-school security
7. **Brazilian Validation Library** (2.5h) - Government standards
8. **Advanced Reporting** (2h) - Analytics and exports

### Implementation Reference:
- **Status Documentation**: See `gestao_fronteira/BUGS-ANALYSIS.md` for current status and fixes
- **Migration Guide**: See `gestao_fronteira/MIGRATION-GUIDE.md` for breaking changes
- **Change History**: See `gestao_fronteira/CHANGELOG.md` for version history

## Quick Start Development Workflow

```bash
# 1. Setup development environment
cd gestao_fronteira/
pnpm install

# 2. Start development
pnpm dev             # http://localhost:3000

# 3. Development cycle
pnpm typecheck       # TypeScript validation
pnpm lint            # Code quality
pnpm test            # Unit tests

# 4. Ready for production
pnpm build           # Production build
pnpm test:e2e        # End-to-end tests
```

## Changelog Management & Documentation Requirements

### Mandatory Changelog Documentation

**Every change to the codebase SHOULD be documented** following the Keep a Changelog format when appropriate for significant changes.

### Development Principles

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
- **Code Comments**: Brazilian compliance context and business rules
- **API Documentation**: Government integration and educational workflows
- **Bug Tracking**: Update BUGS-ANALYSIS.md for known issues

**Focus**: Leverage `gestao_fronteira` as the production foundation with 80% MVP completion. Prioritize Brazilian educational domain compliance and municipal deployment readiness.

# RULE 1: CHANGELOG.md - Document ALL Changes
BEFORE committing code, ALWAYS update /CHANGELOG.md:
Add entry under ## [Unreleased] in appropriate section:
Added: New features, new files, new systems
Changed: Modifications to existing functionality
Fixed: Bug fixes
Removed: Deleted features, deprecated code


# RULE 2: Communication Style
Be direct and concise.
You can use abbreviations for messages, to reduce token cost.
You can use emojis to condense messages.

# RULE 3: Task Tracking with TASKS.md
ALL active development tasks MUST be tracked in TASKS.md:

**When to update TASKS.md:**
- Starting a new multi-step feature or bug fix (add to "Pending" or "In Progress")
- Completing a task (move to "Completed" with ✅)
- Breaking down a large feature into subtasks
- Planning sprints/days of work

**Structure:**
```markdown
## In Progress
### DIA X: Feature Name
- [ ] Subtask 1
- [x] Subtask 2 (completed)

## Pending
### Next Feature
- [ ] Task list

## Completed
### Previous Feature ✅
- [x] All tasks done
```

**Workflow:**
1. Add new tasks to TASKS.md when starting work
2. Check off subtasks as you complete them
3. Move entire sections to "Completed" when done
4. Keep backlog items in "Backlog" section
5. Update TASKS.md BEFORE updating CHANGELOG.md for commits

**Benefits:**
- Session continuity (next session knows what's pending)
- Progress visibility for user
- Clear sprint planning (DIA 1, DIA 2, etc.)
- Complements TodoWrite (TASKS.md = long-term, TodoWrite = current session)