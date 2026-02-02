<objective>
Completar as features restantes da Fase 1 (Core Acadêmico).

Propósito: Finalizar Calendário Escolar e Grade Curricular
Output: Código implementado + SUMMARY.md
</objective>

<context>
Research: @.prompts/006-educa-roadmap-research/educa-roadmap-research.md
Plan: @.prompts/007-educa-implementation-plan/educa-implementation-plan.md
Codebase: @gestao_fronteira/

Features a implementar:
- F005: Calendário Escolar
- F006: Grade Curricular
</context>

<requirements>
Calendário Escolar:
- CRUD de eventos (feriados, recessos, dias letivos)
- Integração com cálculo de frequência
- Visualização mensal/anual
- Filtro por escola

Grade Curricular:
- Disciplinas por turma
- Carga horária semanal
- Vínculo professor-disciplina-turma
- Horário das aulas (grade horária)

Requisitos técnicos:
- Supabase para persistência (usar MCP)
- shadcn/ui para componentes (usar MCP)
- TypeScript strict
- RLS por escola
</requirements>

<implementation>
Padrões a seguir:
- Estrutura de arquivos existente em @gestao_fronteira/app/
- Componentes em @gestao_fronteira/components/
- Types em @gestao_fronteira/types/
- API routes em @gestao_fronteira/app/api/

Usar MCPs:
- mcp__supabase__apply_migration para schema
- mcp__supabase__generate_typescript_types após migrations
- mcp__shadcn-ui__get_component para UI
- mcp__chrome-devtools para testar

Evitar:
- Modificar features já em produção
- Criar schema sem RLS
- Hardcode de IDs de escola
</implementation>

<output>
Arquivos a criar/modificar:

Database (via Supabase MCP):
- Migration: create_calendario_escolar_table
- Migration: create_grade_curricular_tables

Backend:
- `app/api/calendario/route.ts`
- `app/api/grade-curricular/route.ts`

Frontend:
- `app/(dashboard)/dashboard/calendario/page.tsx`
- `app/(dashboard)/dashboard/grade-curricular/page.tsx`
- `components/calendario/` (componentes)
- `components/grade-curricular/` (componentes)

Types:
- `types/calendario.ts`
- `types/grade-curricular.ts`
</output>

<verification>
Antes de declarar completo:

1. Database
   - [ ] Tables criadas com RLS
   - [ ] Types gerados via MCP

2. Funcionalidade
   - [ ] CRUD calendário funciona
   - [ ] CRUD grade curricular funciona
   - [ ] Integração calendário-frequência

3. UI/UX
   - [ ] Páginas acessíveis via dashboard
   - [ ] Responsivo (testar com Chrome DevTools MCP)
   - [ ] Mensagens em português

4. Qualidade
   - [ ] pnpm typecheck passa
   - [ ] pnpm build passa
   - [ ] Sem console errors (Chrome DevTools MCP)
</verification>

<summary_requirements>
Criar `.prompts/008-phase1-core-academic-do/SUMMARY.md`:

```markdown
# Phase 1 Core Academic Implementation Summary

**{One-liner: ex: "Calendário e Grade Curricular implementados com 4 migrations e 6 componentes"}**

## Versão
v1

## Arquivos Criados
- `path/to/file.ts` - Descrição

## Principais Implementações
- {O que foi feito}

## Testes Realizados
- [ ] {Teste 1}
- [ ] {Teste 2}

## Decisões Necessárias
{Ou "Nenhuma"}

## Bloqueios
{Ou "Nenhum"}

## Próximo Passo
Executar prompt 009-lgpd-compliance-do

---
*Confiança: Alta*
*Iterações: 1*
```
</summary_requirements>

<success_criteria>
- [ ] Calendário Escolar CRUD completo
- [ ] Grade Curricular CRUD completo
- [ ] Integração com frequência
- [ ] RLS configurado
- [ ] Build passa
- [ ] SUMMARY.md criado
</success_criteria>
