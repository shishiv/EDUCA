# Importação governada do piloto

Este contrato prepara dados para o piloto sem colocar dados reais no deploy ou no demo.

O import governado só grava em um banco de prova isolado. O demo continua com o efeito de import bloqueado e simulado. O gate de deploy continua bloqueando dados reais e endpoints externos.

## Contrato do CSV

O arquivo precisa usar UTF-8, uma escola por lote e exatamente este cabeçalho:

```csv
synthetic_marker,source_id,school_code,class_code,student_name,birth_date,sex,guardian_name,guardian_phone,guardian_relationship
```

Cada linha vira registros canônicos em `alunos`, `responsaveis`, `aluno_responsaveis` e `matriculas`.

- O modo `synthetic` exige `SYNTHETIC-EDUCA-PILOT` em `synthetic_marker`.
- O modo `real` exige a coluna `synthetic_marker` vazia.
- O modo `real` exige confirmação explícita de que o alvo é somente o banco de prova isolado.
- O validador rejeita colunas extras, fórmulas de planilha, duplicatas, datas inválidas e lotes de várias escolas.

O pipeline não salva o CSV em arquivo de evidência, log ou tabela auxiliar.

## Manifesto de governança

O arquivo JSON de aprovação acompanha o CSV e contém:

```json
{
  "owner": {"name": "Nome do owner", "email": "owner@municipio.gov.br"},
  "processingAgreement": {
    "reference": "DPA-2026-001",
    "version": "v1",
    "recordedAt": "2026-08-10T12:00:00.000Z",
    "recordedBy": {"name": "Secretaria", "email": "secretaria@municipio.gov.br"}
  },
  "approval": {
    "submittedBy": {"name": "Secretaria", "email": "secretaria@municipio.gov.br"},
    "approvedBy": {"name": "Direção", "email": "direcao@municipio.gov.br"},
    "approvedAt": "2026-08-10T12:05:00.000Z"
  },
  "retention": {
    "policy": "proof-only-30d",
    "rawPayloadExpiresAt": "2026-08-11T12:00:00.000Z",
    "canonicalDataExpiresAt": "2026-09-09T12:00:00.000Z",
    "rollbackUntil": "2026-08-17T12:00:00.000Z"
  }
}
```

O pipeline resolve `recordedBy`, `submittedBy` e `approvedBy` em usuários ativos do banco de prova. O owner fica registrado como snapshot nomeado. O fingerprint do manifesto impede replay com governança diferente.

## Execução isolada

A execução local de prova usa o banco temporário criado pelo próprio E2E:

```bash
cd app
pnpm test:e2e:pilot:import
```

Para uma execução manual, defina todos estes valores:

```bash
export PILOT_MODE=true
export PILOT_IMPORT_TARGET=isolated-proof
export PILOT_IMPORT_PROOF_DATABASE_URL=postgresql://postgres@127.0.0.1:5432/educa_pilot_proof_local
export PILOT_IMPORT_DATA_MODE=synthetic
export PILOT_SYNTHETIC_DATA_ONLY=true
export PILOT_IMPORT_ENCRYPTION_KEY='<base64 de uma chave AES-256>'
export PILOT_IMPORT_ENCRYPTION_KEY_ID=proof-local-v1
pnpm pilot:import:proof import --csv /caminho/piloto.csv --approval /caminho/aprovacao.json
```

Para uma carga real aprovada, o arquivo deve permanecer fora do repositório e o alvo precisa continuar local:

```bash
export PILOT_IMPORT_DATA_MODE=real
export PILOT_SYNTHETIC_DATA_ONLY=false
export PILOT_IMPORT_REAL_DATA_CONFIRMATION=isolated-proof-only
pnpm pilot:import:proof import --csv /caminho/dado-aprovado.csv --approval /caminho/aprovacao.json
```

O gate rejeita URLs remotas, nomes de banco fora de `educa_pilot_proof_`, modo demo, chave ausente e carga real sem confirmação.

## Encriptação, retenção e rollback

O payload CSV fica em repouso como `aes-256-gcm` com `PILOT_IMPORT_ENCRYPTION_KEY`. A tabela guarda somente o `encryption_key_id`, IV, tag e ciphertext. A chave nunca entra no banco, no log ou no receipt.

Cada linha canônica recebe `pilot_import_batch_id`. A tabela do lote registra owner, acordo, aprovadores, contagens, fingerprints, retenção e timestamps.

- `pilot_cleanup_import_retention()` remove ciphertext após `rawPayloadExpiresAt`.
- `pilot_rollback_import_batch()` remove somente linhas canônicas daquele lote, registra tombstone e auditoria.
- O rollback manual exige owner operacional ativo, motivo e janela `rollbackUntil` vigente.
- Após `canonicalDataExpiresAt`, a limpeza de retenção usa o mesmo rollback transacional com motivo `retention_expired`.
- O rollback recusa lotes com frequência já vinculada ou responsável compartilhado fora do lote.

## Receipt

O comando emite `PILOT_GOVERNED_IMPORT_RECEIPT` com lote, contagens, fingerprints, estado criptográfico e retenção. O E2E grava um receipt operacional em `.pilot-evidence/governed-import-proof-e2e.md`; esse diretório é ignorado e não contém dados de aluno ou família.

O E2E também executa dois deliberate-breaks: aprovação sem owner e import sem chave. Cada falha precisa ficar vermelha. Se uma validação de governança for removida, o teste falha.
