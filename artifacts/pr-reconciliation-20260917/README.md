# Conciliação de preservações para main

Fonte de aplicação validada: `148e7fca80e33b3c707017c2b8c87e98b1be3e2f` e seu pai de integração `748eaf1b3f5fcedab2662a258e82f7eb5976c1b7`, sobre `main=64c552ef6f929234b697ba4233a2d7ebc4e9c2a6`. Coleta e verificações em 2026-09-17. Esta entrega não é uma promoção integral de `dev` nem uma prova de operação do sandbox público.

## Composição e procedência

O agregado canônico `2f3f07801c461792557cb6dc580cb295947ecb22`, entregue em https://github.com/shishiv/EDUCA/pull/219, já conciliava as oito preservações de qualidade. Ele é reutilizado com suas dependências de base. Os únicos deltas posteriores escolhidos são o restore parcial F02 de https://github.com/shishiv/EDUCA/pull/238 e o status transacional F04 de https://github.com/shishiv/EDUCA/pull/240.

O guard de preenchimento demo permanece exatamente como no main inicial: somente `NEXT_PUBLIC_DEMO_SANDBOX === 'true'`. O fallback de ambiente do agregado não é importado. Não há escolha nova de acesso, frontend ou direção visual.

Não foram incluídos por conveniência os contratos posteriores de Vivências/períodos, recovery F03, import F05, canary F06, restore pedagógico F07, retenção F08 ou provas F09. Migrations que compõem a unidade escolhida estão versionadas, mas não foram aplicadas a nenhum banco remoto.

`source-projection.json` prova que a árvore candidata é exatamente a composição declarada: agregado, guard preservado, patches F02/F04, destino configurável da evidência geral e correção de teardown do teste de perfil. A projeção foi reconstruída em um índice Git temporário, sem modificar a árvore de trabalho. O resultado foi `c3893f42050a022f11d96c09905fe39a719cec83`.

`preservation-reconciliation.json` compara os destinos do ledger histórico com esta fonte. Das 886 entradas sobrepostas, 873 mantêm o objeto/modo final histórico. As 13 entradas que evoluíram correspondem a sete caminhos, todos explicados por F02, F04, guard estrito ou teardown. Não houve atualização dos hashes ou recibos antigos para fingir equivalência. As decisões por arquivo permanecem em `../quality-integration/resolution-notes.md`.

## Matriz dos PRs abertos

Nenhum destes PRs foi fechado durante a preparação. O fechamento operacional depende do landing confirmado e de nova conferência do head. Manter as branches de preservação enquanto houver bytes alternativos ou evidência exclusiva não comprovadamente absorvida.

| PR | Conciliação |
| --- | --- |
| https://github.com/shishiv/EDUCA/pull/175 | Promoção antiga já representada pela história equivalente do main. Não reaplicar suas versões antigas de locale |
| https://github.com/shishiv/EDUCA/pull/211 | Usar o resultado canônico de qualidade, não o snapshot que tinha typecheck vermelho |
| https://github.com/shishiv/EDUCA/pull/212 | Auth e mutações governadas conciliadas. Status passa também pelo delta F04 |
| https://github.com/shishiv/EDUCA/pull/213 | Contratos de API, escopo e auditoria mantidos nos donos conciliados |
| https://github.com/shishiv/EDUCA/pull/214 | Frequência mantém deadline capturado, precedência de correção e time_cutoff |
| https://github.com/shishiv/EDUCA/pull/215 | Público, navegação, provider e fluxos governados conciliados, sem segundo seletor/autofill |
| https://github.com/shishiv/EDUCA/pull/216 | Readmodels combinados com as entradas de public, sem regressão para alternativas antigas |
| https://github.com/shishiv/EDUCA/pull/217 | Plugin e fixtures exclusivos preservados como dados e exercitados pelo teste real |
| https://github.com/shishiv/EDUCA/pull/218 | Recibos originais mantidos, inclusive conteúdo não destinado a execução |
| https://github.com/shishiv/EDUCA/pull/223 | Intenção incorporada pelo delta canônico F02, sem declarar restore completo |
| https://github.com/shishiv/EDUCA/pull/224 | Intenção incorporada pelo delta canônico F04, sem ampliar efeitos Auth ou dados reais |

## Verificação executada

Node nativo 26.8.1, ABI147, pnpm 9.15.9 já instalado, PostgreSQL 18.6 local e Chromium 152. Um integrador. Unitários com no máximo 2 workers, browser 1, plugin 1, build 2. Nenhum no-mistakes, workflow hospedado ou ferramenta global foi instalado.

| Check | Resultado | Evidência |
| --- | --- | --- |
| Typecheck final | Passou | `checks/typecheck-final.log` |
| Lint integral | Zero warnings e erros, max10 e anti-slop | `checks/lint-final.log` |
| Plugin anti-slop executável | 2/2 | `checks/anti-slop-plugin.log` |
| Unitários | 126 arquivos, 1339 testes passaram. Cinco arquivos/29 testes live ignorados pelos guards existentes | `checks/unit.log` |
| Build sintético | Passou, dois workers | `checks/build.log` |
| SQL/RLS | Cadeia selecionada completa, catálogo replay, 31 arquivos SQL, concorrência e condicionalidade | `checks/database.log` |
| Restore F02 | 18 tabelas comparadas, vazias declaradas, catálogo/grants/escopo e cleanup | `checks/restore-f02.log` |
| F04 live | 9/9, incluindo HTTP real, rollback em throw/supressão de receipt e seis casos concorrentes | `f04-live-final/test.log` |
| R3 agregado | Quatro filhos passaram: legacy 26, capacity 3, descriptive 4, security 3, incluindo setups | `pilot/` |
| E2E geral final | 235/235, sem skips | `general/test.log` |
| Público e service worker | 10/10, sem login no sandbox público | `checks/public-entry.log` |
| Seed demo offline | Contrafactual vermelho e fingerprints idênticos após repetição | `checks/demo-sql.log` |
| Tipografia | Passou contra origin/main | `checks/typography.log` |

Os nove live F04 foram executados separadamente após o gate unitário. Os outros 20 casos live ignorados pelo gate não recebem aprovação por transitividade. As limitações de F04 não são apagadas por este conjunto, e a issue236 não é declarada resolvida.

A suíte unitária e o R3 foram executados sobre `748eaf1b`. A fonte da aplicação permaneceu idêntica depois disso. A única mudança posterior em `app/` é o teardown do E2E de perfil, em `148e7fca`, exercitado no geral final. Typecheck e lint também foram repetidos após essa mudança. O harness F04 fica neste diretório e usa exclusivamente os helpers locais existentes, uma instância descartável e os dois arquivos live já preservados.

Os logs novos normalizam o prefixo da cópia isolada e removem códigos de cor e tokens locais. Recibos históricos fora deste diretório permanecem intactos. `verification.json` registra os resultados e `cleanup-verification.json` distingue as verificações de recursos desta rodada.

## Falhas e correções da rodada

- O pnpm global 11 ignorava `pnpm.overrides` e tentou reinstalar módulos antes de typecheck. A remoção foi abortada sem TTY. Foi usado o pnpm9 já disponível com Node26, sem reinstalação ou mudança de lockfile.
- A primeira invocação dos unitários usou a forma errada do comando pnpm e não iniciou Vitest. A execução real foi `pnpm run test --maxWorkers=2 --no-file-parallelism`.
- O primeiro build encontrou validadores `.next/dev` herdados que referenciavam rotas não selecionadas. O cache gerado foi preservado em `app/node_modules/.cache/educa-public-version-246-preexisting-next-dev`, fora da compilação. Não foram adicionadas rotas para satisfazer cache obsoleto.
- O primeiro SQL completo usou um override de porta que o filho herdou, causando colisão. A execução completa final usa as portas próprias dos runners. O cluster anterior foi removido e nenhum processo dele permaneceu.
- O primeiro geral passou 173 testes e falhou no teardown da troca de senha, com 61 não executados. Navegar para privacidade não desmontava AuthProvider antes de desativar a fixture. O teste agora fecha sua página depois da mesma asserção de privacidade e antes de retirar a conta. Nenhuma asserção de senha, persistência ou diagnóstico foi removida. O recorte repetiu o caso três vezes, 5/5 com setups, e o geral final passou 235/235. Evidência em `general-before/` e `general-profile-focused/`.
- O primeiro público usou 127.0.0.1 com o dev server, que bloqueou recursos por origem. Repetir com o hostname localhost previsto pela configuração passou 10/10. Não foi alterado allowedDevOrigins nem relaxado o teste.
- O primeiro F04 live não ativou `EDUCA_LIVE_SUPABASE`, então o setup de isolamento unitário substituiu o endpoint pela porta 9. Seis testes SQL passaram e os três HTTP não rodaram. O harness final declara o modo live local e passou 9/9, sem remover o guard de segurança.

O diff-check bruto aponta CRLF, espaços e linhas finais herdados, principalmente em fontes/fixtures e recibos históricos. Esses bytes foram mantidos para preservar procedência. Isso não é apresentado como um check verde. Os checks obrigatórios de lint e tipografia passaram.

## Reprodução

Use Node26 nativo e pnpm9 disponível. Não use os valores de um projeto externo para estes comandos.

```bash
cd app
pnpm typecheck
pnpm lint
pnpm run test --maxWorkers=2 --no-file-parallelism
node --test --test-concurrency=1 tools/oxlint/anti-slop/tests/no-shape-in-symbol-names.test.mjs
cd ..
bash supabase/tests/database/run.sh
bash supabase/tests/pilot/run-restore-contract.sh
GENERAL_E2E_EVIDENCE_DIR="$PWD/.pilot-evidence/general-$(date -u +%Y%m%dT%H%M%SZ)" CIRCLE_NODE_TOTAL=3 bash artifacts/quality-integration/run-general-e2e.sh
CIRCLE_NODE_TOTAL=3 bash artifacts/pr-reconciliation-20260917/run-f04-live.sh
```

O público usa `PLAYWRIGHT_BASE_URL=http://localhost:<porta-local-livre>` e Chromium instalado, com `--workers=1`. O R3 usa `PILOT_E2E_APP_SERVER=direct`, overrides existentes de Chromium e `PILOT_E2E_RECEIPT_DIR` neste diretório. O build usa configuração sintética local, nunca valores do sandbox remoto.

## Limpeza proposta, não executada

Inventário revalidado: 99 branches e 182 PRs históricos, 11 abertos. `branch-cleanup-plan.json` contém head, PR associada, prova e disposição para cada branch.

- 71 candidatas à exclusão somente após landing e revalidação imediata. A prova usa ancestralidade, árvores inteiras equivalentes, a projeção canônica verificada ou deltas exatos já conciliados de heads merged inalterados.
- 26 preservadas por conteúdo exclusivo ou evoluído sem prova suficiente de equivalência.
- main e dev preservadas. A branch desta execução, ainda fora daquele inventário remoto, também será mantida enquanto estiver em uso.

Idade, prefixo e draft não são provas. Não houve fechamento ou exclusão. A fase operacional deve reconsultar cada head e situação, preservar qualquer mudança concorrente e registrar o resultado individual.

## Limites de entrega

Main está conectado ao Git na Vercel. Seu merge pode disparar o fluxo existente, mas este trabalho não executa deployment, altera variáveis ou aplica migrations remotas. Os gates usam somente bancos sintéticos descartáveis e não comprovam compatibilidade do schema do alvo público, autenticação publicada ou prontidão municipal. O contrato de acesso/demo e a avaliação visual específica permanecem separados.
