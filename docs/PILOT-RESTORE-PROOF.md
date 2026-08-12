# Prova sintética de restore portátil

Esta rotina prova um restore portátil local com dados sintéticos.

Ela não prova prontidão municipal, aprovação legal, contrato, SLA comercial ou PITR gerenciado.

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

O artifact aceita somente a allowlist explícita do runner.

A allowlist inclui configuração municipal sintética, escolas, perfis, turmas, responsáveis, alunos, matrículas, aulas, sessões, frequência, tabelas do piloto, Auth referenciado por perfis ou convites, e Storage de fotos sintéticas.

O Storage exporta metadados de bucket e objeto, além dos bytes obtidos pelo contrato local de Storage.

O artifact exclui owners, ACLs, roles, extensões, configurações gerenciadas de sessão e metadados de PITR do provedor.

## Postconditions

O runner valida independentemente:

- lista do artifact após descriptografia e remoção dos arquivos plaintext;
- contagens e fingerprints de todas as tabelas allowlisted;
- contagem e fingerprint do manifesto Auth;
- metadados Storage e checksum dos bytes;
- políticas, grants, view com `security_invoker` e RPC;
- guard do piloto e configuração sintética;
- relacionamentos, tombstone e contagem de auditoria;
- sessão sintética de professor, com leitura e escrita dentro da escola;
- negação de leitura e escrita fora da escola;
- RPO e RTO observados contra os campos documentados no `pilot_municipality_config`.

O receipt não contém nomes, e-mails, telefones, linhas CSV ou bytes de aluno.

O banco temporário, artifacts plaintext, artifact cifrado e credenciais geradas são removidos em sucesso e falha.

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
