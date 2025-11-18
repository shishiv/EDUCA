# Project Context

## Purpose
Sistema municipal de gestão educacional para Fronteira-MG, Brasil. Foco em transformação digital de matrícula, frequência escolar e relatórios educacionais com compliance total das normas brasileiras (INEP, Educacenso, LGPD).

**Status**: 90% pronto para produção, todos os 6 bugs críticos resolvidos (2025-01-11)

## Development Model

**Solo Developer**: Desenvolvimento realizado por único desenvolvedor em modelo de horas extras
**Remuneração**: Todas horas investidas são remuneradas como horas extras
**Apontamento**: Horas apontadas mensalmente todo dia 20
**Tracking**: Cada spec e tarefa OpenSpec deve registrar horas investidas em changelog não técnico

## Tech Stack
- **Frontend**: Next.js 15.5.3 (App Router) + React 18.2.0
- **Database**: Supabase 2.57.4 (PostgreSQL + Auth + Storage + Real-time)
- **UI**: shadcn/ui + Radix UI + Tailwind CSS 3.3.3
- **Forms**: React Hook Form 7.53.0 + Zod 3.23.8
- **State**: Zustand 4.4.7 + TanStack Query 5.17.9
- **Testing**: Jest 30.2.0 + React Testing Library 16.3.0 + Playwright 1.55.1
- **TypeScript**: 5.2.2 (strict mode)
- **Package Manager**: pnpm (obrigatório)

## Project Conventions

### Code Style
- TypeScript strict mode (obrigatório)
- ESLint + Prettier com regras para domínio educacional brasileiro
- shadcn/ui components para consistência
- Zod schemas para validação de dados brasileiros (CPF, telefone, etc.)
- Sem emojis (a menos que solicitado)
- Comunicação direta e concisa (abreviações OK)

### Architecture Patterns
- Next.js App Router (diretório app/)
- Server Actions para mutations
- API routes para queries complexas
- Row Level Security (RLS) para multi-tenancy por escola
- Zustand stores para client state
- TanStack Query para server state
- Organização de componentes por feature

### Testing Strategy
**TDD com foco em UX** (OBRIGATÓRIO):
- Escrever testes E2E PRIMEIRO antes de implementar features
- Chrome DevTools MCP para validação UI/UX (desktop, mobile, tablet)
- Unit tests com Jest + React Testing Library
- E2E tests com Playwright para fluxos críticos
- Performance testing antes de produção (LCP < 2.5s)

### Git Workflow
- **Branch main**: `main` (somente production-ready)
- **Feature branches**: `feature/*` (novas funcionalidades)
- **Fix branches**: `fix/*` (correções de bugs)
- **NUNCA** commit direto na main
- Conventional commits: `feat(attendance): description`
- Scopes: attendance, students, schools, classes, reports, compliance, database, auth

## Domain Context

### Normas Educacionais Brasileiras
- **Compliance INEP**: Padrões Educacenso 2025
- **Integração Bolsa Família**: Monitoramento de 80% de presença
- **"não existe o esquecer"**: Frequência é imutável após submissão (princípio legal)
- **Isolamento multi-escola**: Separação completa de dados via RLS
- **5-Role RBAC**: admin, diretor, secretario, professor, responsavel

### Regras de Negócio Críticas
- Frequência é documento legal ("único documento oficial")
- Workflow "Abrir aula" obrigatório antes de marcar presença
- Alunos só podem estar em uma turma ativa por ano letivo
- Mínimo 75% de presença, alerta em 80%
- Validação CPF obrigatória para usuários e alunos

### Validação de Dados Brasileiros
- CPF (Cadastro de Pessoas Físicas)
- Telefones (móvel/fixo)
- NIS (ID programa social)
- Códigos INEP (11 dígitos)
- Datas do calendário acadêmico

## Important Constraints

### Acesso ao Banco de Dados
**⚠️ CRÍTICO**: Operações de DB SOMENTE via Supabase MCP tools:
- `mcp__supabase__apply_migration` (migrations)
- `mcp__supabase__execute_sql` (queries)
- `mcp__supabase__list_tables` (inspeção schema)
- **NUNCA** usar Supabase CLI local (`supabase start`, `supabase db push`)

### Quality Gates de UI/UX
**OBRIGATÓRIO** validação Chrome DevTools MCP para TODAS mudanças de UI:
- Responsividade (desktop, mobile, tablet)
- Acessibilidade (WCAG 2.1 AA)
- Performance (LCP < 2.5s)
- Console limpo de erros
- Network requests validados

### Requisitos de Performance
- Carregamento dashboard: < 3s
- Marcação de frequência: < 1s por aluno
- Mobile-responsive para tablets de sala de aula
- Funciona em Slow 3G com CPU throttling

### Legal & Compliance
- Compliance LGPD (GDPR brasileiro)
- Padrões de relatórios INEP Educacenso
- Integração programa Bolsa Família
- Audit trail para todas mudanças de dados educacionais

## External Dependencies

### MCP Servers (configurados em .mcp.json)
1. **Supabase MCP** - OBRIGATÓRIO para todas operações de DB
2. **Chrome DevTools MCP** - OBRIGATÓRIO para validação UI/UX
3. **shadcn-ui MCP** - Geração de componentes
4. **Context7 MCP** - Lookup de documentação

### APIs do Governo Brasileiro (opcional)
- INEP API (dados educacionais)
- Integração Educacenso
- Serviços de validação de programas sociais

### Serviços de Produção
- Supabase (PostgreSQL, Auth, Storage, Real-time)
- Vercel (hosting, edge functions)
- Monitoramento de performance (opcional)
