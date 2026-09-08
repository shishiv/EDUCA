# VENT

Feedback log. Repeated/systemic workflow friction that should become future automation, docs, or workflow fixes.

## 26-09-07 09:02 — repeated-truncated-discovery-output

Several broad shell retrievals were truncated after mixing campaign JSON, ownership, and repository-wide grep output. The repeated workaround was to rerun narrower jq/rg queries and line slices. A tool option or helper that summarizes JSON diagnostics and caps per-file grep matches before transport would prevent this backtracking.
## 26-09-07 12:42 — read-only shell guard friction

Durante a revisão, comandos compostos apenas de leitura estática (rg/head/find, expansão de caminho) foram bloqueados pelo wrapper como runner/script; precisei repetir a leitura em comandos menores e sem expansão. O wrapper deveria classificar pipelines e expansões sem executáveis de teste como leitura, ou indicar uma forma segura de leitura estática, para evitar backtracking.
