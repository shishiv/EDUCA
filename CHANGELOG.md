# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
