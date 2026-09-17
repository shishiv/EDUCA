# Importação governada do piloto

Este contrato prepara dados para o piloto sem colocar dados reais no deploy ou no demo.

O import governado exige um owner nomeado e um acordo de tratamento confirmado em arquivo antes de gravar qualquer lote. O owner deve ser o secretário municipal ou o operador designado autenticado. O demo continua com o efeito de import bloqueado e simulado. O gate de deploy continua bloqueando dados reais e endpoints externos.

## Contrato do CSV

O arquivo precisa usar UTF-8, uma escola por lote e exatamente este cabeçalho:

```csv
synthetic_marker,source_id,school_code,class_code,student_name,birth_date,sex,guardian_name,guardian_phone,guardian_relationship
```

Cada linha vira registros canônicos em `alunos`, `responsaveis`, `aluno_responsaveis` e `matriculas`.

- A prova no modo `synthetic` exige `SYNTHETIC-EDUCA-PILOT` em `synthetic_marker`.
- A representação de modo `real` permanece coberta pelo validador para uma mudança futura, mas o guard atual rejeita esse modo antes do banco.
- O validador rejeita colunas extras, fórmulas de planilha, duplicatas, datas inválidas e lotes de várias escolas.

O pipeline não salva o CSV em arquivo de evidência, log ou tabela auxiliar.

## Manifesto versionado de governança G2

O manifesto técnico `educa-synthetic-pilot-governance-v1` acompanha a preparação e reutiliza o mesmo bloco `approval` do import governado.
Todos os e-mails do exemplo usam o domínio reservado `.invalid`.

```json
{
  "version": "educa-synthetic-pilot-governance-v1",
  "owner": {"name": "Secretaria Sintetica", "email": "secretaria@synthetic.invalid"},
  "controller": {"name": "Controlador Sintetico", "email": "controller@synthetic.invalid", "status": "a confirmar"},
  "processor": {"name": "Processador Sintetico", "email": "processor@synthetic.invalid", "status": "a confirmar"},
  "purpose": "preparacao tecnica do piloto sintetico",
  "legalBasis": "a confirmar",
  "processingAgreement": {
    "reference": "DPA-SYN-001",
    "version": "v1",
    "status": "confirmed",
    "confirmed": true,
    "recordedAt": "2026-08-10T12:00:00.000Z",
    "recordedBy": {"name": "Secretaria Sintetica", "email": "secretaria@synthetic.invalid"}
  },
  "approval": {
    "submittedBy": {"name": "Secretaria Sintetica", "email": "secretaria@synthetic.invalid"},
    "approvedBy": {"name": "Diretora Sintetica", "email": "diretora@synthetic.invalid"},
    "approvedAt": "2026-08-10T12:05:00.000Z"
  },
  "subprocessors": [{
    "name": "Armazenamento Sintetico",
    "email": "storage@synthetic.invalid",
    "status": "a confirmar",
    "service": "armazenamento cifrado de prova",
    "processingLocation": "isolated-proof-local"
  }],
  "location": {"primary": "isolated-proof-local", "transfer": "a confirmar"},
  "encryption": {
    "algorithm": "aes-256-gcm",
    "keyReference": "proof-local-v1",
    "inTransit": "a confirmar",
    "plaintextStored": false
  },
  "retention": {
    "policy": "proof-only-30d",
    "rawPayloadExpiresAt": "2026-08-11T12:00:00.000Z",
    "canonicalDataExpiresAt": "2026-09-09T12:00:00.000Z",
    "rollbackUntil": "2026-08-17T12:00:00.000Z"
  },
  "exit": {
    "trigger": "fim da prova tecnica",
    "dataDisposition": "a confirmar",
    "accessRevocation": "a confirmar",
    "evidence": "a confirmar"
  },
  "incident": {
    "contact": {"name": "Contato Incidente Sintetico", "email": "incidente@synthetic.invalid"},
    "notification": "a confirmar",
    "response": "a confirmar"
  }
}
```

O pipeline resolve `recordedBy`, `submittedBy` e `approvedBy` em usuários ativos. A tabela `pilot_data_treatment_agreements` é a fonte do gate booleano `confirmed`; referência, versão, confirmer e timestamp ficam vinculados ao lote. O owner autenticado fica registrado como snapshot nomeado e `governance_owner_user_id`. Sem owner correspondente ao ator autenticado, o lote não é criado.
A aprovação publica a projeção canônica no RPC transacional `pilot_publish_synthetic_import_batch`; qualquer falha desfaz aprovação e linhas parciais. O fingerprint canônico inclui todos os campos, normaliza espaços, e-mails, timestamps e ordena subprocessadores.

O validador exige owner, controller, processor, propósito, base legal, acordo, aprovadores maker-checker, subprocessadores, localização, criptografia, retenção, janela de rollback, saída e incidente.
Ele rejeita campos incompletos, identidade que não termina em `.invalid` e aprovação pelo próprio submitter. Exige a ordem estrita `rawPayloadExpiresAt < rollbackUntil < canonicalDataExpiresAt`; igualdade ou inversão é rejeitada. No banco, o mesmo contrato é `raw_expires_at < rollback_until < canonical_expires_at`, conforme o [validador de governança](../app/lib/pilot/governed-csv-import.ts) e a [constraint canônica de owner/acordo](../supabase/migrations/20260814000000_governed_import_owner_agreement.sql).

### Limite explícito do G2

Este contrato prova somente completude técnica do preparo sintético.
Ele não aprova a base legal, não confirma a identidade do controller e não autoriza contratação municipal.
Os campos reservados ao captain ou ao município permanecem exatamente como `a confirmar`.
O receipt guarda a versão e o fingerprint de governança, mas não guarda CSV, nomes, e-mails ou qualquer PII.

## Identidades e limites

As três identidades não se misturam:

- **Prova sintética isolada:** usa `PILOT_IMPORT_TARGET=isolated-proof`, banco local `educa_pilot_proof_*`, modo `synthetic` e o marcador `SYNTHETIC-EDUCA-PILOT`.
- **Demo público:** usa `NEXT_PUBLIC_DEMO_SANDBOX=true` e referências `SUPABASE_DEMO_*`. O demo não é alvo de importação: esse fluxo simula sucesso sem publicar dados canônicos. Isso não torna todo o sandbox somente leitura; outras mutações sintéticas têm limites próprios em [`DEMO.md`](../DEMO.md#source-capability-catalog).
- **Piloto municipal:** é uma implantação posterior, com aprovação própria. O alvo municipal não pode reutilizar a configuração da prova sintética.

A identidade de código fica em `PILOT_PROOF_TARGET_IDENTITY`, exportada por `app/lib/pilot/pilot-safety-gate.ts` e pelo guard de importação. A prova não autoriza dados reais, infraestrutura remota, credenciais municipais ou DNS.

## Execução isolada

A execução local de prova usa o banco temporário criado pelo próprio E2E:

```bash
cd app
pnpm test:e2e:pilot:import
```

Para uma execução manual, defina todos estes valores explícitos:

```bash
export PILOT_MODE=true
export PILOT_IMPORT_TARGET=isolated-proof
export PILOT_IMPORT_PROOF_DATABASE_URL=postgresql://postgres@127.0.0.1:5432/educa_pilot_proof_local
export PILOT_IMPORT_DATA_MODE=synthetic
export PILOT_SYNTHETIC_DATA_ONLY=true
export PILOT_IMPORT_SYNTHETIC_MARKER=SYNTHETIC-EDUCA-PILOT
export PILOT_IMPORT_ENCRYPTION_KEY='<base64 de uma chave AES-256>'
export PILOT_IMPORT_ENCRYPTION_KEY_ID=proof-local-v1
pnpm pilot:import:proof import --csv /caminho/piloto.csv --approval /caminho/aprovacao.json
```

O gate rejeita URLs remotas, nomes de banco fora de `educa_pilot_proof_`, modo demo, referências `SUPABASE_DEMO_*`, modo real, modo não confirmado, marcador ausente, chave ausente e qualquer alvo diferente de `isolated-proof`. A checagem acontece antes de abrir o cliente do banco, e o receipt redigido registra o alvo tentado e o motivo sem URL, chave ou conteúdo.

Uma futura carga real exige uma mudança revisada separada, com aprovações legais e de governança nomeadas. Este contrato não abre essa porta.

## Encriptação, retenção e rollback

O payload CSV fica em repouso como `aes-256-gcm` com `PILOT_IMPORT_ENCRYPTION_KEY`. A rota lê a chave exclusivamente do ambiente e nunca a grava no banco, no log ou no receipt. O ciphertext, IV e tag permanecem no lote até `rawPayloadExpiresAt`; a limpeza remove o envelope inteiro. As projeções canônicas ficam vinculadas ao lote e são removidas pelo rollback exato.

Cada linha canônica recebe `pilot_import_batch_id`. A tabela do lote registra owner, acordo, aprovadores, contagens, fingerprints, retenção e timestamps.

Objetos de Storage do proof recebem os metadados `pilot_import_batch_id` e `pilot_import_object_fingerprint`. O rollback usa a associação exata do lote, nunca o nome amplo do objeto.

- `pilot_cleanup_import_retention_results()` aplica retenção somente a lotes `source_mode = 'synthetic'` dos alvos existentes. Retorna um resultado redigido por lote elegível.
- `pilot_cleanup_import_retention()` mantém a assinatura escalar para os clientes existentes. Sua contagem histórica soma operações de limpeza bruta e descarte canônico, não lotes distintos. O proof usa o RPC detalhado.
- `pilot_rollback_synthetic_import_batch()` remove somente linhas canônicas do lote `synthetic_local`, registra tombstone e auditoria.
- `pilot_rollback_import_batch()` mantém a prova isolada com Storage e sua associação por fingerprint.
- O endpoint `POST /api/pilot/imports/{batchId}/rollback` exige ator autenticado, motivo e janela `rollbackUntil` vigente.
- Após `canonicalDataExpiresAt`, a limpeza de retenção usa o rollback transacional com motivo `retention_expired`.
- O rollback recusa lotes com frequência já vinculada, associação incompleta ou responsável compartilhado fora do lote.

### Resultados independentes de retenção

A [migração F08](../supabase/migrations/20260917000000_pilot_retention_batch_results.sql) isola cada lote em uma subtransação. A limpeza do envelope e o rollback canônico têm subtransações separadas. Assim, uma dependência canônica não restaura ciphertext já expirado nem desfaz a limpeza de outro lote.

O RPC detalhado retorna `batch_id`, `escola_id`, `raw_payload_status`, `canonical_status` e `reason_code`. O resultado bruto é `cleaned`, `not_due` ou `failed`. O resultado canônico é:

| `canonical_status` | Significado e ação |
| --- | --- |
| `deleted` | Rollback exato concluído, com tombstone e auditoria existentes. |
| `preserved_dependency` | Frequência, responsável compartilhado ou referência protegida impediu o descarte. Inclui `RESTRICT` de relatórios e Vivências, SQLSTATE `23001`, e violação de FK `23503`. Preserve o lote. Uma decisão sobre descarte pertence à autoridade de governança. |
| `failed` | Falha operacional ou associação incompleta. O rollback parcial é desfeito. Corrija a causa antes de tentar novamente. |
| `not_due` | Não houve descarte canônico nesta tentativa. |

Os motivos são códigos fixos. Mensagens do PostgreSQL, nomes, conteúdo narrativo e detalhes de dependência não saem no resultado. Cada tentativa registra `import_retention_result` na auditoria existente. Se essa gravação falhar, a subtransação restaura o lote inteiro e o chamador recebe `failed` com `batch_failed`, sem afirmar que houve auditoria persistida.

Lotes eliminados deixam de ser elegíveis. Lotes preservados ou falhos continuam elegíveis para retry manual, sem duplicar o tombstone ou a auditoria de rollback de lotes já eliminados. O lock e a rechecagem do lote evitam repetir uma limpeza concorrente concluída. As subtransações não são commits autônomos: cancelamento da chamada ou falha da conexão não comprovam uma execução concluída.

Nenhum prazo, propósito ou categoria é reescrito. `raw_expires_at`, `rollback_until`, `canonical_expires_at` e a política persistida continuam sendo a autoridade. Não há scheduler novo nem autorização de descarte de dados reais ou compartilhados.

## Receipt

O comando emite `PILOT_GOVERNED_IMPORT_RECEIPT` com lote, alvo aceito, receipt de segurança, contagens, fingerprints, objetos de Storage, estado criptográfico e retenção. Falhas emitem `PILOT_IMPORT_PROOF_SAFETY_RECEIPT` com o alvo tentado e o motivo, sem URL, chave ou conteúdo.

O rollback acrescenta contagens removidas, evidência de tombstone, auditoria redigida, associação de Storage por fingerprint e replay idempotente. O comando `cleanup` emite `PILOT_GOVERNED_RETENTION_RECEIPT` com `batches` e contagens separadas de envelopes limpos, falhas brutas, lotes canônicos eliminados, preservados e falhos. Um comando concluído pode conter lotes preservados ou falhos. Consulte esses resultados, não apenas o código de saída. Esses receipts de operação não comprovam que o E2E terminou ou que seu cluster foi removido.

O E2E anuncia `PILOT_IMPORT_PROOF_E2E_ATTEMPT` antes do preflight e guarda cada tentativa em `.pilot-evidence/governed-import-proof-e2e/<runId>/`. Não há alias de sucesso corrente. O antigo `governed-import-proof-e2e.md`, se existir, é movido para `legacy-unattributed.md` na nova tentativa. Esse arquivo é histórico sem atribuição, nunca o resultado da tentativa nova.

- `result.json` relaciona `runId`, SHA do commit, indicação de árvore modificada, comando selecionado, hash do manifesto, código de saída e estados do banco e workspace. Começa em `running`. Só termina em `pass` após todas as verificações e cleanup.
- `selection.sha256` identifica os bytes do runner completo selecionado, seu finalizador, dependências de importação, manifesto de pacote, lockfile, bootstrap, migrations e provisionamento aplicados. Os hashes são conferidos novamente antes do sucesso para rejeitar alteração durante a execução. Não representa seleção ou execução de testes de browser.
- `receipt.md` é publicado atomicamente apenas após `pg_ctl stop` bem-sucedido, `pg_ctl status` igual a 3, ausência de PID vivo conhecido e remoção verificada do workspace. Tem o mesmo `runId`, SHA e hash do manifesto. Falhas não publicam esse arquivo.
- Falha de parada, status incerto ou PID vivo conservam o workspace privado. `recovery.txt` registra somente seu caminho local para intervenção. Não remova esse diretório até comprovar que o processo terminou. O runner não exporta logs brutos, CSV, nomes, e-mails ou chaves como diagnóstico.

`INT`, `TERM` e `HUP` preservam saída não-zero e passam pelo mesmo cleanup, inclusive se chegarem durante a parada. Um `KILL` ou queda da máquina não executa traps: `running` não é sucesso e exige inspeção dos recursos locais. O diretório de evidência é ignorado pelo Git. O receipt identifica somente uma prova sintética isolada, não prontidão municipal.

A regressão serial do lifecycle usa stubs locais, sem banco nem browser:

```bash
cd app
pnpm test:pilot:import:lifecycle
```

Ela cobre receipt histórico, falha precoce, parada falha, parada que mente, PID vivo, status desconhecido, sinais inclusive durante cleanup, startup parcial, alteração de fontes durante a execução e sucesso após cleanup. Não substitui a prova raw-PG `pnpm test:e2e:pilot:import`.

O E2E de browser executa importação sintética real, aprovação maker-checker, verifica ciphertext e acordo, chama rollback, e confirma que as linhas canônicas, ciphertext, tombstone e auditoria desapareceram ou ficaram redigidos. O proof runner também executa deliberate-breaks de segurança e governança: alvo inesperado, host de banco fora da lista local, demo, modo real configurado, marcador ausente, aprovação sem owner, import sem chave e replay com governança alterada. Cada falha precisa ficar vermelha e sem mutar o banco.
O teste de banco cobre associação de lote ausente, lote ausente, alvo demo ou incorreto, expiração, frequência vinculada, responsável compartilhado, isolamento, rollback exato e replay. Se uma validação for removida, o teste falha.

O proof também executa [`pilot_retention_batch.test.sql`](../supabase/tests/database/pilot_retention_batch.test.sql), presente na suíte de banco. A fixture é inteiramente sintética. Ela protege a escola B, um relatório realmente finalizado com snapshot e vínculos, Vivências, frequência e um responsável compartilhado. Injeta falhas depois de DELETEs parciais e na gravação de auditoria, verifica a restauração do lote afetado e mantém a remoção dos lotes independentes. Um sentinela sintético marcado `source_mode = 'real'` prova a exclusão desse modo, sem usar dados reais. O CLI recebe dois lotes expirados e confirma `preserved_dependency` e `deleted`, inclusive Storage por associação exata e retry.

O controle negativo remove somente no banco descartável a contenção das exceções por dependência. A execução deve terminar em vermelho na etapa `retention`, sem `receipt.md` de sucesso e com cleanup verificado em `result.json`:

```bash
cd app
PILOT_IMPORT_RETENTION_DELIBERATE_BREAK=isolation pnpm test:e2e:pilot:import
```

Depois, execute `pnpm test:e2e:pilot:import` sem essa variável para obter uma nova tentativa positiva. As duas tentativas mantêm diretórios distintos e manifestos dos arquivos selecionados.
