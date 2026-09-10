# Preservação do worker auth

## Origem e escopo
Autenticação, autorização por escola, perfil, convites/revogação, handlers e recibos de auditoria das mutações de usuários.

Trabalho finalizado fora do Firstmate na pasta original `/home/shiv/Projects/EDUCA-quality-20260907/workers/auth`, sobre `8713027b52caf6930999385253fdf1f052bbf912`. Commitado sem reescrita ou reconciliação, em `a8c143eab185d4459ce1cf7740c8a841f1e014b9`, no ramo remoto `salvar/educa-quality-auth-20260908`. Todos os oito snapshots estavam enviados com SHAs confirmados antes da abertura dos PRs.

Resultado integrado principal: https://github.com/shishiv/EDUCA/pull/211

## Contagem preservada
- Inventário: 25 entradas já conhecidas do índice (incluindo intent-to-add) + 4 não rastreadas = **29 entradas preservadas**.
- Diff do commit: **29 files changed, 2021 insertions(+), 1312 deletions(-)**.
- Exclusão única: 1 arquivo(s) `.pi/semantic-grep.sqlite*`, deixados no disco. `VENT.md`, quando existente, está incluído.

## O que este ramo preserva além da versão do integration
`VENT.md` é exclusivo deste worker. Preserva também versões distintas de login/perfil, ciclo de vida de usuários, convites, contexto de escola e da migração de recibos de auditoria. Não se presume que essas versões sejam melhores ou mais recentes que as integradas.

Comparação direta: `git diff a8c143eab185d4459ce1cf7740c8a841f1e014b9 2d95afc0237a74ded944cae53ed4db30a83903aa -- <arquivo>`, arquivo a arquivo. Classificação: **com conteudo exclusivo**, com 14 caminhos byte/modo-idênticos no mesmo local. Versões divergentes são preservadas conservadoramente; não são uma afirmação de que a funcionalidade correspondente esteja ausente do integration.

| Caminho | Relação com integration |
|---|---|
| `VENT.md` | Caminho presente só no worker |
| `app/app/(auth)/login/page.tsx` | Versão divergente |
| `app/app/(dashboard)/dashboard/perfil/page.tsx` | Versão divergente |
| `app/app/api/pilot/first-access/route.ts` | Versão divergente |
| `app/app/api/pilot/invitations/handler.ts` | Versão divergente |
| `app/app/api/users/[userId]/route.ts` | Versão divergente |
| `app/app/api/users/[userId]/status/handler.ts` | Versão divergente |
| `app/app/api/users/me/route.ts` | Versão divergente |
| `app/contexts/escola-context.tsx` | Versão divergente |
| `app/lib/auth.ts` | Versão divergente |
| `app/lib/route-policy.ts` | Versão divergente; alterações normalizadas da base cobertas |
| `app/lib/services/user-lifecycle.ts` | Versão divergente |
| `app/tests/unit/api/user-lifecycle-routes.test.ts` | Versão divergente |
| `app/tests/unit/auth-middleware.test.ts` | Versão divergente |
| `supabase/migrations/20260907000000_auth_mutation_audit_receipts.sql` | Versão divergente |

## Evidência e limites
- Conteúdos SHA-256 e modos do índice conferidos contra o inventário antes do commit; ausências reconciliadas; ramo remoto confirmado por SHA.
- Este worker isolado não teve a suíte executada nesta tarefa. O resultado de testes do integration não é atribuído a ele.
- No integration (https://github.com/shishiv/EDUCA/pull/211), lint e testes unitários passaram (1316 testes; 20 ignorados), mas typecheck falhou em `app/tests/e2e/pilot/deployed-isolation.spec.ts:71:26` (`TS7006`). Build/E2E/SQL/pilot não foram reexecutados.
- Inventário completo, hashes, recibos e comparação: ramo `fm/educa-quality-prs-dev`, diretório `artifacts/educa-quality-prs-dev/`.

**Rascunho de preservação/reconciliação. Não mesclar integralmente sobre o integration sem revisar as diferenças: este snapshot pode conter versões anteriores ou alternativas e reverter avanços. Nenhum merge, fechamento, remoção de ramo ou limpeza das pastas faz parte desta entrega.**
