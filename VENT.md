# VENT

Feedback log. Repeated/systemic workflow friction that should become future automation, docs, or workflow fixes.

## 26-09-07 09:03 — gh-search-state

GitHub issue discovery retried `gh search issues` with `--state all`; the CLI only accepts `open|closed`, causing the same failure for C05/C08/C09. Omitting the flag worked. A wrapper or documented helper that maps “all” to no state filter would avoid repeated failed discovery calls.
## 26-09-07 11:48 — test-guard false-positive

O guard bloqueou duas operações Git sem runner de teste (`git diff --binary` em comando composto e `git add -N`), exigindo wrapper inclusive para preparar o patch. A primeira foi resolvida por orientação explícita, mas a segunda impede incluir a migração não rastreada no patch. Seria útil classificar Git read/index preparation como não-testes ou documentar a exigência de wrapper para todo comando Git, com exemplos para `git add -N` e `git diff --binary`.
