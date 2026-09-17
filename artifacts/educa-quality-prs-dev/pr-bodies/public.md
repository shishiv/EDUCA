# Preservação do worker public

## Origem e escopo
Interface pública/dashboard, navegação, criação de turmas/matrículas, i18n e testes do sandbox demonstrável.

Trabalho finalizado fora do Firstmate na pasta original `/home/shiv/Projects/EDUCA-quality-20260907/workers/public`, sobre `8713027b52caf6930999385253fdf1f052bbf912`. Commitado sem reescrita ou reconciliação, em `c0b0d4c63da6f2081f47a69000c7db654745c5aa`, no ramo remoto `salvar/educa-quality-public-20260908`. Todos os oito snapshots estavam enviados com SHAs confirmados antes da abertura dos PRs.

Resultado integrado principal: https://github.com/shishiv/EDUCA/pull/211

## Contagem preservada
- Inventário: 51 entradas já conhecidas do índice (incluindo intent-to-add) + 0 não rastreadas = **51 entradas preservadas**.
- Diff do commit: **50 files changed, 2211 insertions(+), 2057 deletions(-)**.
- Exclusão única: 1 arquivo(s) `.pi/semantic-grep.sqlite*`, deixados no disco. `VENT.md`, quando existente, está incluído.
- Reconciliação de contagem: `app/lib/middleware/proxy-boundary.ts` já não existia no disco nem na base; sua ausência foi preservada, sem conteúdo descartado.

## O que este ramo preserva além da versão do integration
O worker mantém a versão antiga de `app/tests/unit/demo-sandbox/demo-demoable-flows.test.ts`; o integration a substitui por testes comportamentais em `.test.tsx`, com conteúdo diferente. Também ficam preservadas versões alternativas de providers, formulários, navegação e auditoria demo. Trata-se de retenção para comparação, não de recomendação para reintroduzir testes ou contratos anteriores.

Comparação direta: `git diff c0b0d4c63da6f2081f47a69000c7db654745c5aa 2d95afc0237a74ded944cae53ed4db30a83903aa -- <arquivo>`, arquivo a arquivo. Classificação: **com conteudo exclusivo**, com 39 caminhos byte/modo-idênticos no mesmo local. Versões divergentes são preservadas conservadoramente; não são uma afirmação de que a funcionalidade correspondente esteja ausente do integration.

| Caminho | Relação com integration |
|---|---|
| `app/app/providers.tsx` | Versão divergente |
| `app/components/dashboard/matriculas-page-content.tsx` | Versão divergente |
| `app/components/dashboard/nova-turma-page-content.tsx` | Versão divergente |
| `app/components/dashboard/teacher-dashboard-enhanced.tsx` | Versão divergente |
| `app/components/layout/header.tsx` | Versão divergente; alterações normalizadas da base cobertas |
| `app/components/layout/mobile-header.tsx` | Versão divergente; alterações normalizadas da base cobertas |
| `app/components/layout/navigation.ts` | Versão divergente |
| `app/lib/demo-sandbox/demo-audit.ts` | Versão divergente |
| `app/tests/unit/demo-sandbox/demo-demoable-flows.test.ts` | Caminho presente só no worker |
| `app/tests/unit/demo-sandbox/demo-deploy-package.test.tsx` | Versão divergente |
| `app/tests/unit/i18n/locale-switcher.test.tsx` | Versão divergente; alterações normalizadas da base cobertas |
| `app/tests/unit/i18n/providers.test.tsx` | Versão divergente |

## Evidência e limites
- Conteúdos SHA-256 e modos do índice conferidos contra o inventário antes do commit; ausências reconciliadas; ramo remoto confirmado por SHA.
- Este worker isolado não teve a suíte executada nesta tarefa. O resultado de testes do integration não é atribuído a ele.
- No integration (https://github.com/shishiv/EDUCA/pull/211), lint e testes unitários passaram (1316 testes; 20 ignorados), mas typecheck falhou em `app/tests/e2e/pilot/deployed-isolation.spec.ts:71:26` (`TS7006`). Build/E2E/SQL/pilot não foram reexecutados.
- Inventário completo, hashes, recibos e comparação: ramo `fm/educa-quality-prs-dev`, diretório `artifacts/educa-quality-prs-dev/`.

**Rascunho de preservação/reconciliação. Não mesclar integralmente sobre o integration sem revisar as diferenças: este snapshot pode conter versões anteriores ou alternativas e reverter avanços. Nenhum merge, fechamento, remoção de ramo ou limpeza das pastas faz parte desta entrega.**
