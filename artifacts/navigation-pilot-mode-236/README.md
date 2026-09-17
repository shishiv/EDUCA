# Contrato de navegação geral e piloto

Validação local de [#236](https://github.com/shishiv/EDUCA/issues/236), em 2026-09-17, sobre `dev@ee1c6976bbc1b57c288df737229137ba84890d06`.

A reprodução anterior à correção confirmou as três expectativas gerais que falhavam com o piloto ativo. A correção altera somente `app/tests/unit/navigation.test.ts`: os 21 casos gerais declaram piloto desligado, quatro casos novos verificam o piloto ligado, as duas flags de demo ficam desligadas e `vi.unstubAllEnvs()` restaura as flags após cada teste. As funções reais de navegação e autorização continuam sendo chamadas, sem mocks.

Relatórios e configurações continuam ausentes da navegação piloto, mesmo para os papéis autorizados pela política de rotas. Dashboard e diário continuam presentes. Nenhum código de produto, gate, dependência, lockfile ou configuração remota foi alterado.

## Resultados observados

Runtime confirmado: `/usr/bin/node` v26.8.1, `process.execPath=/usr/bin/node`, ABI 147, pnpm 9.15.9 e Vitest 4.1.10. Os testes foram executados sequencialmente com `--maxWorkers=1`, sem watch nem cobertura. A suíte completa foi executada uma vez por modo após a correção.

| Execução | Resultado | Evidência |
| --- | --- | --- |
| Focado antes, piloto `true` | Exit 1, 18 PASS e 3 FAIL | [before-true.log](before-true.log) |
| Focado antes, geral `false` | Exit 0, 21 PASS | [before-false.log](before-false.log) |
| Focado depois, piloto `true` | Exit 0, 25 PASS | [after-true.log](after-true.log) |
| Focado depois, geral `false` | Exit 0, 25 PASS | [after-false.log](after-false.log) |
| Focado depois, piloto e demo herdados `true` | Exit 0, 25 PASS | [after-demo-inherited.log](after-demo-inherited.log) |
| Completa, piloto `true` | Exit 0, 1.372 PASS e 29 SKIP, 131 arquivos PASS e 5 SKIP, 89,16 s | [full-true.log](full-true.log) |
| Completa, geral `false` | Exit 0, 1.372 PASS e 29 SKIP, 131 arquivos PASS e 5 SKIP, 86,20 s | [full-false.log](full-false.log) |
| Typecheck | Exit 0 | [typecheck.log](typecheck.log) |
| Lint, incluindo complexity max10 e anti-slop | Exit 0, sem relaxar gates | [lint.log](lint.log) |
| Build webpack | Exit 0, dois workers, 71/71 páginas estáticas | [build.log](build.log) |

O SHA-256 do teste validado é `473500409da33ed54f1b0bb9ec2fe75176f3617eccdcdf955933648bcb45f1e9`. Os logs foram normalizados apenas para LF e remoção de whitespace ao fim das linhas.

## Comandos executados

Todos os comandos de aplicação partiram de `app/`. `P` abaixo abrevia o caminho exato do pnpm usado. `PATH` colocou `/usr/bin` antes do PATH herdado para os processos filhos usarem o Node nativo.

```bash
export PATH=/usr/bin:$PATH
P=/home/shiv/.cache/node/corepack/v1/pnpm/9.15.9/bin/pnpm.cjs

# Executado antes e depois da correção, nesta ordem: true, false.
for mode in true false; do
  env -u EDUCA_LIVE_SUPABASE \
    NEXT_PUBLIC_PILOT_MODE=$mode PILOT_MODE=$mode \
    NEXT_PUBLIC_DEMO_SANDBOX=false DEMO_SANDBOX=false \
    /usr/bin/node "$P" run test tests/unit/navigation.test.ts --maxWorkers=1
done

# Depois da correção, prova adicional contra flags de demo herdadas.
env -u EDUCA_LIVE_SUPABASE \
  NEXT_PUBLIC_PILOT_MODE=true PILOT_MODE=true \
  NEXT_PUBLIC_DEMO_SANDBOX=true DEMO_SANDBOX=true \
  /usr/bin/node "$P" run test tests/unit/navigation.test.ts --maxWorkers=1

# Suíte completa depois da correção, sequencial nos dois modos.
for mode in true false; do
  env -u EDUCA_LIVE_SUPABASE -u EDUCA_USER_STATUS_DB_TEST -u EDUCA_USER_STATUS_HTTP_TEST \
    NEXT_PUBLIC_PILOT_MODE=$mode PILOT_MODE=$mode \
    NEXT_PUBLIC_DEMO_SANDBOX=false DEMO_SANDBOX=false \
    /usr/bin/node "$P" run test --maxWorkers=1
done
```

Para executar o script original `lint`, que chama `pnpm` internamente, foi usado um shim descartável em `.validation-bin/pnpm` na raiz deste worktree, removido após os gates. Seu conteúdo foi:

```sh
#!/bin/sh
exec /usr/bin/node /home/shiv/.cache/node/corepack/v1/pnpm/9.15.9/bin/pnpm.cjs "$@"
```

Com o shim executável, os gates seguintes foram executados em `app/`:

```bash
export PATH="$PWD/../.validation-bin:/usr/bin:$PATH"
export NEXT_PUBLIC_PILOT_MODE=true PILOT_MODE=true
export NEXT_PUBLIC_DEMO_SANDBOX=false DEMO_SANDBOX=false
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9
export NEXT_PUBLIC_SUPABASE_ANON_KEY=synthetic-unit-anon-key
export SUPABASE_SERVICE_ROLE_KEY=synthetic-build-service-role-key
unset EDUCA_LIVE_SUPABASE EDUCA_USER_STATUS_DB_TEST EDUCA_USER_STATUS_HTTP_TEST
/usr/bin/node "$P" run typecheck
/usr/bin/node "$P" run lint
CIRCLE_NODE_TOTAL=3 NEXT_TELEMETRY_DISABLED=1 /usr/bin/node "$P" run build
```

`CIRCLE_NODE_TOTAL=3` resulta em dois workers na fórmula do Next instalado, que subtrai um. O log confirma dois workers na coleta e geração estática. Os valores Supabase acima são placeholders sintéticos e apontam para loopback, não credenciais ou endpoints provisionados.

## Skips e limites

Os 29 SKIP pertencem aos cinco arquivos live em `app/tests/live/`: `attendance-auth.live.test.ts`, `user-lifecycle.live.test.ts`, `user-lifecycle-revocation.live.test.ts`, `user-status-atomic.live.test.ts` e `user-status-concurrency.live.test.ts`. Seus opt-ins `EDUCA_LIVE_SUPABASE`, `EDUCA_USER_STATUS_HTTP_TEST` e `EDUCA_USER_STATUS_DB_TEST` ficaram ausentes. Nenhum teste foi excluído ou alterado para obter esse resultado. Não houve Supabase provisionado nem execução desses contratos live.

Cada execução completa emitiu 46 avisos experimentais de localStorage do Node e dois erros esperados `PILOT_APP_SERVER_ORIGIN_INVALID`, originados nas assertions negativas de `app/tests/unit/pilot/pilot-app-server.test.ts`. O build avisou que os dados Browserslist estavam desatualizados. Os avisos foram preservados; não houve atualização de dependências.

Antes da reprodução válida, duas tentativas com `/usr/bin/node /home/shiv/.local/bin/pnpm run test tests/unit/navigation.test.ts --maxWorkers=1`, uma por modo com demo desligado e `EDUCA_LIVE_SUPABASE` ausente, encontraram pnpm 11.24.0. Ambas abortaram antes do Vitest com `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`, durante a instalação automática tentada pelo pnpm. Não são resultados de testes. O executável foi substituído pelo pnpm 9.15.9 já disponível no cache, sem executar instalação nem alterar dependências ou lockfile. Evidências: [piloto](pnpm11-pilot-aborted.log) e [geral](pnpm11-general-aborted.log).

Não houve timeout ou OOM nos gates concluídos. Não foram executados R3, E2E de navegador, banco provisionado, deploy, dados reais, envio de notificações ou alteração de flags remotas. Esta evidência prova o contrato unitário de navegação e os gates locais solicitados, não autoriza ampliar o piloto nem declara prontidão operacional.
