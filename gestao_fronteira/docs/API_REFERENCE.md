# API Reference - Gestão Fronteira

**Version:** 1.0.0
**Last Updated:** October 10, 2025
**Brazilian Educational Compliance:** INEP, LGPD, Educacenso 2025

This document provides comprehensive documentation for all Server Actions and API routes in the Gestão Fronteira educational management system.

---

## Table of Contents

1. [Server Actions](#server-actions)
   - [Attendance Actions](#attendance-actions)
2. [API Routes](#api-routes)
   - [Session Management](#session-management)
   - [Attendance Management](#attendance-management)
   - [Compliance & Monitoring](#compliance--monitoring)
   - [Search & Discovery](#search--discovery)
3. [Brazilian Educational Compliance](#brazilian-educational-compliance)
4. [Authentication & Authorization](#authentication--authorization)
5. [Error Handling](#error-handling)
6. [Code Examples](#code-examples)

---

## Server Actions

Server Actions are server-side functions that can be called directly from React components. All actions use `'use server'` directive and enforce Row Level Security (RLS) through Supabase.

### Attendance Actions

#### `openSessionAction`

Opens a new attendance session for a class (turma) on a specific date.

**Location:** `app/actions/attendance/open-session.ts`

**Type Signature:**
```typescript
async function openSessionAction(
  params: OpenSessionParams
): Promise<OpenSessionResult>
```

**Parameters:**
```typescript
interface OpenSessionParams {
  turma_id: string          // UUID of the class
  professor_id: string      // UUID of the teacher
  data_aula: string        // Date in YYYY-MM-DD format
  conteudo_programatico?: string  // Optional lesson content
}
```

**Returns:**
```typescript
interface OpenSessionResult {
  success: boolean
  session?: {
    id: string
    turma_id: string
    professor_id: string
    data_aula: string
    status: 'ABERTA'
    aberta_em: string       // ISO 8601 timestamp
    auto_fechamento_agendado: string  // ISO 8601 timestamp (18:00 São Paulo time)
    conteudo_programatico: string | null
  }
  error?: string
}
```

**Business Rules:**
- Cannot create duplicate sessions for the same turma on the same date
- Auto-closure scheduled for 18:00 São Paulo time (America/Sao_Paulo timezone)
- RLS policies enforce teacher can only create sessions for their own turmas
- Session starts in `ABERTA` status, ready for attendance marking

**Database Operations:**
- Checks for existing session with status `PLANEJADA`, `ABERTA`, or `aberta`
- Inserts new record in `sessoes_aula` table
- Triggers `revalidatePath()` for `/dashboard/frequencia` and `/dashboard/turmas/{turma_id}`

**Error Codes:**
- `"ID da turma é obrigatório"` - Missing turma_id
- `"ID do professor é obrigatório"` - Missing professor_id
- `"Data da aula é obrigatória"` - Missing data_aula
- `"Já existe uma aula aberta para esta turma hoje"` - Duplicate session

**Usage Example:**
```typescript
'use client'
import { openSessionAction } from '@/app/actions/attendance/open-session'

async function handleOpenSession() {
  const result = await openSessionAction({
    turma_id: 'uuid-turma-123',
    professor_id: 'uuid-professor-456',
    data_aula: '2025-10-10',
    conteudo_programatico: 'Matemática: Frações e Decimais'
  })

  if (result.success) {
    console.log('Session opened:', result.session)
  } else {
    console.error('Error:', result.error)
  }
}
```

---

#### `closeSessionAction`

Manually closes an open session, making it immutable ("não existe o esquecer" principle).

**Location:** `app/actions/attendance/close-session.ts`

**Type Signature:**
```typescript
async function closeSessionAction(
  params: CloseSessionParams
): Promise<CloseSessionResult>
```

**Parameters:**
```typescript
interface CloseSessionParams {
  session_id: string        // UUID of the session to close
  observacoes?: string      // Optional closing observations
}
```

**Returns:**
```typescript
interface CloseSessionResult {
  success: boolean
  session?: {
    id: string
    status: 'FECHADA'
    fechada_em: string      // ISO 8601 timestamp
    observacoes_fechamento: string | null
    updated_at: string
  }
  error?: string
}
```

**Business Rules:**
- Only session owner (professor) can close via RLS policies
- Session must be editable (not already closed/locked)
- Database trigger automatically generates `hash_legal` (SHA-256 compliance hash)
- Database trigger creates audit trail record
- Database trigger calculates `tempo_total_aula` (total class time)

**Database Operations:**
- Calls `is_session_editable()` database function
- Updates `sessoes_aula` with `status='FECHADA'`, `fechada_em` timestamp
- Trigger `fn_enhanced_audit_sessao_aula` executes automatically

**Brazilian Compliance:**
- Implements "não existe o esquecer" (no forgetting) principle
- Once closed, session becomes legal document and cannot be modified
- Legal hash ensures data integrity for INEP reporting

**Error Codes:**
- `"ID da sessão é obrigatório"` - Missing session_id
- `"Aula já encerrada. Documento oficial não pode ser alterado"` - Session already closed

**Usage Example:**
```typescript
import { closeSessionAction } from '@/app/actions/attendance/close-session'

async function handleCloseSession(sessionId: string) {
  const result = await closeSessionAction({
    session_id: sessionId,
    observacoes: 'Aula transcorreu normalmente. Todos os alunos participaram.'
  })

  if (result.success) {
    alert('Sessão encerrada com sucesso!')
  }
}
```

---

#### `markAttendanceAction`

Marks or updates attendance for a single student in a session.

**Location:** `app/actions/attendance/mark-attendance.ts`

**Type Signature:**
```typescript
async function markAttendanceAction(
  params: MarkAttendanceParams
): Promise<MarkAttendanceResult>
```

**Parameters:**
```typescript
interface MarkAttendanceParams {
  sessao_aula_id: string    // UUID of the session
  aluno_id: string          // UUID of the student
  presente: boolean         // true = present, false = absent
  data: string              // Date in YYYY-MM-DD format
}
```

**Returns:**
```typescript
interface MarkAttendanceResult {
  success: boolean
  record?: {
    sessao_aula_id: string
    aluno_id: string
    presente: boolean
    data: string
    updated_at: string
  }
  error?: string
}
```

**Business Rules:**
- Performance target: < 1 second per student (including database round trip)
- Supports toggle behavior: can update existing record if already marked
- Session must be editable (not locked) before marking
- Uses `UPSERT` operation with unique constraint on `(sessao_aula_id, aluno_id, data)`

**Database Operations:**
- Calls `is_session_editable()` database function
- Upserts record in `frequencia` table with conflict resolution
- Triggers `revalidatePath()` for `/dashboard/frequencia`

**Brazilian Compliance:**
- Prevents modification of locked sessions ("não existe o esquecer")
- Attendance records are official legal documents for INEP
- Cannot mark attendance after 18:00 auto-lock time

**Error Codes:**
- `"ID da sessão é obrigatório"` - Missing sessao_aula_id
- `"ID do aluno é obrigatório"` - Missing aluno_id
- `"Data é obrigatória"` - Missing data
- `"Frequência já finalizada. Não existe o esquecer."` - Session locked

**Performance Metrics:**
- Target execution time: < 1000ms
- Optimized with database indexes on `(sessao_aula_id, aluno_id, data)`

**Usage Example:**
```typescript
import { markAttendanceAction } from '@/app/actions/attendance/mark-attendance'

async function markStudentPresent(sessionId: string, studentId: string) {
  const result = await markAttendanceAction({
    sessao_aula_id: sessionId,
    aluno_id: studentId,
    presente: true,
    data: '2025-10-10'
  })

  if (result.success) {
    console.log('Attendance marked successfully')
  }
}
```

---

#### `checkLockStatusAction`

Validates if a session is editable or locked (immutable).

**Location:** `app/actions/attendance/check-lock-status.ts`

**Type Signature:**
```typescript
async function checkLockStatusAction(
  sessionIdOrTurmaId: string,
  date?: string
): Promise<CheckLockStatusResult>
```

**Parameters:**
- `sessionIdOrTurmaId` (string): UUID of session OR turma
- `date` (string, optional): Date in YYYY-MM-DD format when querying by turma_id

**Returns:**
```typescript
interface CheckLockStatusResult {
  success: boolean
  session?: {
    id: string
    turma_id: string
    professor_id: string
    status: string
    data_aula: string
    fechada_em?: string
    travada_em?: string
    auto_fechamento_agendado: string
  }
  isLocked: boolean
  lockReason?: 'manual_close' | 'auto_lock' | null
  error?: string
}
```

**Business Rules:**
- Can query by session_id OR by turma_id + date combination
- Returns lock status with reason: manual close or auto-lock
- Optimized for real-time polling to detect 18:00 auto-lock
- Performance optimized with database indexes on `(status, travada_em)`

**Lock Detection Logic:**
1. **Manual Close**: status = `FECHADA` OR `fechada_em` is set
2. **Auto Lock**: status = `travada` OR `travada_em` is set
3. **Cutoff Check**: Verifies if current time > `auto_fechamento_agendado`

**Database Operations:**
- Queries `sessoes_aula` table by id or turma_id + date
- Calls `is_session_editable()` database function for validation

**Use Cases:**
- Real-time UI updates to disable attendance marking after auto-lock
- Frontend polling every 60 seconds to detect lock transitions
- Pre-validation before attendance marking operations

**Usage Example:**
```typescript
import { checkLockStatusAction } from '@/app/actions/attendance/check-lock-status'

// Query by session ID
async function checkSessionLock(sessionId: string) {
  const result = await checkLockStatusAction(sessionId)

  if (result.isLocked) {
    console.log('Session locked:', result.lockReason)
    // Disable attendance marking UI
  }
}

// Query by turma ID + date
async function checkTurmaSessionLock(turmaId: string, date: string) {
  const result = await checkLockStatusAction(turmaId, date)

  return result.isLocked
}

// Real-time polling (recommended every 60 seconds)
useEffect(() => {
  const interval = setInterval(async () => {
    const lockStatus = await checkLockStatusAction(sessionId)
    setIsLocked(lockStatus.isLocked)
  }, 60000)

  return () => clearInterval(interval)
}, [sessionId])
```

---

## API Routes

All API routes require authentication via Supabase Auth. RLS policies enforce school-based multi-tenancy and role-based access control.

### Session Management

#### `POST /api/sessoes-aula/abrir`

Creates a new session in `PLANEJADA` state with Brazilian compliance features.

**Authentication:** Required
**Authorization:** professor, diretor, secretario, admin

**Request Body:**
```typescript
{
  turma_id: string          // UUID, required
  professor_id: string      // UUID, required
  disciplina_id?: string    // UUID, optional
  data_aula: string         // YYYY-MM-DD format, required
  hora_inicio?: string      // HH:MM format, optional
  hora_fim?: string         // HH:MM format, optional
  observacoes?: string      // max 500 chars, optional
}
```

**Validation Schema (Zod):**
```typescript
const AbrirAulaSchema = z.object({
  turma_id: z.string().uuid('ID da turma inválido'),
  professor_id: z.string().uuid('ID do professor inválido'),
  disciplina_id: z.string().uuid('ID da disciplina inválido').optional(),
  data_aula: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido'),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido').optional(),
  hora_fim: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido').optional(),
  observacoes: z.string().max(500).optional()
})
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Sessão criada com sucesso",
  "session": {
    "id": "uuid-session-123",
    "turma_id": "uuid-turma-456",
    "professor_id": "uuid-professor-789",
    "disciplina_id": "uuid-disciplina-012",
    "data_aula": "2025-10-10",
    "hora_inicio": "08:00",
    "hora_fim": "09:30",
    "status": "PLANEJADA",
    "auto_fechamento_agendado": "2025-10-10T21:00:00.000Z",
    "criada_em": "2025-10-10T12:00:00.000Z",
    "aberta_em": null,
    "fechada_em": null,
    "conteudo_ministrado": "Matemática básica",
    "tempo_total_aula": null,
    "turmas": {
      "id": "uuid-turma-456",
      "nome": "5º Ano A",
      "ano_letivo": 2025,
      "escola_id": "uuid-escola-111"
    },
    "users": {
      "id": "uuid-professor-789",
      "nome_completo": "Maria Silva"
    },
    "disciplinas": {
      "id": "uuid-disciplina-012",
      "nome": "Matemática",
      "codigo": "MAT"
    },
    "compliance_status": "criada",
    "can_modify": true,
    "auto_closure_info": {
      "scheduled_time": "2025-10-10T21:00:00.000Z",
      "sao_paulo_timezone": "America/Sao_Paulo",
      "closure_hour": "18:00"
    },
    "workflow_status": {
      "current_phase": "PLANEJADA",
      "next_allowed_transitions": ["ABERTA", "CANCELADA"],
      "legal_compliance": "pending"
    }
  }
}
```

**Error Responses:**

**400 Bad Request - Validation Error:**
```json
{
  "error": "Dados de entrada inválidos",
  "details": [
    {
      "field": "data_aula",
      "message": "Formato de data inválido (AAAA-MM-DD)"
    }
  ],
  "code": "VALIDATION_ERROR"
}
```

**401 Unauthorized:**
```json
{
  "error": "Não autorizado",
  "code": "UNAUTHORIZED"
}
```

**403 Forbidden:**
```json
{
  "error": "Você só pode criar sessões para turmas da sua escola",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

**404 Not Found:**
```json
{
  "error": "Turma não encontrada",
  "code": "NOT_FOUND"
}
```

**409 Conflict - Duplicate Session:**
```json
{
  "error": "Já existe uma sessão para esta turma em 2025-10-10",
  "code": "DUPLICATE_SESSION"
}
```

**Business Rules:**
- Professors can only create sessions for their own turmas
- Directors/secretarios can create sessions for any turma in their school
- Admins can create sessions for any turma
- Cannot create sessions more than 30 days in advance
- Cannot create sessions more than 7 days in the past
- No duplicate sessions for same turma on same date
- Auto-closure scheduled for 18:00 São Paulo time (UTC-3)

**Auto-Closure Calculation:**
```typescript
// Auto-closure time: 6 PM São Paulo time (UTC-3)
// Converts to UTC: 18:00 BRT = 21:00 UTC
const sessionDate = new Date(data_aula)
const closureTime = new Date(sessionDate)
closureTime.setUTCHours(21, 0, 0, 0)
```

**cURL Example:**
```bash
curl -X POST https://api.example.com/api/sessoes-aula/abrir \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -d '{
    "turma_id": "uuid-turma-456",
    "professor_id": "uuid-professor-789",
    "data_aula": "2025-10-10",
    "hora_inicio": "08:00",
    "hora_fim": "09:30",
    "observacoes": "Aula de matemática - frações"
  }'
```

**Fetch Example:**
```typescript
async function createSession(data: AbrirAulaRequest) {
  const response = await fetch('/api/sessoes-aula/abrir', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message)
  }

  return await response.json()
}
```

---

#### `PUT /api/sessoes-aula/[id]/status`

Updates session status with legal compliance validation and three-phase workflow enforcement.

**Authentication:** Required
**Authorization:** professor (own sessions), diretor, secretario (school sessions), admin

**URL Parameters:**
- `id` (string): UUID of the session

**Request Body:**
```typescript
{
  status: 'PLANEJADA' | 'ABERTA' | 'FECHADA' | 'CANCELADA'  // required
  conteudo_ministrado?: string  // min 10, max 1000 chars, optional
  observacoes_fechamento?: string  // max 500 chars, optional
  motivo_cancelamento?: string  // min 5, max 500 chars, optional
}
```

**Validation Schema:**
```typescript
const StatusUpdateSchema = z.object({
  status: z.enum(['PLANEJADA', 'ABERTA', 'FECHADA', 'CANCELADA']),
  conteudo_ministrado: z.string().min(10).max(1000).optional(),
  observacoes_fechamento: z.string().max(500).optional(),
  motivo_cancelamento: z.string().min(5).max(500).optional()
})
```

**Valid Status Transitions:**
```typescript
const validTransitions = {
  'PLANEJADA': ['ABERTA', 'CANCELADA'],
  'ABERTA': ['FECHADA', 'CANCELADA'],
  'FECHADA': [],  // Cannot transition from closed (não existe o esquecer)
  'CANCELADA': []  // Cannot transition from cancelled
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Aula aberta com sucesso. A chamada pode ser realizada.",
  "session": {
    "id": "uuid-session-123",
    "turma_id": "uuid-turma-456",
    "professor_id": "uuid-professor-789",
    "status": "ABERTA",
    "criada_em": "2025-10-10T12:00:00.000Z",
    "aberta_em": "2025-10-10T13:00:00.000Z",
    "fechada_em": null,
    "cancelada_em": null,
    "conteudo_ministrado": "Matemática: Frações",
    "hash_legal": null,
    "tempo_total_aula": null,
    "compliance_status": "active",
    "can_modify": true,
    "workflow_status": {
      "previous_phase": "PLANEJADA",
      "current_phase": "ABERTA",
      "next_allowed_transitions": ["FECHADA", "CANCELADA"],
      "legal_compliance": "pending"
    },
    "audit_info": {
      "changed_by": "Maria Silva",
      "changed_at": "2025-10-10T13:00:00.000Z",
      "change_type": "session_opened"
    }
  }
}
```

**Error Responses:**

**400 Bad Request - Invalid Transition:**
```json
{
  "error": "Transição inválida de FECHADA para ABERTA",
  "valid_transitions": [],
  "code": "INVALID_TRANSITION"
}
```

**403 Forbidden - Immutable Session:**
```json
{
  "error": "Não é possível modificar sessões já fechadas (princípio \"não existe o esquecer\")",
  "code": "SESSION_IMMUTABLE"
}
```

**Status Change Messages:**
```typescript
const messages = {
  'PLANEJADA → ABERTA': 'Aula aberta com sucesso. A chamada pode ser realizada.',
  'ABERTA → FECHADA': 'Aula fechada com sucesso. Registro legal criado.',
  'PLANEJADA → CANCELADA': 'Sessão cancelada com sucesso.',
  'ABERTA → CANCELADA': 'Sessão cancelada durante a aula.'
}
```

**Legal Hash Generation (when closing):**
```typescript
// Generates SHA-256 hash for legal compliance
const hashInput = [
  session.turma_id,
  session.professor_id,
  session.data_aula,
  session.aberta_em || session.criada_em,
  session.fechada_em,
  session.conteudo_ministrado
].join('|')

const hash_legal = crypto.createHash('sha256').update(hashInput).digest('hex')
```

**Compliance Status Values:**
- `"pending"` - Session in PLANEJADA state
- `"active"` - Session in ABERTA state
- `"compliant"` - Session in FECHADA state with hash_legal
- `"cancelled"` - Session in CANCELADA state

**cURL Example:**
```bash
curl -X PUT https://api.example.com/api/sessoes-aula/uuid-123/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "status": "FECHADA",
    "conteudo_ministrado": "Matemática: Frações e decimais. Exercícios práticos.",
    "observacoes_fechamento": "Aula transcorreu normalmente."
  }'
```

**Fetch Example:**
```typescript
async function updateSessionStatus(
  sessionId: string,
  status: 'ABERTA' | 'FECHADA' | 'CANCELADA',
  data?: {
    conteudo_ministrado?: string
    observacoes_fechamento?: string
    motivo_cancelamento?: string
  }
) {
  const response = await fetch(`/api/sessoes-aula/${sessionId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, ...data }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error)
  }

  return await response.json()
}
```

---

#### `POST /api/sessoes-aula/[id]/frequencia/batch`

High-performance batch attendance marking with < 1 second requirement per operation.

**Authentication:** Required
**Authorization:** professor (own sessions), diretor, secretario (school sessions), admin

**URL Parameters:**
- `id` (string): UUID of the session

**Request Body:**
```typescript
{
  attendance: Array<{
    aluno_id: string           // UUID, required
    presente: boolean          // required
    observacoes?: string       // max 200 chars, optional
    horario_marcacao?: string  // ISO 8601 datetime, optional
  }>                          // min 1, max 50 records
  force_overwrite?: boolean   // default false, overwrite locked records
  bulk_observations?: string  // max 300 chars, applied to all records
}
```

**Validation Schema:**
```typescript
const AttendanceRecordSchema = z.object({
  aluno_id: z.string().uuid('ID do aluno inválido'),
  presente: z.boolean(),
  observacoes: z.string().max(200).optional(),
  horario_marcacao: z.string().datetime().optional()
})

const BatchAttendanceSchema = z.object({
  attendance: z.array(AttendanceRecordSchema)
    .min(1, 'Pelo menos um registro necessário')
    .max(50, 'Máximo 50 registros por lote'),
  force_overwrite: z.boolean().default(false),
  bulk_observations: z.string().max(300).optional()
})
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Frequência processada com sucesso em 487.23ms",
  "results": {
    "processed_count": 25,
    "inserted": 20,
    "updated": 5,
    "skipped": 0,
    "errors": [],
    "total_requested": 25
  },
  "performance": {
    "execution_time_ms": 487,
    "performance_compliant": true,
    "requirement_met": true,
    "records_per_second": 51
  },
  "session_info": {
    "session_id": "uuid-session-123",
    "turma_nome": "5º Ano A",
    "processed_by": "Maria Silva",
    "processed_at": "2025-10-10T14:30:00.000Z"
  }
}
```

**Partial Success with Errors:**
```json
{
  "success": true,
  "message": "Frequência processada com sucesso em 523.12ms",
  "results": {
    "processed_count": 22,
    "inserted": 18,
    "updated": 4,
    "skipped": 3,
    "errors": [
      {
        "aluno_id": "uuid-aluno-789",
        "error": "Registro travado - use force_overwrite para sobrescrever"
      },
      {
        "aluno_id": "uuid-aluno-012",
        "error": "Registro travado - use force_overwrite para sobrescrever"
      },
      {
        "aluno_id": "uuid-aluno-345",
        "error": "Registro travado - use force_overwrite para sobrescrever"
      }
    ],
    "total_requested": 25
  },
  "performance": {
    "execution_time_ms": 523,
    "performance_compliant": true,
    "requirement_met": true,
    "records_per_second": 42
  }
}
```

**Error Responses:**

**400 Bad Request - Session Not Open:**
```json
{
  "error": "Frequência só pode ser marcada em sessões abertas",
  "code": "SESSION_NOT_OPEN",
  "execution_time_ms": 125
}
```

**400 Bad Request - Invalid Enrollment:**
```json
{
  "error": "Alunos não matriculados ou inativos: uuid-1, uuid-2, uuid-3",
  "code": "INVALID_ENROLLMENT",
  "execution_time_ms": 234
}
```

**403 Forbidden - Session Closed:**
```json
{
  "error": "Não é possível marcar frequência em sessões já fechadas",
  "code": "SESSION_CLOSED",
  "execution_time_ms": 98
}
```

**Business Rules:**
- Performance requirement: < 1000ms for up to 50 records
- Session must be in `ABERTA` status
- All students must have active enrollment in the turma
- Locked records can only be overwritten with `force_overwrite: true`
- Bulk observations applied to all records without individual observations
- Optimized with parallel database operations

**Performance Optimization:**
- Bulk insert for new records (single transaction)
- Parallel updates for existing records (Promise.allSettled)
- Student enrollment validation in parallel with existing record check
- Database indexes on `(aula_session_id, aluno_id)`

**cURL Example:**
```bash
curl -X POST https://api.example.com/api/sessoes-aula/uuid-123/frequencia/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "attendance": [
      { "aluno_id": "uuid-aluno-1", "presente": true },
      { "aluno_id": "uuid-aluno-2", "presente": false, "observacoes": "Atestado médico" },
      { "aluno_id": "uuid-aluno-3", "presente": true }
    ],
    "bulk_observations": "Chamada realizada às 08:05"
  }'
```

**Fetch Example with Performance Tracking:**
```typescript
async function batchMarkAttendance(
  sessionId: string,
  attendance: AttendanceRecord[],
  options?: {
    force_overwrite?: boolean
    bulk_observations?: string
  }
) {
  const startTime = performance.now()

  const response = await fetch(`/api/sessoes-aula/${sessionId}/frequencia/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attendance,
      ...options
    }),
  })

  const result = await response.json()
  const clientTime = performance.now() - startTime

  console.log(`Client execution: ${clientTime.toFixed(2)}ms`)
  console.log(`Server execution: ${result.performance?.execution_time_ms}ms`)
  console.log(`Performance compliant: ${result.performance?.performance_compliant}`)

  return result
}
```

---

#### `PUT /api/sessoes-aula/[id]/cancelar`

Cancels a session with proper audit trail and legal compliance.

**Authentication:** Required
**Authorization:** professor (own sessions), diretor, secretario (school sessions), admin

**URL Parameters:**
- `id` (string): UUID of the session to cancel

**Request Body:**
```typescript
{
  motivo_cancelamento: string   // min 10, max 500 chars, required
  observacoes_adicionais?: string  // max 300 chars, optional
}
```

**Validation Schema:**
```typescript
const CancelSessionSchema = z.object({
  motivo_cancelamento: z.string()
    .min(10, 'Motivo deve ter pelo menos 10 caracteres')
    .max(500, 'Motivo muito longo'),
  observacoes_adicionais: z.string().max(300).optional()
})
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Sessão cancelada com sucesso. 12 registro(s) de frequência foram marcados como cancelados.",
  "session": {
    "id": "uuid-session-123",
    "turma_id": "uuid-turma-456",
    "professor_id": "uuid-professor-789",
    "status": "CANCELADA",
    "criada_em": "2025-10-10T12:00:00.000Z",
    "aberta_em": "2025-10-10T13:00:00.000Z",
    "cancelada_em": "2025-10-10T14:30:00.000Z",
    "observacoes_fechamento": "SESSÃO CANCELADA\nMotivo: Falta de energia elétrica na escola\nCancelada por: Maria Silva\nData/Hora: 10/10/2025 11:30:00\nRegistros de frequência afetados: 12\n",
    "compliance_status": "cancelled",
    "can_modify": false,
    "cancellation_info": {
      "cancelled_by": "Maria Silva",
      "cancelled_at": "2025-10-10T14:30:00.000Z",
      "reason": "Falta de energia elétrica na escola",
      "had_attendance_records": true,
      "affected_records": 12
    },
    "workflow_status": {
      "previous_phase": "ABERTA",
      "current_phase": "CANCELADA",
      "next_allowed_transitions": [],
      "legal_compliance": "cancelled"
    }
  }
}
```

**Error Responses:**

**400 Bad Request - Already Cancelled:**
```json
{
  "error": "Esta sessão já foi cancelada",
  "code": "ALREADY_CANCELLED"
}
```

**403 Forbidden - Cannot Cancel Closed:**
```json
{
  "error": "Não é possível cancelar sessões já fechadas (princípio \"não existe o esquecer\")",
  "code": "SESSION_CLOSED"
}
```

**Business Rules:**
- Can only cancel sessions in `PLANEJADA` or `ABERTA` status
- Cannot cancel sessions in `FECHADA` status (immutable)
- Cannot cancel sessions with `hash_legal` (legal compliance protection)
- All existing attendance records marked with cancellation note
- Detailed cancellation audit trail created

**Attendance Record Update:**
When a session is cancelled, all existing attendance records are updated:
```typescript
// Updates all frequencia records for the session
{
  observacoes: `SESSÃO CANCELADA: ${motivo_cancelamento}`,
  updated_at: new Date().toISOString()
}
```

**Cancellation Observations Format:**
```
SESSÃO CANCELADA
Motivo: [motivo_cancelamento]
Cancelada por: [nome_completo do usuário]
Data/Hora: [timestamp em pt-BR]
Registros de frequência afetados: [count]
Observações adicionais: [observacoes_adicionais] (se fornecido)
```

**cURL Example:**
```bash
curl -X PUT https://api.example.com/api/sessoes-aula/uuid-123/cancelar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "motivo_cancelamento": "Falta de energia elétrica na escola impossibilitou a aula",
    "observacoes_adicionais": "Aula será reagendada para amanhã"
  }'
```

**Fetch Example:**
```typescript
async function cancelSession(
  sessionId: string,
  motivo: string,
  observacoes?: string
) {
  const response = await fetch(`/api/sessoes-aula/${sessionId}/cancelar`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      motivo_cancelamento: motivo,
      observacoes_adicionais: observacoes
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error)
  }

  return await response.json()
}
```

---

### Compliance & Monitoring

#### `GET /api/compliance/warnings`

Retrieves Brazilian educational compliance warnings and alerts.

**Authentication:** Required
**Authorization:** All authenticated users (filtered by school/role)

**Query Parameters:** None

**Success Response (200):**
```json
{
  "success": true,
  "warnings": [
    {
      "id": "bolsa-familia-risk",
      "title": "Alunos em Risco - Bolsa Família",
      "message": "3 aluno(s) com frequência abaixo de 80%. Ação imediata necessária para conformidade com Bolsa Família.",
      "type": "critical",
      "icon": "AlertTriangle",
      "actionUrl": "/dashboard/relatorios/frequencia",
      "actionText": "Ver Alunos em Risco",
      "count": 3
    },
    {
      "id": "attendance-lock-pending",
      "title": "Bloqueio Automático de Frequência",
      "message": "2 sessão(ões) aberta(s) será(ão) bloqueada(s) automaticamente em 3h. Confirme toda a frequência antes deste horário.",
      "type": "warning",
      "icon": "Clock",
      "actionUrl": "/dashboard/frequencia",
      "actionText": "Verificar Frequência",
      "deadline": "2025-10-10T21:00:00.000Z",
      "count": 2
    },
    {
      "id": "educacenso-deadline",
      "title": "Prazo Educacenso 2025",
      "message": "Primeira etapa de coleta termina em 15 dias. Verifique se todos os dados de matrícula estão atualizados.",
      "type": "warning",
      "icon": "FileText",
      "actionUrl": "/dashboard/relatorios/educacenso",
      "actionText": "Revisar Dados",
      "deadline": "2025-07-31T00:00:00.000Z"
    },
    {
      "id": "incomplete-registrations",
      "title": "Cadastros Incompletos",
      "message": "5 aluno(s) sem CPF cadastrado. Necessário para conformidade INEP.",
      "type": "warning",
      "icon": "AlertCircle",
      "actionUrl": "/dashboard/alunos?filter=incomplete",
      "actionText": "Completar Cadastros",
      "count": 5
    }
  ],
  "total": 4,
  "timestamp": "2025-10-10T14:00:00.000Z"
}
```

**Warning Types:**

**1. Attendance Lock Pending:**
- Triggered when open sessions approaching 18:00 auto-lock
- Type: `"critical"` if < 2 hours remaining, `"warning"` otherwise
- Updated in real-time based on current time

**2. Bolsa Família Risk:**
- Students below 80% attendance threshold
- Type: `"critical"`
- Requires immediate action for social program compliance

**3. INEP Attendance Critical:**
- Students below 75% attendance (legal minimum)
- Type: `"critical"`
- Risk of failing due to absences

**4. Educacenso Deadline:**
- Approaching data collection deadline (within 30 days)
- Type: `"critical"` if ≤ 7 days, `"warning"` otherwise
- Only shown to diretor, secretario, admin

**5. Incomplete Registrations:**
- Students missing required data (CPF, guardians, etc.)
- Type: `"warning"`
- Only shown to secretario, admin

**Warning Interface:**
```typescript
interface ComplianceWarning {
  id: string                        // Unique warning identifier
  title: string                     // Warning title
  message: string                   // Detailed warning message
  type: 'critical' | 'warning' | 'info'  // Severity level
  icon: string                      // Lucide icon name
  actionUrl: string                 // Navigation URL for action
  actionText: string                // Call-to-action button text
  deadline?: Date                   // Optional deadline timestamp
  count?: number                    // Optional affected items count
}
```

**cURL Example:**
```bash
curl -X GET https://api.example.com/api/compliance/warnings \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Fetch Example with Auto-Refresh:**
```typescript
// Poll every 5 minutes for updated warnings
useEffect(() => {
  async function fetchWarnings() {
    const response = await fetch('/api/compliance/warnings')
    const data = await response.json()
    setWarnings(data.warnings)
  }

  fetchWarnings()
  const interval = setInterval(fetchWarnings, 5 * 60 * 1000)

  return () => clearInterval(interval)
}, [])
```

---

#### `GET /api/health`

Comprehensive health check endpoint for system monitoring.

**Authentication:** Not required (public endpoint)
**Response Format:** JSON

**Success Response (200 - Healthy):**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-10T14:00:00.000Z",
  "responseTime": "234ms",
  "checks": [
    {
      "name": "database",
      "status": "healthy",
      "responseTime": 145
    },
    {
      "name": "compliance_metrics",
      "status": "healthy",
      "responseTime": 89
    }
  ],
  "metrics": {
    "totalStudents": 342,
    "activeTeachers": 28,
    "openSessionsToday": 5
  },
  "version": "1.0.0",
  "environment": "production"
}
```

**Degraded Response (200 - Degraded):**
```json
{
  "status": "degraded",
  "timestamp": "2025-10-10T14:00:00.000Z",
  "responseTime": "1245ms",
  "checks": [
    {
      "name": "database",
      "status": "degraded",
      "responseTime": 1123,
      "error": null
    },
    {
      "name": "compliance_metrics",
      "status": "healthy",
      "responseTime": 122
    }
  ],
  "metrics": {
    "totalStudents": 342,
    "activeTeachers": 28,
    "openSessionsToday": 5
  },
  "version": "1.0.0",
  "environment": "production"
}
```

**Unhealthy Response (503 - Service Unavailable):**
```json
{
  "status": "unhealthy",
  "timestamp": "2025-10-10T14:00:00.000Z",
  "responseTime": "5432ms",
  "checks": [
    {
      "name": "database",
      "status": "unhealthy",
      "responseTime": 5321,
      "error": "Connection timeout"
    },
    {
      "name": "compliance_metrics",
      "status": "degraded",
      "responseTime": 111,
      "error": "Attendance data not accessible"
    }
  ],
  "metrics": null,
  "version": "1.0.0",
  "environment": "production"
}
```

**Health Check Components:**

**1. Database Check:**
- Tests connection to Supabase PostgreSQL
- Query: `SELECT id FROM escolas LIMIT 1`
- Healthy: < 1000ms response time
- Degraded: ≥ 1000ms response time
- Unhealthy: Connection error or timeout

**2. Compliance Metrics Check:**
- Validates access to attendance data
- Query: `SELECT id FROM frequencia LIMIT 1`
- Healthy: Query succeeds
- Degraded: Query fails (non-critical)

**System Metrics:**
- `totalStudents`: Count of active students (`ativo = true`)
- `activeTeachers`: Count of active teachers (`tipo_usuario = 'professor'` AND `ativo = true`)
- `openSessionsToday`: Count of sessions today with status `PLANEJADA` or `ABERTA`

**HTTP Status Codes:**
- `200 OK`: System healthy or degraded
- `503 Service Unavailable`: System unhealthy

**Integration with Monitoring:**
```bash
# UptimeRobot configuration
URL: https://your-app.com/api/health
Method: GET
Expected Status: 200
Check Interval: 5 minutes

# Grafana configuration
datasource: JSON API
endpoint: /api/health
interval: 1m
metrics: [
  system_health,
  students_total,
  teachers_active,
  sessions_open_today,
  health_check_database (response time),
  health_check_total (response time)
]
```

**Lightweight HEAD Request:**
```bash
# HEAD request returns only status code (no body)
curl -I https://api.example.com/api/health

# Response:
HTTP/2 200 OK
# or
HTTP/2 503 Service Unavailable
```

---

### Search & Discovery

#### `GET /api/search`

Universal search endpoint with fuzzy matching and Brazilian name support.

**Authentication:** Required
**Authorization:** All authenticated users (RLS-filtered results)

**Query Parameters:**
```typescript
{
  query: string                // Search query (required)
  type?: 'student' | 'teacher' | 'school' | 'class' | 'all'  // default: 'all'
  limit?: number              // max results, range 1-100, default: 50
  offset?: number             // pagination offset, default: 0
  fuzzy?: boolean             // enable fuzzy search, default: false

  // Advanced filters
  status?: 'active' | 'inactive'  // filter by status
  escola_id?: string          // filter by school UUID
  date_from?: string          // YYYY-MM-DD format
  date_to?: string            // YYYY-MM-DD format
  serie?: string              // filter classes by grade
  turno?: string              // filter classes by shift (manhã, tarde, noite)
}
```

**Success Response (200):**
```json
{
  "success": true,
  "results": [
    {
      "id": "uuid-student-123",
      "type": "student",
      "data": {
        "nome_completo": "João Silva Santos",
        "cpf": "123.456.789-00",
        "data_nascimento": "2010-05-15",
        "serie_ano": "5º Ano",
        "turno": "Manhã",
        "escola": "EMEF Fronteira",
        "telefone": "(38) 99999-8888",
        "endereco": "Rua Principal, 100",
        "bairro": "Centro"
      },
      "relevanceScore": 0.95,
      "matchedFields": ["nome_completo", "cpf"],
      "lastUpdated": "2025-09-15T10:00:00.000Z",
      "status": "active"
    },
    {
      "id": "uuid-teacher-456",
      "type": "teacher",
      "data": {
        "nome_completo": "Maria Silva Costa",
        "cpf": "987.654.321-00",
        "email": "maria.silva@escola.com",
        "escola": "EMEF Fronteira",
        "telefone": "(38) 98888-7777"
      },
      "relevanceScore": 0.87,
      "matchedFields": ["nome_completo"],
      "lastUpdated": "2025-08-20T14:30:00.000Z",
      "status": "active"
    },
    {
      "id": "uuid-class-789",
      "type": "class",
      "data": {
        "nome": "5º Ano A",
        "serie": "5º Ano",
        "turno": "Manhã",
        "ano_letivo": 2025,
        "capacidade": 30,
        "escola": "EMEF Fronteira",
        "professor": "Maria Silva Costa"
      },
      "relevanceScore": 0.75,
      "matchedFields": ["serie"],
      "lastUpdated": "2025-02-01T08:00:00.000Z",
      "status": "active"
    }
  ],
  "totalCount": 3,
  "query": "silva",
  "type": "all",
  "fuzzySearch": true
}
```

**Search Result Interface:**
```typescript
interface SearchResult {
  id: string
  type: 'student' | 'teacher' | 'school' | 'class'
  data: any                    // Type-specific data object
  relevanceScore: number       // 0.0 to 1.0
  matchedFields: string[]      // Fields that matched the query
  lastUpdated: Date
  status: string              // 'active' or 'inactive'
}
```

**Relevance Scoring:**
```typescript
// Exact match: 1.0
query === field  // score = 1.0

// Starts with query: 0.9
field.startsWith(query)  // score = 0.9

// Contains query: 0.7
field.includes(query)  // score = 0.7

// Fuzzy match: 0.0 to 0.95
fuzzySearchBrazilianName(query, field)  // score based on similarity
```

**Fuzzy Search Features:**
- Brazilian name normalization (removes accents, handles compound names)
- Levenshtein distance-based similarity
- Handles typos and partial matches
- Boosts score for fuzzy matches when enabled
- Minimum 2 characters required for fuzzy matching

**Access Control (RLS):**
- **Professors**: See only students/classes in their school
- **Diretor/Secretario**: See all data within their school
- **Admin**: See all data across all schools

**Search by Type:**

**Students:**
- Search fields: `nome_completo`, `cpf`
- Returns: enrollment info, current class, contact details

**Teachers:**
- Search fields: `nome_completo`, `email`, `cpf`
- Returns: school assignment, contact info

**Schools:**
- Search fields: `nome`, `codigo_inep`
- Returns: contact info, INEP code

**Classes:**
- Search fields: `nome`, `serie`
- Returns: teacher, school, capacity, year

**cURL Example:**
```bash
curl -X GET "https://api.example.com/api/search?query=silva&type=all&fuzzy=true&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Fetch Example:**
```typescript
async function searchGlobal(
  query: string,
  options?: {
    type?: 'student' | 'teacher' | 'school' | 'class' | 'all'
    fuzzy?: boolean
    limit?: number
    filters?: {
      escola_id?: string
      status?: 'active' | 'inactive'
    }
  }
) {
  const params = new URLSearchParams({
    query,
    type: options?.type || 'all',
    fuzzy: options?.fuzzy ? 'true' : 'false',
    limit: String(options?.limit || 50),
    ...(options?.filters?.escola_id && { escola_id: options.filters.escola_id }),
    ...(options?.filters?.status && { status: options.filters.status })
  })

  const response = await fetch(`/api/search?${params}`)
  return await response.json()
}

// Usage
const results = await searchGlobal('joão', {
  type: 'student',
  fuzzy: true,
  limit: 20,
  filters: { status: 'active' }
})
```

---

## Brazilian Educational Compliance

### Overview

The Gestão Fronteira system implements comprehensive Brazilian educational compliance, including:

1. **INEP (Instituto Nacional de Estudos e Pesquisas Educacionais) Compliance**
2. **Educacenso 2025 Data Collection Standards**
3. **Bolsa Família Program Integration**
4. **LGPD (Lei Geral de Proteção de Dados) Data Protection**
5. **"Não existe o esquecer" Legal Document Principle**

### Data Validation Library

**Location:** `lib/validation/brazilian-educational.ts`

#### CPF Validation

Brazilian taxpayer identification number validation with check digit verification.

```typescript
import { validateCPF, formatCPF } from '@/lib/validation/brazilian-educational'

// Validation
const isValid = validateCPF('123.456.789-00')  // true/false

// Formatting
const formatted = formatCPF('12345678900')  // '123.456.789-00'

// Zod Schema
import { brazilianCPFSchema } from '@/lib/validation/brazilian-educational'

const schema = z.object({
  cpf: brazilianCPFSchema  // Validates and formats automatically
})
```

**Algorithm:**
- Removes non-digit characters
- Validates length (11 digits)
- Rejects invalid patterns (all same digits)
- Validates first check digit
- Validates second check digit

#### CNPJ Validation

Brazilian company identification number validation.

```typescript
import { validateCNPJ, formatCNPJ } from '@/lib/validation/brazilian-educational'

const isValid = validateCNPJ('12.345.678/0001-90')  // true/false
const formatted = formatCNPJ('12345678000190')  // '12.345.678/0001-90'
```

#### Brazilian Phone Validation

Mobile and landline phone number validation.

```typescript
import {
  validateBrazilianPhone,
  formatBrazilianPhone
} from '@/lib/validation/brazilian-educational'

// Mobile (11 digits)
const isValidMobile = validateBrazilianPhone('38999998888')  // true
const formattedMobile = formatBrazilianPhone('38999998888')  // '(38) 99999-8888'

// Landline (10 digits)
const isValidLandline = validateBrazilianPhone('3835551234')  // true
const formattedLandline = formatBrazilianPhone('3835551234')  // '(38) 3555-1234'
```

**Patterns:**
- Mobile: `(xx) 9xxxx-xxxx` (11 digits with 9)
- Landline: `(xx) xxxx-xxxx` (10 digits, starts with 2-5)

#### INEP Code Validation

Educational institution and student identification.

```typescript
import { validateINEP } from '@/lib/validation/brazilian-educational'

const isValidSchool = validateINEP('12345678')     // 8 digits (schools)
const isValidStudent = validateINEP('12345678901') // 11 digits (students)
```

#### NIS Validation

Social program identification number validation (Bolsa Família).

```typescript
import { validateNIS } from '@/lib/validation/brazilian-educational'

const isValid = validateNIS('12345678901')  // true/false with check digit
```

#### Attendance Percentage Validation

Validates attendance percentage against Brazilian legal requirements.

```typescript
import { validateAttendancePercentage } from '@/lib/validation/brazilian-educational'

const result = validateAttendancePercentage(82)
// {
//   isValid: true,
//   status: 'adequate',
//   message: 'Frequência adequada conforme LDB'
// }

const resultWarning = validateAttendancePercentage(76)
// {
//   isValid: true,
//   status: 'warning',
//   message: 'Frequência no limite mínimo legal (75%)'
// }

const resultCritical = validateAttendancePercentage(70)
// {
//   isValid: false,
//   status: 'critical',
//   message: 'Frequência abaixo do mínimo legal - risco de reprovação'
// }
```

**Thresholds:**
- **≥ 80%**: Adequate (Bolsa Família compliant)
- **75-79%**: Warning (legal minimum)
- **< 75%**: Critical (failing risk)

### Complete Validation Schemas

#### Student Registration Schema

```typescript
import { studentRegistrationSchema } from '@/lib/validation/brazilian-educational'

const schema = studentRegistrationSchema
// Includes:
// - nome_completo (2-100 chars, letters only)
// - data_nascimento (0-18 years old)
// - cpf (optional, validated)
// - rg, sexo, endereco, telefone, email
// - nome_mae, nome_pai
// - necessidades_especiais
// - codigo_inep, nis
// - renda_familiar, transporte_escolar
// - bolsa_familia, programa_mais_educacao
```

#### Guardian Registration Schema

```typescript
import { guardianRegistrationSchema } from '@/lib/validation/brazilian-educational'

const schema = guardianRegistrationSchema
// Includes:
// - nome, cpf (required, validated)
// - rg, telefone, email
// - parentesco (mae, pai, avo, tio, etc.)
// - endereco, profissao, escolaridade
// - renda_familiar
// - lgpd_consentimento (required: true)
```

#### Attendance Session Schema

```typescript
import { attendanceSessionSchema } from '@/lib/validation/brazilian-educational'

const schema = attendanceSessionSchema
// Includes:
// - turma_id (UUID)
// - data_aula (cannot be >7 days old)
// - conteudo_programatico (5-500 chars)
// - duracao_minutos (30-240 min)
// - metodologia, recursos_utilizados, observacoes
```

### INEP Compliance Requirements

**Educacenso 2025 Timeline:**
- **Stage 1** (Initial Enrollment): May 28 - July 31, 2025
- **Stage 2** (Student Status): February 2 - March 13, 2026

**Required Data Points:**
- Student individualized data (CPF, enrollment status, attendance)
- Teacher classroom assignments and qualifications
- Class structure and academic calendar alignment
- Educational establishment information

**Data Integrity:**
- All attendance records immutable after closure
- Legal hash generation for compliance verification
- Complete audit trail with timestamps
- Non-retroactive attendance marking

### Bolsa Família Integration

**Program Requirements:**
- Minimum 80% school attendance for social program eligibility
- Real-time attendance monitoring
- Automated alerts for students below threshold
- Monthly attendance reporting

**Implementation:**
```typescript
// Check student Bolsa Família compliance
const { data: lowAttendance } = await supabase
  .rpc('get_students_below_attendance_threshold', {
    threshold_percentage: 80,
    escola_id: userProfile.escola_id
  })

// Compliance warning in dashboard
if (lowAttendance && lowAttendance.length > 0) {
  showWarning({
    type: 'critical',
    message: `${lowAttendance.length} aluno(s) em risco - Bolsa Família`
  })
}
```

### "Não existe o esquecer" Principle

**Legal Document Immutability:**

Once an attendance session is closed (`status = 'FECHADA'`), it becomes an official legal document and cannot be modified.

**Implementation:**
1. **Database Trigger**: Generates SHA-256 hash on closure
2. **RLS Policies**: Prevent updates to closed sessions
3. **API Validation**: Checks session editability before operations
4. **Frontend UI**: Disables modification controls

**Hash Generation:**
```typescript
const hashInput = [
  session.turma_id,
  session.professor_id,
  session.data_aula,
  session.aberta_em,
  session.fechada_em,
  session.conteudo_ministrado
].join('|')

const hash_legal = crypto.createHash('sha256')
  .update(hashInput)
  .digest('hex')
```

### LGPD Compliance

**Data Subject Rights:**
- Right to access personal data
- Right to correction of inaccurate data
- Right to deletion (with educational record exceptions)
- Right to data portability

**Consent Management:**
```typescript
const guardianSchema = z.object({
  lgpd_consentimento: z.boolean().refine(
    (val) => val === true,
    'Consentimento LGPD é obrigatório'
  )
})
```

**Data Protection Measures:**
- Row Level Security (RLS) for multi-tenancy
- School-based data isolation
- Encrypted sensitive data
- Audit trail for all data access

---

## Authentication & Authorization

### Authentication

All API routes and server actions require authentication via **Supabase Auth**.

**Token Location:**
- Stored in HTTP-only cookies by Supabase Auth
- Automatically included in requests by `createServerClient()`
- Token refresh handled automatically

**Authentication Check:**
```typescript
const { data: { user }, error } = await supabase.auth.getUser()

if (error || !user) {
  // Return 401 Unauthorized
  throw new Error('Não autorizado')
}
```

### Authorization (RBAC)

**5-Role System:**

1. **admin** - Full system access
2. **diretor** - School director, all data within their school
3. **secretario** - School secretary, administrative access within school
4. **professor** - Teacher, access to their own classes only
5. **responsavel** - Guardian, access to their children's data only

**Permission Matrix:**

| Operation | admin | diretor | secretario | professor | responsavel |
|-----------|-------|---------|------------|-----------|-------------|
| Create session | ✅ All | ✅ School | ✅ School | ✅ Own classes | ❌ |
| Mark attendance | ✅ All | ✅ School | ✅ School | ✅ Own sessions | ❌ |
| View students | ✅ All | ✅ School | ✅ School | ✅ Own classes | ✅ Own children |
| Edit students | ✅ All | ✅ School | ✅ School | ❌ | ❌ |
| Close session | ✅ All | ✅ School | ✅ School | ✅ Own sessions | ❌ |
| View reports | ✅ All | ✅ School | ✅ School | ✅ Own classes | ❌ |

**Row Level Security (RLS):**

Database policies enforce authorization at the PostgreSQL level:

```sql
-- Professors can only modify their own sessions
CREATE POLICY "professor_own_sessions" ON sessoes_aula
  FOR UPDATE USING (
    auth.uid() = professor_id
  );

-- Directors/secretaries can modify sessions in their school
CREATE POLICY "school_staff_sessions" ON sessoes_aula
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.escola_id = (
          SELECT escola_id FROM turmas
          WHERE turmas.id = sessoes_aula.turma_id
        )
        AND users.tipo_usuario IN ('diretor', 'secretario', 'admin')
    )
  );
```

**Access Control in API Routes:**
```typescript
// Get user profile
const { data: profile } = await supabase
  .from('users')
  .select('id, tipo_usuario, escola_id')
  .eq('id', user.id)
  .single()

// Validate access based on role
if (profile.tipo_usuario === 'professor') {
  if (session.professor_id !== profile.id) {
    throw new Error('Permissões insuficientes')
  }
} else if (['diretor', 'secretario'].includes(profile.tipo_usuario)) {
  if (session.turmas?.escola_id !== profile.escola_id) {
    throw new Error('Você só pode acessar dados da sua escola')
  }
}
```

---

## Error Handling

### Standard Error Response Format

All API endpoints return consistent error responses:

```typescript
{
  error: string              // Human-readable error message (Portuguese)
  code: string              // Machine-readable error code
  details?: Array<{         // Optional validation errors
    field: string
    message: string
  }>
  execution_time_ms?: number  // Performance tracking
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data (Zod validation failed) |
| `UNAUTHORIZED` | 401 | Authentication required or failed |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required permissions |
| `NOT_FOUND` | 404 | Requested resource doesn't exist |
| `DUPLICATE_SESSION` | 409 | Session already exists for turma/date |
| `INVALID_TRANSITION` | 400 | Invalid status transition attempted |
| `SESSION_IMMUTABLE` | 403 | Attempt to modify closed/locked session |
| `SESSION_NOT_OPEN` | 400 | Attendance marking requires ABERTA status |
| `SESSION_CLOSED` | 403 | Session already closed, cannot modify |
| `INVALID_ENROLLMENT` | 400 | Student not enrolled or inactive |
| `BULK_INSERT_ERROR` | 500 | Database error during batch operation |
| `BUSINESS_RULE_VIOLATION` | 400 | Generic business logic violation |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Error Handling Best Practices

**Client-Side Error Handling:**
```typescript
async function apiCall() {
  try {
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    const result = await response.json()

    if (!response.ok) {
      // Handle specific error codes
      switch (result.code) {
        case 'VALIDATION_ERROR':
          // Show field-specific errors
          result.details?.forEach(err => {
            showFieldError(err.field, err.message)
          })
          break

        case 'SESSION_IMMUTABLE':
          // Show immutability warning
          alert('Sessão já fechada - não pode ser modificada')
          break

        case 'INSUFFICIENT_PERMISSIONS':
          // Redirect to unauthorized page
          router.push('/unauthorized')
          break

        default:
          // Generic error toast
          toast.error(result.error)
      }

      throw new Error(result.error)
    }

    return result
  } catch (error) {
    console.error('API call failed:', error)
    throw error
  }
}
```

**Server-Side Error Logging:**
```typescript
import { logger } from '@/lib/logger'

try {
  // Operation
} catch (error) {
  logger.error('Operation failed', {
    error,
    context: {
      userId: user.id,
      sessionId,
      operation: 'mark_attendance'
    }
  })

  throw error
}
```

---

## Code Examples

### Complete Attendance Workflow

```typescript
'use client'
import { useState, useEffect } from 'react'
import { openSessionAction } from '@/app/actions/attendance/open-session'
import { markAttendanceAction } from '@/app/actions/attendance/mark-attendance'
import { closeSessionAction } from '@/app/actions/attendance/close-session'
import { checkLockStatusAction } from '@/app/actions/attendance/check-lock-status'

interface Student {
  id: string
  nome_completo: string
  presente?: boolean
}

export default function AttendanceWorkflow() {
  const [session, setSession] = useState<any>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [isLocked, setIsLocked] = useState(false)
  const [loading, setLoading] = useState(false)

  // Step 1: Open session
  async function handleOpenSession() {
    setLoading(true)
    try {
      const result = await openSessionAction({
        turma_id: 'uuid-turma-123',
        professor_id: 'uuid-professor-456',
        data_aula: new Date().toISOString().split('T')[0],
        conteudo_programatico: 'Matemática: Frações'
      })

      if (result.success) {
        setSession(result.session)
        // Load students from turma
        await loadStudents('uuid-turma-123')
      } else {
        alert(`Erro: ${result.error}`)
      }
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Mark attendance for students
  async function handleMarkAttendance(studentId: string, presente: boolean) {
    if (!session || isLocked) return

    const result = await markAttendanceAction({
      sessao_aula_id: session.id,
      aluno_id: studentId,
      presente,
      data: session.data_aula
    })

    if (result.success) {
      // Update local state
      setStudents(prev => prev.map(s =>
        s.id === studentId ? { ...s, presente } : s
      ))
    } else {
      alert(`Erro: ${result.error}`)
    }
  }

  // Step 3: Close session
  async function handleCloseSession() {
    if (!session || isLocked) return

    const result = await closeSessionAction({
      session_id: session.id,
      observacoes: 'Aula transcorreu normalmente'
    })

    if (result.success) {
      setSession(result.session)
      setIsLocked(true)
      alert('Sessão encerrada com sucesso!')
    } else {
      alert(`Erro: ${result.error}`)
    }
  }

  // Real-time lock status polling
  useEffect(() => {
    if (!session) return

    const checkLock = async () => {
      const result = await checkLockStatusAction(session.id)
      if (result.isLocked) {
        setIsLocked(true)
      }
    }

    // Check every 60 seconds
    const interval = setInterval(checkLock, 60000)
    return () => clearInterval(interval)
  }, [session])

  // Mock function to load students
  async function loadStudents(turmaId: string) {
    // Fetch students from database
    const response = await fetch(`/api/turmas/${turmaId}/alunos`)
    const data = await response.json()
    setStudents(data.students)
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Chamada Digital</h1>

      {!session ? (
        <button
          onClick={handleOpenSession}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          {loading ? 'Abrindo...' : 'Abrir Aula'}
        </button>
      ) : (
        <>
          <div className="mb-4 p-4 bg-gray-100 rounded">
            <p>Sessão: {session.id}</p>
            <p>Status: {session.status}</p>
            <p>Data: {new Date(session.data_aula).toLocaleDateString('pt-BR')}</p>
            {isLocked && (
              <p className="text-red-600 font-bold">
                ⚠️ Sessão bloqueada - não é possível modificar
              </p>
            )}
          </div>

          <div className="space-y-2">
            {students.map(student => (
              <div key={student.id} className="flex items-center gap-4 p-2 border rounded">
                <span className="flex-1">{student.nome_completo}</span>
                <button
                  onClick={() => handleMarkAttendance(student.id, true)}
                  disabled={isLocked}
                  className={`px-3 py-1 rounded ${
                    student.presente === true
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200'
                  }`}
                >
                  Presente
                </button>
                <button
                  onClick={() => handleMarkAttendance(student.id, false)}
                  disabled={isLocked}
                  className={`px-3 py-1 rounded ${
                    student.presente === false
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-200'
                  }`}
                >
                  Ausente
                </button>
              </div>
            ))}
          </div>

          {!isLocked && (
            <button
              onClick={handleCloseSession}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded"
            >
              Encerrar Aula
            </button>
          )}
        </>
      )}
    </div>
  )
}
```

### Batch Attendance Marking

```typescript
async function batchMarkAttendance(
  sessionId: string,
  students: Array<{ id: string; presente: boolean }>
) {
  // Process in chunks of 50 for optimal performance
  const BATCH_SIZE = 50
  const batches = []

  for (let i = 0; i < students.length; i += BATCH_SIZE) {
    batches.push(students.slice(i, i + BATCH_SIZE))
  }

  const results = []

  for (const batch of batches) {
    const response = await fetch(`/api/sessoes-aula/${sessionId}/frequencia/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attendance: batch.map(s => ({
          aluno_id: s.id,
          presente: s.presente
        })),
        bulk_observations: 'Chamada realizada via sistema'
      })
    })

    const result = await response.json()
    results.push(result)

    // Log performance
    console.log(`Batch processed in ${result.performance?.execution_time_ms}ms`)
    console.log(`Performance compliant: ${result.performance?.performance_compliant}`)
  }

  return results
}

// Usage
const students = [
  { id: 'uuid-1', presente: true },
  { id: 'uuid-2', presente: false },
  // ... up to 50 students
]

const results = await batchMarkAttendance('uuid-session-123', students)
```

### Compliance Warnings Dashboard

```typescript
'use client'
import { useState, useEffect } from 'react'
import { AlertTriangle, Clock, FileText, AlertCircle } from 'lucide-react'

export default function ComplianceDashboard() {
  const [warnings, setWarnings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWarnings()
    // Refresh every 5 minutes
    const interval = setInterval(fetchWarnings, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  async function fetchWarnings() {
    try {
      const response = await fetch('/api/compliance/warnings')
      const data = await response.json()
      setWarnings(data.warnings || [])
    } catch (error) {
      console.error('Failed to fetch warnings:', error)
    } finally {
      setLoading(false)
    }
  }

  const getIcon = (iconName: string) => {
    const icons = {
      AlertTriangle,
      Clock,
      FileText,
      AlertCircle
    }
    return icons[iconName as keyof typeof icons] || AlertCircle
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'bg-red-100 border-red-500 text-red-900'
      case 'warning':
        return 'bg-yellow-100 border-yellow-500 text-yellow-900'
      default:
        return 'bg-blue-100 border-blue-500 text-blue-900'
    }
  }

  if (loading) return <div>Carregando avisos...</div>

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Avisos de Conformidade</h2>

      {warnings.length === 0 ? (
        <div className="p-4 bg-green-100 rounded">
          ✅ Nenhum aviso de conformidade no momento
        </div>
      ) : (
        warnings.map((warning: any) => {
          const Icon = getIcon(warning.icon)

          return (
            <div
              key={warning.id}
              className={`p-4 border-l-4 rounded ${getTypeColor(warning.type)}`}
            >
              <div className="flex items-start gap-3">
                <Icon className="w-6 h-6 mt-1" />
                <div className="flex-1">
                  <h3 className="font-bold">{warning.title}</h3>
                  <p className="mt-1">{warning.message}</p>
                  {warning.deadline && (
                    <p className="text-sm mt-2">
                      Prazo: {new Date(warning.deadline).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                  <a
                    href={warning.actionUrl}
                    className="inline-block mt-3 px-4 py-2 bg-white rounded shadow hover:shadow-md"
                  >
                    {warning.actionText}
                  </a>
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
```

---

## Summary

This API reference documents **4 Server Actions** and **6+ API routes** with comprehensive Brazilian educational compliance support.

**Key Features:**
- Three-phase attendance workflow (PLANEJADA → ABERTA → FECHADA)
- "Não existe o esquecer" legal document immutability
- Performance-optimized batch operations (< 1 second for 50 records)
- Real-time compliance monitoring and warnings
- Comprehensive Brazilian data validation (CPF, CNPJ, NIS, INEP)
- Role-based access control with Row Level Security
- LGPD data protection compliance
- Educacenso 2025 and Bolsa Família integration

**For Support:**
- Review `BUGS-ANALYSIS.md` for known issues
- Check database schema in `supabase/migrations/`
- Refer to validation library in `lib/validation/brazilian-educational.ts`
