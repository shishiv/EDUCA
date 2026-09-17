# F02: probe de grants do restore parcial

## Escopo e diagnóstico

Base investigada: `063e0e97` em worktree descartável; somente dados sintéticos. O arquivo `data/educa-pstack-integrate-r2/report.md` citado no despacho não estava no checkout nem no histórico disponível. Esta entrega segue o escopo F02 detalhado no brief, sem inferir autorização para F07.

- **Gatilho:** depois de recriar o destino com migrations + provisioner do piloto e copiar os CSVs allowlisted, o runner calcula `RESTORE_GRANTS_OK`.
- **Condição que expõe:** a cadeia vigente concede SELECT por coluna em `alunos`, não SELECT de tabela. `has_table_privilege(..., 'SELECT')` é falso mesmo quando o roster permitido está acessível.
- **Condições que mascaram:** uma origem/destino antigo ou um grant indevido de tabela tornaria esse termo verdadeiro. Separadamente, o wrapper antigo nem alcança o restore quando `supabase status -o env` fornece apenas `SECRET_KEY`, sem o alias legado `SERVICE_ROLE_KEY`; credenciais herdadas também podiam mascarar essa omissão.
- **Sintoma para o operador:** ao alcançar o probe antigo no catálogo correto, `restore.grants` é falso; o código registra `PILOT_RESTORE_ASSERTION name=restore.grants result=fail` e termina com `PILOT_RESTORE_PROOF_RED`, sem receipt de sucesso. Com keys atuais, o wrapper antigo termina antes com `PILOT_RESTORE_LOCAL_STACK_REQUIRED: Supabase status is missing SERVICE_ROLE_KEY`. Não se executou uma campanha Supabase completa para alegar esse percurso inteiro: a expressão SQL e a barreira do wrapper foram reproduzidas separadamente.

### Histórico e evidência contrária à hipótese de migration defeituosa

1. `22444880` (2026-08-12) introduziu o runner portátil com o probe de SELECT de tabela. `20260810220000_governed_pilot_security_hardening.sql` concedia esse privilégio naquele contrato.
2. `10bd95dd` (2026-08-25), migration `20260815000000_bolsa_familia_visibility_policy.sql`, restringiu SELECT de `alunos` para retirar NIS/PBF da leitura direta.
3. `ee3db6a5` (2026-08-26), migration `20260829000000_sensitive_family_read_boundary.sql`, estabeleceu as 18 colunas atuais e retirou CPF/campos familiares. O runner continuou com o probe anterior.
4. Recriamos o **mesmo bootstrap SQL do destino**, todas as 49 migrations ordenadas e o provisioner. O teste existente `sensitive_family_read_boundary.test.sql` passou nesse catálogo. O provisioner não recoloca SELECT de tabela. Isso nega a hipótese de que faltasse conceder um privilégio no destino.
5. Menor contrafactual: dentro de uma transação descartável, um SELECT de tabela faz o termo antigo passar **e** abre CPF/NIS. ROLLBACK restaura o contrato. Esse é um teste de rejeição, nunca uma correção de grants.

Trecho observado no PostgreSQL 16 isolado:

```text
                         tabela   nome_completo   cpf     nis
current                  false    true            false   false
old_restore_grants_ok    false
unsafe_counterfactual    true                     true    true
ROLLBACK
F02_REPRO_OK: old probe false; current security contract passes; unsafe grant would mask failure; transaction rolled back
```

Fixtures do wrapper antigo, sem credenciais herdadas:

```text
old_wrapper/current: exit=1
PILOT_RESTORE_LOCAL_STACK_REQUIRED: Supabase status is missing SERVICE_ROLE_KEY
old_wrapper/legacy: exit=0
FIXTURE_REACHED_RESTORE
```

## Correção delimitada

- [`restore-grants.sql`](../supabase/tests/pilot/restore-grants.sql) exige cada coluna permitida, nega todas as outras (inclusive CPF/NIS e campos familiares), SELECT de tabela, acesso anônimo e leitura de notas. Preserva os probes de frequência e Storage. Nenhuma migration ou grant de aplicação foi alterado.
- O wrapper aceita `SECRET_KEY` atual e `SERVICE_ROLE_KEY` legado, preferindo a atual, sem aproveitar aliases herdados ausentes no status local. As fixtures não exercitam Auth.
- [`restore-coverage-v1.tsv`](../supabase/tests/pilot/restore-coverage-v1.tsv) versiona incluídos, parciais, excluídos e motivos. A ordem e as 18 tabelas são idênticas à lista anterior. Inventário e hash são referenciados no manifesto/receipt.
- O bootstrap foi extraído sem alteração de SQL/grants para que a regressão use o mesmo caminho estrutural. [`restore-catalog.sql`](../supabase/tests/pilot/restore-catalog.sql) compara expressões `qual`/`with_check`, roles, permissividade, RLS e grants com o baseline recém-migrado, não apenas nomes/contagens/hash não vazio. Esse baseline **recria** estrutura; não recupera ACLs ou dados de origem.
- Recibos e documentação declaram prova parcial. Não se ampliam restore, grants ou allowlists para A1/B1. Configurações/períodos escolares, janela auditada/reaberturas, Vivências, relatórios e snapshots permanecem fora da recuperação desta fatia.

## Prova raw-PostgreSQL executada

Comando de `app/`, sem rede, sem credenciais externas e sem lifecycle Supabase compartilhado:

```bash
docker run --rm --network none --user postgres \
  -v "$(cd .. && pwd):/work:ro" -w /work/app --entrypoint bash \
  postgres:16-alpine ../supabase/tests/pilot/run-restore-contract.sh
```

Imagem local: `sha256:cf78e76683b9ca8c5733cbbdce6c9262b45b6767934dd0a95e671f9a0fc20685`.

O host dispõe de clientes PostgreSQL, mas não `initdb`/`pg_ctl`; usou-se o PostgreSQL raw da imagem já disponível, não o banco gerenciado/Supabase. Origem e destino foram migrados independentemente; somente a fixture sintética foi inserida.

Comparações de CSV passaram nas 18 tabelas. Dados efetivamente presentes: configuração municipal (1), threshold municipal (1), escolas (2), perfis (2), turmas (2), alunos (2), matrículas (2), sessões (1), frequência (1), auditoria (12) e manifesto de identidade (2). As outras **8 tabelas estavam vazias**: responsáveis, vínculos aluno/responsável, aulas legadas, batches, aprovações, convites, métricas e tombstones. Sua comparação não prova recuperação de linhas. O sentinel de `configs` na origem não aparece no destino, demonstrando uma exclusão, não escondendo-a atrás das migrations.

```text
RESTORE_CATALOG_OK: qual, with_check, RLS and grants mutations detected
RESTORE_GRANTS_REGRESSION_OK: 18 allowed revokes, 6 sensitive grants, unsafe table grant rejected
RESTORE_SCOPE_OK: SQL claims only, no Auth service session proved
RESTORE_RAW_PARTIAL_OK: 18 table CSV comparisons (empty tables identified), identity manifest and migration catalog; no Storage bytes, encryption or GoTrue session proof
RESTORE_CONTRACT_CLEANUP: status=0 temporary_cluster_and_csv_removed
EXPECTED_RED: allowed-column exit=3 cleanup=confirmed
EXPECTED_RED: cpf exit=3 cleanup=confirmed
EXPECTED_RED: nis exit=3 cleanup=confirmed
```

Cada probe externo foi executado em um novo container/cluster com `PILOT_RESTORE_RAW_BREAK` correspondente. O erro foi `RESTORE_GRANTS_REGRESSION: current column contract must pass`, não falha de infraestrutura. Os testes internos retiram individualmente as 18 colunas permitidas e concedem individualmente seis colunas sensíveis; todos devem tornar o probe falso e são revertidos. A escola B permanece invisível ao professor A; leitura de CPF/NIS/notas e escrita de frequência entre escolas são negadas.

## Gates e limites

**Encerramento antecipado solicitado pelo captain via inbox 001.** Implementação e validação foram interrompidas; esta mudança é preservada para revisão em **draft**, não pronta para merge. Os processos do driver de gates e seus descendentes foram encerrados. Os containers raw-PG da tarefa já haviam saído com `--rm`; nenhum serviço compartilhado foi parado.

Ambiente: Node `v26.8.2`, pnpm `9.15.9` (instalação frozen bem-sucedida). A tentativa inicial com pnpm global 11 foi recusada por incompatibilidade de configuração do lockfile; o lockfile não foi alterado.

| Check | Resultado realmente observado |
| --- | --- |
| Raw-PG + escola/RLS/grants/catálogo/CSVs | Passou; prova parcial descrita acima |
| Raw-PG `allowed-column`, `cpf`, `nis` | Três saídas 3 esperadas, erro de regressão correto, cleanup confirmado |
| Vitest focal `restore-wrapper.test.ts` | 8 testes passaram antes do ajuste posterior de tipo |
| `restore-coverage.test.ts` | Adicionado; execução ainda pendente |
| `pnpm typecheck` | Vermelho, saída 2; erros na fixture `restore-wrapper.test.ts` |
| `pnpm lint` | Primeira execução alcançou ESLint após Oxlint (complexity max10 + anti-slop), mas foi interrompida por timeout externo; retry interrompido pelo encerramento. Gate completo não aprovado |
| `pnpm lint:anti-slop-plugin` | Não executado |
| `pnpm test` | Interrompido por timeout externo sem resultado final; registrou falha de checkmark em `DescriptiveReportForm.test.tsx`. Retry serial ainda não executado |
| `pnpm build` | Não executado |
| `bash -n` e `git diff --check` | Passaram na verificação feita antes do encerramento |

Pendências explícitas: corrigir o ambiente da fixture para satisfazer o `ProcessEnv` aumentado pelo Next (`NODE_ENV` obrigatório), validar o tipo dos parâmetros de casos tabulares, executar typecheck/lint/plugin/unit/build e reexecutar os testes focais no estado final. Houve um ajuste de assinatura de `Record<string, string>` para `NodeJS.ProcessEnv` antes da ordem de parada, **não revalidado**; a saída do typecheck capturou a assinatura anterior e a ausência de `NODE_ENV`. Não se continuou a corrigir após a ordem. A melhoria final de mensagens/traps de cleanup também não recebeu nova execução raw-PG. Os comandos autoritativos permanecem em `CONTEXT.md`.

A rotina portátil completa `pnpm pilot:restore-test` **não foi executada nesta fatia**: não se preparou nem se reutilizou um stack Supabase sintético para repetir a campanha. Portanto criptografia/descriptografia, bytes HTTP Storage, RPO/RTO e o caminho portátil completo permanecem **não revalidados**, não verdes. O raw-PG não os substitui. Auth sempre se limita ao manifesto `id/email/created_at` e claims SQL: não há prova de login GoTrue, senha, refresh token, sessão, MFA, identidades de provedor ou revogação. Não há prontidão municipal nem autorização de produção/dados reais.
