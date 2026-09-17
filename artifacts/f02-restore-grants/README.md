# F02: conclusão do probe de grants do restore parcial

Validação local em 2026-09-17. **PASS restrito ao probe e à recuperação parcial descrita abaixo.** Não é prova do restore portátil completo.

- Base confirmada antes da implementação e da entrega: `origin/dev@5a77d1379ea1579dea6a1e907aa6f094f4fba07d`.
- Código validado: `b4099bc469ed460dd8967ff800af18684084eb30`. O commit seguinte acrescenta somente estes recibos.
- Continuidade de https://github.com/shishiv/EDUCA/issues/226.
- Draft preservado: https://github.com/shishiv/EDUCA/pull/223, head `07466e0bd3269b6389ba069abd1df5ebd548a318`, base `dev`, aberto e ainda draft na conferência de entrega. Nenhuma publicação foi feita na branch daquele draft.
- [`docs/F02-RESTORE-GRANTS.md`](../../docs/F02-RESTORE-GRANTS.md) mantém os bytes históricos. SHA-256 `51d82ba6c7426daf1839b271642319d3a5adaaf41f762e8dad00d257e43c8b23`. Seus gates interrompidos não são os gates desta execução.

## Defeito e correção

No catálogo canônico, `alunos` concede SELECT em 18 colunas e nega SELECT de tabela. O termo antigo de `RESTORE_GRANTS_OK` exigia justamente esse SELECT de tabela. Concedê-lo faria o probe antigo passar, mas exporia CPF e NIS.

O runner usa agora [`restore-grants.sql`](../../supabase/tests/pilot/restore-grants.sql). O probe exige todas as colunas permitidas, nega as demais e SELECT de tabela, nega leitura anônima de alunos e leitura de notas, e conserva os requisitos de frequência e Storage. A cadeia de 49 migrations e o provisioner do piloto não foram alterados. As 18 tabelas da allowlist e sua ordem também não mudaram.

O conteúdo preservado foi reaplicado sobre o `dev` atual, sem trazer sua base antiga. A fixture aceita overrides de ambiente como `Partial<NodeJS.ProcessEnv>` e constrói o processo filho com `NODE_ENV: 'test'`. Os parâmetros dos casos tabulares passam pelo mesmo contrato. Não foram usados casts, supressões ou relaxamento de gates.

O wrapper continua limitado ao status do Supabase local. Ele aceita `SECRET_KEY` atual e `SERVICE_ROLE_KEY` legado sem reutilizar credenciais herdadas ausentes no status. Os testes de fixture provam essa seleção, não compatibilidade operacional com GoTrue ou Storage HTTP.

## Gates observados

Node nativo `/usr/bin/node`, `v26.8.1`, ABI `147`. pnpm `9.15.9`, já disponível no cache local, foi executado pelo Node nativo. Nenhuma instalação ou mudança de lockfile foi necessária. O pnpm global 11 foi recusado antes dos gates por incompatibilidade do diretório de dependências, sem remover dependências. A retomada usou pnpm 9 para respeitar o contrato do projeto.

Comandos de aplicação executados em `app/`, com pnpm 9 e `/usr/bin/node` na resolução dos subprocessos:

| Comando | Resultado | Evidência |
| --- | --- | --- |
| `pnpm typecheck` antes da correção da fixture | Falhou com TS2741 e TS2345, ausência de `NODE_ENV` | [typecheck-before.log](typecheck-before.log) |
| `pnpm typecheck` após a correção | Passou | [typecheck.log](typecheck.log) |
| `pnpm lint` | Passou Oxlint com complexity max10 e anti-slop, seguido de ESLint com `--max-warnings 0` | [lint.log](lint.log) |
| `/usr/bin/node --test --test-concurrency=1 tools/oxlint/anti-slop/tests/no-shape-in-symbol-names.test.mjs` | 2 passaram. Mesmo alvo de `lint:anti-slop-plugin`, com concorrência explícita | [anti-slop-plugin.log](anti-slop-plugin.log) |
| `pnpm run test --maxWorkers=2 tests/unit/pilot/restore-wrapper.test.ts tests/unit/pilot/restore-coverage.test.ts` | 10 passaram em 2 arquivos | [unit-focused.log](unit-focused.log) |
| `pnpm run test --maxWorkers=2` | 1343 passaram. 20 testes live opt-in em 3 arquivos permaneceram skipped | [unit-full.log](unit-full.log) |
| `CIRCLE_NODE_TOTAL=3 NEXT_TELEMETRY_DISABLED=1 pnpm build` | Passou. Next.js informou 2 workers e 70/70 páginas estáticas | [build.log](build.log) |
| `supabase/tests/database/run.sh` no container raw-PG abaixo | Cadeia canônica, parity de replay, contratos SQL e concorrência de relatórios passaram | [database.log](database.log) |
| `bash -n` nos três runners envolvidos e `git diff --check` | Passaram | Revisão local antes do commit |

As transcrições de comando vinculadas preservam as mensagens e resultados. Somente finais de linha CRLF, espaços no fim de linhas e linhas vazias no fim do arquivo foram normalizados para o gate de whitespace do Git.

Os skips existentes são `attendance-auth.live.test.ts`, `user-lifecycle.live.test.ts` e `user-lifecycle-revocation.live.test.ts`. Não foram executados nem convertidos em PASS. O unit completo emitiu avisos experimentais de `localStorage` do Node 26 e erros esperados dos testes negativos de origem do app. O lint terminou sem warnings.

## Raw-PG reproduzível

Imagem local `postgres:16-alpine`, ID `sha256:cf78e76683b9ca8c5733cbbdce6c9262b45b6767934dd0a95e671f9a0fc20685`. Cada execução usou um container descartável, sem rede, sem download de imagem, limitado a 2 CPUs e 1 GiB. Origem e destino foram migrados independentemente e receberam somente a fixture sintética. O cluster do contrato de restore abriu apenas um socket Unix.

Da raiz do repositório:

```bash
for probe in none allowed-column cpf nis; do
  docker run --rm --pull=never --name "educa-f02-raw-$probe" \
    --network none --cpus=2 --memory=1g --user postgres \
    -e "PILOT_RESTORE_RAW_BREAK=$probe" \
    -v "$PWD:/work:ro" -w /work/app --entrypoint bash \
    postgres:16-alpine ../supabase/tests/pilot/run-restore-contract.sh
done
```

`none` retornou 0. `allowed-column`, `cpf` e `nis` retornaram 3 por `RESTORE_GRANTS_REGRESSION: current column contract must pass`, não por falha de infraestrutura. Cada execução confirmou remoção do cluster e CSVs. Uma consulta Docker posterior confirmou a ausência do container exato. [Resultados e cleanup](raw-results.txt), [verde](raw-none.log), [coluna removida](raw-allowed-column.log), [CPF](raw-cpf.log), [NIS](raw-nis.log).

A execução verde comprovou:

- O probe antigo é falso no catálogo correto. Um grant de tabela o mascararia e é rejeitado pelo novo probe.
- Remover individualmente qualquer uma das 18 colunas permitidas torna o probe falso. A projeção inteira também foi executada como professor restaurado sob RLS.
- Conceder individualmente CPF, NIS, Bolsa Família, nome da mãe, nome do pai ou necessidades especiais torna o probe falso.
- Seis mutações adicionais são rejeitadas: leitura anônima de alunos, retirada de INSERT em frequência, retirada de SELECT em objetos Storage, SELECT de tabela em notas para authenticated, SELECT de coluna em notas para authenticated e SELECT de coluna em notas para anon.
- Alterar `qual`, `with_check`, RLS ou grant modifica o catálogo. As mutações de teste são revertidas.
- O professor da escola A vê seu aluno, não vê o aluno da escola B, não lê CPF, NIS ou notas e não escreve frequência entre escolas.
- Os CSVs restaurados coincidem com a origem nas 18 tabelas. O manifesto de identidade tem dois registros. O sentinel escolar de `configs` fica fora da recuperação.

Para a suíte SQL geral, usou-se o mesmo isolamento com `--name educa-f02-database -w /work` e comando `supabase/tests/database/run.sh`. Esse container também foi removido.

### Contagens e tabelas vazias

| Tabela recuperada | Linhas |
| --- | ---: |
| `pilot_municipality_config` | 1 |
| `attendance_municipal_thresholds` | 1 |
| `escolas` | 2 |
| `users` | 2 |
| `turmas` | 2 |
| `alunos` | 2 |
| `matriculas` | 2 |
| `sessoes_aula` | 1 |
| `frequencia` | 1 |
| `pilot_audit_log` | 12 |

**Oito tabelas vazias:** `responsaveis`, `aluno_responsaveis`, `aulas_abertas`, `pilot_import_batches`, `pilot_import_approvals`, `pilot_user_invitations`, `pilot_metric_events` e `pilot_data_tombstones`. Comparar seus CSVs vazios não prova recuperação de linhas nessas tabelas.

## Limites e revisão

`pnpm pilot:restore-test` não foi executado. Esta entrega não prova login GoTrue, senhas, sessões, refresh tokens, MFA, revogação, Storage HTTP restaurado, bytes Storage, criptografia ou RPO/RTO. A suíte SQL geral não substitui esses percursos. Não houve browser, CI hospedado, deploy, dados reais nem uso de um stack compartilhado.

O catálogo comparado foi recriado pelas migrations, não recuperado das ACLs de uma origem gerenciada. Configurações escolares, períodos, reaberturas, Vivências, relatórios e sua proveniência continuam fora da allowlist. F07 não foi iniciado.

A revisão local confrontou o diff com a migration canônica de grants, a allowlist anterior, o bootstrap original e os testes negativos executados. Não foi estabelecido achado material nos caminhos inspecionados. O risco residual principal continua sendo o restore portátil e os serviços de provedor não exercitados.

[Hashes dos arquivos validados](source-files.sha256) permitem conferir os bytes do código e da cadeia canônica a partir da raiz com `sha256sum -c artifacts/f02-restore-grants/source-files.sha256`.
