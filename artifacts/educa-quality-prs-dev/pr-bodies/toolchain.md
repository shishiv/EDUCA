# Preservação do worker toolchain

## Origem e escopo
Oxlint/anti-slop, regras e runner locais, configuração e fixtures de testes do plugin.

Trabalho finalizado fora do Firstmate na pasta original `/home/shiv/Projects/EDUCA-quality-20260907/workers/toolchain`, sobre `8713027b52caf6930999385253fdf1f052bbf912`. Commitado sem reescrita ou reconciliação, em `1fb7874e082ca05f867b72991b3a384e81468af2`, no ramo remoto `salvar/educa-quality-toolchain-20260908`. Todos os oito snapshots estavam enviados com SHAs confirmados antes da abertura dos PRs.

Resultado integrado principal: https://github.com/shishiv/EDUCA/pull/211

## Contagem preservada
- Inventário: 33 entradas já conhecidas do índice (incluindo intent-to-add) + 0 não rastreadas = **33 entradas preservadas**.
- Diff do commit: **33 files changed, 2939 insertions(+), 7 deletions(-)**.
- Exclusão única: 1 arquivo(s) `.pi/semantic-grep.sqlite*`, deixados no disco. `VENT.md`, quando existente, está incluído.

## O que este ramo preserva além da versão do integration
Os arquivos `app/tools/oxlint/anti-slop/tests/fixtures/import-specifiers.ts` e `app/tools/oxlint/anti-slop/tests/fixtures/local-symbol.ts` não existem no integration. A configuração `.oxlintrc.json` e o teste `no-shape-in-symbol-names.test.mjs` têm versões distintas. As fixtures e sua versão do teste ficam recuperáveis neste ramo.

Comparação direta: `git diff 1fb7874e082ca05f867b72991b3a384e81468af2 2d95afc0237a74ded944cae53ed4db30a83903aa -- <arquivo>`, arquivo a arquivo. Classificação: **com conteudo exclusivo**, com 29 caminhos byte/modo-idênticos no mesmo local. Versões divergentes são preservadas conservadoramente; não são uma afirmação de que a funcionalidade correspondente esteja ausente do integration.

| Caminho | Relação com integration |
|---|---|
| `app/.oxlintrc.json` | Versão divergente |
| `app/tools/oxlint/anti-slop/tests/fixtures/import-specifiers.ts` | Caminho presente só no worker |
| `app/tools/oxlint/anti-slop/tests/fixtures/local-symbol.ts` | Caminho presente só no worker |
| `app/tools/oxlint/anti-slop/tests/no-shape-in-symbol-names.test.mjs` | Versão divergente |

## Evidência e limites
- Conteúdos SHA-256 e modos do índice conferidos contra o inventário antes do commit; ausências reconciliadas; ramo remoto confirmado por SHA.
- Este worker isolado não teve a suíte executada nesta tarefa. O resultado de testes do integration não é atribuído a ele.
- No integration (https://github.com/shishiv/EDUCA/pull/211), lint e testes unitários passaram (1316 testes; 20 ignorados), mas typecheck falhou em `app/tests/e2e/pilot/deployed-isolation.spec.ts:71:26` (`TS7006`). Build/E2E/SQL/pilot não foram reexecutados.
- Inventário completo, hashes, recibos e comparação: ramo `fm/educa-quality-prs-dev`, diretório `artifacts/educa-quality-prs-dev/`.

**Rascunho de preservação/reconciliação. Não mesclar integralmente sobre o integration sem revisar as diferenças: este snapshot pode conter versões anteriores ou alternativas e reverter avanços. Nenhum merge, fechamento, remoção de ramo ou limpeza das pastas faz parte desta entrega.**
