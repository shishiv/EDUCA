# Preservação do worker frequency

## Origem e escopo
Frequência canônica, grade de chamada, bloqueio/reabertura com janela de correção, ações de servidor, migração e regressões.

Trabalho finalizado fora do Firstmate na pasta original `/home/shiv/Projects/EDUCA-quality-20260907/workers/frequency`, sobre `8713027b52caf6930999385253fdf1f052bbf912`. Commitado sem reescrita ou reconciliação, em `d8e884b3135edc24aba2a27df764c1a7224d7cb8`, no ramo remoto `salvar/educa-quality-frequency-20260908`. Todos os oito snapshots estavam enviados com SHAs confirmados antes da abertura dos PRs.

Resultado integrado principal: https://github.com/shishiv/EDUCA/pull/211

## Contagem preservada
- Inventário: 39 entradas já conhecidas do índice (incluindo intent-to-add) + 0 não rastreadas = **39 entradas preservadas**.
- Diff do commit: **39 files changed, 2803 insertions(+), 1862 deletions(-)**.
- Exclusão única: 1 arquivo(s) `.pi/semantic-grep.sqlite*`, deixados no disco. `VENT.md`, quando existente, está incluído.

## O que este ramo preserva além da versão do integration
O conteúdo a reconciliar está nas versões alternativas das ações/adaptadores de frequência, grade de chamada, módulo canônico, tipos e testes. Por exemplo, o worker preserva o contrato `time_18h` e a assinatura anterior ao parâmetro `scheduledCutoffAt`, enquanto o integration usa `time_cutoff` e o deadline capturado; não restaurar o contrato antigo por merge automático. O E2E `app/tests/e2e/attendance/reopen.spec.ts` é byte-idêntico ao arquivo movido para `app/tests/e2e/pilot/attendance-reopen.spec.ts` no integration, portanto esse movimento NÃO conta como conteúdo exclusivo.

Comparação direta: `git diff d8e884b3135edc24aba2a27df764c1a7224d7cb8 2d95afc0237a74ded944cae53ed4db30a83903aa -- <arquivo>`, arquivo a arquivo. Classificação: **parcialmente contido**, com 21 caminhos byte/modo-idênticos no mesmo local. Versões divergentes são preservadas conservadoramente; não são uma afirmação de que a funcionalidade correspondente esteja ausente do integration.

| Caminho | Relação com integration |
|---|---|
| `CONTEXT.md` | Versão divergente; alterações normalizadas da base cobertas |
| `app/app/(dashboard)/dashboard/turmas/[id]/chamada/page.tsx` | Versão divergente |
| `app/app/actions/attendance/check-lock-status.ts` | Versão divergente |
| `app/app/actions/attendance/close-session.ts` | Versão divergente |
| `app/app/actions/attendance/mark-attendance.ts` | Versão divergente |
| `app/app/actions/attendance/open-session.ts` | Versão divergente |
| `app/app/api/sessoes/aula/[id]/frequencia/batch/route.ts` | Versão divergente |
| `app/components/attendance/AttendanceCell.tsx` | Versão divergente |
| `app/components/attendance/AttendanceGrid.tsx` | Versão divergente |
| `app/components/attendance/AttendanceGridHeader.tsx` | Versão divergente |
| `app/components/attendance/AttendanceGridTypes.tsx` | Versão divergente |
| `app/components/attendance/AttendanceGridUtils.tsx` | Versão divergente |
| `app/lib/services/attendance-module.ts` | Versão divergente |
| `app/tests/e2e/reports/frequency.spec.ts` | Versão divergente |
| `app/tests/unit/components/attendance/correction-window.test.tsx` | Versão divergente |
| `app/tests/unit/services/attendance-module.test.ts` | Versão divergente |
| `app/types/database.ts` | Versão divergente |

## Evidência e limites
- Conteúdos SHA-256 e modos do índice conferidos contra o inventário antes do commit; ausências reconciliadas; ramo remoto confirmado por SHA.
- Este worker isolado não teve a suíte executada nesta tarefa. O resultado de testes do integration não é atribuído a ele.
- No integration (https://github.com/shishiv/EDUCA/pull/211), lint e testes unitários passaram (1316 testes; 20 ignorados), mas typecheck falhou em `app/tests/e2e/pilot/deployed-isolation.spec.ts:71:26` (`TS7006`). Build/E2E/SQL/pilot não foram reexecutados.
- Inventário completo, hashes, recibos e comparação: ramo `fm/educa-quality-prs-dev`, diretório `artifacts/educa-quality-prs-dev/`.

**Rascunho de preservação/reconciliação. Não mesclar integralmente sobre o integration sem revisar as diferenças: este snapshot pode conter versões anteriores ou alternativas e reverter avanços. Nenhum merge, fechamento, remoção de ramo ou limpeza das pastas faz parte desta entrega.**
