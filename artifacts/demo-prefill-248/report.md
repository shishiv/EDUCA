# Entrada demo pré-preenchida

Referência: https://github.com/shishiv/EDUCA/issues/248

## Resultado

Em `/login`, `NEXT_PUBLIC_DEMO_SANDBOX=true` inicializa os dois campos com a persona pública de demonstração que já era usada pelo botão. O helper agora fornece esses valores tanto ao estado inicial quanto à ação de restaurar o preenchimento. O antigo helper booleano foi substituído e seus chamadores migrados.

O convite aparece antes dos campos. Os cuidados sobre dados fictícios e ambiente compartilhado ficam junto de “Entrar”. “Preencher credenciais demo” continua sendo uma ação de formulário, não de autenticação. “Entrar” continua sendo o único envio do formulário. Fora do modo demo, os campos ficam vazios e o título continua sendo “Entrar no sistema”. O fallback privado `DEMO_SANDBOX` não ativa mais a interface de preenchimento, evitando diferenças entre servidor e navegador.

Não houve alteração na landing, em `/demo`, nas credenciais do seed, no SQL, no fluxo de sessão ou em configuração remota. Nenhuma conta foi criada ou autenticada no sandbox público.

## Verificações finais

Ambiente: Node 26.8.1, `/usr/bin/node`, ABI 147, pnpm 9.15.9, Next.js 16.3.0. Instalação com lockfile congelado, sem mudanças de dependência. Os logs abaixo têm apenas cores ANSI e espaços de fim de linha normalizados para leitura no repositório.

| Verificação | Resultado |
| --- | --- |
| `pnpm typecheck` | Passou. [Log](typecheck.log). |
| `pnpm lint` | Passou, sem warnings. Complexity max 10 e anti-slop preservados. [Log](lint.log). |
| `pnpm run test --maxWorkers=2 --reporter=dot` | 1374 passaram, 29 ignorados em 5 arquivos já excluídos por suas condições existentes. Nenhum skip novo. [Resumo](test-summary.txt). |
| `CIRCLE_NODE_TOTAL=3 pnpm build` | Passou com 2 workers, flag demo ativa e Supabase limitado a loopback sem serviço. [Log](build.log). |
| `public-visitor`, flag pública `true` | 1 passou, 1 worker. Valores verificados antes de qualquer clique, restauração após editar e zero requisições de autenticação. [Log](e2e-demo.log). |
| `public-visitor`, flag pública `false`, fallback privado `true` | 1 passou, 1 worker. Ambos os campos vazios, botão de preenchimento ausente e “Entrar” preservado. [Log](e2e-operational.log). |
| Build servido localmente, 390×844 | Convite, campos preenchidos e ação visíveis. “Entrar” entre y=535,52 e y=583,52. Sem overflow horizontal nem erro de console observado. [Dados](demo-observation.json). |

A suíte existente `app/tests/e2e/public-demo/public-visitor.spec.ts` é a prova primária do preenchimento inicial e da restauração sem autenticar. O valor da senha é comparado por hash para preservar a expectativa exata sem imprimir a senha em falhas. O teste de componente usa o `AuthProvider` real e interrompe apenas a fronteira externa do Auth. Ele verifica envio explícito de valores editados, loading, erro e recuperação nos dois modos, sem repetir a jornada E2E.

Comandos E2E, executados separadamente a partir de `app/`, com `PLAYWRIGHT_BASE_URL=http://localhost:3248`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`, `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9` e uma chave sintética sem acesso a serviço:

```sh
NEXT_PUBLIC_DEMO_SANDBOX=true pnpm run test:e2e:public-entry --grep 'visitor can move' --workers=1
NEXT_PUBLIC_DEMO_SANDBOX=false DEMO_SANDBOX=true pnpm run test:e2e:public-entry --grep 'visitor can move' --workers=1
```

A configuração existente aceita a flag explícita e mantém `true` como default do ensaio. O servidor do ensaio fica limitado ao loopback. Não foram ampliados timeouts. O primeiro ensaio não restaurou o campo editado. A interação funcionou na inspeção manual com os handlers carregados. O ensaio final usa a origem `localhost` e aguarda a conclusão da carga dos scripts antes de editar e restaurar, mantendo as asserções dos valores iniciais antes dessa espera.

## Evidência visual

- [Demo 390×844 no build](demo-production-mobile.png), capturado com agent-browser.
- [Demo 1440×900 no build](demo-desktop.png), capturado com agent-browser.
- [Operacional 390×844](operational-mobile.png), capturado com agent-browser. [Campos vazios e bloqueio nativo de envio vazio](operational-observation.json).
- [Demo 390×844 no desenvolvimento](demo-mobile.png), captura inicial por chrome-devtools-axi preservada.

## Passe crítico e limites

O passe but-for-real confrontou o pedido com o diff, os dois modos no teste existente, o envio real do componente até a fronteira do Auth e as capturas do build. A senha está mascarada nas imagens. Nenhum artefato textual contém a senha. O botão de preenchimento não cria sessão e o teste não depende mais de clicar nele para obter o estado inicial.

Não foram verificados o valor da flag publicada, a validade da conta pública, autenticação bem-sucedida, dashboard, a suíte E2E geral ou idiomas além do português no navegador. As traduções em inglês foram incluídas e passaram pelos checks de código. A efetividade no ambiente publicado depende de uma compilação futura com a flag correta, que não foi inspecionada nem alterada nesta tarefa.

O build avisou sobre dados antigos do Browserslist. Os ensaios emitiram avisos existentes do Node e do bloqueio deliberado de service worker pelo Playwright. Isso não foi tratado como aprovação de checks ausentes nem motivou atualização de dependências. Os servidores e as sessões de navegador próprios foram encerrados.

## Feedback de ferramenta

O `chrome-devtools-axi run` retornou `fn is not a function` em duas formas de `page.eval` documentadas no help. Os comandos avulsos funcionaram. A prova restante foi feita com agent-browser por orientação de firstmate. Isso foi uma falha do driver, não do produto. Um teste de integração das duas formas documentadas evitaria repetir essa troca manual de ferramenta.
