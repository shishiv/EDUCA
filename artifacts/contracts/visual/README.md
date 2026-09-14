# Checagem visual local do export Lavish

2026-09-14. Ferramenta `agent-browser` **0.37.1**, já instalada, explicitamente autorizada pela coordenação. Lido o core skill completo antes da operação. Não se usou nem atualizou `chrome-devtools-axi`.

## Isolamento

- Namespace exclusivo `ec-7c556a-1`, sessão `lavish`.
- Chrome existente: `/opt/google/chrome/chrome` (152.0.7977.75).
- Config temporária vazia, sem herdar providers/plugins, perfis de usuário, proxies, auto-connect ou restore.
- Allowlist apenas `127.0.0.1,localhost`. Servidor HTTP temporário ligado somente em `127.0.0.1`, porta atribuída pelo sistema.
- Apenas o HTML e assets sintéticos locais; sem conexão ao Supabase, serviços externos ou produção.

A tentativa inicial encontrou limite de comprimento do socket Unix antes de abrir navegador. Namespace/sessão menores corrigiram a configuração; `doctor --offline --quick` retornou 8 pass, 0 warn, 0 fail. Não houve instalação ou modificação global.

## Provas reais

| Estado | Screenshot | Checagem |
| --- | --- | --- |
| Claro, 1440 × 1000 | `light.png` (local) | [light-check.json](light-check.json) |
| Escuro, 1440 × 1000 | `dark.png` (local) | [dark-check.json](dark-check.json) |
| Escuro, 390 × 844 | `narrow-dark.png` (local) | [narrow-dark-check.json](narrow-dark-check.json) |
| Claro, 390 × 844 | `narrow-light.png` (local) | [narrow-light-check.json](narrow-light-check.json) |

Screenshots são full-page; alturas dos PNGs refletem todo o conteúdo, não apenas a viewport. Checagens executadas no DOM real confirmam:

- largura do documento igual à viewport, sem overflow horizontal da página;
- fontes carregadas e quatro imagens completas;
- rótulos SVG dentro dos respectivos nós;
- ausência de recursos HTTP externos;
- tema alterado pelo botão real; snapshots de controles preservados;
- nenhuma exceção JavaScript em `errors.log`.

Ajustes feitos **somente no artefato** após a primeira leitura visual: rolagem contida do diagrama em tela estreita, para não reduzir os rótulos a tamanho ilegível, e legenda mais precisa da screenshot de períodos ainda não configurados. Não houve nova alteração do produto ou repetição da campanha histórica.

`network.log` contém a navegação loopback e assets embutidos com URLs base64 substituídas por `[EMBEDDED_LOCAL_ASSET]` para evitar duplicar fontes/imagens no log. O favicon não fornecido retornou 404 local; os assets do conteúdo retornaram 200. Isso não é apresentado como prova de zero erros HTTP.

## Export e cleanup

O export final em `artifacts/contracts/review.html`, mantido **somente no worktree local**, foi o arquivo efetivamente verificado; `export.log` confirma zero assets locais não resolvidos. Fontes e imagens estão embutidas, sem CDN.

`cleanup.log` confirma encerramento da sessão automatizada. O servidor temporário foi encerrado no trap do mesmo processo. Depois foi aberta uma sessão Lavish apenas para `.lavish/contratos.html` e encerrada com `lavish-axi end` nesse mesmo arquivo; nenhum `close --all`, stop global ou fechamento de sessão alheia. Sem share externo e sem polling em background. O arquivo portátil permanece disponível para revisão offline.
