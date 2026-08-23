# Public Demo Journeys Contract

Issue: #79 — Jornadas do demo público
Status: draft, blocked by #76 (mutability) and #77 (privacy)

## Purpose

Define the observable journeys that the public demo must satisfy before activation.
Each journey has a persona, environment, data boundary, expected result, and verification method.

## Environments

| Label | URL | Mutations allowed | Data |
|-------|-----|-------------------|------|
| `local-synthetic` | `http://localhost:3000` | Yes (disposable stack) | Synthetic seed only |
| `public-demo` | `https://educa-demo.vercel.app` | **No** — smoke is non-destructive | Shared sandbox |

## Persona Matrix

| # | Persona | Ambiente | Dados | Jornada | Resultado esperado | Verificação |
|---|---------|----------|-------|---------|-------------------|-------------|
| J1 | Visitante público | public-demo | Nenhum | Acessa URL raiz, vê redirect para `/login`, vê link de política de privacidade | `/login` renderiza sem erro; política acessível sem auth | Playwright: status 200, heading presente |
| J2 | Operador municipal sintético (admin) | local-synthetic | Demo seed | Login, navega escolas, alunos, turmas, matrículas; abre chamada; salva presença; verifica persistência | CRUD visível, frequência salva, reload confirma write | Playwright com Supabase local |
| J3 | Diretor de escola | local-synthetic | Demo seed | Login como diretor; vê apenas escola própria; tenta acessar escola alheia → unauthorized | Isolamento de escola via RLS | Playwright + asserção de RLS |
| J4 | Professor titular | local-synthetic | Demo seed | Login; abre chamada da turma atribuída; registra presença; tenta turma de outra escola → bloqueado | Write na turma própria, deny na alheia | Playwright + Supabase client |
| J5 | Convite / primeiro acesso | local-synthetic | Synthetic invite | Admin convida professor; professor faz primeiro login com senha temporária; completa first-access | Profile atualizado, `primeiro_login=false`, `senha_padrao=false` | Playwright (reusa harness de `invitation-first-access.spec.ts`) |
| J6 | Negativas do Pilot Gate | local-synthetic | Pilot provisioner | Usuário autenticado tenta acessar módulos desabilitados (notas, calendário, configurações, sessões) | Redirect para `/dashboard?pilotScope=disabled` | Playwright (reusa padrão de `core-scope.spec.ts`) |

## Mutation boundary

- **Local-synthetic:** mutations são permitidas e exercitadas. A stack é descartável (Supabase local + demo seed).
- **Public-demo:** o smoke verifica apenas leitura. Nenhum POST, PUT, DELETE, ou RPC mutante é emitido contra o sandbox público compartilhado.

## Blockers

1. **Deploy do site divergente** — não é possível provar que o smoke público reflete o código local.
2. **Credencial pública do demo inválida** — login no endpoint público falha; J1 é o único journey executável externamente.
3. **Contrato de privacidade (#77)** — texto da política pode mudar; J1 depende de heading estável.
4. **Mutabilidade (#76)** — definição de operações permitidas no sandbox ainda aberta; J2-J5 só executam local.

## Acceptance criteria

1. Cada jornada tem resultado observável documentado acima.
2. Mutações rodam somente em stack sintética descartável.
3. Produção/demo público recebe apenas smoke não destrutivo.
4. Specs em `app/tests/e2e/public-demo/` cobrem J1-J6.
5. Nenhum dado real, credencial real, ou identidade real aparece nos testes.

## Verification

- Playwright local com Supabase isolado para J2-J6.
- Smoke HTTP/browser no site público para J1 (quando deploy convergir).
- Teste explícito de RLS/tenant/role para J3 e J4.
- Reuso dos harnesses sintéticos existentes (`.invalid` emails, UUIDs determinísticos).
