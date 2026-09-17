# Preservação do worker readmodels

## Origem e escopo
Projeções de dashboard e relatórios, frequência/Bolsa Família, formulários e exportação; testes de regressão relacionados.

Trabalho finalizado fora do Firstmate na pasta original `/home/shiv/Projects/EDUCA-quality-20260907/workers/readmodels`, sobre `8713027b52caf6930999385253fdf1f052bbf912`. Commitado sem reescrita ou reconciliação, em `8393a99dbc1f800a64753c7d737fb71ea43b20eb`, no ramo remoto `salvar/educa-quality-readmodels-20260908`. Todos os oito snapshots estavam enviados com SHAs confirmados antes da abertura dos PRs.

Resultado integrado principal: https://github.com/shishiv/EDUCA/pull/211

## Contagem preservada
- Inventário: 41 entradas já conhecidas do índice (incluindo intent-to-add) + 1 não rastreadas = **42 entradas preservadas**.
- Diff do commit: **42 files changed, 2930 insertions(+), 2879 deletions(-)**.
- Exclusão única: 3 arquivo(s) `.pi/semantic-grep.sqlite*`, deixados no disco. `VENT.md`, quando existente, está incluído.

## O que este ramo preserva além da versão do integration
`VENT.md` é exclusivo deste worker. Também há versões divergentes de alertas/dashboard, formulário de relatório descritivo e E2Es de dashboard/relatórios; a lista abaixo explicita os caminhos sem equivalência exata.

Comparação direta: `git diff 8393a99dbc1f800a64753c7d737fb71ea43b20eb 2d95afc0237a74ded944cae53ed4db30a83903aa -- <arquivo>`, arquivo a arquivo. Classificação: **com conteudo exclusivo**, com 30 caminhos byte/modo-idênticos no mesmo local. Versões divergentes são preservadas conservadoramente; não são uma afirmação de que a funcionalidade correspondente esteja ausente do integration.

| Caminho | Relação com integration |
|---|---|
| `VENT.md` | Caminho presente só no worker |
| `app/app/(dashboard)/relatorios/conteudo/page.tsx` | Versão divergente; alterações normalizadas da base cobertas |
| `app/app/(dashboard)/relatorios/frequencia/page.tsx` | Versão divergente; alterações normalizadas da base cobertas |
| `app/app/api/dashboard/alerts/route.ts` | Versão divergente |
| `app/components/dashboard/teacher-dashboard-enhanced.tsx` | Versão divergente |
| `app/components/reports/AttendanceReportTable.tsx` | Versão divergente; alterações normalizadas da base cobertas |
| `app/components/reports/DescriptiveReportForm.tsx` | Versão divergente |
| `app/components/reports/StudentReport.tsx` | Versão divergente; alterações normalizadas da base cobertas |
| `app/lib/export/attendance-pdf.ts` | Versão divergente; alterações normalizadas da base cobertas |
| `app/tests/e2e/flows/dashboard-metrics.spec.ts` | Versão divergente |
| `app/tests/e2e/reports/bolsa-familia.spec.ts` | Versão divergente |
| `app/tests/e2e/reports/content.spec.ts` | Versão divergente |

## Evidência e limites
- Conteúdos SHA-256 e modos do índice conferidos contra o inventário antes do commit; ausências reconciliadas; ramo remoto confirmado por SHA.
- Este worker isolado não teve a suíte executada nesta tarefa. O resultado de testes do integration não é atribuído a ele.
- No integration (https://github.com/shishiv/EDUCA/pull/211), lint e testes unitários passaram (1316 testes; 20 ignorados), mas typecheck falhou em `app/tests/e2e/pilot/deployed-isolation.spec.ts:71:26` (`TS7006`). Build/E2E/SQL/pilot não foram reexecutados.
- Inventário completo, hashes, recibos e comparação: ramo `fm/educa-quality-prs-dev`, diretório `artifacts/educa-quality-prs-dev/`.

**Rascunho de preservação/reconciliação. Não mesclar integralmente sobre o integration sem revisar as diferenças: este snapshot pode conter versões anteriores ou alternativas e reverter avanços. Nenhum merge, fechamento, remoção de ramo ou limpeza das pastas faz parte desta entrega.**
