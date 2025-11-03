# Changelog — Docs Gestão Fronteira

Este changelog consolida as últimas atualizações e conteúdos modificados no diretório `docs` do projeto `@gestao_fronteira`. As entradas estão organizadas por data de modificação (mais recente primeiro) e trazem destaques do conteúdo.

## 2025-10-18
- Adicionado: `docs/changelog.md` (changelog central de documentação).
- Atualizado: `docs/README.md` (índice centralizado + seção “Recentes — Outubro 2025”).
- Mantidos: arquivos recentes de Outubro/2025.
- Destaques por documento:
  - `docs/UI_UX_VALIDATION_SUMMARY_2025-10-18.md`
    - Status geral: PARCIAL (4 ok, 1 parcial, 1 quebrada, 2 sem dados).
    - Correção requerida: página `sessoes` usa `.order('criada_em')` inexistente; trocar para `travada_em` ou remover ordenação extra.
    - Correção urgente: página `escolas` detalhes retorna 400; investigar consulta/data-fetch.
    - Observação: RLS recursiva corrigida com funções SECURITY DEFINER.
  - `docs/UI_UX_IMPROVEMENTS.md`
    - Homepage com 10.6s (target < 3s); causa: `use client` e ausência de lazy/dynamic import.
    - Ação: migrar homepage para Server Component + `next/dynamic` nos blocos pesados; prioridade ALTA.
  - `docs/SECURITY_PERFORMANCE_SUMMARY.md`
    - Segurança: 2 tabelas sem RLS; views com security definer vulnerável; funções sem search_path.
    - Performance: 8 FKs sem índices; sequential scans altos; bloat em 3 tabelas.
    - Plano rápido: habilitar RLS pendente; recriar views com security_invoker; criar índices de FKs.
  - `docs/DATABASE_SECURITY_PERFORMANCE_PLAN.md`
    - SQLs de referência para RLS/Policies/Índices (fase 1–3) prontos para migração.
  - `docs/API_REFERENCE.md`
    - Cobertura de Server Actions (abrir/fechar/attendance) e rotas (sessions, attendance, search, compliance); exemplos TS e tratamento de erros.
  - `docs/DATABASE_SCHEMA.md`
    - 18 tabelas com RLS; 16 migrações; 28 índices; multi-tenant por escola; trilha de auditoria e conformidade brasileira.
  - `docs/COMPONENT_ARCHITECTURE.md`
    - Organização de componentes por domínio; padrões com shadcn/ui + Radix; itens pendentes: hooks de sessão e página escolas blank (investigar).
  - `docs/PRODUCTION-READINESS-REPORT.md`
    - Avaliação de prontidão com foco em segurança/performance; dependências de RLS e índices; checklist para go-live.
  - `docs/ROADMAP-PORTAL-RESPONSAVEIS.md`
    - Questões de descoberta (autenticação, visualização de dados, multi-guardian, comunicação, LGPD, mobile-first) definidas para decisão.

## 2025-10-17
- Atualizações de documentação técnica:
  - `docs/DOCUMENTATION_INDEX.md`
  - `docs/COMPONENT_ARCHITECTURE.md`
  - `docs/DATABASE_SCHEMA.md`

## 2025-10-16
- Sessões de melhorias e análises:
  - `docs/TASK_IMPROVEMENTS_SESSION_2025-10-16.md`
  - `docs/CODE_IMPROVEMENTS_2025-10-16.md`
  - `docs/CODE_ANALYSIS_REPORT.md`
  - `docs/PROJECT_STATUS_REPORT.md`

## 2025-10-11
- `docs/README.md`

## 2025-10-10
- `docs/API_REFERENCE.md`
- `docs/PROJECT_INDEX.md`
- `docs/PRODUCTION-READINESS-REPORT.md`
- `docs/ROADMAP-PORTAL-RESPONSAVEIS.md`

## 2025-10-09
- `docs/SECURITY_PERFORMANCE_SUMMARY.md`
- `docs/DATABASE_SECURITY_PERFORMANCE_PLAN.md`

## 2025-10-06
- `docs/NEW_HOMEPAGE_DESIGN.md`
- `docs/UI_UX_IMPROVEMENTS.md`

## 2025-10-05 (Arquivados)
- `docs/archive/2025-10/DEPLOYMENT_SUCCESS.md`
- `docs/archive/2025-10/VERCEL_ENV_SETUP.md`
- `docs/archive/2025-10/MIGRATION-COMPLETE-2025-10-05.md`
- `docs/archive/2025-10/ARCHITECTURE-ANALYSIS-DUAL-TABLE-ISSUE.md`
- `docs/archive/2025-10/PROJECT-COMPLETE.md`
- `docs/archive/2025-10/PRODUCTION-READINESS.md`
- `docs/archive/2025-10/PRODUCTION-READINESS-FINAL.md`
- `docs/archive/2025-10/PRODUCTION-CLEANUP-SESSION-2.md`
- `docs/archive/2025-10/OPTIONAL-ENHANCEMENTS-COMPLETE.md`
- `docs/archive/2025-10/MONITORING-COMPARISON.md`
- `docs/archive/2025-10/FREE-MONITORING-SETUP.md`
- `docs/archive/2025-10/FINAL-PRODUCTION-STATUS.md`
- `docs/archive/2025-10/DEPLOYMENT-GUIDE.md`
- `docs/archive/2025-10/CLEANUP-SUMMARY.md`

Notas:
- Este arquivo lista alterações apenas no escopo de `gestao_fronteira/docs`.
- Para detalhes do conteúdo de cada documento, consulte os respectivos títulos e seções internas nos próprios arquivos referenciados.
