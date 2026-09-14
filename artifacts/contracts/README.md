# Evidências: Vivências e períodos escolares

Implementação A1/B1 sobre `dev`, commit de código `6a534024f0f664df151e4c050451b07d529530b3`. Somente ensaios sintéticos descartáveis locais. Não houve merge, deploy, promoção, banco compartilhado ou uso de credenciais externas.

Contrato durável: [`docs/NARRATIVE-SOURCES-AND-SCHOOL-PERIODS.md`](../../docs/NARRATIVE-SOURCES-AND-SCHOOL-PERIODS.md), referenciado por `CONTEXT.md`.

## Resultados finais do código

| Gate | Resultado | Evidência |
| --- | --- | --- |
| Typecheck | Passou | [`checks/static-delivery.log`](checks/static-delivery.log) |
| Complexidade máxima 10, anti-slop e ESLint sem warnings | Passaram, sem supressões | Mesmo log; `pnpm lint` executa oxlint e ESLint |
| Unitários completos | 1333 passaram; 20 skips preexistentes; 127 arquivos passaram e 3 previamente pulados | [`checks/unit-delivery.log`](checks/unit-delivery.log) |
| Builds de produção | Passaram nos runners geral e descritivo | [`general/build.log`](general/build.log), [`checks/pilot-delivery.log`](checks/pilot-delivery.log) |
| SQL completo | Passou: cadeia, replay, isolamento, legado e concorrência | [`checks/database-delivery.log`](checks/database-delivery.log) |
| Browser geral focado | 27/27 passaram, incluindo setup selecionado | [`general/test.log`](general/test.log), [`checks/browser-delivery.log`](checks/browser-delivery.log) |
| Piloto narrativo real | 6/6 passaram: 5 casos + setup | [Receipt final](pilot/r3-t4-descriptive-pilot-e2e-20260914T090227Z-3081593.json) |
| PDF real | 1.613.691 bytes; baixado, texto/fingerprint/IDs conferidos por pdftotext | Receipt final, [`checks/pdf-delivery.txt`](checks/pdf-delivery.txt) |
| Cleanup | Aplicações, bancos e auth state removidos; leases liberados | Receipt final, [`general/cleanup.log`](general/cleanup.log), `GENERAL_E2E_EXIT=0` |

O full unit run foi seguido apenas por captura adicional de screenshots nos mesmos casos E2E e ajuste de finais de linha, sem mudança semântica; typecheck/lint e piloto foram executados após isso. O piloto final usa o commit de código acima na proveniência do PDF.

## O que as provas cobrem

- Seleção automática completa de 60 Vivências, inclusive limites de datas; fonte de outra matrícula excluída.
- Rascunho salvo sem período; finalização sem período/fontes recusada e snapshot fornecido pelo cliente rejeitado.
- Captura de textos, IDs/escopo, versão, período, autor/hora e fingerprint PostgreSQL JSONB; recomputação independente no validador SQL do piloto.
- Fonte editada em transação concorrente: captura da versão commitada, sem mistura; alterações posteriores e remoção do calendário não reescrevem a captura.
- Legado criado antes da migração numa cópia isolada, depois migrado: leitura preservada, ausência honesta de snapshot e imutabilidade.
- Professor/escola estrangeira não podem configurar períodos; leitura/preview cross-school negados. Datas inválidas e sobreposição rejeitadas.
- Ambas as rotas narrativas, papéis de professor/diretor, rascunho/recarga, finalização e PDF após mudanças da fonte/calendário.
- UI real de configuração pela direção, reload e remoção. Ausência de calendário conserva meses civis e datas personalizadas.
- Preservação dos relatórios separados de conteúdo ministrado, BNCC, fonte `conteudo_aula`, PDF/mobile e quebra deliberada.
- Frequência canônica, PDF e XLSX com leitura dos bytes e valores reais, e fluxo mobile.

O piloto continua bloqueando `/dashboard/configuracoes`: o teste narrativo configura pela API autenticada. A UI de configurações foi provada no runner geral, fora do modo piloto mas ainda exclusivamente sintético. Nenhuma ampliação de acesso foi usada para validar.

## Reprodução do recorte

Dependências travadas já instaladas, pnpm 9, Docker, Chrome local e `pdftotext` disponível. Não instalar ferramentas globais automaticamente. Rodar comandos de aplicação em `app/`:

```bash
pnpm typecheck
pnpm lint
pnpm run test --maxWorkers=1 --no-file-parallelism
PILOT_E2E_APP_SERVER=direct \
PILOT_PLAYWRIGHT_EXECUTABLE_PATH=/opt/google/chrome/chrome \
pnpm test:e2e:pilot:descriptive
```

Do root, os runners entram em `app/` ou usam PG16 descartável:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/google/chrome/chrome \
bash artifacts/contracts/run-focused-browser.sh \
  tests/e2e/config/settings.spec.ts \
  tests/e2e/reports/frequency.spec.ts \
  tests/e2e/reports/content.spec.ts \
  tests/e2e/diary/vivencias-persistence.spec.ts

supabase/tests/database/run.sh
```

O runner SQL requer `initdb`, `pg_ctl`, `psql` e `pg_dump`. Neste host foram usados dentro da imagem **já existente** `pgvector/pgvector:pg16`, com `--pull=never --network none --user postgres`, worktree read-only e trap de remoção do container. `run-focused-sql.sh` conserva a reprodução menor, e `generate-local-types.sh` usa o lifecycle Supabase descartável para tipos.

Não se reexecutou a campanha histórica inteira nem se alteraram branches preservados. Coleta de manifesto não é prova browser.

## Diagnósticos resolvidos

1. **Manifesto:** startup repetido de pnpm removido em favor da CLI local travada; ExcelJS passa a carregar dentro dos testes de exportação, não durante coleta. Focado 8/8 e full unit final passaram. Timeout de 5000 ms e expectativas preservados. Logs anteriores permanecem como histórico, não como resultado final.
2. **Extrator:** a coordenação autorizou/provisionou `/usr/bin/pdftotext` 26.01.0 no host. O worker não alterou dependências ou imagens de produção. Os avisos sobre coleção de caracteres das fontes não impediram extração e assertions.
3. **Nome do download:** [`checks/download-real-metadata.json`](checks/download-real-metadata.json) comprova o mesmo blob, XLSX válido, ausência de falha e execução do chunk atualizado com atributo `download` correto. O [contrafactual isolado](checks/download-counterfactual.log) comprovou que Chrome 152 preserva o nome ASCII, mas troca o nome com `º` por `download`. Normalização aplicada somente ao nome do arquivo; dados do documento não mudam. A [regressão real](checks/download-regression-browser.log) e o recorte completo passaram sem alterar expectativas. A troca candidata anterior de FileSaver por link nativo, isoladamente, não resolveu; não é apresentada como a causa.

Traces brutos continham material de sessão local e não entram no Git. O trace agregado da primeira reprodução ficou incompleto no teardown, mas os segmentos válidos preservaram os metadados extraídos. O contrafactual não é apresentado como prova completa: a prova funcional é a regressão real subsequente.

## Revisão visual local

- `artifacts/contracts/review.html`: export Lavish portátil **somente no worktree local**, com fontes e imagens embutidas, zero assets locais pendentes e sem CDN. O HTML e screenshots da apresentação não são enviados ao GitHub, preservando a restrição de Lavish somente local.
- Fontes: Inter/Lexend; tokens reais do workspace EDUCA de `app/app/globals.css`, sem rebrand.
- Screenshots reais em [`assets/`](assets/): rascunho, captura finalizada, configuração e primeira página do PDF.
- Authoring local: `.lavish/contratos.html` (sessões ignoradas pelo Git).
- **Verificação visual concluída:** `agent-browser` 0.37.1 já instalado, explicitamente autorizado pela coordenação. Screenshots e checagens em [`visual/`](visual/): claro/escuro em 1440 px e ambos os temas em 390 px, sem overflow da página, fontes/imagens carregadas, rótulos SVG dentro dos nós e nenhum recurso externo. Diagrama móvel com rolagem contida para preservar legibilidade.
- Namespace `ec-7c556a-1`, sessão `lavish`, Chrome local existente; sem providers cloud, perfis de usuário ou auto-connect. A sessão automatizada e o servidor temporário foram encerrados. A sessão Lavish foi aberta e encerrada apenas para este artefato; nenhuma sessão alheia foi fechada. O export permanece utilizável offline e pode ser reaberto com `lavish-axi .lavish/contratos.html` no worktree.
- Não se usou nem atualizou `chrome-devtools-axi` nesta checagem. A primeira tentativa de nome de socket longo foi corrigida com namespace/sessão menores; `doctor --offline --quick` passou antes de operar. Ver [`visual/README.md`](visual/README.md).

Nenhum share externo ou polling em background. O arquivo é uma superfície de revisão, não uma demonstração pública. São versionados somente os receipts redigidos da checagem visual e as screenshots sintéticas do produto usadas como evidência dos testes. Logs textuais foram normalizados apenas para remover whitespace terminal e linhas vazias excedentes ao final; não se alteraram resultados.
