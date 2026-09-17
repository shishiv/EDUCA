# F07: restore do agregado pedagógico sintético

**PASS dentro da allowlist parcial v2.** A campanha executou backup cifrado, descriptografia, replay PostgreSQL real, verificações pedagógicas e cleanup. Não é recuperação municipal, de produção ou dos serviços gerenciados do provedor.

- Data da validação: 2026-09-17.
- Base confirmada antes da implementação e novamente antes da entrega: `origin/dev@877f6cdb82bb3bdc89beead5e1adfb1e2da7ba3b`.
- Código validado: `05d0f6718602f75b2b6558a2f9cb7bd03237834e`. O commit seguinte acrescenta somente estes recibos.
- Escopo: https://github.com/shishiv/EDUCA/issues/231. Dependência F02 já mesclada em https://github.com/shishiv/EDUCA/pull/238.
- As 50 migrations canônicas, o provisioner, `restore-grants.sql` e seus testes F02 não foram alterados.

## Cobertura recuperada

O [inventário v2](../../supabase/tests/pilot/restore-coverage-v2.tsv) fixa a ordem de 26 tabelas. As oito inclusões são `configs`, `anos_letivos`, `conteudo_aula`, `attendance_reopen_requests`, `vivencias`, `vivencias_campos_experiencia`, `relatorios_descritivos` e `relatorios_descritivos_vivencias`. O inventário v1 e os recibos F02 continuam preservados.

A cópia substitui defaults recriados, em vez de mesclá-los com os overrides recuperados. O replay usa owner somente no banco descartável e não amplia grants para browser ou service role. Triggers em modo replica não renovam capturas, deadlines, IDs de vínculos nem timestamps. A verificação posterior procura órfãos em todas as FKs públicas. Referenciar uma dependência excluída e ausente resulta em erro, não em ampliação implícita do backup.

O cenário recuperado contém:

- Duas escolas, quatro perfis e dois alunos. O ano de A tem semestre configurado. O de B tem `periodos = []`.
- 60 Vivências capturadas no relatório A, com 120 vínculos de campos e 60 vínculos originais de relatório. A escola B tem outra Vivência e outro vínculo de campo.
- Relatório A finalizado pelo trigger real. Antes do backup, mudam o texto da primeira Vivência e o nome do semestre. O snapshot restaurado mantém texto e período anteriores.
- Relatório B inserido antes da migration de snapshot. O restore mantém `fontes_snapshot IS NULL`, o timestamp histórico e a ausência de vínculos. As tentativas de preencher o snapshot e inserir uma fonte retroativa são negadas.
- Três conteúdos de diário. Duas decisões de reabertura. A aprovação capturada mantém `2026-01-01T14:00:00Z` e duas horas, mesmo com override atual de oito horas. A outra aprovação permanece sem prazo capturado.
- A tentativa de escrever frequência na janela vencida falha. Configurar 48 horas depois do restore não altera o prazo antigo.

O fingerprint é recomposto com `sha256(convert_to(jsonb_build_object('periodo', ..., 'fontes', ...)::text, 'UTF8'))`, a mesma serialização PostgreSQL JSONB do contrato canônico. Não se usa serialização JavaScript nem novo preview das fontes mutáveis. A igualdade integral dos CSVs também preserva os timestamps de captura e os deadlines da origem.

O ator A lê seus dados pedagógicos e não lê os registros testemunha de B. A prova inclui os RPCs de ano letivo e preview, conteúdo do diário, Vivências, campos, relatórios, vínculos, configuração de reabertura e pedidos. A projeção das 18 colunas permitidas de alunos, negações CPF/NIS/notas e escrita de frequência entre escolas continuam cobertas pelo F02.

## Campanha portátil executada

De `app/`, com Node nativo e pnpm 9:

```bash
bash ../supabase/tests/pilot/run-pedagogical-rehearsal.sh \
  none student-checksum attendance-checksum policy auth storage artifact cleanup \
  pedagogical-omission snapshot deadline
```

O runner criou uma origem Supabase local exclusiva, com lease de portas. Nenhum stack compartilhado foi reutilizado. A fixture histórica entrou antes da migration de snapshot e as migrations restantes foram aplicadas sem alteração. A preparação inseriu dados sintéticos e duas imagens mínimas no Storage dessa origem descartável. Depois da preparação, `run-backup-restore.sh` somente leu a origem.

A primeira tentativa de integração detectou colisão entre a sessão aberta da fixture e o probe de escrita F02. A preparação passou a fechar aquela sessão por UPDATE normal antes do backup. O probe F02 não foi relaxado. A campanha final abaixo foi repetida depois da inclusão do marcador verificável de cleanup.

[Campanha e cleanup](portable-campaign.log), [positivo completo](none.log) e [receipt portátil](portable-receipt.md).

| Execução | Resultado observado |
| --- | --- |
| `none` | Saída 0, 73 assertions sem falha, 26 fingerprints de tabela iguais, hash PostgreSQL JSONB e cenário pedagógico aprovados |
| `student-checksum`, `attendance-checksum` | Saída 1 por divergência de dados. Probes F02 preservados |
| `policy`, `auth`, `storage` | Saída 1 pelas respectivas divergências de catálogo, identidade e bytes. Probes F02 preservados |
| `artifact` | Saída 1 por falha de descriptografia, antes do replay |
| `cleanup` | Saída 1 pelo controle negativo de cleanup, sem receipt de sucesso. O trap removeu os recursos reais |
| `pedagogical-omission` | Saída 1 ao omitir os vínculos de campos. Contagem do cenário e fingerprint da tabela rejeitaram a omissão |
| `snapshot` | Saída 1 ao corromper o texto capturado. Hash PostgreSQL JSONB, cenário e fingerprint da tabela rejeitaram a corrupção |
| `deadline` | Saída 1 ao deslocar aprovação, decisão e deadline por um dia mantendo a aritmética válida. Igualdade com a origem e cenário rejeitaram a renovação |

Cada negativo emitiu `PILOT_RESTORE_PROOF_RED`, não deixou receipt de sucesso da execução e confirmou `temporary_database_and_artifacts_removed`. O rehearsal consultou `pg_database` após cada execução e encontrou zero bancos temporários de restore. Ao sair, o helper verificou ausência de containers, volumes e rede da origem e liberou o lease. A [conferência posterior](cleanup-verification.txt) também encontrou zero recursos F07.

O positivo recuperou quatro identidades limitadas, dois metadados de fotos e os respectivos arquivos. RPO observado de 0 segundos contra 24 horas documentadas e RTO de 3 segundos contra 4 horas documentadas. Esses números pertencem à fixture pequena, parada para escrita, e não são SLA nem projeção de escala.

## Regressão raw-PostgreSQL

A [execução positiva](raw-none.log) criou origem e destino independentes no PostgreSQL 16. Ambos receberam a cadeia canônica. Somente a origem recebeu fixtures. O destino recebeu exclusivamente CSVs e manifesto de identidade. O cluster abriu socket Unix, sem rede.

Exemplo executado a partir da raiz:

```bash
docker run --rm --pull=never --name educa-f07-raw-none \
  --network none --cpus=2 --memory=1g --user postgres \
  -v "$PWD:/work:ro" -w /work/app --entrypoint bash \
  postgres:16-alpine ../supabase/tests/pilot/run-restore-contract.sh
```

O mesmo comando foi executado com `-e PILOT_RESTORE_RAW_BREAK=<probe>` para cada negativo. [Resultados](raw-results.txt): os três probes F02 `allowed-column`, `cpf` e `nis` retornaram 3. As oito omissões `omit-<tabela F07>` retornaram 1. `snapshot`, `deadline` e `orphan` retornaram 3. Cada falha veio da assertion prevista, não de erro de infraestrutura, e confirmou remoção do cluster, CSVs e container. `orphan` conservou a contagem, mas quebrou a FK conteúdo/sessão, rejeitada por `RESTORE_DEPENDENCY_MISSING`.

O positivo também conservou todas as mutações internas de grants F02, além das mutações de `qual`, `with_check`, RLS e grants do catálogo.

Contagens raw-PG das inclusões F07: `configs=15`, `anos_letivos=2`, `conteudo_aula=3`, `attendance_reopen_requests=2`, `vivencias=61`, `vivencias_campos_experiencia=121`, `relatorios_descritivos=2`, `relatorios_descritivos_vivencias=60`.

Oito tabelas raw estavam vazias: `responsaveis`, `aluno_responsaveis`, `aulas_abertas`, `pilot_import_batches`, `pilot_import_approvals`, `pilot_user_invitations`, `pilot_metric_events` e `pilot_data_tombstones`. Comparar CSVs vazios não prova recuperação de linhas. A campanha portátil acrescentou o tombstone e o verificou, mas as outras sete continuaram vazias.

## Gates e ambiente

Node `/usr/bin/node`, `v26.8.1`, ABI `147`. pnpm `9.15.9` do cache existente, executado pelo Node nativo. Clientes PostgreSQL `18.6`. Nenhuma instalação ou mudança de dependências, lockfile ou configuração de lint foi feita.

| Gate | Resultado |
| --- | --- |
| `pnpm typecheck` | Passou. [Log](typecheck.log) |
| `pnpm lint` | Oxlint com complexity max10 e anti-slop, depois ESLint sem warnings. [Log](lint.log) |
| `pnpm run test --maxWorkers=2` | 1366 passaram, 29 skipped em cinco arquivos live opt-in. [Log](unit-full.log) |
| `/usr/bin/node --test --test-concurrency=1 tools/oxlint/anti-slop/tests/no-shape-in-symbol-names.test.mjs` | 2 passaram. [Log](anti-slop-plugin.log) |
| `CIRCLE_NODE_TOTAL=3 NEXT_TELEMETRY_DISABLED=1 pnpm build` | Passou com dois workers e 71 páginas estáticas. [Log](build.log) |
| `supabase/tests/database/run.sh` | Cadeia canônica, contratos SQL, replay de catálogo e concorrência de relatórios passaram no container raw-PG sem rede, 2 CPUs e 1 GiB. [Log](database.log) |
| `bash -n supabase/tests/pilot/*.sh`, `git diff --check` | Passaram |

`pnpm test --maxWorkers=2` foi recusado pelo parsing do pnpm antes de iniciar testes. A execução real acima usou `pnpm run test --maxWorkers=2`. Os cinco arquivos skipped são `attendance-auth.live.test.ts`, `user-lifecycle.live.test.ts`, `user-lifecycle-revocation.live.test.ts`, `user-status-atomic.live.test.ts` e `user-status-concurrency.live.test.ts`. Não são PASS. Avisos experimentais do Node e mensagens esperadas de testes negativos estão nos logs.

Imagens locais usadas:

- `postgres:16-alpine`, `sha256:cf78e76683b9ca8c5733cbbdce6c9262b45b6767934dd0a95e671f9a0fc20685`.
- `public.ecr.aws/supabase/postgres:17.6.1.156`, `sha256:ca7871b587ca2c401ac0f325df6249c9aa0d25647ded34631158efc51176767f`.

[Hashes dos fontes](source-files.sha256) incluem os arquivos da prova, wrapper e migrations. Conferência da raiz: `sha256sum -c artifacts/f07-pedagogical-restore/source-files.sha256`. Nos logs versionados foram normalizados somente CRLF, espaços de fim de linha e linhas vazias finais. Credenciais locais do Supabase foram redigidas pelo helper existente. Não foram versionados CSVs, imagens, artifact cifrado ou chaves.

## Limites e revisão

O inventário exclui disciplinas, acordos de importação, auditoria histórica completa, certificados, WhatsApp, Educacenso e outros módulos fora da lista. Os pedidos de reabertura mantêm estados antes/depois e o piloto conserva seu log, mas isso não recupera toda a auditoria.

Não foram exercitados login GoTrue, senha, sessão, refresh token, MFA, revogação, convite consumível, Storage HTTP restaurado, backup concorrente online, PITR municipal ou escala operacional. O download HTTP veio da origem sintética. Os bytes recuperados foram verificados em arquivos, sem publicar um serviço Storage restaurado. Browser e E2E da aplicação não foram executados nesta fatia, pois não há mudança de UI ou de contrato de aplicação. Os gates SQL e portátil não substituem esses percursos.

A revisão local confrontou o diff com o contrato canônico de snapshots/períodos, janela de correção, os probes F02 e os contrafactuais executados. Não foi estabelecido achado material nos caminhos inspecionados. Permanece uma prova parcial de dados e estrutura recriada, sem alegação de recuperação dos serviços de provedor. Não houve CI hospedado, deploy, merge, dados reais ou envio externo de dados do piloto.
