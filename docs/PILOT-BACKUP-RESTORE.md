# Contrato diário de backup e restore sintético

Objetivos confirmados: **RPO 24 horas** e **RTO 4 horas**. A evidência deste repositório é de ensaio sintético isolado e não comprova prontidão de um projeto municipal real.

## Conteúdo mínimo diário

- banco completo, incluindo `auth`, dados, policies, grants, views e RPCs;
- metadados de Storage e bytes dos buckets aprovados;
- manifesto com horário, região, versão, contagens e checksums;
- criptografia antes de persistir o artefato;
- rotação e destino definidos no contrato municipal futuro.

## Ensaio local

```bash
cd app
pnpm pilot:restore-test
```

O ensaio recusa Supabase externo, cria dump criptografado, restaura em banco isolado, compara Auth/Storage/policies/grants/view/RPC, valida tombstone, mede RPO/RTO e remove banco/arquivos temporários. Nunca sobrescreve o banco de origem.

Evidência do último ensaio: [evidence/synthetic-restore-evidence.md](./evidence/synthetic-restore-evidence.md).

## Evidência exigida antes de dados reais

ID/data do backup, executor/aprovador, início/fim, RPO/RTO observado, checksums, amostra de vínculos, login por papel, frequência, auditoria, falhas e limpeza. O Município deve aprovar rotação, TTD, legal hold e procedimento de tombstone.
