# EDUCA - promoção do runtime público

Data da verificação: 2026-08-10 UTC
Commit promovido: `e9ad3cdd8d4d22099a2bbdcafdf2e8b85c7dadaf` (`e9ad3cd`)
Branch de trabalho: `fm/educa-node-runtime-promote-final`
Alias oficial: `https://educa-demo.vercel.app`

## Upload autenticado

- `VERCEL_TOKEN` foi carregado com `source` a partir do arquivo autorizado.
- O valor do token não foi impresso, salvo ou incluído neste receipt.
- Projeto existente resolvido sem escolha interativa:
  - Projeto: `educa-demo`
  - ID: `prj_BVaLDFY1oJfjj7Q33xnFBfwJCUHq`
  - `rootDirectory`: `app`
  - Alias de produção: `educa-demo.vercel.app`
- O upload foi executado a partir da raiz da worktree, preservando `rootDirectory=app`.
- Nenhum domínio customizado foi configurado ou alterado.

O upload final foi `dpl_A4K6S8tCnQNLq4tAs5JA44ZQvAxC`, com metadata explícito do commit.

## Deployment final

- ID: `dpl_A4K6S8tCnQNLq4tAs5JA44ZQvAxC`
- URL imutável: `https://educa-demo-6hia2dmy6-myke-matos-projects.vercel.app`
- Target: `production`
- `readyState`: `READY`
- `readySubstate`: `PROMOTED`
- Alias: `https://educa-demo.vercel.app`
- `source`: `origin-main`
- `gitCommitSha`: `e9ad3cdd8d4d22099a2bbdcafdf2e8b85c7dadaf`
- `gitCommitRef`: `main`
- `gitDirty`: `0`
- Mensagem: `fix(reports): select Bolsa Familia beneficiaries by flag (#98)`
- Build: Next.js `16.3.0`, TypeScript concluído, 57 páginas estáticas geradas.

A API REST da Vercel confirmou `READY/PROMOTED`, o SHA acima e os aliases de produção.

## Correção autorizada do read model

O banco remoto tinha a função antiga, baseada em NIS. O captain autorizou reaplicar somente a função corrigida do PR98, sem reset.

Foi executado, em transação, o trecho `CREATE OR REPLACE FUNCTION public.get_attendance_conditionality` da migration `20260810120559_attendance_conditionality_read_model.sql`, seguido de `REVOKE ALL` e `GRANT EXECUTE`. Não foram executados os demais trechos da migration.

Receipt da operação:

- Antes: `md5(pg_get_functiondef(...)) = 4c323af7ce38cfaadb36e5e308d8c7b4`
- Antes: lógica NIS presente, lógica `bolsa_familia` ausente.
- Depois: `md5(pg_get_functiondef(...)) = 5373b61cf980856ed5683c7775953c97`
- Depois: lógica NIS ausente, lógica `coalesce(student.bolsa_familia, false)` presente.
- Consulta do read model para `2026-08-01` a `2026-08-10`: `50` matrículas ativas, `26` com `is_bolsa_familia=true`.

A operação não apagou, truncou ou regravou dados.

## Validação canônica

Com o arquivo autorizado carregado por `source`, foi executado:

```text
pnpm --dir app demo:validate
```

Resultado: `VALIDACAO OK - dataset determinístico e synthetic-only conforme o contrato.`

Receipts principais:

- Âncora: `2026-08-10`, 20 dias letivos.
- Contagens: 3 escolas, 5 turmas, 11 usuários, 50 alunos, 50 matrículas.
- Frequência: 1000 registros e 100 sessões.
- Conteúdo canônico: 100/100 completos, 5 disciplinas com 20 conteúdos cada.
- Fingerprint do conteúdo: `888045b03e3eae986b28d6ffc3eb630c`.
- Certificado: 1 emissão com fonte verificável.
- Bolsa Família: 3 casos sintéticos abaixo de 80%, incluindo o caso designado.
- Determinismo: 0 divergências.
- Auth demo: usuário presente.

## Receipts do browser

A sessão autenticada usou somente o usuário sintético do demo. Nenhum fluxo de escrita de dados foi executado.

### Dashboard

URL: `https://educa-demo.vercel.app/dashboard`

- Status: `200`
- `x-vercel-id`: `gru1::6f54g-1786390687054-8880dd44d08f`
- `x-vercel-cache`: `HIT`
- `x-matched-path`: `/dashboard`
- Banner `Sandbox público de demonstração` presente.
- Contagens: `50` alunos, `5` turmas, `10` professores e `90%` de frequência média.

### Bolsa Família

URL: `https://educa-demo.vercel.app/relatorios/bolsa-familia`

- Status: `200`
- `x-vercel-id`: `gru1::9n6lk-1786390645475-9f6112a598cc`
- `x-vercel-cache`: `HIT`
- `x-matched-path`: `/relatorios/bolsa-familia`
- Resumo exibido: `26` alunos Bolsa Família, `13` conformes, `8` em alerta e `5` críticos na margem municipal.
- Tabela completa: `26` linhas.
- Colunas `Legal` e `Margem` presentes, com os limites `80/85%`.

### Conteúdo descritivo

URL: `https://educa-demo.vercel.app/relatorios/conteudo`

- Status: `200`
- `x-vercel-id`: `gru1::wlp2x-1786390707634-610eeaece716`
- `x-vercel-cache`: `HIT`
- `x-matched-path`: `/relatorios/conteudo`
- Após `Gerar Relatorio`, a tela exibiu `30` aulas, `5` habilidades BNCC e `5` disciplinas.
- A tela exibiu conteúdo textual real do seed, incluindo tema, objetivo, habilidade BNCC, metodologia e recursos.

A rota individual de relatório descritivo não tinha relatório finalizado no dataset remoto. Não foi criado ou finalizado um relatório para testar PDF, porque isso escreveria no banco. O contrato de conteúdo do PR97 foi validado pelo `demo:validate` e pelo relatório canônico de conteúdo.

## Limites respeitados

- Nenhum reset foi executado.
- Nenhum `TRUNCATE` foi executado.
- Nenhuma migração completa foi reaplicada.
- A única alteração remota foi a substituição autorizada da função read model do PR98 e seus privilégios de execução.
- Nenhum domínio customizado foi tocado.
- O token Vercel não aparece neste arquivo.

## Resultado

Promoção, correção não destrutiva do read model, validação canônica e prova browser foram concluídas.
