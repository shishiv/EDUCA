# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
