## Integração e preservação

Entrega única contra `dev`, baseada em `8713027b`. Integra o código preservado em https://github.com/shishiv/EDUCA/pull/211 e a evidência de https://github.com/shishiv/EDUCA/pull/218, após confronto de conteúdo com:

- https://github.com/shishiv/EDUCA/pull/212
- https://github.com/shishiv/EDUCA/pull/213
- https://github.com/shishiv/EDUCA/pull/214
- https://github.com/shishiv/EDUCA/pull/215
- https://github.com/shishiv/EDUCA/pull/216
- https://github.com/shishiv/EDUCA/pull/217

Não houve merge cego dos workers nem resolução geral por `theirs`. As 65 sobreposições divergentes foram revisadas por conteúdo; fixtures exclusivos, feedback, movimentos e substituições de testes estão reconciliados em `artifacts/quality-integration/resolution-notes.md`. O ledger executável compara os objetos/modos de todos os caminhos dos snapshots, não apenas contagens de linhas.

Os oito PRs e seus ramos permanecem abertos e intactos, com SHAs reconfirmados. O snapshot validation sem PR próprio também foi confrontado. O runtime e schema mantêm exatamente o conteúdo do snapshot integrado.

## Correções comprovadas

- Cliente Supabase tipado no spec de isolamento, corrigindo TS7006 sem `any` ou casts.
- Fixtures negativos anti-slop preservados byte a byte como `.ts.txt`, materializados pelo teste real do plugin; nenhum lint ou typecheck relaxado.
- Seed geral usa o mesmo prazo escolar auditado do seed piloto, evitando falha de abertura da chamada à noite; regressão exige o prazo capturado.
- Specs de perfil e diário agora controlam sessão/data local, preservando as expectativas de auditoria, persistência e validação.
- VENTs unidos por entradas completas, com títulos adequados ao gate tipográfico.

### Decisão `grades-general-contract`

A cadeia canônica tem RLS ativo e zero policies em `notas`. Conforme decisão explícita do Firstmate, **não foram criadas policies, alteradas permissões ou reativado o módulo**. Os cinco contratos positivos permanecem byte-idênticos e coletáveis em `playwright.grades-positive.config.ts`, fora do gate geral. A suíte geral prova a negativa para os cinco papéis e anon, com controle positivo por service role. Não há `test.skip` novo nem alegação de aprovação dos contratos positivos bloqueados.

## Validação observada

- Frozen install, typecheck, lint (zero warnings) e build: passaram.
- Vitest: **1317 passaram**, 20 ignorados preexistentes; workers máximo 2, sem paralelismo entre arquivos.
- E2E geral no escopo aprovado: **235/235 passaram**, worker 1, sem skips.
- Agregado piloto: **4/4 filhos passaram**, 36 testes incluindo setups, cleanup e liberação do lease confirmados.
- SQL completo: cadeia canônica, paridade de catálogo/replay, isolamento, concorrência e condicionalidade passaram.
- Demo SQL: fingerprints idênticos após reset repetido.
- Plugin anti-slop: 2/2; manifest: 3/3; preservação executável e tipografia: passaram.

Comandos, falhas antes das correções, screenshots, recibos redigidos e limites: **`artifacts/quality-integration/README.md`**. Recibos brutos herdados conservam seus espaços finais; o diff autoral passa em whitespace.

Somente dados sintéticos locais. Sem deploy, merge, fechamento ou descarte de ramos. R1 independente, restore/canary e execução pública externa não foram declarados validados. Entrega direct-PR, sem pipeline no-mistakes.
