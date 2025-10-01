# Class Diary API Specification

**Sub-Spec for:** MVP Day 13 Production Readiness
**Focus:** Task 2 - Implement Class Diary (API Layer)
**Created:** 2025-10-01

---

## Overview

The Class Diary API provides read-only access to class session data, attendance statistics, and student attendance history. It leverages existing `sessoes_aula` and `frequencia` tables without requiring new migrations.

---

## API Functions

### 1. `getClassDiary()`

**Purpose:** Fetch list of class sessions with attendance statistics

**Function Signature:**
```typescript
async function getClassDiary(params: {
  turmaId?: string
  disciplinaId?: string
  dateFrom?: string // YYYY-MM-DD
  dateTo?: string // YYYY-MM-DD
  limit?: number
  offset?: number
}): Promise<ClassDiaryEntry[]>
```

**Return Type:**
```typescript
interface ClassDiaryEntry {
  id: string // sessao_aula.id
  data_aula: string // YYYY-MM-DD
  turma_id: string
  turma_nome: string
  disciplina_id: string
  disciplina_nome: string
  conteudo_programatico: string | null
  professor_id: string
  professor_nome: string
  total_alunos: number
  total_presentes: number
  total_ausentes: number
  fase: 'planning' | 'attendance' | 'completion' | 'locked'
  aberta_em: string // ISO timestamp
  fechada_em: string | null // ISO timestamp
}
```

**SQL Query:**
```sql
SELECT
  sa.id,
  sa.data_aula,
  sa.turma_id,
  t.nome AS turma_nome,
  sa.disciplina_id,
  d.nome AS disciplina_nome,
  sa.conteudo_programatico,
  sa.professor_id,
  u.nome AS professor_nome,
  sa.fase,
  sa.aberta_em,
  sa.fechada_em,
  (SELECT COUNT(*) FROM matriculas m WHERE m.turma_id = sa.turma_id AND m.situacao = 'ativa') AS total_alunos,
  (SELECT COUNT(*) FROM frequencia f WHERE f.sessao_aula_id = sa.id AND f.presente = true) AS total_presentes,
  (SELECT COUNT(*) FROM frequencia f WHERE f.sessao_aula_id = sa.id AND f.presente = false) AS total_ausentes
FROM sessoes_aula sa
JOIN turmas t ON sa.turma_id = t.id
JOIN disciplinas d ON sa.disciplina_id = d.id
JOIN users u ON sa.professor_id = u.id
WHERE
  ($1::uuid IS NULL OR sa.turma_id = $1)
  AND ($2::uuid IS NULL OR sa.disciplina_id = $2)
  AND ($3::date IS NULL OR sa.data_aula >= $3)
  AND ($4::date IS NULL OR sa.data_aula <= $4)
ORDER BY sa.data_aula DESC, sa.aberta_em DESC
LIMIT $5 OFFSET $6
```

**Example Usage:**
```typescript
// Get all classes for a specific turma
const classes = await getClassDiary({ turmaId: 'uuid-123' })

// Get classes for specific disciplina in date range
const mathClasses = await getClassDiary({
  disciplinaId: 'uuid-456',
  dateFrom: '2025-09-01',
  dateTo: '2025-09-30',
  limit: 20,
  offset: 0
})
```

**Error Handling:**
```typescript
try {
  const classes = await getClassDiary(params)
} catch (error) {
  if (error.code === 'PGRST116') {
    // No results found - return empty array
    return []
  }
  throw error
}
```

---

### 2. `getAttendanceHistory()`

**Purpose:** Fetch attendance history for a specific student

**Function Signature:**
```typescript
async function getAttendanceHistory(params: {
  alunoId: string
  turmaId: string
  dateFrom?: string // YYYY-MM-DD
  dateTo?: string // YYYY-MM-DD
}): Promise<AttendanceHistoryEntry[]>
```

**Return Type:**
```typescript
interface AttendanceHistoryEntry {
  id: string // frequencia.id
  data_aula: string // YYYY-MM-DD
  disciplina_nome: string
  presente: boolean
  observacoes: string | null
  sessao_aula_id: string
  created_at: string // ISO timestamp
}
```

**SQL Query:**
```sql
SELECT
  f.id,
  sa.data_aula,
  d.nome AS disciplina_nome,
  f.presente,
  f.observacoes,
  f.sessao_aula_id,
  f.created_at
FROM frequencia f
JOIN sessoes_aula sa ON f.sessao_aula_id = sa.id
JOIN disciplinas d ON sa.disciplina_id = d.id
WHERE
  f.aluno_id = $1
  AND sa.turma_id = $2
  AND ($3::date IS NULL OR sa.data_aula >= $3)
  AND ($4::date IS NULL OR sa.data_aula <= $4)
ORDER BY sa.data_aula DESC
```

**Example Usage:**
```typescript
// Get all attendance for a student in current year
const history = await getAttendanceHistory({
  alunoId: 'uuid-789',
  turmaId: 'uuid-123',
  dateFrom: '2025-01-01',
  dateTo: '2025-12-31'
})

// Calculate attendance percentage
const totalClasses = history.length
const presentCount = history.filter(h => h.presente).length
const attendancePercentage = (presentCount / totalClasses) * 100
```

---

### 3. `getClassDetail()`

**Purpose:** Fetch detailed information about a specific class session

**Function Signature:**
```typescript
async function getClassDetail(sessaoId: string): Promise<ClassDetailResponse>
```

**Return Type:**
```typescript
interface ClassDetailResponse {
  session: {
    id: string
    data_aula: string
    turma_nome: string
    disciplina_nome: string
    conteudo_programatico: string | null
    professor_nome: string
    fase: string
    aberta_em: string
    fechada_em: string | null
  }
  attendance: {
    aluno_id: string
    aluno_nome: string
    numero_chamada: number
    presente: boolean
    observacoes: string | null
  }[]
  statistics: {
    total_alunos: number
    total_presentes: number
    total_ausentes: number
    percentual_presenca: number
  }
}
```

**SQL Query:**
```sql
-- Session info
SELECT
  sa.id,
  sa.data_aula,
  t.nome AS turma_nome,
  d.nome AS disciplina_nome,
  sa.conteudo_programatico,
  u.nome AS professor_nome,
  sa.fase,
  sa.aberta_em,
  sa.fechada_em
FROM sessoes_aula sa
JOIN turmas t ON sa.turma_id = t.id
JOIN disciplinas d ON sa.disciplina_id = d.id
JOIN users u ON sa.professor_id = u.id
WHERE sa.id = $1

-- Attendance list
SELECT
  a.id AS aluno_id,
  a.nome_completo AS aluno_nome,
  m.numero_chamada,
  COALESCE(f.presente, false) AS presente,
  f.observacoes
FROM matriculas m
JOIN alunos a ON m.aluno_id = a.id
LEFT JOIN frequencia f ON f.aluno_id = a.id AND f.sessao_aula_id = $1
WHERE m.turma_id = (SELECT turma_id FROM sessoes_aula WHERE id = $1)
  AND m.situacao = 'ativa'
ORDER BY m.numero_chamada
```

**Example Usage:**
```typescript
const detail = await getClassDetail('uuid-session-123')

console.log(`Class: ${detail.session.turma_nome} - ${detail.session.disciplina_nome}`)
console.log(`Date: ${detail.session.data_aula}`)
console.log(`Attendance: ${detail.statistics.percentual_presenca}%`)

detail.attendance.forEach(student => {
  console.log(`${student.numero_chamada}. ${student.aluno_nome}: ${student.presente ? 'P' : 'F'}`)
})
```

---

## Implementation Details

### File: `lib/api/class-diary.ts`

```typescript
import { supabase } from '@/lib/supabase'

export interface ClassDiaryEntry {
  id: string
  data_aula: string
  turma_id: string
  turma_nome: string
  disciplina_id: string
  disciplina_nome: string
  conteudo_programatico: string | null
  professor_id: string
  professor_nome: string
  total_alunos: number
  total_presentes: number
  total_ausentes: number
  fase: 'planning' | 'attendance' | 'completion' | 'locked'
  aberta_em: string
  fechada_em: string | null
}

export interface AttendanceHistoryEntry {
  id: string
  data_aula: string
  disciplina_nome: string
  presente: boolean
  observacoes: string | null
  sessao_aula_id: string
  created_at: string
}

export interface ClassDetailResponse {
  session: {
    id: string
    data_aula: string
    turma_nome: string
    disciplina_nome: string
    conteudo_programatico: string | null
    professor_nome: string
    fase: string
    aberta_em: string
    fechada_em: string | null
  }
  attendance: {
    aluno_id: string
    aluno_nome: string
    numero_chamada: number
    presente: boolean
    observacoes: string | null
  }[]
  statistics: {
    total_alunos: number
    total_presentes: number
    total_ausentes: number
    percentual_presenca: number
  }
}

export async function getClassDiary(params: {
  turmaId?: string
  disciplinaId?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
  offset?: number
}): Promise<ClassDiaryEntry[]> {
  const {
    turmaId,
    disciplinaId,
    dateFrom,
    dateTo,
    limit = 20,
    offset = 0
  } = params

  let query = supabase
    .from('sessoes_aula')
    .select(`
      id,
      data_aula,
      turma_id,
      turmas!inner(nome),
      disciplina_id,
      disciplinas!inner(nome),
      conteudo_programatico,
      professor_id,
      users!inner(nome),
      fase,
      aberta_em,
      fechada_em
    `)

  if (turmaId) {
    query = query.eq('turma_id', turmaId)
  }

  if (disciplinaId) {
    query = query.eq('disciplina_id', disciplinaId)
  }

  if (dateFrom) {
    query = query.gte('data_aula', dateFrom)
  }

  if (dateTo) {
    query = query.lte('data_aula', dateTo)
  }

  query = query.order('data_aula', { ascending: false })
  query = query.order('aberta_em', { ascending: false })
  query = query.range(offset, offset + limit - 1)

  const { data, error } = await query

  if (error) {
    throw error
  }

  // Transform data and fetch attendance counts
  const entries = await Promise.all(
    (data || []).map(async (session) => {
      const { data: attendanceData } = await supabase
        .from('frequencia')
        .select('presente')
        .eq('sessao_aula_id', session.id)

      const totalPresentes = attendanceData?.filter(a => a.presente).length || 0
      const totalAusentes = attendanceData?.filter(a => !a.presente).length || 0

      const { count: totalAlunos } = await supabase
        .from('matriculas')
        .select('*', { count: 'exact', head: true })
        .eq('turma_id', session.turma_id)
        .eq('situacao', 'ativa')

      return {
        id: session.id,
        data_aula: session.data_aula,
        turma_id: session.turma_id,
        turma_nome: session.turmas.nome,
        disciplina_id: session.disciplina_id,
        disciplina_nome: session.disciplinas.nome,
        conteudo_programatico: session.conteudo_programatico,
        professor_id: session.professor_id,
        professor_nome: session.users.nome,
        total_alunos: totalAlunos || 0,
        total_presentes: totalPresentes,
        total_ausentes: totalAusentes,
        fase: session.fase,
        aberta_em: session.aberta_em,
        fechada_em: session.fechada_em
      }
    })
  )

  return entries
}

export async function getAttendanceHistory(params: {
  alunoId: string
  turmaId: string
  dateFrom?: string
  dateTo?: string
}): Promise<AttendanceHistoryEntry[]> {
  const { alunoId, turmaId, dateFrom, dateTo } = params

  let query = supabase
    .from('frequencia')
    .select(`
      id,
      presente,
      observacoes,
      sessao_aula_id,
      created_at,
      sessoes_aula!inner(
        data_aula,
        turma_id,
        disciplinas!inner(nome)
      )
    `)
    .eq('aluno_id', alunoId)
    .eq('sessoes_aula.turma_id', turmaId)

  if (dateFrom) {
    query = query.gte('sessoes_aula.data_aula', dateFrom)
  }

  if (dateTo) {
    query = query.lte('sessoes_aula.data_aula', dateTo)
  }

  query = query.order('sessoes_aula.data_aula', { ascending: false })

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data || []).map(entry => ({
    id: entry.id,
    data_aula: entry.sessoes_aula.data_aula,
    disciplina_nome: entry.sessoes_aula.disciplinas.nome,
    presente: entry.presente,
    observacoes: entry.observacoes,
    sessao_aula_id: entry.sessao_aula_id,
    created_at: entry.created_at
  }))
}

export async function getClassDetail(sessaoId: string): Promise<ClassDetailResponse> {
  // Fetch session info
  const { data: sessionData, error: sessionError } = await supabase
    .from('sessoes_aula')
    .select(`
      id,
      data_aula,
      turma_id,
      turmas!inner(nome),
      disciplinas!inner(nome),
      conteudo_programatico,
      users!inner(nome),
      fase,
      aberta_em,
      fechada_em
    `)
    .eq('id', sessaoId)
    .single()

  if (sessionError) {
    throw sessionError
  }

  // Fetch attendance list
  const { data: matriculasData, error: matriculasError } = await supabase
    .from('matriculas')
    .select(`
      numero_chamada,
      alunos!inner(id, nome_completo),
      frequencia:frequencia(presente, observacoes)
    `)
    .eq('turma_id', sessionData.turma_id)
    .eq('situacao', 'ativa')
    .eq('frequencia.sessao_aula_id', sessaoId)
    .order('numero_chamada')

  if (matriculasError) {
    throw matriculasError
  }

  const attendance = (matriculasData || []).map(m => ({
    aluno_id: m.alunos.id,
    aluno_nome: m.alunos.nome_completo,
    numero_chamada: m.numero_chamada,
    presente: m.frequencia?.[0]?.presente || false,
    observacoes: m.frequencia?.[0]?.observacoes || null
  }))

  const totalAlunos = attendance.length
  const totalPresentes = attendance.filter(a => a.presente).length
  const totalAusentes = totalAlunos - totalPresentes
  const percentualPresenca = totalAlunos > 0 ? (totalPresentes / totalAlunos) * 100 : 0

  return {
    session: {
      id: sessionData.id,
      data_aula: sessionData.data_aula,
      turma_nome: sessionData.turmas.nome,
      disciplina_nome: sessionData.disciplinas.nome,
      conteudo_programatico: sessionData.conteudo_programatico,
      professor_nome: sessionData.users.nome,
      fase: sessionData.fase,
      aberta_em: sessionData.aberta_em,
      fechada_em: sessionData.fechada_em
    },
    attendance,
    statistics: {
      total_alunos: totalAlunos,
      total_presentes: totalPresentes,
      total_ausentes: totalAusentes,
      percentual_presenca: Math.round(percentualPresenca * 10) / 10
    }
  }
}
```

---

## Testing

### Unit Tests (`lib/api/__tests__/class-diary.test.ts`)

```typescript
import { getClassDiary, getAttendanceHistory, getClassDetail } from '../class-diary'
import { supabase } from '@/lib/supabase'

jest.mock('@/lib/supabase')

describe('Class Diary API', () => {
  describe('getClassDiary', () => {
    it('fetches classes for a specific turma', async () => {
      // Mock implementation
      const mockData = [{ id: '123', turma_nome: '3º Ano A' }]
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: mockData, error: null })
      })

      const result = await getClassDiary({ turmaId: 'uuid-123' })
      expect(result).toHaveLength(1)
    })
  })

  describe('getAttendanceHistory', () => {
    it('fetches attendance for a specific student', async () => {
      // Test implementation
    })
  })

  describe('getClassDetail', () => {
    it('fetches detailed session with attendance list', async () => {
      // Test implementation
    })
  })
})
```

---

## Performance Considerations

### Query Optimization

**Problem:** N+1 queries when fetching attendance counts

**Solution:** Use batch queries or database views

**Alternative (if slow):**
```sql
CREATE VIEW vw_class_diary AS
SELECT
  sa.id,
  sa.data_aula,
  -- ... other fields
  COUNT(DISTINCT f.id) FILTER (WHERE f.presente = true) AS total_presentes,
  COUNT(DISTINCT f.id) FILTER (WHERE f.presente = false) AS total_ausentes
FROM sessoes_aula sa
LEFT JOIN frequencia f ON f.sessao_aula_id = sa.id
GROUP BY sa.id
```

### Caching Strategy

Use TanStack Query with 5-minute stale time:

```typescript
const { data } = useQuery({
  queryKey: ['class-diary', turmaId, disciplinaId],
  queryFn: () => getClassDiary({ turmaId, disciplinaId }),
  staleTime: 5 * 60 * 1000 // 5 minutes
})
```

---

## References

- [Supabase Select Queries](https://supabase.com/docs/reference/javascript/select)
- [PostgreSQL Aggregate Functions](https://www.postgresql.org/docs/current/functions-aggregate.html)
- [TanStack Query Caching](https://tanstack.com/query/latest/docs/react/guides/caching)

---

**Last Updated:** 2025-10-01
**API Version:** 1.0.0
