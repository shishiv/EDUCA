# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-09-29-enhanced-abrir-aula-workflow/spec.md

> Created: 2025-09-29
> Version: 1.0.0

## Overview

This specification defines the Server Actions (Next.js 15 App Router) required for the three-phase attendance workflow. All actions use TypeScript with Zod validation, Supabase RLS enforcement, and return Portuguese error messages for Brazilian educational compliance.

## Server Actions Architecture

**Base Path:** `gestao_fronteira/app/actions/attendance/`

**Shared Utilities:**
```typescript
// app/actions/attendance/_utils.ts
import { createClient } from '@/lib/supabase'

export async function checkSessionLock(sessionId: string) {
  const supabase = createClient()

  const { data: session } = await supabase
    .from('sessoes_aula')
    .select('locked_at, status, data_aula')
    .eq('id', sessionId)
    .single()

  if (!session) {
    throw new Error('Sessão não encontrada')
  }

  // Check if locked
  if (session.locked_at) {
    throw new Error('Frequência já finalizada. Não existe o esquecer.')
  }

  // Check if past 18:00 cutoff on session date
  const sessionDate = new Date(session.data_aula)
  const now = new Date()

  if (
    sessionDate.toDateString() === now.toDateString() &&
    now.getHours() >= 18
  ) {
    throw new Error('Prazo para fechar aula encerrado às 18:00. Sessão bloqueada automaticamente.')
  }

  return session
}
```

## Endpoints (Server Actions)

### 1. Open Attendance Session

**File:** `app/actions/attendance/open-session.ts`

**Purpose:** Create new attendance session (Planning Phase) and validate that no duplicate session exists for the same class/date

**Action Signature:**
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase'

const OpenSessionSchema = z.object({
  turma_id: z.string().uuid('ID da turma inválido'),
  disciplina_id: z.string().uuid('ID da disciplina inválido'),
  data_aula: z.string().datetime('Data da aula inválida'),
  professor_id: z.string().uuid('ID do professor inválido'),
})

export async function openAttendanceSession(input: z.infer<typeof OpenSessionSchema>) {
  // 1. Validate input
  const validated = OpenSessionSchema.parse(input)

  // 2. Get Supabase client
  const supabase = createClient()

  // 3. Check for duplicate session
  const { data: existing } = await supabase
    .from('sessoes_aula')
    .select('id')
    .eq('turma_id', validated.turma_id)
    .eq('data_aula', validated.data_aula)
    .single()

  if (existing) {
    return {
      success: false,
      error: 'Já existe uma aula aberta para esta turma hoje.'
    }
  }

  // 4. Create session
  const { data: session, error } = await supabase
    .from('sessoes_aula')
    .insert({
      ...validated,
      status: 'planning',
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    return {
      success: false,
      error: 'Erro ao criar sessão de frequência.'
    }
  }

  // 5. Revalidate cache
  revalidatePath('/dashboard/frequencia')

  return {
    success: true,
    data: session
  }
}
```

**Parameters:**
- `turma_id` (UUID): Class ID
- `disciplina_id` (UUID): Subject ID
- `data_aula` (ISO datetime): Class date
- `professor_id` (UUID): Teacher ID

**Response:**
```typescript
{
  success: true,
  data: {
    id: string
    turma_id: string
    disciplina_id: string
    data_aula: string
    professor_id: string
    status: 'planning'
    locked_at: null
    created_at: string
  }
}
```

**Errors:**
- 400: Validation error (Zod schema)
- 409: "Já existe uma aula aberta para esta turma hoje."
- 500: Database error

---

### 2. Mark Student Attendance

**File:** `app/actions/attendance/mark-attendance.ts`

**Purpose:** Update individual student attendance with optimistic lock validation

**Action Signature:**
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase'
import { checkSessionLock } from './_utils'

const MarkAttendanceSchema = z.object({
  sessao_aula_id: z.string().uuid('ID da sessão inválido'),
  aluno_id: z.string().uuid('ID do aluno inválido'),
  status: z.enum(['presente', 'ausente', 'justificado'], {
    errorMap: () => ({ message: 'Status de frequência inválido' })
  }),
})

export async function markAttendance(input: z.infer<typeof MarkAttendanceSchema>) {
  // 1. Validate input
  const validated = MarkAttendanceSchema.parse(input)

  // 2. Check session lock status
  try {
    await checkSessionLock(validated.sessao_aula_id)
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }

  // 3. Get Supabase client
  const supabase = createClient()

  // 4. Upsert attendance record
  const { data: attendance, error } = await supabase
    .from('frequencia')
    .upsert({
      sessao_aula_id: validated.sessao_aula_id,
      aluno_id: validated.aluno_id,
      status: validated.status,
      marcado_em: new Date().toISOString(),
    }, {
      onConflict: 'sessao_aula_id,aluno_id'
    })
    .select()
    .single()

  if (error) {
    return {
      success: false,
      error: 'Erro ao marcar frequência.'
    }
  }

  // 5. Update session status to 'attendance' if still in planning
  await supabase
    .from('sessoes_aula')
    .update({ status: 'attendance' })
    .eq('id', validated.sessao_aula_id)
    .eq('status', 'planning')

  // 6. Revalidate cache
  revalidatePath('/dashboard/frequencia')

  return {
    success: true,
    data: attendance
  }
}
```

**Parameters:**
- `sessao_aula_id` (UUID): Session ID
- `aluno_id` (UUID): Student ID
- `status` (enum): 'presente' | 'ausente' | 'justificado'

**Response:**
```typescript
{
  success: true,
  data: {
    id: string
    sessao_aula_id: string
    aluno_id: string
    status: 'presente' | 'ausente' | 'justificado'
    marcado_em: string
  }
}
```

**Errors:**
- 400: Validation error
- 403: "Frequência já finalizada. Não existe o esquecer."
- 403: "Prazo para fechar aula encerrado às 18:00. Sessão bloqueada automaticamente."
- 500: Database error

---

### 3. Batch Mark Attendance (Performance Optimization)

**File:** `app/actions/attendance/batch-mark-attendance.ts`

**Purpose:** Mark multiple students in single request to reduce network round trips

**Action Signature:**
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase'
import { checkSessionLock } from './_utils'

const BatchMarkSchema = z.object({
  sessao_aula_id: z.string().uuid(),
  attendances: z.array(z.object({
    aluno_id: z.string().uuid(),
    status: z.enum(['presente', 'ausente', 'justificado']),
  })).min(1).max(50, 'Máximo de 50 alunos por lote'),
})

export async function batchMarkAttendance(input: z.infer<typeof BatchMarkSchema>) {
  // 1. Validate input
  const validated = BatchMarkSchema.parse(input)

  // 2. Check session lock status
  try {
    await checkSessionLock(validated.sessao_aula_id)
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }

  // 3. Get Supabase client
  const supabase = createClient()

  // 4. Prepare batch records
  const records = validated.attendances.map(att => ({
    sessao_aula_id: validated.sessao_aula_id,
    aluno_id: att.aluno_id,
    status: att.status,
    marcado_em: new Date().toISOString(),
  }))

  // 5. Upsert batch
  const { data, error } = await supabase
    .from('frequencia')
    .upsert(records, {
      onConflict: 'sessao_aula_id,aluno_id'
    })
    .select()

  if (error) {
    return {
      success: false,
      error: 'Erro ao marcar frequências em lote.'
    }
  }

  // 6. Update session status
  await supabase
    .from('sessoes_aula')
    .update({ status: 'attendance' })
    .eq('id', validated.sessao_aula_id)
    .eq('status', 'planning')

  // 7. Revalidate cache
  revalidatePath('/dashboard/frequencia')

  return {
    success: true,
    data: { marked: data.length }
  }
}
```

**Parameters:**
- `sessao_aula_id` (UUID): Session ID
- `attendances` (array): Array of `{ aluno_id, status }` (max 50)

**Response:**
```typescript
{
  success: true,
  data: { marked: number }
}
```

**Performance Impact:**
- Marking 40 students: 1 request instead of 40 (40x faster)
- Network time: ~500ms instead of ~20s

---

### 4. Close Attendance Session

**File:** `app/actions/attendance/close-session.ts`

**Purpose:** Complete session (Completion Phase) and trigger immutability lock

**Action Signature:**
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase'
import { checkSessionLock } from './_utils'

const CloseSessionSchema = z.object({
  sessao_aula_id: z.string().uuid('ID da sessão inválido'),
  conteudo_programatico: z.string().optional(),
  observacoes: z.string().optional(),
})

export async function closeAttendanceSession(input: z.infer<typeof CloseSessionSchema>) {
  // 1. Validate input
  const validated = CloseSessionSchema.parse(input)

  // 2. Check session lock status
  try {
    await checkSessionLock(validated.sessao_aula_id)
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }

  // 3. Get Supabase client
  const supabase = createClient()

  // 4. Verify all students marked (optional - business rule)
  const { count: unmarkedCount } = await supabase
    .from('matriculas')
    .select('id', { count: 'exact' })
    .eq('turma_id', (await supabase
      .from('sessoes_aula')
      .select('turma_id')
      .eq('id', validated.sessao_aula_id)
      .single()
    ).data.turma_id)
    .not('id', 'in', `(
      SELECT aluno_id FROM frequencia
      WHERE sessao_aula_id = '${validated.sessao_aula_id}'
    )`)

  if (unmarkedCount > 0) {
    return {
      success: false,
      error: `Existem ${unmarkedCount} alunos sem frequência marcada. Marque todos antes de fechar.`
    }
  }

  // 5. Close session
  const { data: session, error } = await supabase
    .from('sessoes_aula')
    .update({
      status: 'completed',
      locked_at: new Date().toISOString(),
      conteudo_programatico: validated.conteudo_programatico,
      observacoes: validated.observacoes,
    })
    .eq('id', validated.sessao_aula_id)
    .select()
    .single()

  if (error) {
    return {
      success: false,
      error: 'Erro ao fechar sessão de frequência.'
    }
  }

  // 6. Revalidate cache
  revalidatePath('/dashboard/frequencia')

  return {
    success: true,
    data: session
  }
}
```

**Parameters:**
- `sessao_aula_id` (UUID): Session ID
- `conteudo_programatico` (string, optional): Class content notes
- `observacoes` (string, optional): Additional observations

**Response:**
```typescript
{
  success: true,
  data: {
    id: string
    status: 'completed'
    locked_at: string
    conteudo_programatico: string | null
    observacoes: string | null
  }
}
```

**Errors:**
- 400: Validation error
- 400: "Existem X alunos sem frequência marcada. Marque todos antes de fechar."
- 403: Session already locked
- 500: Database error

---

### 5. Check Session Lock Status

**File:** `app/actions/attendance/check-lock-status.ts`

**Purpose:** Real-time validation of session editability (used by UI for disabled state)

**Action Signature:**
```typescript
'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase'

const CheckLockSchema = z.object({
  sessao_aula_id: z.string().uuid('ID da sessão inválido'),
})

export async function checkLockStatus(input: z.infer<typeof CheckLockSchema>) {
  // 1. Validate input
  const validated = CheckLockSchema.parse(input)

  // 2. Get Supabase client
  const supabase = createClient()

  // 3. Fetch session
  const { data: session, error } = await supabase
    .from('sessoes_aula')
    .select('locked_at, status, data_aula')
    .eq('id', validated.sessao_aula_id)
    .single()

  if (error || !session) {
    return {
      success: false,
      error: 'Sessão não encontrada'
    }
  }

  // 4. Check lock conditions
  const isLocked = session.locked_at !== null
  const sessionDate = new Date(session.data_aula)
  const now = new Date()
  const isPast18 =
    sessionDate.toDateString() === now.toDateString() &&
    now.getHours() >= 18

  return {
    success: true,
    data: {
      isLocked: isLocked || isPast18,
      lockedAt: session.locked_at,
      status: session.status,
      reason: isLocked
        ? 'completed'
        : isPast18
          ? 'cutoff'
          : null
    }
  }
}
```

**Parameters:**
- `sessao_aula_id` (UUID): Session ID

**Response:**
```typescript
{
  success: true,
  data: {
    isLocked: boolean
    lockedAt: string | null
    status: 'planning' | 'attendance' | 'completed' | 'locked'
    reason: 'completed' | 'cutoff' | null
  }
}
```

**Usage:** Called every 30s via TanStack Query polling to update UI disabled state

---

## Error Handling Standards

### Error Response Format

All Server Actions return standardized error format:

```typescript
{
  success: false,
  error: string  // Portuguese user-facing message
}
```

### Error Messages (Portuguese)

**Session Errors:**
- "Sessão não encontrada"
- "Já existe uma aula aberta para esta turma hoje."
- "Frequência já finalizada. Não existe o esquecer."
- "Prazo para fechar aula encerrado às 18:00. Sessão bloqueada automaticamente."

**Validation Errors:**
- "ID da sessão inválido"
- "ID do aluno inválido"
- "Status de frequência inválido"
- "Máximo de 50 alunos por lote"

**Business Rule Errors:**
- "Existem X alunos sem frequência marcada. Marque todos antes de fechar."

**Generic Errors:**
- "Erro ao criar sessão de frequência."
- "Erro ao marcar frequência."
- "Erro ao fechar sessão de frequência."

---

## Security & Authorization

### Row Level Security (RLS)

All Server Actions rely on Supabase RLS policies:

**sessoes_aula table:**
```sql
-- Teachers can only manage their own sessions
CREATE POLICY "teachers_manage_own_sessions" ON sessoes_aula
  FOR ALL USING (professor_id = auth.uid());

-- Admins and directors can view all sessions
CREATE POLICY "admins_view_all_sessions" ON sessoes_aula
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'diretor')
    )
  );
```

**frequencia table:**
```sql
-- Teachers can mark attendance for their sessions
CREATE POLICY "teachers_mark_attendance" ON frequencia
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sessoes_aula
      WHERE id = frequencia.sessao_aula_id
      AND professor_id = auth.uid()
    )
  );
```

### Authorization Checks

Server Actions validate user permissions via RLS - no additional auth checks needed in action code.

---

## Performance Considerations

### Caching Strategy

- Use Next.js `revalidatePath` after mutations
- TanStack Query cache for session data (5min stale time)
- Polling for lock status every 30s (not real-time subscription)

### Rate Limiting

**Not implemented in MVP** - Consider for post-MVP:
- Max 100 mark requests per session per minute
- Max 5 session open/close requests per user per minute

---

## Integration with Frontend

### TanStack Query Hooks

```typescript
// hooks/use-attendance-session.ts
import { useMutation, useQuery } from '@tanstack/react-query'
import { openAttendanceSession, markAttendance, closeAttendanceSession } from '@/app/actions/attendance'

export function useOpenSession() {
  return useMutation({
    mutationFn: openAttendanceSession,
    onSuccess: () => {
      // Invalidate session queries
    }
  })
}

export function useMarkAttendance() {
  return useMutation({
    mutationFn: markAttendance,
    onSuccess: () => {
      // Optimistic update
    }
  })
}

export function useCloseSession() {
  return useMutation({
    mutationFn: closeAttendanceSession,
  })
}
```

---

## Testing Strategy

### Unit Tests (Vitest)

Test each Server Action with mocked Supabase client:
- Valid input handling
- Error scenarios (locked session, validation errors)
- RLS enforcement

### Integration Tests (Playwright)

Test full workflow with real database:
- Open session → Mark attendance → Close session
- Lock validation after 18:00
- Concurrent modification prevention

**Test File:** `__tests__/actions/attendance-workflow.test.ts`