# Importação governada do piloto

Este contrato prepara dados para o piloto sem colocar dados reais no deploy ou no demo.

O import governado só grava em um banco de prova isolado. O demo continua com o efeito de import bloqueado e simulado. O gate de deploy continua bloqueando dados reais e endpoints externos.

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
  "owner": {"name": "Owner Sintetico", "email": "owner@synthetic.invalid"},
  "controller": {"name": "Controlador Sintetico", "email": "controller@synthetic.invalid", "status": "a confirmar"},
  "processor": {"name": "Processador Sintetico", "email": "processor@synthetic.invalid", "status": "a confirmar"},
  "purpose": "preparacao tecnica do piloto sintetico",
  "legalBasis": "a confirmar",
  "processingAgreement": {
    "reference": "DPA-SYN-001",
    "version": "v1",
    "status": "a confirmar",
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

O pipeline resolve `recordedBy`, `submittedBy` e `approvedBy` em usuários ativos do banco de prova. O owner fica registrado como snapshot nomeado.
O fingerprint canônico inclui todos os campos, normaliza espaços, e-mails, timestamps e ordena subprocessadores.

O validador exige owner, controller, processor, propósito, base legal, acordo, aprovadores maker-checker, subprocessadores, localização, criptografia, retenção, janela de rollback, saída e incidente.
Ele rejeita campos incompletos, identidade que não termina em `.invalid`, aprovação pelo próprio submitter e a ordem `rawPayloadExpiresAt < rollbackUntil < canonicalDataExpiresAt`.

### Limite explícito do G2

Este contrato prova somente completude técnica do preparo sintético.
Ele não aprova a base legal, não confirma a identidade do controller e não autoriza contratação municipal.
Os campos reservados ao captain ou ao município permanecem exatamente como `a confirmar`.
O receipt guarda a versão e o fingerprint de governança, mas não guarda CSV, nomes, e-mails ou qualquer PII.

## Identidades e limites

As três identidades não se misturam:

- **Prova sintética isolada:** usa `PILOT_IMPORT_TARGET=isolated-proof`, banco local `educa_pilot_proof_*`, modo `synthetic` e o marcador `SYNTHETIC-EDUCA-PILOT`.
- **Demo público:** usa `NEXT_PUBLIC_DEMO_SANDBOX=true` e referências `SUPABASE_DEMO_*`. O demo não é alvo de importação e continua simulado e somente leitura.
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

O payload CSV fica em repouso como `aes-256-gcm` com `PILOT_IMPORT_ENCRYPTION_KEY`. A tabela guarda somente o `encryption_key_id`, IV, tag e ciphertext. A chave nunca entra no banco, no log ou no receipt.

Cada linha canônica recebe `pilot_import_batch_id`. A tabela do lote registra owner, acordo, aprovadores, contagens, fingerprints, retenção e timestamps.

- `pilot_cleanup_import_retention()` remove ciphertext após `rawPayloadExpiresAt`.
- `pilot_rollback_import_batch()` remove somente linhas canônicas daquele lote, registra tombstone e auditoria.
- O rollback manual exige owner operacional ativo, motivo e janela `rollbackUntil` vigente.
- Após `canonicalDataExpiresAt`, a limpeza de retenção usa o mesmo rollback transacional com motivo `retention_expired`.
- O rollback recusa lotes com frequência já vinculada ou responsável compartilhado fora do lote.

## Receipt

O comando emite `PILOT_GOVERNED_IMPORT_RECEIPT` com lote, alvo aceito, receipt de segurança, contagens, fingerprints, estado criptográfico e retenção. Falhas emitem `PILOT_IMPORT_PROOF_SAFETY_RECEIPT` com o alvo tentado e o motivo, sem URL, chave ou conteúdo. O E2E grava um receipt operacional em `.pilot-evidence/governed-import-proof-e2e.md`; esse diretório é ignorado e não contém dados de aluno ou família.

O E2E também executa três deliberate-breaks: aprovação sem owner, import sem chave e replay com governança alterada. Cada falha precisa ficar vermelha. Se uma validação de governança for removida, o teste falha.
