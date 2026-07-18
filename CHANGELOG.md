# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- README: honest **Problem / Today (1 mun · ~900 students) / mission** framing; site → [geteduca.vercel.app](https://geteduca.vercel.app)
- GitHub repo description + homepage aligned with pilot + geteduca

### Removed
- Internal planning from public tree: OSS apply draft, security board, product roadmap, audits, WhatsApp spec, pilot feedback template, brand brief, and `app/plans/*` improve/security plans — kept offline privately
### Added
- `docs/README.md` — index of public technical/adoption docs only

## [OSS-prep] - 2026-06-01

### Added
- `lib/config.ts` — `municipalConfig` driven by `NEXT_PUBLIC_MUNICIPAL_*` env vars
- `README.md` — project overview, stack, quick start (<30 min), module status
- `CONTRIBUTING.md` — PR workflow, code standards, Brazilian compliance rules
- `LICENSE` — MIT, Myke Matos
- `docker-compose.yml` — PostgreSQL 16 for local dev
- `docs/MUNICIPALITIES.md` — municipal adoption guide with infra tiers and checklist
- `docs/PROVIDER-AGNOSTIC-ROADMAP.md` — planned adapter pattern (Supabase/Postgres/SQLite)

### Changed
- Genericized all hardcoded `Fronteira/MG` strings (city, emails, addresses, INEP codes, school names)
- Renamed Tailwind/CSS color tokens: `fronteira-*` → `municipal-*`
- `docs/gestao-fronteira-architecture.md` → `docs/architecture.md`
- `docs/DEPLOYMENT.md` genericized (removed project-specific URLs and environment)
- `.env.local.example` updated with municipal identity variables
- `public/logo_pref.png` replaced with generic placeholder (replace with official municipal logo)

### Removed
- `.env.production` from git history (contained `SUPABASE_SERVICE_ROLE_KEY`)
- `deploy.log`, `VERCEL_ENV_SETUP.md`, `setup-vercel-env.sh` from git history
- `build_output.txt`, `docs-inventory.json`, `test-results/` from tracked files
- Real INEP school codes and school names from `scripts/seed-superadmin.ts`
- Supabase project reference from git history (replaced with `SUPABASE-PROJECT-REF` placeholder)

### Fixed
- `app/layout.tsx` title (ordering bug had left it as `Cidade/UF` instead of `EDUCA - Sistema...`)
- Test assertion in `AttendanceReportTable.test.tsx` updated to match new `municipalConfig.nome` output

- **Code quality refactoring:**
  - Consolidated duplicated validation functions (CPF, CNPJ, CEP) across validation modules
  - `brazilian-educational.ts` now imports CPF validators from `brazilian.ts`
  - `schools-validation.ts` now imports CNPJ/CEP validators instead of duplicating
  - Improved variable naming in CNPJ validation (`pos` → `weightMultiplier`, `i` → `digitIndex`)
  - Improved variable naming in API base (`client` → `supabaseClient`)
  - Consolidated date formatting utilities in export modules to use `lib/date-utils.ts`
  - Reduced ~110 lines of duplicated code

### Fixed
- **Schema alignment com Supabase (WIP):**
  - Corrigidos nomes de colunas em múltiplos arquivos
  - sessoes_aula: inicio_aula/fim_aula (não hora_inicio/hora_fim)
  - users: tipo_usuario (não role)
  - attendance: conversão UI/DB status ('P'/'F'/'A' vs 'presente'/'falta'/'attestado')
  - react-day-picker v9 API update (Chevron component)
  - Criados stubs para lib/react-query.ts e lib/stores/app-store.ts
  - Restam erros em lib/services/attendance-immutability.ts

- **Turbopack HMR error with sonner Toaster:**
  - Replaced `next/dynamic` with direct import + client-side mount guard
  - Fixes "module factory is not available" error during HMR updates
  - Known Turbopack bug since Next.js 15.5.0 (GitHub #74167, #85883)
  - Pattern: `{mounted && <Toaster />}` with `useEffect` mount state

### Removed
- **PostHog analytics (temporario):**
  - Removido posthog-js da dependencia (Turbopack HMR bug)
  - Removido PostHogProvider.tsx e posthog-init.ts
  - AnalyticsProvider.tsx simplificado como passthrough
  - lib/logger.ts: removido import e integracao PostHog
  - Usuario configurara analytics posteriormente

### Added
- **Responsaveis na navegacao lateral:**
  - Pagina `/dashboard/responsaveis` adicionada ao grupo Cadastros
  - Visivel para admin, diretor e secretario
  - Permite gestao de responsaveis/tutores de alunos

### Removed
- **Paginas de desenvolvimento removidas:**
  - `/showcase` - pagina de testes de componentes
  - `/platform-names` - pagina de exploracao de branding
  - Referencias atualizadas em scripts de dev

### Added
- **Calendário Escolar (F009):**
  - Tabela `calendario_escolar` com RLS por escola
  - Funções `is_dia_letivo()` e `contar_dias_letivos()` para integração com frequência
  - Página `/dashboard/calendario` com visualização mensal
  - Componentes `CalendarioEventForm` e `CalendarioEventList`
  - 6 tipos de evento: feriado, recesso, dia_letivo, evento, reuniao, conselho
  - Eventos que "afetam frequência" são excluídos do cálculo de dias letivos
  - Link adicionado nas sidebars desktop e mobile

- **Compliance LGPD para dados de menores (Art. 14):**
  - Página pública `/politica-privacidade` com política completa (9 seções)
  - Componente `ConsentCheckbox` em `components/lgpd/`
  - Checkbox obrigatório no cadastro de responsável
  - Campos `lgpd_consentimento` e `lgpd_data_consentimento` salvos automaticamente
  - Bloqueia cadastro sem aceite da política
  - Seção especial destacando tratamento de dados de menores (LGPD Art. 14)

### Fixed
- **Cache de Service Worker causando queries antigas:**
  - Atualizado `CACHE_NAME` de `v1` para `v2` em `public/sw.js`
  - Força refresh do cache para todos usuários, evitando JavaScript obsoleto
  - Resolve problema de queries Supabase com nomes de colunas incorretos

- **TypeScript error em class-diary-filter.tsx:**
  - Corrigido chamada logger.error com parâmetro incorreto
  - Adicionado `ano_letivo: number` ao tipo de turmas

- **Acessibilidade: SelectTrigger com id para Label htmlFor (21 campos):**
  - `turmas/nova`: escola_id, serie, turno, professor_id
  - `alunos/novo`: sexo, serie_pretendida, turno_preferencia, resp_parentesco, resp_renda
  - `usuarios/novo`: tipo_usuario, escola
  - `matriculas/nova`: turma_id
  - `matriculas/[id]`: situacao
  - `responsaveis/novo`: parentesco
  - `responsaveis/page`: parentesco_filter
  - `responsaveis/[id]`: parentesco
  - `sessoes/page`: status
  - `relatorios/page`: tipo
  - `components/auth/user-profile`: tipo_usuario
  - `components/classes/teacher-assignment`: professor
  - `components/schools/school-registration-form`: diretor

- **Erros 400 na página Diário de Classe:**
  - Corrigido nomes de colunas em `lib/api/class-diary.ts`
  - `ano` → `ano_letivo` (tabela turmas)
  - `users!inner(id, name)` → `professor:users(id, nome)`
  - Adicionado null check para `freq.aula_id`
  - Página `/dashboard/diario` agora carrega sem erros de API

- **Erros 400 na página Dashboard principal:**
  - Corrigido query de matrículas: `ativo=true` → `situacao='ativa'`
  - Corrigido query de frequência: `aluno_id` → `matricula_id`
  - Página `/dashboard` agora exibe estatísticas corretamente

### Removed
- **Arquivos locais de migration órfãos (24 arquivos):**
  - Removidos drafts/templates que nunca foram aplicados ao Supabase
  - Migrations reais (42) são gerenciadas remotamente pelo Supabase MCP
  - Edge function órfã `auto-lock-sessions` removida (não estava implantada)
  - Diretório `.temp` do Supabase CLI removido

- **Preloads não utilizados e imagens órfãs:**
  - Removidos `<link rel="preload">` para brasao.png e logo-completo.png em `layout.tsx`
  - Componentes usam ícones Lucide, não as PNGs
  - Diretório `/public/identity/` removido (~190KB)
  - Elimina warnings "preloaded but not used" em todas as páginas

### Fixed
- **Hook de validação de commit:**
  - Corrigido regex para detectar `git commit` em comandos encadeados
  - Antes: `^git\ commit` (só início do comando)
  - Depois: `git\ commit` (qualquer posição no comando)

### Added
- **Skill codebase-cleanup migrado para estrutura XML:**
  - YAML frontmatter com name e description
  - Tags XML semânticas (objective, quick_start, phases, success_criteria)
  - Removidos markdown headings do corpo
  - Adicionado safety_checklist com MUST/NEVER constraints

- **Hook de validação de commit:**
  - Script `.claude/hooks/validate-commit.sh` que valida regras do projeto
  - Bloqueia commits sem atualização de CHANGELOG.md
  - Bloqueia commits sem atualização de `.apontamento/[mes-ano].md`
  - Configurado em `.claude/hooks.json`

### Removed
- **Testes e Mocks removidos para refatoração:**
  - Diretório `__tests__/` (43 arquivos de teste)
  - Diretório `__mocks__/` (mock do Supabase)
  - Diretório `tests/` (6 testes de segurança JS)
  - Configurações: `jest.config.js`, `jest.setup.js`, `playwright.config.ts`
  - Dependências: @playwright/test, playwright, @testing-library/*, jest, @types/jest
  - Scripts de teste: test, test:watch, test:coverage, test:e2e*
  - Chrome DevTools MCP substitui Playwright para testes de UI
  - Novos testes serão escritos após refatoração de componentes

### Changed
- **Limpeza de configurações:**
  - `tsconfig.json`: removidos excludes obsoletos de testes
  - `next.config.js`: removida regra SVG não usada, corrigido wrapper do bundle analyzer
  - Redução de ~1000+ para 859 pacotes npm

### Added
- **Proposta de Organização e Roadmap MVP:**
  - Documento `PROPOSTA-ORGANIZACAO-CLEANUP-ROADMAP.md` com análise completa do repositório
  - Identificação de 716 erros de TypeScript e suas causas raiz
  - Mapeamento de código morto/não utilizado (endpoints deprecated, páginas de dev)
  - Roadmap de 8 semanas para MVP do ano letivo 2025
  - Propostas de melhoria do frontend (UX/UI, performance, acessibilidade)
  - Estimativas de tempo para todas as tarefas identificadas

- **Diário de Classe - Fase 4 Completa:**
  - Sistema de alertas Bolsa Família com monitoramento de frequência (threshold 80%)
  - Página de relatório `/relatorios/bolsa-familia` com filtros por escola, turma e período
  - Exportação de relatórios em PDF (jsPDF) e Excel (ExcelJS)
  - Relatório de conteúdo ministrado com agregação de habilidades BNCC
  - Página `/relatorios/conteudo` com visualização em cards, tabela e resumo BNCC
- **Diário de Classe - Fase 5 (Performance e UX):**
  - Skeletons de carregamento para lista de aulas, grid de frequência e painéis
  - Hooks React Query com cache otimizado para dados do diário
  - Índices de banco de dados para consultas de frequência e sessões
  - Sistema centralizado de toasts de feedback (Sonner)
  - Animações sutis em células de frequência e cards
  - Componentes de loading (spinner, overlay, progress)
  - Melhorias de acessibilidade (WCAG 2.1 AA) com aria-labels e navegação por teclado
  - Navegação mobile com bottom nav (MobileNav component)
- **Diário de Classe - Fase 6 (Revisão de Testes):**
  - Gap Analysis documentado com 74/87 testes passando (85% pass rate)
  - Testes de API lesson-content, grades, attendance-reports: 100% passando
  - Testes de LessonContentForm: 14/14 passando
  - Identificação de gaps para próxima iteração (mock Supabase realtime)

### Changed
- Otimização de responsividade mobile nas páginas de relatório
- Targets de toque mínimo de 44px para tablets
- Layout adaptativo em `/relatorios/frequencia`

### Security
- **CRITICAL**: Fixed CVE-2025-66478 (Next.js RCE in React flight protocol) - upgraded Next.js 15.5.3 → 15.5.7
- **HIGH**: Removed xlsx library vulnerable to Prototype Pollution (CVE-2023-30533) and ReDoS (CVE-2024-22363), replaced with secure exceljs 4.4.0
- **HIGH**: Fixed path-to-regexp ReDoS vulnerability (GHSA-9wv6-86v2-598j) via Vercel upgrade
- **MODERATE**: Fixed esbuild CORS vulnerability (GHSA-67mh-4wv8-2f99) and undici randomness/DoS vulnerabilities via Vercel upgrade
- Updated ESLint 8.49.0 → 9.39.1 for security maintenance
- Reduced production vulnerabilities from 19 to 4 (remaining are low-risk transitive dependencies in Vercel dev CLI)

### Changed
- gestao_fronteira: Next.js 15.5.3 → 15.5.7 (production security)
- gestao_fronteira: Replaced xlsx 0.18.5 with exceljs 4.4.0 (maintains Excel export compatibility)
- gestao_fronteira: Vercel CLI 48.2.0 → 48.12.1 (dev dependency)
- gestao_fronteira: ESLint 8.49.0 → 9.39.1 (dev dependency)

### Added
- gestao_fronteira: @types/exceljs for TypeScript support

### Notes
- **No breaking changes**: All upgrades maintain backward compatibility
- **Brazilian compliance maintained**: INEP exports, LGPD data protection features unchanged
- **Excel exports**: Migration from xlsx to exceljs is transparent, all report formats preserved
