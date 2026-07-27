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

## Provisionamento exclusivo do piloto

As migrações canônicas em `supabase/migrations/` continuam válidas fora de um piloto: elas não revogam módulos já entregues nem bloqueiam campos do Censo Escolar. A contenção exclusiva do piloto (revogação de `notas`, `relatorios_descritivos`, `educacenso_exports`, `codigos_inep` e da visão Bolsa Família, mais o gatilho de campos de alto risco em `alunos`) vive em `supabase/pilot/provision-pilot-module-gate.sql`.

Esse arquivo é idempotente e é aplicado explicitamente — e apenas — pelos ensaios sintéticos: `app/scripts/run-pilot-e2e.sh`, `supabase/tests/database/run.sh` e `supabase/tests/pilot/run-backup-restore.sh`. Um `supabase db push` comum, portanto, não desabilita módulos fora de um piloto municipal sintético.

## Verificação sintética

```bash
cd app
pnpm typecheck
pnpm test
pnpm test:e2e:pilot
cd ..
supabase/tests/database/run.sh
```

O E2E reinicia o Supabase local, aplica `supabase/pilot/provision-pilot-module-gate.sql`, cria apenas identidades `.invalid`, gera estado de autenticação novo em `app/.pilot-e2e/` e executa build/start dentro do orçamento de 180 segundos.

## Escopo limitado do typecheck e do Vitest

`pnpm typecheck` (`tsconfig.typecheck.json`) cobre o aplicativo, as bibliotecas, os scripts e **também** os testes unitários e os specs E2E. `pnpm test` (`vitest.config.mts`) cobre `tests/unit/`.

Ambos excluem os mesmos dois diretórios, e apenas eles:

- `tests/unit/components/diary/**`
- `tests/unit/components/reports/**`

Esses arquivos cobrem o diário completo e os relatórios descritivos, módulos desabilitados por este gate. Eles ficam no repositório para uma reativação futura, mas não contam como evidência do piloto core. Não há subsistema de reativação neste gate: reabilitar esses módulos é uma mudança separada que precisa remover as duas exclusões acima e reavaliar o provisionamento exclusivo do piloto.
