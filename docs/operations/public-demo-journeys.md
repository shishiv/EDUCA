# Contrato de jornadas do demo público

Issue: #79: Jornadas do demo público
Status: rascunho, bloqueado por #76 (mutabilidade) e #77 (privacidade)

## Purpose

Define as jornadas observáveis que o demo público deve satisfazer antes da ativação.
Cada jornada tem persona, ambiente, limite de dados, resultado esperado e método de verificação.

## Environments

| Rótulo | URL | Mutações permitidas | Dados |
|-------|-----|-------------------|------|
| `local-synthetic` | Origem local nomeada pelo runner | Sim, stack descartável | Somente seed sintético |
| `public-demo` | `https://educa-demo.vercel.app` | **Não**: smoke não destrutivo | Sandbox compartilhado |

## Persona Matrix

| # | Persona | Ambiente | Dados | Jornada | Resultado esperado | Verificação |
|---|---------|----------|-------|---------|-------------------|-------------|
| J1 | Visitante público | public-demo | Nenhum | Acessa URL raiz, vê redirect para `/login`, vê link de política de privacidade | `/login` renderiza sem erro; política acessível sem auth | Playwright: status 200, heading presente |
| J2 | Operador municipal sintético | local-synthetic | Seed sintético | Fluxo de escolas, alunos, turmas, matrículas e chamada | CRUD e frequência observáveis | Suíte existente `core-scope.spec.ts` e manifests do runner legacy |
| J3 | Diretor de escola | local-synthetic | Seed sintético | Isolamento entre escolas | Leitura alheia negada por RLS | `deployed-isolation.spec.ts` |
| J4 | Professor titular | local-synthetic | Seed sintético | Leitura e escrita da chamada própria, negação entre escolas | Write próprio e deny alheio | `canonical-pilot.spec.ts` |
| J5 | Convite e primeiro acesso | local-synthetic | Convite sintético | Admin convida professor e conclui primeiro acesso | Perfil atualizado | `invitation-first-access.spec.ts` |
| J6 | Negativas do Pilot Gate | local-synthetic | Pilot provisioner | Usuário tenta módulos desabilitados | Redirect para `/dashboard?pilotScope=disabled` | `core-scope.spec.ts` |

## Mutation boundary

- **Local-synthetic:** mutações são permitidas e exercitadas. A stack é descartável (Supabase local + seed sintético).
- **Public-demo:** o smoke verifica apenas leitura. Nenhum POST, PUT, DELETE ou RPC mutante é emitido contra o sandbox público compartilhado.

## Blockers

1. **Deploy do site divergente**: não é possível provar que o smoke público reflete o código local.
2. **Credencial pública do demo inválida**: login no endpoint público falha; J1 é a única jornada executável externamente.
3. **Contrato de privacidade (#77)**: texto da política pode mudar; J1 depende de heading estável.
4. **Mutabilidade (#76)**: definição de operações permitidas no sandbox ainda aberta; J2-J6 só executam local.

## Acceptance criteria

1. Cada jornada tem resultado observável documentado acima.
2. Mutações rodam somente em stack sintética descartável.
3. Produção/demo público recebe apenas smoke não destrutivo.
4. J1 tem smoke dedicado em `app/tests/e2e/public-demo/`; J2-J6 são mapeadas para as suítes existentes robustas.
5. Nenhum dado real, credencial real, ou identidade real aparece nos testes.

## Verification

- Suítes Playwright existentes com Supabase isolado para J2-J6.
- Smoke HTTP/browser no site público para J1, quando o deploy convergir.
- Testes explícitos de RLS, tenant e role nas suítes canônica e de isolamento.
- Reuso dos harnesses sintéticos existentes (`.invalid` emails, UUIDs determinísticos).
