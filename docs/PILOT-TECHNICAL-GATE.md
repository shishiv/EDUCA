# Gate técnico do piloto municipal

Este repositório contém somente a fundação **sintética** do piloto EDUCA. Ele não autoriza dados reais, implantação municipal, parecer jurídico ou declaração de conformidade.

## Escopo liberado

- autenticação e RBAC;
- escolas, usuários, alunos, turmas, matrículas e responsáveis;
- atribuição de professores, frequência e dashboard.

Notas, diário completo, Educacenso, Bolsa Família/NIS, saúde, deficiência e raça/cor ficam desabilitados. Responsáveis não recebem conta no piloto inicial.

## Gates de execução

1. `PILOT_MODE=true` e `PILOT_SYNTHETIC_DATA_ONLY=true`.
2. Supabase local e dedicado ao ensaio. O safety gate rejeita host externo.
3. Importação aceita apenas o marcador `SYNTHETIC-EDUCA-PILOT` e a allowlist documentada.
4. `PILOT_EXTERNAL_DEPLOY_APPROVED=false` e `PILOT_LEGAL_APPROVAL_STATUS=not_approved`.
5. Dados reais exigiriam uma mudança futura separada, com DPA/RIPD, TTD/CPAD, inventário de operadores, testes implantados e aprovações nominais.

## Verificação sintética

```bash
cd app
pnpm typecheck
pnpm test:e2e:pilot
cd ..
supabase/tests/database/run.sh
```

O E2E reinicia o Supabase local, cria apenas identidades `.invalid`, gera estado de autenticação novo em `app/.pilot-e2e/` e executa build/start dentro do orçamento de 180 segundos.
