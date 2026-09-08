## Objetivo

Entregar o inventário, a reconciliação e as provas da preservação dos oito worktrees de qualidade do EDUCA. Este ramo contém **88 arquivos de evidências/feedback**, não cópias do código das oito áreas: os commits do trabalho foram feitos nas pastas originais e enviados antes de qualquer PR.

## PRs de preservação para dev

| Área | Entradas preservadas | Arquivos no diff | PR |
|---|---:|---:|---|
| integration | 561 | 559 | https://github.com/shishiv/EDUCA/pull/211 |
| auth | 29 | 29 | https://github.com/shishiv/EDUCA/pull/212 |
| contracts | 25 | 25 | https://github.com/shishiv/EDUCA/pull/213 |
| frequency | 39 | 39 | https://github.com/shishiv/EDUCA/pull/214 |
| public | 51 | 50 | https://github.com/shishiv/EDUCA/pull/215 |
| readmodels | 42 | 42 | https://github.com/shishiv/EDUCA/pull/216 |
| toolchain | 33 | 33 | https://github.com/shishiv/EDUCA/pull/217 |
| validation | 21 | 21 | Coberto pelo integration; ramo remoto `salvar/educa-quality-validation-20260908` |

Total: **801 entradas preservadas/reconciliadas**, correspondentes a **798 arquivos de diff entre os oito commits**, sem deduplicar sobreposições. Três entradas eram marcadores de caminhos já ausentes no disco e na base, sem bytes a commitar. Apenas 11 arquivos de índice `.pi/semantic-grep.sqlite*` foram excluídos e deixados intactos. Todos os `VENT.md` dos workers foram incluídos nos seus snapshots.

## Evidências deste ramo

Veja `artifacts/educa-quality-prs-dev/README.md`: status inicial/final das oito pastas, hashes SHA-256 e modos, HEADs, recibos de commits/pushes e confirmação de SHA remoto, comparação por arquivo, prova específica de cobertura de validation e logs dos checks. `VENT.md` registra a incompatibilidade do scaffold genérico com a autorização de preservação em múltiplos worktrees.

A verificação final confirmou zero alterações não preservadas. A API autenticada do GitHub confirmou URL, head/SHA, base `dev`, estado aberto/rascunho e corpo exato dos sete PRs de código. `dev` e `main` continuam nos mesmos SHAs; nenhum merge, fechamento, descarte ou remoção foi feito.

## Validação e pendências

- Integration: lint passou; testes passaram com `--maxWorkers=2 --no-file-parallelism`, 1316 testes aprovados e 20 ignorados.
- Integration: typecheck falhou em `app/tests/e2e/pilot/deployed-isolation.spec.ts:71:26` (`TS7006`, parâmetro `metric` implicitamente `any`). O snapshot foi preservado sem correções adicionais.
- Build, E2E, SQL e pilot não foram reexecutados. Não há afirmação de prontidão para merge/produção. Os workers não herdam os resultados de validação do integration.
- Os PRs de código são rascunhos; versões divergentes precisam de reconciliação manual, não de merge automático sobre o integration.
- Markdown/JSON autorais passam no `git diff --cached --check`. O check global aponta somente espaços finais/linhas vazias nos recibos brutos de push e logs, mantidos sem normalização para preservar a evidência.

Esta entrega direta cumpre a política de manter também a trilha de auditoria commitada e enviada no ramo `fm/educa-quality-prs-dev`.
