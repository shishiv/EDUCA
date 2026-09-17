# Integração de qualidade para dev

Base: `8713027b52caf6930999385253fdf1f052bbf912`. Trabalho isolado na branch `fm/educa-corrigir-integracao-dev`.

## Escopo e preservação

Ponto de partida: relatório de investigação completo em `/home/shiv/Projects/firstmate/data/educa-validar-8-prs/report.md`.

- Código integrado preservado de https://github.com/shishiv/EDUCA/pull/211 (`2d95afc0237a74ded944cae53ed4db30a83903aa`).
- Evidência original preservada de https://github.com/shishiv/EDUCA/pull/218 (`b87671e4f7795c0bebe0c972b80e9781db49ef5c`), em `../educa-quality-prs-dev/`.
- Workers confrontados por conteúdo: auth https://github.com/shishiv/EDUCA/pull/212, contracts https://github.com/shishiv/EDUCA/pull/213, frequency https://github.com/shishiv/EDUCA/pull/214, public https://github.com/shishiv/EDUCA/pull/215, readmodels https://github.com/shishiv/EDUCA/pull/216 e toolchain https://github.com/shishiv/EDUCA/pull/217.
- Também confrontado o snapshot validation `5d1bb89a78218a5abb0f82c29b275fa5f23ffab5`, já coberto pela integração e sem PR independente.
- Nenhum desses PRs ou ramos foi fechado, mesclado, reescrito ou descartado. Nenhum deploy ou dado real utilizado.

`reconciliation.json` registra, para cada caminho alterado nos nove snapshots acima, os objetos Git/modos da origem e integração, o destino final, seu objeto/modo esperado e a decisão. São 886 entradas com sobreposição, não 886 arquivos únicos. As 72 divergências worker/integração incluem as 65 sobreposições divergentes do relatório, três VENTs, dois fixtures, um E2E movido e a diferença adicional do snapshot validation.

`resolution-notes.md` explica cada divergência. Os 53 conflitos da simulação anterior não foram resolvidos com `theirs`: a versão integrada foi comparada aos workers antes de ser aplicada, e seus destinos/refatorações foram inspecionados. Exemplos relevantes:

- Auditoria demo mantém validação de papel/escola e recibos no handler extraído, com testes de contrato dos dois intentos.
- Dashboard docente combina a entrada `initialTurmas` do worker public com as consultas/projeções do readmodels.
- Reabertura mantém o E2E byte-idêntico em `tests/e2e/pilot/attendance-reopen.spec.ts`; a janela de correção continua prevalecendo sobre o prazo ordinário persistido pela escola.
- O antigo `demo-demoable-flows.test.ts` não foi ressuscitado: suas cópias de funções e regex de fonte foram substituídas por `.test.tsx` que executa formulário e transporte Supabase reais, com contrato SQL para admissão e isolamento.
- Leituras, mutações governadas, recibos atômicos, isolamento escolar, defaults no banco, testes do diário e relatórios já presentes na integração foram mantidos; não foram substituídos pelas versões pré-integração dos workers.
- Feedback dos três workers e do ramo de evidências foi unido por entradas completas em `VENT.md`. Apenas a pontuação dos títulos foi normalizada para cumprir o gate tipográfico; os corpos originais estão intactos.

Verificação executável, sem alterar Git ou arquivos:

```bash
python3 artifacts/quality-integration/verify.py
```

Em clone raso, obtenha antes os commits de origem listados em `reconciliation.json` com `git fetch origin <commit>`; os ramos de preservação continuam disponíveis. A verificação compara bytes/modos e cobertura de caminhos, inclusive exclusões/movimentos e fixtures. A avaliação comportamental está nas notas e nos testes, não é inferida de contagem de linhas ou hashes.

## Correções próprias, além do snapshot integrado

1. **TS7006 reproduzido** em `tests/e2e/pilot/deployed-isolation.spec.ts`. O helper de autenticação criava cliente sem `Database`, tornando o resultado RPC implicitamente `any`. Todos os clientes desse spec agora usam o tipo gerado; nenhuma anotação `any`, cast ou alteração nas expectativas de isolamento.
2. **Fixtures inválidos reproduzidos**: quando copiados literalmente para `.ts`, produzem três erros anti-slop e `TS2307` para `icon-library`. Seus bytes exclusivos são preservados como `.ts.txt`; o teste do plugin os materializa temporariamente como `.ts` e exige exatamente os mesmos diagnósticos. Não há exceção nova de lint, exclusão de tsconfig nem mudança de regra.
3. **Seed geral dependente do horário**: a E2E geral reproduziu falha ao abrir chamada depois das 18h (44 testes aprovados antes da parada). O piloto já persistia um prazo até o fim do dia via diretor autenticado; o seed geral não. `seed-e2e.ts` agora usa o mesmo RPC auditado somente na escola sintética. O teste de grid exige o prazo efetivamente capturado na sessão, além de salvar/recarregar a chamada. Nenhum bypass de relógio foi acrescentado ao produto.
4. **Perfil dependente da ordem da suíte**: outros contratos autenticam os mesmos papéis depois da criação do `storageState`. O spec comparava o timestamp daquela sessão antiga ao login mais recente da conta. Ele agora autentica uma sessão fresca antes de fazer a mesma comparação estrita; nenhuma expectativa foi relaxada e o produto não foi alterado. Repro em `general-profile-before/` (168 passaram antes da parada).
5. **Dia local do diário**: após a virada de UTC, o spec esperava dia 10 enquanto o formulário local corretamente usava dia 9. O cenário agora fixa relógio e fuso, exigindo literalmente `2026-09-09`; a prova de edição escolhe o dia anterior ao valor criado, para realmente alterar a data mesmo quando UTC e dia local divergem. O formulário permanece intacto. Repro em `general-date-before/`.
6. **Tipografia do feedback**: títulos com travessão herdados dos VENTs normalizados para hífen, sem eliminar entradas.

O teste `general-playwright-manifest.test.ts` passou na suíte completa. Não foi aumentado seu timeout nem escondido o flake histórico.

## Evidências e ambiente

Node `24.20.0`, pnpm `9.15.9`, PostgreSQL `18.6`; builds com Next webpack. Workers explícitos: Vitest máximo 2 sem paralelismo entre arquivos; Playwright 1; oxlint 1; teste Node 1. Nenhuma suíte completa duplicada em paralelo.

| Check | Resultado | Evidência |
| --- | --- | --- |
| Frozen install | Passou | `install.log` |
| Typecheck antes da correção | TS7006 reproduzido | `typecheck-before.log` |
| Fixtures como código antes da correção | 3 erros anti-slop e TS2307 reproduzidos | `fixture-lint-before.log`, `fixture-type-before.log` |
| `pnpm typecheck` | Passou | `typecheck.log` |
| `pnpm lint` | Passou, inclusive ESLint com zero warnings | `lint.log` |
| Teste executável anti-slop | 2/2 passaram | `anti-slop-plugin.log` |
| `pnpm run test --maxWorkers=2 --no-file-parallelism` | 124 arquivos, 1317 testes passaram; 3 arquivos/20 testes ignorados | `unit.log` |
| `pnpm build` | Passou | `build.log` |
| `supabase/tests/database/run.sh` | Passou, catálogo canônico/replay, concorrência e condicionalidade incluídos | `database-retry.log` |
| `pnpm test:e2e:pilot` | Quatro filhos passaram: legacy 26, capacity 3, descriptive 4, security 3, incluindo setups | `pilot/aggregate.json`, `pilot/children/` |
| Cleanup do piloto | Aplicações, bancos, auth e diretórios próprios removidos; lease liberado pelo agregado | `pilot/cleanup.json` e recibos filhos |
| E2E geral antes da decisão de escopo | 157 passaram, 1 falhou em leitura de nota, 81 não executados; não aprovado | `general-grades-before/test.log`, `general-grades-before/error-context.md`, `general-grades-before/test-failed-1.png` |
| Prova do bloqueio de notas | Cadeia canônica, antes de provisionar piloto: RLS ativo, grant SELECT, zero policies | `grades-canonical-policy.log` |
| E2E geral, escopo aprovado final | 235/235 passaram, sem skips, com a negativa de notas e regressões de horário/perfil | `general/test.log`, `general/result.txt` |
| Negativa de notas + perfil, recorte focado | 10/10 passaram | `general-focused/test.log` |
| `pnpm demo:verify-sql` | Passou, incluindo fingerprints idênticos após reset repetido | `demo-sql.log` |
| Manifest separado de notas | 3 testes de seleção passaram; positivos preservados e não declarados verdes | `manifest.log` |
| Tipografia | Passou contra `origin/main`, equivalente remoto da branch local ausente | `typography-final.log` |
| Preservação do runtime e schema | Sem diferenças próprias em app/app, components, lib, hooks, contexts, types e supabase após o snapshot integrado | `runtime-preserved.log` |

Comandos do piloto usados, a partir de `app/`:

```bash
PILOT_E2E_APP_SERVER=direct \
PILOT_PLAYWRIGHT_EXECUTABLE_PATH=/usr/bin/chromium \
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium \
NEXT_TELEMETRY_DISABLED=1 pnpm test:e2e:pilot
```

Ocorrências ambientais mantidas como evidência, não contadas como aprovação:

- Shim `pnpm` sem versão mise ativa: utilizado o binário Node 24/pnpm 9 já instalado, sem mudar configuração global.
- Primeiro SQL: o socket do filho condicionalidade excedeu o limite Unix com o TMPDIR longo. Execução completa repetida com `TMPDIR=$PWD/.t`, passou. Não houve alteração de SQL para contornar a falha.
- Primeiro piloto: navegador gerenciado da versão Playwright não instalado. Interrompido o agregado antes de repetir a falha nos demais filhos; cleanup confirmado. Reexecução completa com Chromium instalado pelos overrides existentes passou.
- Gate tipográfico padrão aponta para branch local `main`, ausente neste worktree. A comparação equivalente usa `EM_DASH_DIFF_BASE=origin/main`; não foi criada ou alterada branch de produção.
- `git diff --check` global registra espaços nos recibos brutos herdados em `artifacts/educa-quality-prs-dev/`. Esses bytes de evidência foram preservados; o check autoral é separado.

## E2E geral reproduzível

`run-general-e2e.sh` reutiliza o criador de projeto Supabase local, lease e cleanup do projeto. Executa o manifest geral real com Chromium instalado e origem localhost isolada, sem depender da porta compartilhada 3000. A configuração temporária muda apenas transporte/servidor e é removida junto com banco e auth próprios. O seed vem do `globalSetup` existente. A execução para na primeira falha (`--max-failures=1`), sem converter testes não executados em aprovação.

```bash
bash artifacts/quality-integration/run-general-e2e.sh
# Recorte focado da regressão do prazo capturado:
bash artifacts/quality-integration/run-general-e2e.sh attendance/grid.spec.ts
```

`general-before/` contém a falha, snapshot e captura de tela antes da correção do seed; `general-grades-before/` registra a falha que motivou a decisão sobre notas. `general/` contém a execução do escopo aprovado, com a prova negativa de notas. Credenciais locais de Auth, Storage e banco são removidas dos logs preservados.

## Decisão resolvida: grades-general-contract

A suíte geral preservada exige leitura/escrita de notas (`grades/entry.spec.ts`), mas a cadeia canônica já remove as policies de `notas` em `20260810220000_governed_pilot_security_hardening.sql` e não as recria. Foi aplicado todo o histórico em PostgreSQL descartável, sem provisionador do piloto: `pg_policies` retorna zero, `relrowsecurity=true`, grant SELECT existe. Portanto trocar admin por diretor não resolve; nenhum browser role lê a nota inserida pelo service role.

A instrução do Firstmate de 2026-09-09T23:42:29Z está preservada em `decision-grades.txt`: manter o bloqueio, separar os contratos positivos e executar a prova negativa no gate geral. Não foi ampliada permissão nem alterado o módulo.

`grades/entry.spec.ts` e `grades/report-card.spec.ts` permanecem byte-idênticos ao snapshot integrado. Os cinco cenários positivos ficam na configuração explícita `app/playwright.grades-positive.config.ts`, fora do gate geral. Sua coleta é verificada pelo teste executável de manifest; eles não são declarados aprovados contra o esquema bloqueado. Nenhum `test.skip` foi introduzido.

O novo `grades/access-boundary.spec.ts` primeiro insere e lê uma nota sintética pelo service role como controle positivo. Depois autentica admin, diretor, professor, secretário e responsável, exige leituras vazias e INSERT negado, e comprova que UPDATE/DELETE não alteraram a nota; anon também é negado. A nota própria é removida ao terminar e cada sessão de teste faz logout com escopo local, sem revogar o storageState dos outros cenários (`general-auth-before/` registra a correção desse isolamento; `general-focused/` comprova o conjunto). Assim o gate geral falha se o bloqueio desaparecer, em vez de fingir que leitura/escrita de notas está habilitada.

Coleta dos contratos positivos preservados, a partir de `app/`:

```bash
pnpm exec playwright test --config playwright.grades-positive.config.ts --list --workers=1
```

Reativar notas, mesmo fora do piloto, continua dependendo de autorização de produto/segurança separada.

## Limites

Os oito PRs originais seguem abertos, não mesclados e com os mesmos SHAs (`source-heads-final.txt`); `origin/dev` permaneceu em `8713027b`. O runtime e as migrations são byte-idênticos ao snapshot integrado; as correções próprias estão nos testes, seed sintético, seleção de testes e documentação. A negativa de notas não constitui reativação desse módulo.

Os resultados são ensaio sintético local, não autorização municipal/produção. A suíte unitária mantém 20 testes ignorados declarados pelo projeto. R1 canônico independente, restore/canary e execução pública externa não recebem aprovação por transitividade do agregado R3. Não foi usado o pipeline no-mistakes, conforme o contrato direct-PR.
