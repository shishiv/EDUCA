# EDUCA - Stack Tecnológico

## Princípios de Design

### Foco no Professor
O professor é o usuário principal. Todas as decisões técnicas priorizam:
- **Velocidade:** Frequência em < 60 segundos
- **Responsividade:** Funciona em tablets, celulares e desktops
- **Simplicidade:** Interface intuitiva, sem curva de aprendizado
- **Confiabilidade:** Funciona mesmo com conexão instável

### Dispositivos Suportados
- Tablets (escola)
- Celulares pessoais (professores)
- Computadores desktop (secretaria)
- **Meta:** Experiência consistente em todos

---

## Frontend

### Framework
- **Next.js 15.5.3** - React framework with App Router for server components, streaming, and optimal performance
- **React 18.2.0** - UI library with concurrent features and Suspense support
- **TypeScript 5.2.2** - Strict mode enabled for type safety across the codebase

### UI Components
- **shadcn/ui** - Accessible, customizable component library built on Radix UI
- **Radix UI** - Headless UI primitives for accessibility compliance
- **Tailwind CSS 3.3.3** - Utility-first CSS framework with custom municipal color palette
- **Lucide React** - Icon library for consistent visual language

### Forms & Validation
- **React Hook Form 7.53.0** - Performant form handling with minimal re-renders
- **Zod 3.23.8** - Schema validation with TypeScript inference
- **Custom Brazilian Validators** - CPF, phone, NIS, INEP code validation

### State Management
- **Zustand 4.4.7** - Lightweight state management for global UI state
- **TanStack Query 5.17.9** - Server state management with caching and synchronization
- **TanStack Table** - Headless table utilities for data grids

### Data Visualization
- **Recharts 2.12.7** - Composable charting library for dashboards
- **jsPDF 3.0.3** - PDF generation for reports
- **jspdf-autotable 5.0.2** - PDF table formatting
- **xlsx 0.18.5** - Excel export for government reporting

## Backend & Database

### Platform
- **Supabase 2.57.4** - Open source Firebase alternative providing:
  - PostgreSQL database with Row Level Security
  - Authentication with email/password and social providers
  - Storage for file uploads (student photos)
  - Real-time subscriptions for live updates

### Database Architecture
- **PostgreSQL** - Relational database with JSONB support
- **Row Level Security (RLS)** - Multi-tenant data isolation by school
- **Database Functions** - Server-side logic for complex operations

### Security
- **5-Role RBAC** - Admin, Diretor, Secretario, Professor, Responsavel
- **RLS Policies** - Enforced at database level for all tables
- **Audit Logging** - IP tracking and action history
- **LGPD Compliance** - Data protection and consent management

## Testing

### Unit Testing
- **Jest 30.2.0** - Test runner with TypeScript support
- **React Testing Library 16.3.0** - Component testing focused on user behavior
- **jest-environment-jsdom** - Browser environment simulation

### End-to-End Testing
- **Playwright 1.55.1** - Cross-browser testing automation
- **Chrome DevTools MCP** - Visual testing and performance profiling
- **Accessibility Testing** - WCAG 2.1 AA compliance verification

### Quality Assurance
- **Responsive Testing** - Desktop, tablet, mobile viewport verification
- **Performance Testing** - Core Web Vitals monitoring (LCP < 2.5s)
- **Visual Regression** - Screenshot comparison for UI consistency

## Development Tools

### Package Management
- **pnpm** - Fast, disk-efficient package manager (required)

### Code Quality
- **ESLint** - Linting with Next.js and TypeScript rules
- **Prettier** - Code formatting with consistent style
- **TypeScript Strict Mode** - Maximum type safety enforcement

### Development Experience
- **Turbopack** - Fast bundler for development (Next.js built-in)
- **Hot Module Replacement** - Instant feedback during development
- **VS Code / Cursor** - Recommended editors with TypeScript support

### Logging & Monitoring
- **Structured Logger** - Centralized logging with feature context
- **Error Boundaries** - Graceful error handling in React components
- **Performance Monitoring** - Dashboard and attendance operation timing

## Deployment

### Hosting Options
- **Vercel** - Recommended for Next.js with automatic deployments
- **Self-Hosted** - Node.js server with PM2 process management

### Database
- **Supabase Cloud** - Managed PostgreSQL with automatic backups
- **Connection Pooling** - PgBouncer for production workloads

### Environment Configuration
```bash
# Required Environment Variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional
DATABASE_URL=postgresql://...
INEP_API_KEY=your_inep_key
```

## MCP Servers (Desenvolvimento)

### Integrações Ativas
1. **Supabase MCP** - Operações de banco sem CLI local
2. **Chrome DevTools MCP** - Validação UI/UX e profiling de performance
3. **shadcn-ui MCP** - Geração de componentes e boas práticas
4. **Context7 MCP** - Documentação e lookup de padrões
5. **Sequential Thinking MCP** - Raciocínio estruturado para problemas complexos

## Architecture Decisions

### Why This Stack

**Next.js 15 + App Router**
- Server components reduce client bundle size
- Streaming enables progressive page loading
- Built-in API routes simplify backend

**Supabase over Custom Backend**
- Built-in authentication handles Brazilian patterns
- RLS provides security at database level
- Real-time enables live attendance updates
- Reduces development time significantly

**shadcn/ui over Material UI**
- Accessible by default (Radix UI foundation)
- Fully customizable for municipal branding
- No runtime overhead (components are copied, not imported)

**pnpm over npm/yarn**
- Faster installation
- Disk-efficient with content-addressable storage
- Strict dependency management prevents phantom dependencies

**Playwright over Cypress**
- Multi-browser support (Chrome, Firefox, Safari)
- Better performance profiling integration
- More reliable for CI/CD pipelines
