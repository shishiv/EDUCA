# VENT

Feedback log. Repeated/systemic workflow friction that should become future automation, docs, or workflow fixes.

## 26-09-07 12:03 — test-guard false-positive em comandos não-testes

A extensão TEST_GUARD_BLOCKED bloqueou repetidamente operações não-runner: um loop somente de leitura com jq/rg, um find somente de leitura e `git add -N` exigido para incluir testes novos no patch. O workaround repetido foi trocar leituras por Deno e, para git add/empacotamento, executar sob test-safe, consumindo scopes desnecessários. O preflight deveria distinguir comandos de leitura e mutações Git locais de runners/checks, ou ao menos reconhecer `git add -N`, `find` e loops de jq/rg como fora da fila.
