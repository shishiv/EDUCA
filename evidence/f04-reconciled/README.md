# F04: status e receipt na mesma transação

Ensaio local em 2026-09-17. Base: `1d373b550d54d92ddbc03cd362123d7d6f12e79b`, de `origin/dev`. Branch: `fm/educa-f04-user-status-atomic-reconciled`. O SHA de entrega consta na proposta contra `dev`. `source-manifest.sha256` identifica os arquivos executados.

A reconciliação reutiliza a implementação e os contratos focais preservados em https://github.com/shishiv/EDUCA/pull/224, head `ac8353328938f262ca1fd4f2b8f0e4c941b84c15`. Essa branch e essa proposta não foram alteradas. Não houve merge, deploy, CI hospedado, envio de email ou uso de dados reais. Todas as identidades e escolas do ensaio são sintéticas. A criação inicial de contas usa o seed local existente, sem alteração do código de Auth.

## Defeito confirmado no handler real

O handler da base executava `UPDATE users.ativo` pelo cliente de serviço e depois `write_pilot_audit_event` pelo cliente autenticado. Cada chamada encerrava sua própria transação.

O teste `app/tests/live/user-status-atomic.live.test.ts` autentica o admin sintético, chama a rota HTTP real e consulta PostgreSQL por outra conexão. Não substitui o handler, o cliente Supabase ou o receipt por mocks. Um trigger temporário suprime apenas `user_status_updated`, sem desabilitar a auditoria genérica.

Em [http-before.log](http-before.log), a rota antiga devolveu 503 com `completed:false`, mas:

| Observação persistida | Antes | Depois |
| --- | --- | --- |
| `users.ativo` | `true` | `false` |
| Receipts `user_status_updated` | 0 | 0 |
| Auditorias genéricas `update` | 2 | 3 |

A asserção de estado inalterado falhou. Logo, o defeito não era ausência de toda auditoria nem um simples erro de interface. Era o commit do status antes do receipt semântico. O mesmo teste passou após a troca do handler pela RPC, sem mudar a asserção.

O comparador existente `update_governed_school` foi exercitado separadamente com throw no receipt `school_updated`. Nome da escola e contagem de auditoria permaneceram iguais. [comparator.sql](comparator.sql) e [comparator.log](comparator.log) registram esse controle transacional, sem modificar a função existente.

## Correção delimitada

`20260915040000_atomic_user_status.sql` introduz `set_governed_user_status(uuid, boolean)`:

- Deriva o ator de `auth.uid()`. Bloqueia ator e alvo em ordem de UUID e relê a autorização depois dos locks.
- Exige admin ativo. Mantém admin municipal com escola nula ou admin da escola do alvo. Um alvo inativo pode ser reativado.
- Grava status e receipt na mesma transação. Throw na inserção ou supressão da linha de retorno abortam ambos.
- Registra ator, alvo, escola do alvo, estado anterior, estado solicitado e `changed`.
- Mantém self-deactivation. Retry aplica o estado desejado, sem toggle. Cada comando aceito tem um novo receipt, inclusive no-op. Não promete exactly-once.
- Concede apenas execução da nova RPC a `authenticated`. Não altera grants gerais, RLS, papéis, Auth, email ou notas. O writer genérico existente continua compatível.

O handler preserva validação de UUID e booleano, chama uma única RPC autenticada, recusa resultado sem receipt ou com alvo/estado divergentes e mantém negações de papel e escola. O browser continua usando a rota governada existente. A correção de https://github.com/shishiv/EDUCA/issues/156 não foi reaberta.

## Verificações executadas

Comandos de aplicação foram executados em `app/`, com Node nativo `/usr/bin/node` v26.8.1, ABI 147, e pnpm 9.15.9. [runtime.json](runtime.json) registra o runtime. Nenhuma dependência, configuração de lint ou lockfile mudou. Os logs preservados tiveram apenas espaços finais e linhas vazias finais normalizados.

| Gate | Resultado | Evidência |
| --- | --- | --- |
| `pnpm typecheck` | exit 0 | [typecheck.log](typecheck.log) |
| `pnpm lint` | exit 0, complexity max10, anti-slop e ESLint `--max-warnings 0` | [lint.log](lint.log) |
| `pnpm run test ... --maxWorkers=1`, três arquivos focais | 26 passaram: 17 handler, 6 concorrência, 3 HTTP | [focused-after.log](focused-after.log) |
| `/usr/bin/node node_modules/vitest/vitest.mjs run tests/live/user-status-atomic.live.test.ts --maxWorkers=1 --reporter=verbose` | 3 passaram, com estado e receipts observados | [http-after.log](http-after.log) |
| `pnpm run test --maxWorkers=2` | 130 arquivos e 1366 testes passaram. 5 arquivos e 29 testes live opt-in ficaram skipped no gate offline | [unit-final.log](unit-final.log) |
| `CIRCLE_NODE_TOTAL=3 pnpm build` | exit 0, geração com 2 workers | [build.log](build.log) |
| `TMPDIR=/tmp supabase/tests/database/run.sh`, da raiz, sem `POSTGRES_TEST_PORT` herdado | exit 0, cadeia canônica, paridade de catálogo, SQL/RLS, concorrência descritiva e filho conditionality | [sql-canonical.log](sql-canonical.log) |
| Geração de tipos pelo Supabase local descartável | Apenas a assinatura da nova RPC mudou | `app/types/database.ts` |
| Browser focal `chrome-devtools-axi`, sessão única | Positivo, erro, persistência, reload, retry e negações executados | Seção abaixo |

A suíte SQL inclui throw e supressão, ativação e desativação, papel inativo/incorreto, escola estrangeira, escola nula, alvo inexistente, entradas nulas, no-op e self-deactivation. Também executa `users_browser_write_boundary.test.sql` e os contratos existentes de auditoria.

Os seis testes concorrentes usam `pg_blocking_pids`, não apenas sleeps. Mudanças já em curso de atividade, papel ou escola do ator, ou de escola do alvo, bloqueiam a chamada e causam negação após o commit. Na ordem inversa, a alteração da escola espera status e receipt. Comandos opostos serializam e o segundo receipt registra o predecessor real.

[http-after.log](http-after.log) mostra que throw e supressão deixam o alvo ativo e preservam as contagens genérica e semântica. A mesma execução confirma receipts distintos de alteração e no-op, com `previous_active:true` e depois `false`.

## Browser focal e persistência

Uma sessão isolada `educa-f04-reconciled` acessou somente `http://127.0.0.1:61009`. Login foi feito pelo formulário com a conta sintética. As negações e o retry usaram `fetch` no browser autenticado. A ação positiva e o erro com toast usaram o botão real de status. Nenhuma resposta foi interceptada ou fabricada. A instrumentação de `fetch` apenas copiou status e corpo, sem cookies ou headers.

- [browser-deactivate.txt](browser-deactivate.txt) e [captura](browser-deactivate.png): clique em "Desativar Professora Sintetica A", HTTP 200, badge `Inativo`, receipt `03205a28-f38e-4b46-860e-2bfccc4279cf`.
- [browser-persisted.log](browser-persisted.log): PostgreSQL confirmou `ativo=false` e o mesmo receipt com ator, alvo, escola e predecessor corretos.
- [browser-error.txt](browser-error.txt) e [captura](browser-error.png): throw apenas no receipt resultou em 503 e toast "Erro ao alterar status do usuário". O badge continuou `Ativo`, inclusive após [reload](browser-error-reload.txt).
- [browser-suppression.txt](browser-suppression.txt): supressão do receipt também resultou em 503. As falhas live expõem o fallback `USER_STATUS_UPDATE_FAILED`, sem receipt de sucesso.
- [browser-foreign-school.txt](browser-foreign-school.txt), [browser-demoted.txt](browser-demoted.txt) e [browser-inactive.txt](browser-inactive.txt): 403 para escola estrangeira, ator rebaixado e ator inativo. Só o perfil sintético em `public.users` foi alterado para preparar essas condições e depois restaurado.
- [browser-denials-before.jsonl](browser-denials-before.jsonl) e [browser-denials-after.jsonl](browser-denials-after.jsonl): bytes iguais para estado e contagens de auditoria dos dois alvos após supressão e negações.
- [browser-retry-persisted.log](browser-retry-persisted.log): retry após remover a falha persistiu a alteração, seguido de no-op com `changed:false`. Nenhum trigger de falha permaneceu.

**Limite da interface existente:** após reload da listagem, o usuário desativado desaparece porque `getUsersWithSchool` filtra ativos por padrão. O detalhe também devolveu "Usuário não encontrado" para esse inativo. [browser-deactivate-reload.txt](browser-deactivate-reload.txt) e [browser-inactive-details.txt](browser-inactive-details.txt) preservam essas observações. Não houve alegação de badge inativo persistente após reload nem mudança dessa listagem fora do escopo. A prova de persistência usa SQL e o receipt correlacionado. Reativação foi exercitada pela rota real no browser, não pelo detalhe indisponível.

## Reproduzir o recorte

Use uma pilha local descartável com migrations canônicas, provisionamento piloto e `scripts/seed-pilot-synthetic.ts`, conforme `CONTEXT.md`. Nunca aponte os testes live para um projeto compartilhado. [runtime-rehearsal.sh.txt](runtime-rehearsal.sh.txt) registra o driver usado nesta execução, com caminhos desta máquina. É evidência do ensaio, não um novo comando suportado do produto.

Com o app ativo e as variáveis locais da pilha exportadas:

```bash
# Em app/. EDUCA_LIVE_SUPABASE mantém a URL local no setup do Vitest.
EDUCA_LIVE_SUPABASE=1 EDUCA_USER_STATUS_HTTP_TEST=1 \
  /usr/bin/node node_modules/vitest/vitest.mjs run \
  tests/live/user-status-atomic.live.test.ts --maxWorkers=1

EDUCA_USER_STATUS_DB_TEST=1 \
  /usr/bin/node node_modules/vitest/vitest.mjs run \
  tests/live/user-status-concurrency.live.test.ts --maxWorkers=1
```

Para reproduzir o vermelho, use o handler da base declarada em outra worktree descartável com somente o teste HTTP novo e selecione `-t suppress`. O teste deve falhar porque o status persistido muda apesar do 503. As fixtures concorrentes pertencem à pilha descartável e exigem uma pilha nova para repetir essa suíte.

Na máquina deste ensaio, pnpm 11 tentou reconciliar dependências e abortou sem TTY. Foi usado o pnpm 9 já instalado, sem alterar o lockfile. O shim PostgreSQL sem versão foi substituído no PATH pelo binário PostgreSQL 18.6 já instalado. Paths longos de socket AF_UNIX impediram tentativas iniciais do SQL runner. Firstmate autorizou `TMPDIR=/tmp`. Também foi removido o `POSTGRES_TEST_PORT` explícito, pois pai e filho herdavam a mesma porta. Só a execução final completa é declarada verde. O build registrou aviso de Browserslist antigo, e o Vitest registrou avisos do localStorage experimental do Node. Lint passou sem warnings.

## Revisão e cleanup

Revisão local do diff e do caminho browser → handler padrão → RPC → receipt, contra os critérios de https://github.com/shishiv/EDUCA/issues/228. O teste vermelho usa o mesmo HTTP real que fica verde depois. A prova de atomicidade e de revalidação não depende dos mocks unitários. Nenhum achado material adicional foi estabelecido na mudança delimitada. A limitação da listagem de inativos permanece separada acima.

[cleanup.log](cleanup.log) e [browser-cleanup.log](browser-cleanup.log) registram app encerrado, sessão browser encerrada, ausência de containers, volumes e redes do projeto `educa-f04-reconciled-local`, lease liberado e remoção dos arquivos temporários e credenciais locais do ensaio. Os runners raw PostgreSQL limparam seus próprios clusters. O helper de memória do projeto confirmou `AGENTS.md` e o ponteiro existente sem mudança. Não foi adicionado conteúdo de sessão ao contexto global do projeto.

Não foram executados E2E geral completo ou agregado R3. Não há afirmação sobre produção, dados reais ou disponibilidade de serviços externos.
