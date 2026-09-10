# Preservação do trabalho integrado de qualidade do EDUCA

## Origem e objetivo
Trabalho concluído fora do Firstmate, em oito worktrees paralelos sob `/home/shiv/Projects/EDUCA-quality-20260907/`, todos originalmente em `8713027b52caf6930999385253fdf1f052bbf912`. O captain autorizou montar os PRs para `dev` para não perder nada. Este é o resultado integrado principal; o conteúdo foi commitado diretamente na pasta original, sem copiar, reescrever ou reconciliar código.

Escopo integrado: autenticação e autorização, contratos de API e mutações governadas, frequência e janelas de correção, interface pública/i18n, projeções de relatórios, validação, anti-slop/toolchain, migrações e testes. O snapshot é de preservação, não uma aprovação de produção.

## Inventário e rede de segurança
Os oito commits foram enviados e os respectivos SHAs confirmados com `git ls-remote` **antes** de qualquer comparação ou abertura de PR. Nenhum merge foi feito; `dev` e `main` não receberam pushes.

| Área | Ramo remoto | Entradas preservadas | Arquivos no diff do commit | Commit |
|---|---|---:|---:|---|
| integration | `refactor/educa-zero-slop-20260907` | 561 | 559 | `2d95afc0237a74ded944cae53ed4db30a83903aa` |
| auth | `salvar/educa-quality-auth-20260908` | 29 | 29 | `a8c143eab185d4459ce1cf7740c8a841f1e014b9` |
| contracts | `salvar/educa-quality-contracts-20260908` | 25 | 25 | `9732efeaee2edbf2455d01905bfb26ef48d40615` |
| frequency | `salvar/educa-quality-frequency-20260908` | 39 | 39 | `d8e884b3135edc24aba2a27df764c1a7224d7cb8` |
| public | `salvar/educa-quality-public-20260908` | 51 | 50 | `c0b0d4c63da6f2081f47a69000c7db654745c5aa` |
| readmodels | `salvar/educa-quality-readmodels-20260908` | 42 | 42 | `8393a99dbc1f800a64753c7d737fb71ea43b20eb` |
| toolchain | `salvar/educa-quality-toolchain-20260908` | 33 | 33 | `1fb7874e082ca05f867b72991b3a384e81468af2` |
| validation | `salvar/educa-quality-validation-20260908` | 21 | 21 | `5d1bb89a78218a5abb0f82c29b275fa5f23ffab5` |

**Contagem reconciliada:** 795 entradas já conhecidas do índice (incluindo intent-to-add/renomeação) + 6 não rastreadas = 801 entradas. Somente 11 arquivos `.pi/semantic-grep.sqlite*` foram excluídos, sem apagá-los. Os três `VENT.md` não rastreados foram incluídos nos respectivos workers.

Três entradas eram caminhos já ausentes tanto no disco quanto no HEAD original; não havia bytes a commitar e sua ausência foi preservada: `integration/app/app/api/demo/audit/handler.ts`, `integration/app/tests/e2e/diary/canonical-lesson.spec.ts` e `public/app/lib/middleware/proxy-boundary.ts`. Assim, são **798 arquivos de diff somados entre os ramos**, com sobreposição; não são 798 arquivos únicos. O integration corresponde a 561 entradas do inventário e 559 arquivos no diff.

## Comparação arquivo a arquivo
Para cada caminho do inventário dos workers, executou-se `git diff <worker-commit> <integration-commit> -- <arquivo>` e compararam-se blobs/modos. Diferença de versão não é prova de funcionalidade faltante: os ramos divergentes ficam em PRs de preservação para reconciliação manual, não para merge cego.

| Worker | Resultado | Cobertura exata / observação |
|---|---|---|
| auth | com conteudo exclusivo | 14 caminhos idênticos no mesmo local; 15 versões/caminhos não idênticos |
| contracts | com conteudo exclusivo | 15 caminhos idênticos no mesmo local; 10 versões/caminhos não idênticos |
| frequency | parcialmente contido | 21 caminhos idênticos no mesmo local; E2E de reabertura idêntico em `app/tests/e2e/pilot/attendance-reopen.spec.ts`; 17 outras versões divergentes |
| public | com conteudo exclusivo | 39 caminhos idênticos no mesmo local; 12 versões/caminhos não idênticos |
| readmodels | com conteudo exclusivo | 30 caminhos idênticos no mesmo local; 12 versões/caminhos não idênticos |
| toolchain | com conteudo exclusivo | 29 caminhos idênticos no mesmo local; 4 versões/caminhos não idênticos |
| validation | contido | 20 caminhos idênticos no mesmo local; todas as 7 substituições de `date-utils.ts` também estão no integration |

**Worker coberto, sem PR separado:** `salvar/educa-quality-validation-20260908` (`5d1bb89a78218a5abb0f82c29b275fa5f23ffab5`), 21 arquivos. Vinte arquivos são byte/modo-idênticos; no único divergente, `app/lib/date-utils.ts`, as sete alterações do worker, ancoradas nas linhas da base e normalizadas CRLF/LF, estão integralmente mantidas. O integration acrescenta `getCurrentUtcMonthRange` e remove helpers legados que o worker não modificou. O ramo de segurança mantém também o snapshot exato anterior.

## Verificações executadas neste snapshot
- Integridade: hashes SHA-256 de todos os conteúdos existentes e modos do índice conferidos antes do commit; ausências e caminhos reconciliados; oito SHAs remotos confirmados.
- `pnpm lint`: passou.
- `pnpm run test --maxWorkers=2 --no-file-parallelism`: passou; 124 arquivos/1316 testes passaram, 3 arquivos/20 testes ignorados. Execução única integrada, sem suítes concorrentes nos workers.
- `pnpm typecheck`: **falhou**, `app/tests/e2e/pilot/deployed-isolation.spec.ts:71:26`, `TS7006: Parameter 'metric' implicitly has an 'any' type`. O erro foi registrado sem alterar o snapshot.
- Build, E2E, validação SQL e pilot não foram reexecutados nesta tarefa de preservação. Os workers isolados não foram declarados validados pelo resultado do integration.
- Varredura de nomes sensíveis e padrões de credenciais de alta confiança: nenhuma ocorrência nos arquivos alterados; não substitui auditoria de segredos completa.

**Rascunho deliberado:** resolver o typecheck e executar os gates aplicáveis antes de considerar merge. Não mesclar automaticamente os workers sobre este resultado: eles podem conter versões anteriores ou alternativas que reverteriam avanços integrados.

Inventário bruto, hashes, recibos dos pushes, comparação e logs ficam no ramo de evidências `fm/educa-quality-prs-dev`, em `artifacts/educa-quality-prs-dev/`.

## PRs complementares de preservação para dev

- auth: https://github.com/shishiv/EDUCA/pull/212
- contracts: https://github.com/shishiv/EDUCA/pull/213
- frequency: https://github.com/shishiv/EDUCA/pull/214
- public: https://github.com/shishiv/EDUCA/pull/215
- readmodels: https://github.com/shishiv/EDUCA/pull/216
- toolchain: https://github.com/shishiv/EDUCA/pull/217

Todos permanecem em rascunho para reconciliação. O worker validation está coberto conforme a prova acima e não precisa de PR separado.
