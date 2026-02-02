# Build Fix Context - Phase 18

**Última atualização:** 2026-01-27
**Status:** Build falha com ~1-2 erros restantes

## Resumo do Problema

O código foi escrito com nomes de colunas diferentes do schema real do Supabase.
Após regenerar `types/database.ts`, os erros de tipo apareceram.

## Schema Real do Supabase

### sessoes_aula
```
Correto:          Código antigo (errado):
- inicio_aula     - hora_inicio
- fim_aula        - hora_fim
- created_at      - criada_em
- observacoes     - conteudo_ministrado
```

### frequencia
```
Correto:          Código antigo (errado):
- data_aula       - data
- matricula_id    - aluno_id
- sessao_id       - (ok)
- status_presenca - status
```

### users
```
Correto:          Código antigo (errado):
- tipo_usuario    - role
```

## Arquivos Corrigidos ✓

1. `app/api/sessoes/aula/abrir/route.ts`
2. `components/attendance/AttendanceGrid.tsx`
3. `components/attendance/AttendanceGridRow.tsx`
4. `components/ui/calendar.tsx` (react-day-picker v9)
5. `components/ui/modal-renderer.tsx`
6. `components/ui/responsive-data-table.tsx`
7. `hooks/use-auth.ts`
8. `hooks/use-diary-query.ts`
9. `hooks/use-users-query.ts`
10. `lib/services/attendance-immutability.ts` (parcial)

## Erros Restantes

### 1. lib/services/attendance-immutability.ts:324
```typescript
// ERRADO - linha 324
.insert(attendanceData)  // attendanceData usa sessao_id, aluno_id, data

// CORRETO - precisa usar
// - data_aula (não data)
// - matricula_id (não aluno_id)
```

## Arquivos Criados (stubs temporários)

- `lib/react-query.ts` - queryKeys helper
- `lib/stores/app-store.ts` - Zustand store (não instalado ainda)

## Próximos Passos

1. Corrigir `attendance-immutability.ts` para usar colunas corretas
2. Rodar `pnpm build` até passar
3. Commit e push para Vercel
4. Verificar deployment

## Commit Atual

```
ff7bf8d fix(18): WIP - type fixes for Supabase schema alignment
```

## Para Continuar

```bash
cd gestao_fronteira
pnpm build 2>&1 | tail -60
```

O erro vai mostrar onde falta corrigir.
