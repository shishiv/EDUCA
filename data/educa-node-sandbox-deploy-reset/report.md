# EDUCA - verificação do deploy do sandbox

Data da verificação: 2026-08-10, 12:23 UTC
Commit aprovado esperado: `e52ae1ceb20717101df6d211128012677e52017b` (PR88)
Runtime observado: `https://educa-demo.vercel.app`

## Resultado histórico antes do deploy

**Não verificado como servido.** Na verificação inicial, o alias de produção ainda apontava para um deploy antigo.

A consulta somente leitura ao Vercel registrou:

- Deployment: `dpl_GGkYUXFu2qMUAvLsWR2hUzMvuYPi`
- URL de deployment: `educa-demo-noqs2gdsp-myke-matos-projects.vercel.app`
- Estado: `READY`
- Ambiente: `production`
- Criado em: `2026-08-05 06:20:15 -03`
- Pronto em: `2026-08-05 06:21:29 -03`
- Commit servido pelo deployment: `4ed0e2f91b32d2565e5cbf06515480cfc3e7708e`
- Mensagem do commit servido: `fix: ajustar política de privacidade do demo público (#83)`
- Alias observado: `https://educa-demo.vercel.app`

O commit servido não era `e52ae1c`. O deploy autorizado ocorreu depois, conforme os receipts abaixo.

## Receipt browser - dashboard

URL observada: `https://educa-demo.vercel.app/dashboard`

Request de documento observado no Chrome DevTools:

- Status: `200`
- Data: `Mon, 10 Aug 2026 12:23:05 GMT`
- `x-vercel-id`: `gru1::svf2j-1786364585072-5c9355c2ae96`
- `x-vercel-cache`: `HIT`
- `age`: `45861`
- `x-matched-path`: `/dashboard`

O snapshot público não mostrou o banner do sandbox.
A navegação lateral mostrou `Dashboard`, `Alunos`, `Usuários`, `Escolas`, `Turmas`, `Matrículas`, `Atribuicoes`, `Responsáveis` e `Frequência`.
Não mostrou `Diário` nem `Relatórios`, que seriam sinais do fix B4.

Contagens observadas no carregamento novo do dashboard:

- Total de alunos: `51`
- Turmas ativas: `9`
- Frequência média: `86%`
- Professores ativos: `50`
- Turmas exibidas: `3 Ano A` com `15` alunos, `4 Ano B` com `31`, `5 Ano C` com `21`, `Pre II A` com `15` e `Maternal II A` com `22`

Essas contagens não correspondem ao contrato pós-reset esperado de 50 alunos, 5 turmas, 10 professores e aproximadamente 90% de frequência.

## Receipt browser - health

URL observada: `https://educa-demo.vercel.app/api/health`

- Status: `200`
- Corpo: `{"status":"healthy","timestamp":"2026-08-10T12:22:27.652Z"}`
- Data: `Mon, 10 Aug 2026 12:22:27 GMT`
- `x-vercel-id`: `gru1::gru1::g69ct-1786364547540-e4483369348d`
- `x-vercel-cache`: `MISS`
- `x-matched-path`: `/api/health`

O endpoint está saudável, mas não identifica o commit. O metadata do deployment e os sinais da UI mostram que o bundle ainda é anterior ao PR88.

## Limites respeitados

- Nenhuma operação de banco foi executada.
- Nenhum `TRUNCATE`, seed ou validação remota foi executado.
- Nenhuma credencial Supabase foi lida ou exposta; o token Vercel foi usado apenas em memória para o deploy.
- O blocker de reset permanece aberto: as três credenciais `SUPABASE_DEMO_*` continuam ausentes de caminho autorizado.

## Deploy autorizado pós-handoff

O projeto foi inspecionado pela API REST da Vercel. O projeto `educa-demo` tem ID `prj_BVaLDFY1oJfjj7Q33xnFBfwJCUHq`, `rootDirectory=app`, e não possui `gitRepository` ou `link` configurado.

Como não há conexão GitHub, o deploy usou upload de arquivos pelo Vercel CLI, a partir da raiz do worktree, com o token carregado por `source` do arquivo autorizado. O token não foi impresso nem gravado.

A primeira tentativa, feita a partir de `app/`, falhou antes de alterar o alias porque o `rootDirectory` resultou em `app/app`:

- Deployment: `dpl_ES47RDJWubNSoZoEXK21Y1AfMoL4`
- Estado: `ERROR`
- Erro: `ERR_PNPM_NO_PKG_MANIFEST`, `Command "pnpm install" exited with 1`

A segunda tentativa, feita a partir da raiz correta, concluiu o build e promoveu o alias:

- Deployment: `dpl_5m1RqxVJSY4mmPP6tyRZL61dYag8`
- URL de deployment: `https://educa-demo-hnfcs97nk-myke-matos-projects.vercel.app`
- Estado REST: `READY`
- Subestado: `PROMOTED`
- Ambiente: `production`
- Criado em: `2026-08-10 11:19:03 -03`
- Alias: `https://educa-demo.vercel.app`
- Commit SHA no metadata: `e52ae1ceb20717101df6d211128012677e52017b`
- Commit local conferido: `e52ae1ceb20717101df6d211128012677e52017b`
- `gitSource`: `null`, conforme o caminho de upload sem conexão GitHub
- `gitCommitRef`: `fm/educa-node-sandbox-deploy-reset`, metadata local do upload
- Build: Next.js `16.3.0`, TypeScript concluído, 57 páginas estáticas geradas

O SHA servido coincide com o commit `main` pós-merge. O metadata mantém a referência local do worktree porque o projeto usa upload, não `gitSource`.

## Receipt browser pós-deploy

### Dashboard

URL observada: `https://educa-demo.vercel.app/dashboard`

- Status: `200`
- Data: `Mon, 10 Aug 2026 14:22:26 GMT`
- `x-vercel-id`: `gru1::rz2gl-1786371746240-1c754a5298f0`
- `x-vercel-cache`: `PRERENDER`
- `age`: `0`
- `x-matched-path`: `/dashboard`

O snapshot mostrou o banner `Sandbox público de demonstração` e o texto de proteção de dados sintéticos.
A navegação mostrou `Diário de Classe` e `Relatórios`, além dos demais módulos esperados do fix B4.

Contagens observadas antes do reset autorizado:

- Total de alunos: `51`
- Turmas ativas: `9`
- Frequência média: `0%`
- Professores ativos: `10`
- Turmas canônicas exibidas: três turmas com `10` alunos cada
- Turmas legadas ainda exibidas: duas turmas com `0` alunos cada

Essas contagens são pré-reset e não foram usadas como prova do contrato pós-reset.

### Diário e Relatórios

- `https://educa-demo.vercel.app/dashboard/diario` carregou com status `200`, exibiu `Diário de Classe` e o banner sandbox.
- `https://educa-demo.vercel.app/dashboard/relatorios` carregou com status `200`, exibiu `Relatórios` e o banner sandbox.
- O Diário exibiu `Nenhuma aula encontrada` no banco ainda não resetado.
- Relatórios exibiu dois relatórios históricos antigos.

### Health

URL observada: `https://educa-demo.vercel.app/api/health`

- Status: `200`
- Corpo: `{"status":"healthy","timestamp":"2026-08-10T14:22:51.755Z"}`
- Data: `Mon, 10 Aug 2026 14:22:51 GMT`
- `x-vercel-id`: `gru1::gru1::sgrrq-1786371770955-0aa7cd54a5e2`
- `x-vercel-cache`: `MISS`
- `x-matched-path`: `/api/health`

## Limites antes do handoff

Na verificação anterior ao handoff de credenciais, nenhum reset, seed, `TRUNCATE`, `demo:validate` ou outra operação de banco havia sido executado.
A validação de contagens pós-reset estava pendente até a presença autorizada das variáveis `SUPABASE_DEMO_URL`, `SUPABASE_DEMO_SERVICE_KEY` e `SUPABASE_DEMO_DB_URL`.

## Reset único autorizado

O arquivo de configuração autorizado estava em modo `0600`. As três variáveis foram carregadas com `set -a; source ...; set +a`; a presença foi confirmada sem imprimir nomes ou valores.

Comandos executados uma única vez contra o projeto demo remoto:

```text
pnpm --dir app seed:demo
pnpm --dir app demo:validate
```

Receipt do seed:

- Âncora: `2026-08-10`
- Contagens rápidas: 3 escolas, 11 usuários, 5 turmas, 50 alunos, 50 matrículas, 100 sessões, 1000 frequências, 300 notas e 12 configs
- Transação: reset + seed concluídos
- Auth: usuário demo sincronizado

Receipt do `demo:validate`:

- Marcador synthetic e âncora: PASS
- Contagens e relacionamentos: PASS, incluindo 3 escolas, 5 turmas, 11 usuários, 50 alunos, 50 matrículas, 100 sessões, 1000 frequências e 100 conteúdos
- Integridade de frequência, cobertura de 20 dias e domínios sintéticos: PASS
- Bolsa Família: 3 casos abaixo de 80%; caso designado presente: PASS
- Determinismo por aluno: 0 divergências
- Auth demo: presente
- Fingerprints md5:
  - `escolas`: `a6057232d39c42ce4d1a04c21fd5780e`
  - `users`: `5911dd6f0d3798675200af271924f2f6`
  - `turmas`: `a5f02fd071c1e6333c89e029d3e9fbee`
  - `matriculas`: `194f729eadc278657c9e79bd4328ff88`
  - `sessoes_aula`: `72f90259128fdd1af2128ad7c81f44cf`
  - `conteudo_aula`: `0147a3f7fcaa924e190c13ebba1e7fd5`
  - `frequencia`: `5dfc196e037607ff09745c152bc09567`

Nenhum segundo seed, reset-check, `TRUNCATE` ou comando destrutivo foi executado.

## E2E após o reset e antes do main mais recente

O runtime anterior, ainda baseado no commit `e52ae1c`, foi validado após o reset:

- Dashboard: `50` alunos, `5` turmas, `10` professores e `90%` de frequência; cinco turmas exibiram `10` alunos cada.
- Diário em `/dashboard/diario`: sessões canônicas de agosto com frequências reais, incluindo `9/1`, `7/3` e `10/0`.
- Bolsa Família: `26` alunos no período atual; a tela mostrou `5` críticos e Miguel com `50%` no recorte mensal. O validador do dataset confirmou `3` casos abaixo de `80%`; a tela não confirmou o receipt final de Miguel `70%` neste recorte.
- Compliance: `/api/compliance/warnings` respondeu `200` com um warning real e `count: 5` no recorte mensal.
- Turma `3 Ano A`: média real `89%`, `10` sessões e `10` concluídas.
- Diário de edição: após selecionar a escola e a turma, `Nova Aula` abriu o aviso `Perfil com acesso de visualização`; `Salvar Aula` ficou desabilitado. Nenhum submit foi feito.

## Main mais recente pós-validação

`git fetch origin main` trouxe:

- `origin/main`: `e75ca66df06488d43ae1ea694b71cb1267608d78`
- Commits recentes: PR93, PR96, PR95, PR94, PR92, PR91 e PR88
- A fonte foi arquivada diretamente de `origin/main`, sem alterar o branch de trabalho

Deployment autenticado pelo upload autorizado:

- Deployment: `dpl_2WhqwRqQeVgCxLoiAGMvm8ZPPoYW`
- URL: `https://educa-demo-bmk2a8z2o-myke-matos-projects.vercel.app`
- Estado REST: `READY`
- Subestado: `PROMOTED`
- Ambiente: `production`
- Criado em: `2026-08-10 11:45:03 -03`
- Alias: `https://educa-demo.vercel.app`
- `gitCommitRef`: `main`
- `gitCommitSha`: `e75ca66df06488d43ae1ea694b71cb1267608d78`
- `gitSource`: `null`, porque o projeto não está conectado ao GitHub
- Build: Next.js `16.3.0`, TypeScript concluído, 57 páginas estáticas geradas

## E2E após o deploy do main mais recente

Passes observados no browser:

- Dashboard: `50` alunos, `5` turmas, `10` professores e `90%` de frequência.
- Navegação canônica: o link Diário aponta para `/diario`, não para `/dashboard/diario`.
- Diário `/diario?turma=00000000-0000-0000-0000-000000000101`: sessões de agosto, incluindo `8/2`, `9/1` e `7/3`; o aviso de perfil view-only apareceu para o admin.
- Turma `3 Ano A`: `89%` de frequência média, `10` sessões e `10` concluídas; a meta exibida passou para `80%`.
- Dashboard request: status `200`, data `Mon, 10 Aug 2026 14:47:32 GMT`, `x-vercel-id: gru1::twxmd-1786373251383-f4587097a710`.
- Health: status `200`, corpo healthy, data `Mon, 10 Aug 2026 14:54:39 GMT`, `x-vercel-id: gru1::gru1::l5kpb-1786373678829-d4782ce7e8a8`.

Falhas da prova completa pós-deploy:

- Bolsa Família: status `200`, `x-vercel-id: gru1::c2ldf-1786373717610-001bc23fb56a`, mas o browser registrou `POST .../rpc/get_attendance_conditionality [404]`. A tela não mostrou os 26 alunos, as colunas Legal/Margem ou as margens 80/85; mostrou `Margens municipais: não configuradas`.
- Compliance: status `200`, `x-vercel-id: gru1::tb5qn-1786373381327-e37a750fabd0`, corpo com `warnings: []`; não apareceu o warning real esperado.
- Descritivo: `/dashboard/alunos/00000000-0000-0000-0000-000000000201/diario/relatorio` carregou e exibiu `Relatorio de Desenvolvimento` e `Exportar`, mas informou `Nenhuma vivencia registrada`; não houve prova de conteúdo descritivo gerado.

## Drift de schema detectado antes das migrations

A consulta somente leitura ao Postgres remoto, após o reset e antes da correção autorizada, registrou:

```json
{"municipio_column": false, "threshold_table": false, "conditionality_function": false, "certificate_table": false}
```

A primeira prova pós-deploy falhou exatamente no RPC que a migration de conditionality cria. O captain autorizou depois a aplicação somente das migrations apropriadas e a restauração do bootstrap sintético canônico.

Nenhum outro banco, projeto ou ambiente foi tocado.

## Migrations autorizadas e validação após o schema

Foram identificadas no `origin/main` e aplicadas somente estas migrations, em ordem temporal:

- `20260810120522_certificate_issuance_source_truth.sql`
- `20260810120559_attendance_conditionality_read_model.sql`

Não foi aplicado `supabase/pilot/provision-pilot-module-gate.sql` nem qualquer migration de piloto.

Como precondição explicitamente canônica da migration C04, foi restaurada a linha sintética `synthetic-municipality` em `pilot_municipality_config`. Essa linha é criada pela migration base `20260727050000_pilot_foundation_gate.sql` e havia sido removida pelo reset. Nenhuma escolha de produto foi feita.

Receipt de schema após as migrations:

```json
{"municipalities":1,"fallback_thresholds":1,"conditionality_function":true,"certificate_emitters":0,"certificate_activities":0,"certificate_sessions":0,"certificates_issued":0}
```

A fonte sintética D9 foi então completada sem reset adicional, usando somente o `certificate-generator.ts` do `origin/main`. O validator do main mais recente passou:

- 1 emissor, 1 atividade, 14 sessões certificadas e 1 certificado emitido
- Fonte completa e hash verificável: PASS
- Identidade sintética do certificado: PASS
- Todos os checks de contagem, relacionamento, marcador, alerta e determinismo: PASS
- Fingerprints adicionais: `certificado_emissores=b009f2c7ea482b3dae563074b3875434`, `certificado_atividades=bf2e50d50a4d965cb74224ac0937649d`, `certificado_atividade_sessoes=b080f499537e4094740a5216962c1507`, `certificados_emitidos=a2ea4badccd13e78961e0b08b7c9ab9b`

O `pnpm --dir app demo:validate` também passou novamente após o schema, com a âncora `2026-08-10` e os checks do contrato original.

## E2E após migrations

- Bolsa Família no período mensal: `50` alunos, `31` conformes, `12` em alerta e `7` críticos. A tela exibiu colunas `Condicionalidade legal` e `Margem municipal`, com política `80/85%`.
- Bolsa Família no período completo `13/07/2026` a `10/08/2026`: `50` alunos, `4` críticos, `4` em alerta e Miguel com `70%` (`14 P`, `6 F`).
- Compliance: `/api/compliance/warnings` respondeu `200` com dois warnings reais: `7` abaixo do piso legal e `19` abaixo da margem municipal.
- Diário canônico: `/diario?turma=00000000-0000-0000-0000-000000000101` exibiu sessões de agosto e o aviso admin view-only.
- Turma `3 Ano A`: `89%`, 10 sessões e 10 concluídas.
- Certificado: fonte e emissão sintéticas verificáveis no validator do main; não existe tela pública de emissão no produto.
- Descritivo: a rota carregou, mas `Exportar` exibiu o toast `Exportação PDF será implementada em breve`; nenhuma vivência sintética existe para gerar o PDF.

## Divergências ainda abertas

A base sintética contém `26` alunos com `bolsa_familia=true`, `3` casos abaixo de `80%` e Miguel com `70%` no período completo. Porém, a função C04 considera também todo aluno com NIS, elevando o total exibido para `50`.

Receipt SQL independente:

```json
{"bolsa_true":26,"nis_nonnull":50,"below80_bolsa_true":3,"miguel_full_percent":70.00}
```

Essa diferença exige uma decisão de produto sobre se NIS não nulo identifica Bolsa Família, ou somente `bolsa_familia=true`. O PDF descritivo também exige uma fonte de vivências sintéticas, ausente no único reset autorizado.

Conclusão: deploy, reset único, schema, validator, certificado e a maior parte do E2E foram concluídos. Os dois drifts de aceitação estão documentados e roteados como ships corretivos, sem correção nesta tarefa.

## Receipts finais por superfície

| Superfície | Contrato exigido | Runtime observado | Receipt browser |
| --- | --- | --- | --- |
| Dashboard | 50 alunos, 5 turmas, 10 professores, aproximadamente 90% | 50, 5, 10 e 90%; banner sandbox ativo | `https://educa-demo.vercel.app/dashboard`, `200`, `x-vercel-id=gru1::twxmd-1786373251383-f4587097a710`, `Mon, 10 Aug 2026 14:47:32 GMT` |
| Diário canônico | rota `/diario`, sessões de agosto, frequências reais, admin view-only | Sessões 8/2, 9/1 e 7/3; aviso view-only | `https://educa-demo.vercel.app/diario?turma=00000000-0000-0000-0000-000000000101`, `200`, `x-vercel-id=gru1::f8mft-1786374684387-fba679153aee`, `Mon, 10 Aug 2026 15:11:24 GMT` |
| Bolsa Família | 26 alunos, 3 abaixo de 80%, Miguel 70% | 50 no read model C04; 50 no período completo, Miguel 70%; 26/3 no SQL independente | `https://educa-demo.vercel.app/relatorios/bolsa-familia`, `200`, `x-vercel-id=gru1::csss9-1786374594832-6dcc37da609a`, `Mon, 10 Aug 2026 15:09:55 GMT` |
| Compliance | warning real ligado ao Bolsa Família | Dois warnings reais: 7 legais e 19 municipais | `https://educa-demo.vercel.app/api/compliance/warnings`, `200`, `x-vercel-id=gru1::nmhnf-1786374651543-e64c48561dea`, `Mon, 10 Aug 2026 15:10:52 GMT` |
| Turma | média real e 10 sessões | 3 Ano A com 89%, 10 sessões e 10 concluídas | `https://educa-demo.vercel.app/dashboard/turmas/00000000-0000-0000-0000-000000000101`, `200`, `x-vercel-id=gru1::p67pf-1786374770124-93625d1de9f9`, `Mon, 10 Aug 2026 15:12:50 GMT` |
| Descritivo | conteúdo sintético e PDF exportável | Rota carregou; `/api/vivencias` respondeu 501; Exportar exibiu stub de PDF | `https://educa-demo.vercel.app/dashboard/alunos/00000000-0000-0000-0000-000000000201/diario/relatorio`, `200`, `x-vercel-id=gru1::6xhv5-1786374724731-223993321459`, `Mon, 10 Aug 2026 15:12:05 GMT` |
| Health | endpoint saudável | `{"status":"healthy"}` | `https://educa-demo.vercel.app/api/health`, `200`, `x-vercel-id=gru1::gru1::l5kpb-1786373678829-d4782ce7e8a8`, `Mon, 10 Aug 2026 14:54:39 GMT` |

O alias `https://educa-demo.vercel.app` serviu o deployment `dpl_2WhqwRqQeVgCxLoiAGMvm8ZPPoYW`, SHA `e75ca66`, em todas as superfícies finais.
