# F09: provas browser de efeitos persistidos

Prova local de `706311434bd235a51ec9db2d965f13d699c74ca8`, sobre
`origin/dev@2840895ea44ed4e6de31de755337d30c6acf9b15`, em 2026-09-17.
A rodada final passou **6/6**, sendo quatro testes funcionais e dois setups,
com um worker, zero skips e zero retries. Os três contrafactuais ficaram
vermelhos por ausência do efeito esperado. O código correto foi restaurado
antes do commit e da validação final.

O [manifesto](manifest.json) contém SHA, hashes dos oito arquivos de código,
seleção real, contagens e recibos de cleanup. Não houve alteração de produto,
migração, grant, dependência, lockfile, configuração de lint ou implantação.
Não foram executadas a campanha geral, R3 ou provas históricas.

## Seleção e resultados

| Recorte | Ação e prova independente | Negativa |
| --- | --- | --- |
| Titular | Diretor escolhe docente da própria escola, salva pelo handler real, recarrega e confere `turmas.id/professor_id` por SQL independente | Lista exata de dois docentes locais. Docente estrangeiro existente fica ausente. Adulterar somente o ID enviado resulta em `PILOT_MANAGEMENT_TEACHER_DENIED`, sem alterar o vínculo salvo |
| Matrícula | Diretor muda a situação para `cancelada`, salva observação, recarrega e confere matrícula, aluno, turma, situação e observação por SQL | Reativação do mesmo registro com aluno inativo resulta em `PILOT_MANAGEMENT_STUDENT_DENIED`. Recarga e SQL mantêm o cancelamento |
| Dashboard | Administrador troca escolas, recarrega e compara quatro combinações de escola e ano com agregação SQL independente | Falha 503 induzida na leitura de frequência apresenta erro e nenhum cartão numérico. Repetir a leitura recupera os valores exatos |

A seleção executada é apenas `assignments/teacher.spec.ts`,
`matriculas/enrollment.spec.ts` e `flows/dashboard-metrics.spec.ts`, filtrada por
`F09`, mais as duas dependências de autenticação já existentes.
[Log final](final/test.log), [seleção coletada](final/manifest.log) e
[resultado estruturado](final/results.log).

### Oracle do dashboard

| Escola sintética | Ano | Alunos em matrículas ativas | Turmas ativas | Titulares ativos distintos | Presenças / fatos | Frequência |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A | 2025 | 3 | 2 | 1 | 3 / 4 | 75% |
| B | 2025 | 1 | 1 | 1 | 2 / 2 | 100% |
| A | 2026 | 2 | 1 | 1 | 1 / 3 | 33.3% |
| B | 2026 | 4 | 2 | 2 | 1 / 5 | 20% |

Cada contexto mostra exatamente uma escola ativa. O fixture inclui turma inativa,
matrícula cancelada e frequência fora do intervalo escolar persistido, de fevereiro
a novembro. A frequência usa fatos canônicos, não a média das porcentagens dos
alunos. `readDashboardOracle` consulta PostgreSQL diretamente, sem importar
`dashboardStatsApi` nem o leitor de frequência da aplicação.

O dashboard não tem seletor de ano. O teste fixa apenas o relógio do browser para
exercitar o resolvedor existente em 2025 e 2026. O relógio do servidor não muda.
A rota separada de alertas responde 409 com `Ano letivo desatualizado` quando os
anos divergem. Esse comportamento foi observado e explicitamente conferido,
não corrigido ou convertido em zero. Alertas históricos e novos indicadores não
fazem parte da prova.

## Contrafactuais causais

Cada rodada abaixo aplicou somente a sua quebra localizada, construiu a aplicação
e executou o teste correspondente no browser. Cada uma teve dois setups aprovados,
um teste reprovado, zero skips e cleanup final confirmado.

| Recorte | Quebra temporária | Resultado observado |
| --- | --- | --- |
| Titular | `handleAssignTeacher` retorna sem efeito | SQL mantém `professor_id = NULL`, diferente do UUID escolhido. [Patch](noop-titular-browser/mutation.patch), [falha](noop-titular-browser/test.log) |
| Matrícula | A persistência de `handleSave` vira `Promise.resolve()`, preservando validação e UI de sucesso | SQL continua `ativa` com a observação anterior. [Patch](noop-enrollment-browser/mutation.patch), [falha](noop-enrollment-browser/test.log) |
| Dashboard | A publicação em `setStats` vira uma expressão sem efeito | Os cartões mostram `0% / 0 / 0 / 0`, não `75% / 3 / 2 / 1`. O antigo teste de formato numérico aceitaria esses zeros. [Patch](noop-dashboard/mutation.patch), [falha](noop-dashboard/test.log) |

Os timeouts de polling de cinco segundos desses testes são falhas com diferenças
concretas de estado, não aprovação por timeout. As quebras não estão no código
entregue. O diff de `app/app`, `app/components`, `app/lib` e `supabase` em relação
à base permanece vazio.

## Cleanup e isolamento

O runner existente cria um projeto Supabase exclusivo, usa lease de portas e
remove somente seu grupo de processos, containers, volumes, redes, diretório,
configuração temporária e estados de autenticação. O projeto final foi
`quality-general.uUXg1f`.

- [Cleanup final da stack](final/cleanup.log): `no resources remain` para esse ID.
- [Exit final](final/result.txt): `GENERAL_E2E_EXIT=0`.
- [Cleanup lógico dos quatro testes](final/f09-cleanup.log): UUIDs removidos ou
  retidos e fingerprints conferidos. Titular e matrícula verificam remoção dos
  registros próprios. Cada fixture do dashboard deixa zero alunos, turmas,
  sessões e docentes próprios. As FKs permanecem habilitadas.
- Os dois testes do dashboard conferem, cada um, 78 fingerprints de auditoria
  anteriores ao cleanup. A auditoria dos vínculos de titular e matrícula também
  é preservada. Eventos novos de cleanup são permitidos, sem alterar eventos
  anteriores.
- Auditoria append-only, escolas referenciadas, anos letivos e configurações
  dessas escolas permanecem enquanto o banco exclusivo existe. O descarte final
  pertence ao lifecycle, não a um DELETE que viole as proteções da auditoria.
- Cada fixture usa nomes de escolas com UUID e exige uma única opção exata.
  As escolas retidas não são confundidas com as escolas do teste seguinte.

Essa separação foi confirmada pela coordenação após a falha `fourth`. Não foram
removidos eventos de auditoria nem desabilitados triggers ou FKs.

## Capturas com agent-browser

Após os seis testes, uma inspeção serial reutilizou o fixture sintético de
dashboard, em sessão própria `f09-bbf5091dad91`, com navegação restrita a loopback.
Os cartões estavam legíveis e mostraram `33.3% / 2 / 1 / 1` na escola A e
`20% / 4 / 2 / 2` na escola B após nova navegação ao dashboard.

- [Escola A](visual/dashboard-a.png), [snapshot](visual/dashboard-a.txt).
- [Escola B após recarga](visual/dashboard-b-reload.png), [snapshot](visual/dashboard-b-reload.txt).
- [Identidade do fixture visual](visual/ready.json) e [cleanup lógico](visual/cleanup.json).

O browser foi fechado antes de liberar o runner para remover a stack. Essas
capturas são inspeção desktop complementar, não novas provas de matrícula ou
uma campanha visual geral. Os testes mantidos continuam no Playwright existente.

## Gates e reprodução

Node nativo `/usr/bin/node` `v26.8.1`, ABI 147, com pnpm `9.15.4` já instalado.
Nenhuma ferramenta global foi instalada. Os comandos de aplicação partiram de
`app/`, com PATH local apontando `pnpm` para o binário pnpm 9 executado por esse
Node. Os registros estão em [checks](checks/).

| Gate final | Resultado |
| --- | --- |
| `pnpm typecheck` | PASS |
| `pnpm lint` | PASS, oxlint com complexity max10 e anti-slop, seguido de ESLint com zero warnings |
| `pnpm run test ... --maxWorkers=2` | PASS, seis arquivos e 23 testes, zero skips |
| `pnpm build` | PASS no runner final, [log](final/build.log) |
| Browser focal | PASS, quatro testes e dois setups, um worker, zero skips, zero retries |
| Tipografia do diff | PASS com `EM_DASH_DIFF_BASE=2840895ea44ed4e6de31de755337d30c6acf9b15`, a base `dev` desta tarefa |

A chamada padrão de tipografia falhou porque este worktree não tem ref local
`main`. Foi usado o override já previsto pelo script para a base `dev` da tarefa,
sem criar ou alterar a branch de produção. Ambos os logs estão preservados.

Seleção unitária: `tests/unit/api/dashboard-stats.test.ts`,
`tests/unit/api/governed-management.test.ts`,
`tests/unit/services/academic-year.test.ts`,
`tests/unit/contexts/escola-selection.test.ts` e `tests/unit/e2e`.

Com Node 26, pnpm 9, Docker e Chromium locais já disponíveis:

```bash
cd app
FOCUSED_BROWSER_EVIDENCE_DIR="$PWD/../artifacts/f09/local-run" \
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium \
  bash ../artifacts/contracts/run-focused-browser.sh \
  assignments/teacher.spec.ts matriculas/enrollment.spec.ts \
  flows/dashboard-metrics.spec.ts --grep F09 --max-failures=0
```

O runner provisiona credenciais locais e não usa Supabase remoto ou demo
compartilhado. Para repetir um contrafactual, aplique somente o patch indicado,
use outro diretório de evidências, selecione somente seu teste F09 e reverta o
patch antes da próxima rodada. Não use os patches em produção.

## Rodadas diagnósticas preservadas

Estas falhas continuam falhas e não contam como contrafactuais aprovados:

| Diretório | Resultado observado |
| --- | --- |
| `initial` | 2 passaram, 1 falhou por capitalização do nome do botão, 3 não executados |
| `second` | 3 passaram, 1 falhou pelo status de frequência inválido no fixture, 2 não executados |
| `third` | 3 passaram, 1 falhou no cleanup por FK de `configs`, 2 não executados. Também revelou o 409 dos alertas |
| `fourth` | 3 passaram, 1 falhou no cleanup por FK de `pilot_audit_log`, 2 não executados. Motivou a orientação de lifecycle |
| `fifth` | 2 passaram, 1 falhou porque o cleanup acrescenta evento de auditoria, 3 não executados. A verificação passou a preservar exatamente os eventos anteriores e permitir novos eventos |
| `sixth` | 6 passaram. Os anexos base64 foram redigidos pelo filtro de tokens. O runner final extrai os recibos JSON permitidos antes da redação, sem enfraquecer a remoção de tokens |
| `noop-titular` | Tentativa interrompida antes do build por edição do script em execução. Exit 2, sem prova browser |
| `noop-enrollment` | O primeiro desenho de no-op quebrou narrowing de TypeScript. Build reprovado, sem prova browser |

Todas essas stacks exclusivas tiveram remoção confirmada nos respectivos
`cleanup.log`. O primeiro lint de `diagnostics.ts` também reprovou complexity 17.
A decisão foi expressa como tabela de negativas específicas e o lint final
passou com o mesmo limite 10, sem supressões.
