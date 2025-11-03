# Roadmap da Documentação — Gestão Fronteira

Escopo: organizar, padronizar e automatizar a pasta `gestao_fronteira/docs`, mantendo foco no conteúdo essencial do projeto e histórico em `archive/`.

## 1) Organização e Curadoria
- Objetivo: manter no root apenas documentos essenciais e Outubro/2025.
- Ações:
  - Manter docs de Outubro/2025 no root (decisão já aplicada).
  - Definir política para conteúdos pré-Out/2025: mover para `archive/centralization-2025-10-18/` (a confirmar).
  - Consolidar índice em `README.md` (feito) e manter `changelog.md` (feito).
- Critérios de aceite:
  - Root `docs/` sem duplicidades/rascunhos.
  - `README.md` aponta apenas para docs essenciais.

### Ações derivadas (Out/2025)
- Manter todos os documentos criados/atualizados em Outubro/2025 no root.
- Decidir política para pré-Out/2025: mover para `archive/centralization-2025-10-18/` (a confirmar).

## 2) Padronização e Qualidade
- Objetivo: padronizar títulos, acentuação e estrutura.
- Ações:
  - Corrigir acentuação/encoding em títulos e cabeçalhos.
  - Padronizar nomes de arquivos, idioma PT-BR, e seções iniciais (Data, Status, Versão).
  - Adotar um linter de Markdown (ex.: `markdownlint`) e um verificador de links.
- Critérios de aceite:
  - `markdownlint` sem erros nos arquivos do root.
  - Todos os links internos válidos.
  - Acentuação e títulos normalizados (evitar caracteres estranhos no Windows).

## 3) Automação
- Objetivo: evitar trabalho manual recorrente.
- Ações:
  - Criar script `pnpm docs:changelog` para gerar `changelog.md` a partir de `git log`/mtimes.
  - Adicionar verificação de links (`markdown-link-check`) ao CI.
- Critérios de aceite:
  - Pipeline CI falha para links quebrados.
  - `docs:changelog` atualiza o arquivo com o cabeçalho de data e itens modificados.

### Itens específicos
- Script deve extrair títulos (`#`, `##`) e primeiros parágrafos para gerar “destaques por documento”.
- Suportar ordenação por `LastWriteTime` e por `git log` (flag).

## 4) Conteúdo Essencial Vivo
- Objetivo: manter sincronismo entre docs e código.
- Ações:
  - `API_REFERENCE.md`: atualizar sempre que rotas/server actions mudarem.
  - `DATABASE_SCHEMA.md`: revisar a cada migração relevante.
  - `COMPONENT_ARCHITECTURE.md`: revisar quando houver grandes refactors de UI/estado.
- Critérios de aceite:
  - Cada PR que muda API/DB valida o doc correspondente.

### Ações derivadas (Out/2025)
- UI/UX Validation: corrigir ordenação na página `sessoes` (`criada_em` → remover ou `travada_em`).
- UI/UX Validation: corrigir erro 400 na página `escolas/[id]` (ajustar consulta/data-fetch).
- Criar dados de teste mínimos para páginas de `turmas` e `matriculas` (evitar “skipped”).
- Database Schema: manter 18 tabelas com RLS ativo; atualizar doc a cada migração relevante.
- API Reference: validar cobertura sempre que houver mudança em server actions/rotas.

## 5) UI/UX e Anexos
- Objetivo: controlar volume e localização de anexos.
- Ações:
  - Definir política para `docs/screenshots/` (manter apenas sessões atuais; mover sessões antigas para `archive/screenshots/`).
  - Nomeação consistente: `YYYY-MM-DD-descricao`.
- Critérios de aceite:
  - Root `docs/` sem anexos pesados; somente referências necessárias.

### Ações derivadas (Out/2025)
- Homepage: converter para Server Component e aplicar `next/dynamic` em blocos pesados (target < 3s).
- Validar novamente 5/8 páginas e ampliar cobertura (meta: 8/8 com dados de teste).

## 6) Histórico e Conformidade
- Objetivo: preservar histórico e atender compliance.
- Ações:
  - Manter `docs/archive/` por mês/tema, com índice.
  - Criar `ARCHIVE_INDEX.md` com sumário por período.
- Critérios de aceite:
  - Navegação fácil no histórico e rastreabilidade por data.

### Ações derivadas (Out/2025)
- Criar `ARCHIVE_INDEX.md` sumarizando `archive/2025-10`, `archive/historical` e `archive/test-results`.
- Definir convenção de pastas por mês/tema (ex.: `YYYY-MM/assunto`).

## 7) Internacionalização (Opcional)
- Objetivo: definir idioma primário.
- Ações:
  - Confirmar PT-BR como padrão.
  - Se bilíngue, criar subpasta `docs/en/` para versões essenciais.
- Critérios de aceite:
  - Diretriz definida e aplicada no `README.md`.

### Ações derivadas (Out/2025)
- Confirmar PT-BR como idioma padrão no root; se necessário, listar docs prioritários para `docs/en/`.

## 9) Portal dos Responsáveis (Produto)
- Objetivo: transformar o roadmap atual em plano implementável.
- Ações:
  - Decidir onboarding (auto-cadastro vs convite) e autenticação (CPF+senha vs código/SMS).
  - Definir escopo inicial de visualização (frequência mensal/bimestral, notas, comunicados).
  - Especificar cenários multi-guardian (perfis e notificações) e LGPD (consentimento, audit trail, restrições).
  - Definir estratégia mobile-first: PWA, offline, push; metas de LCP (< 2.5s 3G).
- Critérios de aceite:
  - Documento de decisão preenchido nas seções de descoberta (Acesso, Visualização, Multi-guardian, Comunicação, LGPD, Mobile).

## 8) Governança
- Objetivo: dar clareza de processo e donos.
- Ações:
  - Definir responsáveis por cada área de doc.
  - Adicionar checklist de PR para docs (títulos corretos, links válidos, changelog atualizado).
- Critérios de aceite:
  - PRs com seção “Docs” obrigatória no template.

---

## Timeline Sugerida
- Semana 1: Organização/Curadoria (itens 1 e 5) + correção de acentuação prioritária.
- Semana 2: Padronização (item 2) + Automação inicial (item 3).
- Semana 3: Sincronismo de Conteúdo (item 4) + Governança (item 8).
- Semana 4: Histórico/Conformidade (item 6) + Internacionalização (item 7), se aplicável.

## To‑Dos (A Fazer)
- [ ] Corrigir acentuação/títulos com caracteres estranhos.
- [ ] Decidir política de arquivamento pré-Out/2025 e mover, se aprovado.
- [ ] Definir política para `docs/screenshots/` (manter vs. arquivar por sessão).
- [ ] Adicionar `markdownlint` e verificador de links no CI.
- [ ] Especificar e implementar `pnpm docs:changelog`.
- [ ] Criar `ARCHIVE_INDEX.md` com sumário das pastas em `archive/`.
