---
status: fixing
trigger: "Chamada page fails to load with 'Erro ao carregar alunos' error"
created: 2026-01-18T00:00:00Z
updated: 2026-01-18T00:00:00Z
---

## Current Focus

hypothesis: Query uses `.eq('ativo', true)` on matriculas table, but table has `situacao` field instead
test: Compare query filter field with actual database schema
expecting: Field mismatch causes query failure
next_action: Verify matriculas table schema and fix the query

## Symptoms

expected: Chamada page should display turma info header, date navigation, and student list with P/F/J attendance buttons
actual: Error message "Erro ao carregar chamada - Erro ao carregar alunos" with a "Voltar" button
errors: "Erro ao carregar chamada - Erro ao carregar alunos" (displayed in red alert box)
reproduction: |
  1. Login as admin@fronteira.mg.gov.br
  2. Navigate to /dashboard/turmas/00000000-0000-0000-0000-000000000002/chamada
  3. Or navigate to /dashboard/turmas/d4444444-4444-4444-4444-444444444444/chamada
  Both URLs show the same error.
started: Discovered during UAT testing

## Eliminated

## Evidence

- timestamp: 2026-01-18T00:01:00Z
  checked: chamada page loadStudents function (line 188-222)
  found: Query uses `.eq('ativo', true)` filter on matriculas table
  implication: This filter may be invalid if table doesn't have 'ativo' field

- timestamp: 2026-01-18T00:02:00Z
  checked: database.ts types for matriculas table (line 767-814)
  found: matriculas table has `situacao: string` field, NOT `ativo: boolean`
  implication: Query is filtering on non-existent column, causing error

- timestamp: 2026-01-18T00:03:00Z
  checked: seed-data.ts matriculas insert (line 408-426)
  found: Seed data uses `situacao: 'ativa'` (string), confirms schema
  implication: Root cause confirmed - wrong field name in query

## Resolution

root_cause:
fix:
verification:
files_changed: []
