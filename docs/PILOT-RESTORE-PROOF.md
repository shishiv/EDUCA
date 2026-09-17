# Prova sintética de restore portátil

Esta rotina oferece uma prova **parcial** de restore portátil local com dados sintéticos. Estrutura recriada por migrations não equivale a dados recuperados.

Ela não prova recuperação completa do piloto/A1/B1, prontidão municipal, aprovação legal, contrato, SLA comercial ou PITR gerenciado.

## Comando

Para preparar a fixture F07 em um Supabase local **novo e descartável**, executar o restore portátil e remover a origem ao terminar:

```bash
cd app
bash ../supabase/tests/pilot/run-pedagogical-rehearsal.sh
```

O runner reutiliza o lease de portas e o cleanup do piloto. Ele não usa o stack compartilhado, não inicia a aplicação e não exige browser. Precisa de Docker, Supabase CLI local, clientes PostgreSQL, OpenSSL, curl, Python 3 e pnpm. Os logs redigidos e o receipt ficam em `.pilot-evidence/f07/`. As imagens Supabase devem estar disponíveis localmente para uma execução sem download.

Com uma origem local já preparada que contenha relatórios capturados, legado e prazo capturado:

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

O inventário versionado [`restore-coverage-v2.tsv`](../supabase/tests/pilot/restore-coverage-v2.tsv) define as **26 tabelas públicas e sua ordem**. Cada item tem status e motivo. O runner registra versão e SHA-256 do inventário no manifesto e no receipt. O inventário v1 permanece preservado como histórico F02, não como entrada ativa.

F07 acrescenta oito tabelas às 18 anteriores: `configs`, `anos_letivos`, `conteudo_aula`, `attendance_reopen_requests`, `vivencias`, `vivencias_campos_experiencia`, `relatorios_descritivos` e `relatorios_descritivos_vivencias`. Os defaults e overrides de `configs` substituem os defaults recriados no destino. O replay não faz merge de configurações, não recaptura fontes, não regenera vínculos e não renova prazos.

A ordem vai de governança, escolas e perfis a configurações, turmas, alunos, matrículas, sessões, conteúdo/frequência/reaberturas, Vivências, relatórios e metadados do piloto. Ciclos existentes, como diretor da escola e perfil, exigem checagem de dependências depois da cópia. O replay roda como owner somente no destino descartável, com triggers em modo replica. Isso preserva capturas imutáveis sem conceder acesso a tabelas que a aplicação usa por RPC. Depois, `restore-integrity.sql` procura órfãos em todas as FKs públicas, inclusive referências a domínios excluídos. O catálogo e o probe de grants F02 continuam intactos.

**Não recuperados:** disciplinas, acordos do ciclo de importação, auditoria histórica completa em `audit_trail`, `audit_sessoes_aula` e `audit_logs`, certificados, WhatsApp, Educacenso, feature flags, schema canary e qualquer outra tabela fora da lista explícita. Uma referência não nula para dependência excluída e ausente torna a prova vermelha. Os estados antes/depois de reaberturas e `pilot_audit_log` são recuperados, sem alegar recuperação de toda a auditoria. Notas seguem bloqueadas. Não se alteram RLS, grants nem os contratos canônicos de Vivências ou frequência.

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
- relacionamentos, tombstone e contagem de auditoria do piloto;
- FKs pós-replay, fingerprint `SHA-256/postgresql-jsonb-v1` recomposto do payload original e consistência do prazo capturado;
- igualdade integral dos CSVs, incluindo timestamps de captura, deadlines e proveniência NULL de legado;
- quando lançado pelo rehearsal F07, fixture pedagógica de duas escolas, 60 fontes, períodos, imutabilidade, RLS e negações de escrita;
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

O primeiro comando cria um cluster temporário, acessível apenas por socket Unix, migra origem e destino independentemente e compara CSVs das 26 tabelas e do manifesto de identidade. Ele testa o catálogo e remove cluster/CSVs no EXIT. Cada tabela informa sua contagem. Comparação de tabela vazia não é prova de recuperação de dados nela.

A fixture carrega o relatório legado **antes** da migration de snapshot. Depois da cadeia canônica, o diretor configura o período da escola A e mantém o da escola B vazio. O professor A registra 60 Vivências e finaliza o relatório pelo trigger real. O texto da primeira fonte e o nome do período mudam antes do backup, para que uma recaptura seja detectável. A escola B tem uma fonte que A não pode ler. A aprovação histórica tem prazo já vencido de duas horas, distinto do override atual de oito horas. Outro pedido legado não tem prazo capturado.

O destino precisa manter o payload antigo com 60 fontes e seu hash PostgreSQL JSONB, sem copiar a alteração posterior de texto/calendário para o snapshot. A prova nega escrita na janela vencida, preenchimento retroativo do snapshot legado e inserção tardia de vínculos no legado. Um novo override de 48 horas não altera o prazo restaurado. As mutações de verificação são revertidas.

Ele testa a remoção de **cada** coluna permitida, grants de CPF/NIS e demais colunas sensíveis, e o contrafactual inseguro de SELECT de tabela. Todas essas mutações acontecem em subtransações revertidas. Alterar apenas `qual` ou `with_check`, desligar RLS ou adicionar grant deve mudar o catálogo. A sessão SQL prova roster escolar, negação de CPF/NIS/notas e escrita de frequência fora da escola negada.

Probes externos devem retornar não-zero e confirmar cleanup:

```bash
PILOT_RESTORE_RAW_BREAK=allowed-column pnpm test:database:restore
PILOT_RESTORE_RAW_BREAK=cpf pnpm test:database:restore
PILOT_RESTORE_RAW_BREAK=nis pnpm test:database:restore
PILOT_RESTORE_RAW_BREAK=omit-vivencias_campos_experiencia pnpm test:database:restore
PILOT_RESTORE_RAW_BREAK=snapshot pnpm test:database:restore
PILOT_RESTORE_RAW_BREAK=deadline pnpm test:database:restore
PILOT_RESTORE_RAW_BREAK=orphan pnpm test:database:restore
```

`omit-<tabela>` também permite omitir qualquer uma das outras sete inclusões F07. A comparação de CSVs precisa rejeitar cada omissão. `orphan` conserva o número de linhas, mas rompe a referência entre conteúdo e sessão, para desafiar a checagem pós-replay de FKs.

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
PILOT_RESTORE_DELIBERATE_BREAK=pedagogical-omission pnpm pilot:restore-test
PILOT_RESTORE_DELIBERATE_BREAK=snapshot pnpm pilot:restore-test
PILOT_RESTORE_DELIBERATE_BREAK=deadline pnpm pilot:restore-test
```

Campanha sequencial completa com origem descartável própria:

```bash
bash ../supabase/tests/pilot/run-pedagogical-rehearsal.sh \
  none student-checksum attendance-checksum policy auth storage artifact cleanup \
  pedagogical-omission snapshot deadline
```

O rehearsal exige saída zero do positivo, saída não-zero e `PILOT_RESTORE_PROOF_RED` de cada negativo, ausência de receipt de sucesso nos negativos e ausência do banco de restore após cada execução. Ao sair, verifica a remoção dos containers, volumes e rede da origem e libera o lease. O cenário F07 é habilitado por `PILOT_RESTORE_FIXTURE_CONTRACT=pedagogical-v2`. O runner portátil comum declara `not_exercised` para esse cenário quando usado com outra fixture.

A origem da prova fica sem escritores concorrentes. Não se prova consistência de backup online sob escrita concorrente, nem recuperação de serviços Auth/Storage ou PITR municipal. O [recibo F07](../artifacts/f07-pedagogical-restore/README.md) discrimina os percursos realmente executados.

Use os probes somente contra o stack local descartável e sintético.
