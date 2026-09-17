# VENT

Feedback log. Repeated/systemic workflow friction that should become future automation, docs, or workflow fixes.

## 26-09-08 19:32 - firstmate-multi-worktree-preservation-contract

The preservation brief explicitly required commits/pushes in eight original worktrees, but its generic trailing Rules 1-2 simultaneously prohibited any external writes and any branch push except the disposable task branch. Work had to pause after read-only inventory, append a keyed needs-decision, then consume a second authorization that repeated the original task scope. The launch template should encode the authorized worktree paths/branch allowlist and direct-PR delivery shape consistently, rather than emitting mutually exclusive safety rules. A task-specific allowlist would prevent this avoidable preservation delay without relaxing default isolation.

## Preserved auth feedback

## 26-09-07 09:03 - gh-search-state

GitHub issue discovery retried `gh search issues` with `--state all`; the CLI only accepts `open|closed`, causing the same failure for C05/C08/C09. Omitting the flag worked. A wrapper or documented helper that maps “all” to no state filter would avoid repeated failed discovery calls.
## 26-09-07 11:48 - test-guard false-positive

O guard bloqueou duas operações Git sem runner de teste (`git diff --binary` em comando composto e `git add -N`), exigindo wrapper inclusive para preparar o patch. A primeira foi resolvida por orientação explícita, mas a segunda impede incluir a migração não rastreada no patch. Seria útil classificar Git read/index preparation como não-testes ou documentar a exigência de wrapper para todo comando Git, com exemplos para `git add -N` e `git diff --binary`.

## Preserved contracts feedback

## 26-09-07 12:03 - test-guard false-positive em comandos não-testes

A extensão TEST_GUARD_BLOCKED bloqueou repetidamente operações não-runner: um loop somente de leitura com jq/rg, um find somente de leitura e `git add -N` exigido para incluir testes novos no patch. O workaround repetido foi trocar leituras por Deno e, para git add/empacotamento, executar sob test-safe, consumindo scopes desnecessários. O preflight deveria distinguir comandos de leitura e mutações Git locais de runners/checks, ou ao menos reconhecer `git add -N`, `find` e loops de jq/rg como fora da fila.

## Preserved readmodels feedback

## 26-09-07 09:02 - repeated-truncated-discovery-output

Several broad shell retrievals were truncated after mixing campaign JSON, ownership, and repository-wide grep output. The repeated workaround was to rerun narrower jq/rg queries and line slices. A tool option or helper that summarizes JSON diagnostics and caps per-file grep matches before transport would prevent this backtracking.
## 26-09-07 12:42 - read-only shell guard friction

Durante a revisão, comandos compostos apenas de leitura estática (rg/head/find, expansão de caminho) foram bloqueados pelo wrapper como runner/script; precisei repetir a leitura em comandos menores e sem expansão. O wrapper deveria classificar pipelines e expansões sem executáveis de teste como leitura, ou indicar uma forma segura de leitura estática, para evitar backtracking.
## 26-09-09 21:16 - isolated-quality-preflight

A validação integrada exigiu repetir manualmente o PATH para Node 24/pnpm 9, escolher os dois nomes de override de Chromium usados pelos configs de piloto e montar um wrapper para a E2E geral, cujo webServer ainda fixa localhost:3000. O primeiro piloto falhou por browser gerenciado ausente; depois cada rodada geral precisou repetir build/start/cleanup com o mesmo transporte isolado. O workaround ficou reproduzível em artifacts/quality-integration/run-general-e2e.sh, reutilizando lease e cleanup existentes. Um preflight versionado que confirme pnpm/browser/PostgreSQL e um runner geral local com origem configurável evitariam essa preparação repetida sem alterar permissões ou testes de negócio.
