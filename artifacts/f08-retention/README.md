# F08: retenção sintética por lote

Evidência local de 2026-09-17 para https://github.com/shishiv/EDUCA/issues/232.

Código e contrato executados no commit `b9e147fe2818ec1664deace5916100089528f48f`, derivado de `origin/dev` em `0f49d1f6d7c0061bcc44e386b0b3b891a570e610`. O commit posterior acrescenta somente este pacote de evidências. Não houve merge, deploy, CI hospedado, scheduler ou uso de dados reais.

## Prova e controle negativo

| Tentativa | Resultado observado |
| --- | --- |
| [Controle negativo](proof/20260917T102101Z-UmxdTl/result.json) | `retentionDeliberateBreak=isolation`, saída 3 na etapa `retention`, sem receipt de sucesso. PostgreSQL parado e workspace removido. |
| [Prova positiva](proof/20260917T102112Z-5WN1QN/result.json) | `retentionDeliberateBreak=none`, saída 0, `pass`, PostgreSQL parado e workspace removido. [Receipt pós-cleanup](proof/20260917T102112Z-5WN1QN/receipt.md). |

Ambas partiram de árvore limpa e do mesmo SHA. O manifesto selecionado tem SHA-256 `057a651361a6e492ebcc00d19fee0044ab1bf52db6773d0a1f6876ba5f56f0a9`. Ele inclui migrations, código de importação, contrato SQL, fixture e finalizador F05. Os manifests foram copiados sem alterar os bytes. A partir da raiz do repositório:

```bash
sha256sum --check artifacts/f08-retention/proof/20260917T102112Z-5WN1QN/selection.sha256
```

O controle negativo deixa as exceções de dependência escaparem da contenção por lote no banco descartável. A prova positiva subsequente usa a migração intacta. Comandos em `app/`:

```bash
PILOT_IMPORT_RETENTION_DELIBERATE_BREAK=isolation pnpm test:e2e:pilot:import
pnpm test:e2e:pilot:import
```

O CLI confirmou dois lotes expirados com resultados independentes: um `preserved_dependency`, outro `deleted`, dois envelopes limpos. No retry, apenas o lote preservado reaparece, sem nova remoção bruta ou tombstone duplicado. O objeto de Storage do lote bloqueado permanece. O objeto do lote removível desaparece por associação exata.

O contrato SQL executado pelo proof e pela suíte de banco confirmou:

- Escola B intacta, incluindo lote, envelope, escola, turma, período e registros canônicos.
- Relatório realmente finalizado com snapshot, vínculos de origem, Vivências e frequência preservados.
- Responsável compartilhado e vínculo sem dono de importação preservados.
- Falha injetada depois de DELETEs parciais retorna `failed` e restaura o lote. Uma falha no receipt de auditoria também restaura o tombstone e o envelope do lote afetado, sem desfazer outro lote removível.
- Associação incompleta continua `failed/ownership_gap`. Remover somente a falha operacional injetada permite retry independente.
- Prazos, política e metadados de governança não são reescritos. O sentinela sintético marcado como modo `real` permanece intocado.

## Outros checks

Ambiente: `/usr/bin/node` v26.8.1, ABI 147, pnpm 9.15.9 já disponível no cache local e PostgreSQL 18.6. Nenhuma dependência ou configuração de lint foi alterada. O pnpm 11 global recusou a árvore de dependências antes de executar os checks, por isso foi usado o pnpm 9 do contrato do projeto.

| Check | Observado |
| --- | --- |
| `pnpm typecheck` | Passou. |
| `pnpm lint` | Oxlint e ESLint passaram. |
| `pnpm run test --maxWorkers=2` | 1368 passaram. 29 testes e 5 arquivos continuam ignorados pela seleção preexistente. |
| `pnpm test:pilot:import:lifecycle` | Passou, incluindo falhas e sinais de cleanup, alteração de fontes e duas tentativas de sucesso separadas. |
| `supabase/tests/database/run.sh` | Passou, incluindo paridade de catálogo no replay, contrato F08 e concorrência de finalização descritiva. |
| `pnpm build` | Passou com dois CPUs via `taskset`, telemetria desativada e valores sintéticos de build para Supabase local. |
| `EM_DASH_DIFF_BASE=origin/dev pnpm check:diff-typography` | Passou contra a base de entrega. O comando sem override não encontrou a referência local `main` neste worktree. |
| `git diff --check` | Passou. |

`app/types/database.ts` foi regenerado por `supabase gen types typescript --local` usando a cadeia canônica completa em um Supabase descartável. O único delta gerado foi o novo RPC. O cleanup confirmou ausência de containers, volumes e redes do projeto `educa-f08-types.SvQFlL`, e a reserva de portas foi liberada.

Não foram executados browser E2E, a suíte R3 completa ou testes contra serviço externo. Esta evidência cobre a retenção sintética e seu lifecycle local. Não comprova prontidão municipal nem autoriza descarte de dependências preservadas. Cancelamento ou falha de conexão continuam sem garantia de commits autônomos por lote.
