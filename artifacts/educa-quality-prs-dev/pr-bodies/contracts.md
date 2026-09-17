# Preservação do worker contracts

## Origem e escopo
Contratos das APIs de gestão, guardas de runtime, clientes compartilhados e contratos de auditoria/logger.

Trabalho finalizado fora do Firstmate na pasta original `/home/shiv/Projects/EDUCA-quality-20260907/workers/contracts`, sobre `8713027b52caf6930999385253fdf1f052bbf912`. Commitado sem reescrita ou reconciliação, em `9732efeaee2edbf2455d01905bfb26ef48d40615`, no ramo remoto `salvar/educa-quality-contracts-20260908`. Todos os oito snapshots estavam enviados com SHAs confirmados antes da abertura dos PRs.

Resultado integrado principal: https://github.com/shishiv/EDUCA/pull/211

## Contagem preservada
- Inventário: 24 entradas já conhecidas do índice (incluindo intent-to-add) + 1 não rastreadas = **25 entradas preservadas**.
- Diff do commit: **25 files changed, 668 insertions(+), 322 deletions(-)**.
- Exclusão única: 1 arquivo(s) `.pi/semantic-grep.sqlite*`, deixados no disco. `VENT.md`, quando existente, está incluído.

## O que este ramo preserva além da versão do integration
`VENT.md` é exclusivo deste worker. Há versões distintas dos clientes de escolas/alunos/usuários e do contrato da rota de auditoria demo, além dos demais caminhos listados abaixo.

Comparação direta: `git diff 9732efeaee2edbf2455d01905bfb26ef48d40615 2d95afc0237a74ded944cae53ed4db30a83903aa -- <arquivo>`, arquivo a arquivo. Classificação: **com conteudo exclusivo**, com 15 caminhos byte/modo-idênticos no mesmo local. Versões divergentes são preservadas conservadoramente; não são uma afirmação de que a funcionalidade correspondente esteja ausente do integration.

| Caminho | Relação com integration |
|---|---|
| `VENT.md` | Caminho presente só no worker |
| `app/app/api/demo/audit/route.ts` | Versão divergente |
| `app/components/turmas/TurmaCard.tsx` | Versão divergente; alterações normalizadas da base cobertas |
| `app/lib/api/classes.ts` | Versão divergente; alterações normalizadas da base cobertas |
| `app/lib/api/feature-flags.ts` | Versão divergente; alterações normalizadas da base cobertas |
| `app/lib/api/schools.ts` | Versão divergente |
| `app/lib/api/students.ts` | Versão divergente |
| `app/lib/api/users.ts` | Versão divergente |
| `app/tests/unit/contracts/demo-audit-route-contract.test.ts` | Versão divergente |
| `app/types/descriptive-report.ts` | Versão divergente; alterações normalizadas da base cobertas |

## Evidência e limites
- Conteúdos SHA-256 e modos do índice conferidos contra o inventário antes do commit; ausências reconciliadas; ramo remoto confirmado por SHA.
- Este worker isolado não teve a suíte executada nesta tarefa. O resultado de testes do integration não é atribuído a ele.
- No integration (https://github.com/shishiv/EDUCA/pull/211), lint e testes unitários passaram (1316 testes; 20 ignorados), mas typecheck falhou em `app/tests/e2e/pilot/deployed-isolation.spec.ts:71:26` (`TS7006`). Build/E2E/SQL/pilot não foram reexecutados.
- Inventário completo, hashes, recibos e comparação: ramo `fm/educa-quality-prs-dev`, diretório `artifacts/educa-quality-prs-dev/`.

**Rascunho de preservação/reconciliação. Não mesclar integralmente sobre o integration sem revisar as diferenças: este snapshot pode conter versões anteriores ou alternativas e reverter avanços. Nenhum merge, fechamento, remoção de ramo ou limpeza das pastas faz parte desta entrega.**
