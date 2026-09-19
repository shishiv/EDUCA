# Entrada por teclado e saída local: #248

Referência: https://github.com/shishiv/EDUCA/issues/248

## Fonte e limite

Base executada: `9177ab5c29ae3732182f812a488033ac48130c20` (`dev`), com as alterações desta entrega. O [manifesto](receipt.json) identifica os cinco arquivos verificados por SHA-256, a origem local, os viewports e a limpeza. Resultados de 2026-09-19, Node 26.8.1, pnpm 9.15.9 e Chromium local.

Esta entrega distingue **A, entrada pública sem Auth**, de **B, piloto operacional autenticado com secretaria sintética**. A conta demo e qualquer origem remota continuam **não validadas**. Não há alegação de produção, dados reais, disponibilidade publicada ou prontidão de navegadores não exercitados.

Nenhuma alteração em copy, traduções, credenciais, Auth, papéis, isolamento, seed, SQL, manifests, lockfile ou flags do runner. O roteiro de primeira tarefa da #251 pertence à entrega separada.

## Resultado final

| Verificação | Resultado |
| --- | --- |
| Dois módulos unitários de login | 2 arquivos, 3 testes passaram |
| Entrada demo, filtro `visitor can move` | 1 passou |
| Entrada demo, arquivo `public-visitor.spec.ts` completo | 8 passaram |
| Entrada operacional, filtro `visitor can move` | 1 passou |
| Entrada operacional, arquivo completo | 8 passaram |
| `locale-layout.spec.ts` completo após correção | 4 passaram, incluindo toque/Escape/foco |
| Desktop autenticado, 1440×900 | Escola e turma A, saída por teclado, retorno protegido: PASS |
| Mobile autenticado, 390×844 com toque habilitado | Escola A por toque, turma A em tela, saída pelo menu, retorno protegido: PASS |
| `pnpm typecheck` / `pnpm lint` | Passaram; complexity max10 e anti-slop preservados |
| Detector Impeccable, somente três componentes alterados | Nenhum achado (`[]`) |

[Saída resumida dos checks finais](checks.txt). Os módulos completos incluem seus testes irmãos; não houve skip novo ou ampliação de timeout.

## A: entrada pública sem Auth

O teste **existente** `visitor can move from landing to demo, login, and home` foi estendido. Não foi criada outra suíte pública.

- Landing → `/demo` → `/login` → recuperação de senha → login → início, com eventos reais de teclado.
- `Tab` e `Shift+Tab` procuram controles, sem fixar contagem incidental. O limite de 50 passos é proteção contra loop, não ordem exigida.
- O controle alcançado deve estar no viewport, corresponder a `:focus-visible` e apresentar mudança de outline/box-shadow em relação ao estado sem foco.
- No demo, valores iniciais preservados; editar e restaurar com Espaço não envia autenticação.
- No operacional, campos iniciais vazios e restauração demo ausente, mesmo com a flag privada ativa.
- Checkbox e links ativados por teclado; envio explícito por Enter; rejeição observável, formulário recuperado e permanência em `/login`.
- A requisição de token é interceptada antes da rede, com rejeição controlada. Isso mantém o smoke não destrutivo também sob sua configuração de origem compartilhada. **Não é sessão Auth real.**

Comandos efetivamente executados em `app/`, em processos separados, com encerramento do servidor entre modos:

```sh
pnpm exec vitest run tests/unit/auth/login-page.test.tsx tests/unit/auth/login-demo-credentials.test.ts --maxWorkers=2

CI=1 PLAYWRIGHT_BASE_URL=http://localhost:3248 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9 NEXT_PUBLIC_SUPABASE_ANON_KEY=local-public-entry-only NEXT_PUBLIC_DEMO_SANDBOX=true pnpm run test:e2e:public-entry --grep 'visitor can move' --workers=1

CI=1 PLAYWRIGHT_BASE_URL=http://localhost:3248 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9 NEXT_PUBLIC_SUPABASE_ANON_KEY=local-public-entry-only NEXT_PUBLIC_DEMO_SANDBOX=false DEMO_SANDBOX=true pnpm run test:e2e:public-entry --grep 'visitor can move' --workers=1
```

Cada modo também executou `pnpm run test:e2e:public-entry public-visitor.spec.ts --workers=1`, com as mesmas variáveis daquele modo. `CI=1` impediu reutilização de servidor. Viewport inicial 1280×720; login 390×844. O destino loopback na porta 9 não oferece Auth: nenhum PASS de sessão, turmas ou logout foi atribuído a A.

## Defeito descoberto e corrigido

A primeira execução mobile autenticada encontrou o popover escolar atrás do drawer. O retângulo da opção A era `x=21, y=181, width=294, height=32`; o hit-test central atingia o link Dashboard. O popup Radix estava fora do painel, diretamente sob `body`, com camada 50; o drawer Headless UI estava em outro portal, com camada 70. O foco do campo de busca também ficava fora do painel.

- [Antes: opções cobertas](local-mobile-school-option-covered.png).
- [Regressão antes do patch](regression-before.txt): `option.tap()` falhou porque o subtree de `headlessui-portal-root` interceptava eventos de ponteiro.
- [Depois: opção visível e tocável](local-mobile-school-option-fixed.png).

A correção usa o `container` suportado pelo portal Radix. `MobileSidebar` fornece seu painel ao `EscolaSelector`, que encaminha o container nas variantes expandida e recolhida. Sem container explícito, os outros consumidores de `PopoverContent` mantêm seu destino anterior. Nenhum z-index global foi elevado.

Depois do patch, no mesmo ponto geométrico, o hit-test atingiu `Escola Sintetica A`; popup e foco estavam dentro do painel. A regressão usa **`tap()` com `hasTouch: true`**, aplica a seleção e verifica que Escape fecha primeiro o popup, devolvendo foco ao seletor, e depois fecha o drawer, devolvendo foco ao botão de abertura.

A regressão foi acrescentada a `app/tests/e2e/flows/locale-layout.spec.ts`. O arquivo completo rodou contra o runner existente por uma configuração transitória que herdava `playwright.config.ts`, desligava apenas o novo servidor/global setup para não provisionar novamente, selecionava esse arquivo e usava estado Auth local temporário. Configuração, estado Auth e saída transitória foram removidos; não integram o commit. Nenhum helper de autenticação foi alterado.

A seleção por teclado permitiu uma prova intermediária de logout mobile, mas **não** foi tratada como correção do toque. O resultado final abaixo foi repetido por toque depois do patch.

## B: piloto operacional autenticado

Runner: `pnpm dev:local`, sem alteração. Origem final:

```text
http://educa-entry-local-proof-248.educa-dev-local-3490726.localhost:1355
```

Proxy próprio, HTTP loopback em porta alta, estado dentro da cópia, `PORTLESS_HTTPS=0`, `PORTLESS_SYNC_HOSTS=0` e `PORTLESS_LAN=0`. O mesmo ambiente foi herdado pelo runner e seus filhos. pnpm 9.15.9 foi fixado no PATH da execução, sem mudar instalação global.

Flags do runner preservadas: `NEXT_PUBLIC_DEMO_SANDBOX=false`, `DEMO_SANDBOX=false`, `NEXT_PUBLIC_PILOT_MODE=true`, `PILOT_MODE=true`, `PILOT_SYNTHETIC_DATA_ONLY=true`, `PILOT_EXTERNAL_DEPLOY_APPROVED=false`, `PILOT_LEGAL_APPROVAL_STATUS=not_approved`.

Foi usada a secretaria sintética documentada no README, não a conta demo. Só ocorreram login/logout, seleção de contexto e leitura; nenhum registro escolar foi cadastrado ou alterado.

### Desktop, 1440×900

1. Contexto limpo; digitação, Tab/Shift+Tab e Enter para autenticar.
2. `/dashboard`, sem primeiro acesso; selecionar `Escola Sintetica A` por teclado.
3. Confirmar seleção também na variante recolhida: escola B e retorno à A, sem mutação de registros.
4. Confirmar Escape e restauração do foco nos seletores expandido/recolhido.
5. Abrir `/dashboard/turmas` por teclado; [turma A visível](local-desktop-turmas.png).
6. Tab até `Abrir menu do usuário`, Enter, End até [Sair do Sistema](local-desktop-logout-menu.png), Enter.
7. Reabrir `/dashboard` no mesmo contexto, sem apagar cookies/estado: [login exigido](local-desktop-after-logout.png), em `/login?returnUrl=%2Fdashboard`.

[Indicação de foco na entrada operacional](local-desktop-login-focus.png), capturada na execução inicial antes do patch modal; essa superfície não foi alterada.

### Mobile, 390×844

1. Contexto limpo; autenticar a secretaria local.
2. Abrir drawer e seletor por toque; selecionar **Escola Sintetica A por toque**, sem clique forçado, seleção por teclado, API ou mutação DOM.
3. Abrir Turmas pelo link dentro do drawer; rolar até a [turma A em tela](local-mobile-touch-turmas.png).
4. Abrir [Opções do usuário → Sair](local-mobile-touch-logout-menu.png) por toque.
5. Reabrir `/dashboard` no mesmo contexto: [login exigido](local-mobile-touch-after-logout.png), sem limpar estado para fabricar o resultado.

Navegação e capturas usaram agent-browser em sessão própria. Como seu CLI Chromium expõe clique, não um comando `tap`, os toques da confirmação final foram emitidos pelo touchscreen CDP do **mesmo navegador próprio**, com `hasTouch=true`; o E2E usa o `tap()` do Playwright. É emulação Chromium, não aparelho físico ou Safari.

## Limpeza e passe crítico

A instância final recebeu SIGTERM diretamente no PID do script `dev-local.sh`, não apenas em pnpm/Next. Saída 143 esperada; stdout: `Local EDUCA environment removed.`. A mensagem foi corroborada por consultas específicas ao projeto `educa-dev-local.KWRWtM`: nenhum container, volume ou rede restante; rotas portless vazias; lease 61000 e diretório temporário removidos. Navegadores próprios fechados e proxy próprio encerrado. Estado Auth, configuração transitória, ferramentas temporárias e CA local não utilizada foram removidos da cópia.

O passe but-for-real confrontou contrato, diff integral, consumidores das novas props, contrafactual vermelho/verde, módulos completos e capturas. O script de memória do projeto retornou `unchanged`; não se acrescentou conhecimento redundante a AGENTS.md.

**Não verificados:** conta demo autenticada, ambientes remotos, produção, dispositivos físicos, Safari/Firefox e a futura integração da copy de outra entrega. Os avisos existentes de Node/Browserslist e o erro de credencial deliberadamente interceptado no smoke não foram convertidos em falhas escondidas nem motivaram mudanças de dependência.
