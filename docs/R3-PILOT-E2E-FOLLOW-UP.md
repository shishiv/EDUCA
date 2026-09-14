# R3: reconciliação do runner E2E do piloto

A reconciliação do runner R3 já foi entregue, não é mais um passo futuro. O
[registro verificado da integração: servidor direto R3](plans/2026-08-23-open-issues-parallel-plan.md#registro-verificado-da-integração-servidor-direto-r3)
documenta a passagem do agregado em modo `direct`, com os quatro filhos e cleanup
integral. Este documento concilia esse registro histórico com o contrato dos
scripts na base `dev` (`a41c2501`), sem registrar uma nova execução E2E.

## Motivação histórica de R1

R1 deliberadamente não corrigiu o runner legado. Naquele momento,
`app/scripts/run-pilot-e2e.sh` consultava o status do Supabase local compartilhado,
exportava uma URL numerada em loopback e invocava a configuração Playwright geral,
cujo `webServer` usava `localhost` com porta. Isso não atendia ao contrato de
servidor nomeado nem criava um projeto Supabase descartável.

A listagem então registrada era de **23 testes em 11 arquivos**, incluindo
capacidade, importação CSV, convites, relatórios descritivos e segurança, com
fixtures, papéis e expectativas de cleanup diferentes. Essa contagem é histórica,
não o manifesto atual nem uma prova de execução. Separar esses ciclos de vida era
o escopo próprio de R3.

R1 permanece independente: `pnpm test:e2e:pilot:canonical` usa
[`run-pilot-canonical-e2e.sh`](../app/scripts/run-pilot-canonical-e2e.sh), projeto
Supabase isolado, Pilot Gate, identidade sintética de professor, portless e um spec
canônico de chamada. Não é um dos filhos do agregado R3 nem é substituído por ele.

## Contrato atual do agregado R3-T4

Em `app/`, `pnpm test:e2e:pilot` chama
[`run-pilot-aggregate-e2e.sh`](../app/scripts/run-pilot-aggregate-e2e.sh), conforme
[`app/package.json`](../app/package.json). O agregado executa, nesta ordem, quatro
filhos como processos separados, cada um com seu stack descartável, fixtures e
cleanup:

| Filho | Script | Configuração Playwright |
| --- | --- | --- |
| `legacy` | [`run-pilot-e2e.sh`](../app/scripts/run-pilot-e2e.sh) | [`playwright.pilot-legacy.config.ts`](../app/playwright.pilot-legacy.config.ts) |
| `capacity` | [`run-pilot-capacity-e2e.sh`](../app/scripts/run-pilot-capacity-e2e.sh) | [`playwright.pilot-capacity.config.ts`](../app/playwright.pilot-capacity.config.ts) |
| `descriptive` | [`run-pilot-descriptive-e2e.sh`](../app/scripts/run-pilot-descriptive-e2e.sh) | [`playwright.pilot-descriptive.config.ts`](../app/playwright.pilot-descriptive.config.ts) |
| `security` | Nova invocação de [`run-pilot-e2e.sh`](../app/scripts/run-pilot-e2e.sh) | [`playwright.pilot-security.config.ts`](../app/playwright.pilot-security.config.ts) |

O agregado adquire uma única lease de portas, coordenada entre worktrees e com
verificação das portas publicadas pelo Docker. Os filhos recebem essa lease sem
liberá-la; o agregado a mantém até a finalização. O filho `legacy` segue o
[manifesto explícito](../app/tests/e2e/pilot/legacy-pilot-manifest.ts), não a suíte
Playwright geral. Os setups de capacidade, descritivo e R1 ficam fora desse
projeto compartilhado. O filho `security` tem uma execução focal própria.

## Portless padrão e alternativa local `direct`

- **Padrão:** `PILOT_E2E_APP_SERVER=portless`, com origem nomeada `.localhost` sem
  porta explícita. A alternativa não remove nem relaxa esse contrato do portless.
- **Alternativa descartável:** `PILOT_E2E_APP_SERVER=direct` dispensa o proxy
  portless nos filhos R3. O app escuta em `127.0.0.1` via HTTP, na porta reservada
  pela lease, não em uma interface pública. Não é configuração de produção.
- **Slot extra:** o Supabase mantém os nove slots originais (`base` a `base + 8`);
  o décimo (`base + 9`) é reservado para o app. As fontes são
  [`pilot-app-server.sh`](../app/scripts/pilot-app-server.sh) e
  [`pilot-port-range-lease.sh`](../app/scripts/pilot-port-range-lease.sh).
- **Auth isolado:** a origem direta é aplicada a `site_url` e
  `additional_redirect_urls` somente na cópia de configuração do stack
  descartável, por [`pilot-local-project.ts`](../app/scripts/pilot-local-project.ts).
  Não altera a configuração canônica nem um projeto compartilhado ou remoto.
- **Controles existentes:** os receipts estruturados identificam `serverMode`,
  omitem portas nas URLs e o caminho da lease. Há controles de origem positivos
  e negativos em [`pilot-app-server.test.ts`](../app/tests/unit/pilot/pilot-app-server.test.ts);
  sua leitura aqui não equivale a uma nova execução desses testes.

## Evidência existente e limites

O registro posterior no plano documenta que o comando abaixo, executado em
`app/`, **passou naquela integração**:

```bash
PILOT_E2E_APP_SERVER=direct pnpm test:e2e:pilot
```

Foram aprovados os quatro filhos: `legacy`, `capacity`, `descriptive` e `security`.
O cleanup reportou app parado, bases isoladas paradas, diretórios temporários
removidos e lease liberada; o registro também confirmou que não restaram
containers da campanha. Os mecanismos atuais estão em
[`pilot-local-runtime.sh`](../app/scripts/pilot-local-runtime.sh) e
[`pilot-supabase-cleanup.sh`](../app/scripts/pilot-supabase-cleanup.sh).

As tentativas anteriores bloqueadas pelo portless sem sudo continuam sendo
histórico válido do plano. O resultado posterior demonstra a alternativa
`direct`, não uma correção daquele ambiente portless.

Esta reconciliação é documental, por leitura do plano e dos scripts. **Não houve
nova execução Docker/E2E nem reexecução da campanha.** O resultado histórico não
prova por transitividade que uma campanha completa futura, outro ambiente ou um
manifesto posterior passe. O contrato permanece local, descartável e somente com
dados sintéticos: não autoriza deploy, dados reais, aprovação jurídica ou
ativação pública.
