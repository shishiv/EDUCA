# Prova sintética de restore portátil

Esta rotina oferece uma prova **parcial** de restore portátil local com dados sintéticos. Estrutura recriada por migrations não equivale a dados recuperados.

Ela não prova recuperação completa do piloto/A1/B1, prontidão municipal, aprovação legal, contrato, SLA comercial ou PITR gerenciado.

## Comando

Com o Supabase local em execução e já preparado pelo piloto sintético:

```bash
cd app
pnpm pilot:restore-test
```

O comando lê o banco local de origem, sem escrever nele, e cria um banco temporário separado.

Ele nunca chama o reset do demo, não usa endpoint remoto e não aceita credenciais de produção.

O receipt redigido fica em `.pilot-evidence/synthetic-restore-evidence.md`.

## Alvo e dados

O guard de T08 exige estes valores:

- alvo: `isolated-proof`
- alvo de banco: `isolated_proof`
- modo: `synthetic`
- marcador: `SYNTHETIC-EDUCA-PILOT`
- identidades: domínio `.invalid`

O inventário versionado [`restore-coverage-v1.tsv`](../supabase/tests/pilot/restore-coverage-v1.tsv) é a fonte da allowlist: cada item tem status e motivo. O runner registra versão e SHA-256 do inventário no manifesto e no receipt. A lista de 18 tabelas públicas não foi ampliada nesta fatia.

A allowlist inclui configuração municipal sintética, escolas, perfis, turmas, responsáveis, alunos, matrículas, aulas, sessões, frequência e tabelas do piloto. Auth referenciado por perfis ou convites e Storage de fotos sintéticas têm cobertura parcial, detalhada no inventário.

**Não recuperados:** `configs` (incluindo overrides escolares), `anos_letivos`/períodos, `attendance_reopen_requests`/janela auditada, Vivências e seus campos, relatórios e snapshots/proveniência, além das demais tabelas fora da lista explícita. Defaults ou tabelas recriados por migrations não recuperam esses registros. Ampliar a cobertura para o agregado A1/B1 pertence a F07. Notas seguem bloqueadas; não se alteram RLS, grants, janela de frequência ou contratos canônicos de Vivências.

O Storage exporta metadados de bucket e objeto, além dos bytes obtidos pelo contrato local de Storage.

O artifact exclui owners, ACLs, roles, extensões, configurações gerenciadas de sessão e metadados de PITR do provedor.

## Postconditions

O runner valida independentemente:

- lista do artifact após descriptografia e remoção dos arquivos plaintext;
- contagens e fingerprints de todas as tabelas allowlisted;
- contagem e fingerprint do manifesto Auth;
- metadados Storage e checksum dos bytes;
- catálogo recriado antes/depois do replay: políticas com `qual`, `with_check`, roles e permissividade, RLS, ACLs de relações/colunas/funções públicas e políticas Storage do piloto;
- SELECT nas 18 colunas permitidas de `alunos`, negação nas demais (incluindo CPF/NIS), negação de SELECT de tabela e bloqueio de notas;
- view com `security_invoker` e existência do RPC;
- guard do piloto e configuração sintética;
- relacionamentos, tombstone e contagem de auditoria;
- sessão sintética de professor, com leitura e escrita dentro da escola;
- negação de leitura e escrita fora da escola;
- RPO e RTO observados contra os campos documentados no `pilot_municipality_config`.

O receipt não contém nomes, e-mails, telefones, linhas CSV ou bytes de aluno.

O banco temporário, artifacts plaintext, artifact cifrado e credenciais geradas são removidos em sucesso e falha.

### Limites de Auth, Storage e catálogo

`auth.users` recupera somente `id`, `email` e `created_at` referenciados. O destino usa [`restore-bootstrap.sql`](../supabase/tests/pilot/restore-bootstrap.sql), um shim SQL, não um serviço Auth restaurado. Claims SQL e vínculo perfil/identidade **não** provam login GoTrue, senha, sessão, refresh token, identidades de provedores, MFA, convite consumível ou revogação. A fixture de keys atuais (`SECRET_KEY`) e alias legado (`SERVICE_ROLE_KEY`) prova somente a seleção local de credenciais do wrapper.

Os bytes de Storage são baixados da origem local e conferidos em arquivos após descriptografia; não há upload nem leitura HTTP em um Storage restaurado. ACLs gerenciadas de Auth/Storage não são copiadas. O catálogo comparado é o baseline das migrations + provisioner deste checkout, não um backup das ACLs de origem. O probe específico de grants também confere INSERT de frequência e SELECT de objetos Storage.

## Regressão focal sem Supabase

Com PostgreSQL 15+ disponível (`initdb`, `pg_ctl`, `psql`), como usuário não-root:

```bash
cd app
pnpm test:database:restore
pnpm exec vitest run --maxWorkers=2 tests/unit/pilot/restore-wrapper.test.ts tests/unit/pilot/restore-coverage.test.ts
```

O primeiro comando cria um cluster temporário, acessível apenas por socket Unix, migra origem e destino independentemente, carrega uma fixture sintética de duas escolas, compara CSVs das 18 tabelas e do manifesto de identidade, testa o catálogo e remove cluster/CSVs no EXIT. Cada tabela informa sua contagem: comparação de tabela vazia não é prova de recuperação de dados nela. Um sentinel de configuração escolar fica deliberadamente fora do restore.

Ele testa a remoção de **cada** coluna permitida, grants de CPF/NIS e demais colunas sensíveis, e o contrafactual inseguro de SELECT de tabela. Todas essas mutações acontecem em subtransações revertidas. Alterar apenas `qual` ou `with_check`, desligar RLS ou adicionar grant deve mudar o catálogo. A sessão SQL prova roster escolar, negação de CPF/NIS/notas e escrita de frequência fora da escola negada.

Probes externos devem retornar não-zero e confirmar cleanup:

```bash
PILOT_RESTORE_RAW_BREAK=allowed-column pnpm test:database:restore
PILOT_RESTORE_RAW_BREAK=cpf pnpm test:database:restore
PILOT_RESTORE_RAW_BREAK=nis pnpm test:database:restore
```

Alternativa isolada, sem instalar servidor no host, a partir de `app/`:

```bash
docker run --rm --pull=never --network none --cpus=2 --memory=1g --user postgres \
  -v "$(cd .. && pwd):/work:ro" -w /work/app --entrypoint bash \
  postgres:16-alpine ../supabase/tests/pilot/run-restore-contract.sh
```

Essa regressão raw-PG **não executa** criptografia do artifact, download/bytes de Storage, RPO/RTO ou serviço Auth. Não substitui a rotina portátil completa nem autoriza marcar esses itens como verdes. O histórico preservado está em [`F02-RESTORE-GRANTS.md`](F02-RESTORE-GRANTS.md). A reconciliação sobre `dev` e os gates de conclusão estão no [recibo F02](../artifacts/f02-restore-grants/README.md).

## Deliberate-breaks

Cada probe deve retornar código diferente de zero e emitir `PILOT_RESTORE_PROOF_RED`:

```bash
PILOT_RESTORE_DELIBERATE_BREAK=student-checksum pnpm pilot:restore-test
PILOT_RESTORE_DELIBERATE_BREAK=attendance-checksum pnpm pilot:restore-test
PILOT_RESTORE_DELIBERATE_BREAK=policy pnpm pilot:restore-test
PILOT_RESTORE_DELIBERATE_BREAK=auth pnpm pilot:restore-test
PILOT_RESTORE_DELIBERATE_BREAK=storage pnpm pilot:restore-test
PILOT_RESTORE_DELIBERATE_BREAK=artifact pnpm pilot:restore-test
PILOT_RESTORE_DELIBERATE_BREAK=cleanup pnpm pilot:restore-test
```

Use os probes somente contra o stack local descartável e sintético.
