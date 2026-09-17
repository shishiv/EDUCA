# F05: receipt do import proof após cleanup

Prova local sintética de 2026-09-17 para [F05](https://github.com/shishiv/EDUCA/issues/229).

- Base: `origin/dev` em `ae207d3f9ff29c147725bf1fd83bc7cff6d2e6e9`.
- Código executado: `492da58becd059dfc4b30e4a9ab12268dae99205`, com árvore limpa no início da prova raw-PG.
- Tentativa final: `20260917T091328Z-ttOJHC`.
- SHA-256 da seleção: `34f47a0969346537eb65e767a81f3ea26311638c0dcb39bdf3894da4d5c12c5f`.
- Runtime: `/usr/bin/node` v26.8.1, ABI 147, pnpm 9.15.9 e PostgreSQL 18.6. Veja [runtime.txt](runtime.txt).

Os commits posteriores que apenas guardam estes arquivos não substituem o SHA de código dentro do receipt. Os logs de comandos tiveram somente espaços finais e terminadores de linha normalizados. O receipt, o resultado e o manifesto foram copiados sem alteração.

## Defeito e correção

O stub de falha no `initdb` reproduziu o defeito original: a execução falhava, mas o receipt verde histórico continuava no caminho corrente. O runner também ignorava falhas de `pg_ctl stop` e escrevia sucesso antes de parar o banco.

Agora cada invocação tem diretório exclusivo, `runId`, SHA e manifesto de fontes. O caminho antigo é aposentado como histórico sem atribuição. O finalizador exige parada bem-sucedida, `pg_ctl status=3`, ausência de PID vivo conhecido e remoção do workspace antes de publicar `receipt.md`. Falha de parada conserva os dados e um caminho local de recuperação. Sinais preservam saída não-zero. Logs brutos e caches dos processos filhos ficam no workspace privado, não na evidência.

A seleção cobre o runner raw-PG inteiro e seus inputs. Os hashes são conferidos antes do sucesso, inclusive para rejeitar alteração de fontes durante uma tentativa. Não houve mudança de migrations, retenção de produto, roles, dados escolares, scheduler ou alvo remoto. O contrato operacional está em [PILOT-DATA-IMPORT.md](../../docs/PILOT-DATA-IMPORT.md#receipt).

## Verificações

Comandos de aplicação executados a partir de `app/`, com Node nativo e pnpm 9 no PATH. Nenhuma instalação global foi feita.

| Comando | Resultado | Evidência |
| --- | --- | --- |
| `pnpm test:pilot:import:lifecycle` | Passou. Histórico, falha precoce, parada falha, parada falsa, PID vivo, status incerto, INT, TERM, HUP, sinal durante cleanup, startup parcial, fonte alterada, sucesso e repetição | [lifecycle.log](lifecycle.log) |
| `TMPDIR="$ROOT/.f05" pnpm test:e2e:pilot:import` | Passou com código 0, deliberate-breaks vermelhos e cleanup verificado | [raw-pg.log](raw-pg.log), [result.json](result.json), [receipt.md](receipt.md) |
| `pnpm typecheck` | Passou | [typecheck.log](typecheck.log) |
| `pnpm lint` | Passou, incluindo oxlint, anti-slop e ESLint | [lint.log](lint.log) |
| `pnpm run test --maxWorkers=1` | Passou: 130 arquivos e 1.366 testes. Permanecem 5 arquivos e 29 testes ignorados pela configuração existente | [unit.log](unit.log) |
| `CIRCLE_NODE_TOTAL=3 NEXT_TELEMETRY_DISABLED=1 pnpm build` | Passou. Next.js informou 2 workers e 71/71 páginas estáticas | [build.log](build.log) |
| `shellcheck scripts/run-pilot-import-proof-e2e.sh scripts/pilot-import-proof-lifecycle.sh tests/unit/pilot/import-proof-lifecycle.test.sh` e `bash -n` nos mesmos arquivos | Passaram, executados a partir de `app/` | [shellcheck.txt](shellcheck.txt) |

O raw-PG aplicou a cadeia canônica de migrations em cluster descartável, publicou dois lotes sintéticos, verificou criptografia, fingerprints, retenção raw, rollback exato, preservação do outro lote, tombstone, auditoria redigida e replay. Os controles negativos cobriram alvo e host rejeitados, demo e referência ao demo, modo real, marcador ausente, modo ausente, piloto desativado, owner ausente, chave ausente e governança alterada.

A conferência externa encontrou o listener local da prova fechado e `.f05` vazio, incluindo os caches dos filhos. O diretório pai também foi removido. Veja [cleanup-verification.txt](cleanup-verification.txt).

Para conferir os bytes selecionados, execute da raiz do repositório no código indicado:

```bash
sha256sum --check artifacts/f05-import-proof-receipt/selection.sha256
```

## Tentativas vermelhas e limites

A suíte geral com 2 workers terminou com todos os 1.366 testes aprovados, mas código não-zero por uma exceção tardia de `@radix-ui/react-focus-scope` em `fechar-aula-dialog.test.tsx`: `dispatchEvent` recebeu um objeto que o jsdom não reconheceu como `Event`. Essa execução não é PASS. O log completo está em [unit-two-workers-error.log](unit-two-workers-error.log). A repetição serial passou sem alterar teste, dependência, configuração ou gate. A intermitência fora dos arquivos F05 permanece sem correção neste recorte.

Um TMPDIR longo dentro do worktree excedeu o limite de socket Unix, primeiro no PostgreSQL e depois no IPC do `tsx` ao conter seus caches no workspace. A tentativa `20260917T090937Z-vvaukn` terminou como `failed`, sem receipt de sucesso, e removeu o cluster. A reprodução mínima do `tsx` confirmou `listen EINVAL`. O PostgreSQL agora escuta somente em loopback TCP, já usado por todos os clientes da prova. A validação final usou `.f05`, autorizado pelo firstmate, para manter o IPC do `tsx` abaixo do limite sem alterar configuração.

Estes resultados não são uma execução de browser, da suíte geral Supabase ou uma prova de dados reais. Não houve deploy, CI hospedado, envio externo de dados, novo acesso, custo, alteração de finalidade ou prazo de retenção. `SIGKILL` e queda da máquina não executam traps: um resultado `running` não é sucesso e exige inspeção local.
