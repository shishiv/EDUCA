# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-09-18-abrir-aula-workflow/spec.md

## Overview

This document defines the API endpoints required for the "Abrir Aula" workflow, including class session management, enhanced attendance tracking, and real-time features. All endpoints integrate with the existing gestao_fronteira Next.js 15.5.3 + Supabase architecture.

## Authentication

All endpoints require JWT authentication with professor role verification. Authentication is handled via Supabase Auth with the existing middleware.

```typescript
// Required headers
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## Endpoints

### POST /api/aulas/abrir

**Purpose:** Open a new class session for attendance marking
**Authentication:** Required (Professor role)
**Parameters:**
```typescript
{
  turma_id: string;
  disciplina?: string;
  observacoes?: string;
}
```
**Response:**
```typescript
{
  success: boolean;
  data: {
    aula_id: string;
    turma_id: string;
    professor_id: string;
    status: 'aberta';
    aberta_em: string; // ISO timestamp
    pode_marcar_frequencia: boolean;
  }
}
```
**Errors:**
- 401: Unauthorized (invalid token or not professor)
- 403: Forbidden (professor not assigned to this class)
- 409: Conflict (class session already open)
- 422: Validation error (invalid turma_id)

### POST /api/aulas/fechar

**Purpose:** Close an active class session and initiate lock timer
**Authentication:** Required (Professor role)
**Parameters:**
```typescript
{
  aula_id: string;
  observacoes_finais?: string;
}
```
**Response:**
```typescript
{
  success: boolean;
  data: {
    aula_id: string;
    status: 'fechada';
    fechada_em: string; // ISO timestamp
    sera_travada_em: string; // ISO timestamp (fechada_em + lock_timeout)
    pode_alterar_ate: string; // User-friendly time remaining
  }
}
```
**Errors:**
- 401: Unauthorized
- 404: Class session not found
- 409: Session already closed
- 422: Validation error

### GET /api/aulas/ativas

**Purpose:** Get all active class sessions for the authenticated professor
**Authentication:** Required (Professor role)
**Parameters:** None (professor_id from JWT)
**Response:**
```typescript
{
  success: boolean;
  data: {
    aulas_ativas: Array<{
      aula_id: string;
      turma: {
        id: string;
        nome: string;
        ano: string;
        total_alunos: number;
      };
      status: 'aberta' | 'fechada';
      aberta_em: string;
      fechada_em?: string;
      tempo_restante?: string; // null if locked
      pode_marcar_frequencia: boolean;
    }>;
  }
}
```
**Errors:**
- 401: Unauthorized

### GET /api/aulas/:aula_id/status

**Purpose:** Get detailed status and metadata for a specific class session
**Authentication:** Required (Professor role)
**Parameters:** aula_id (URL parameter)
**Response:**
```typescript
{
  success: boolean;
  data: {
    aula_id: string;
    turma: {
      id: string;
      nome: string;
      ano: string;
    };
    status: 'aberta' | 'fechada' | 'travada';
    aberta_em: string;
    fechada_em?: string;
    travada_em?: string;
    professor: {
      id: string;
      nome: string;
    };
    configuracao: {
      tempo_limite_minutos: number;
      pode_alterar: boolean;
    };
    estatisticas: {
      total_alunos: number;
      presencas_marcadas: number;
      faltas_marcadas: number;
      nao_marcados: number;
    };
  }
}
```
**Errors:**
- 401: Unauthorized
- 403: Access denied (not your session)
- 404: Session not found

### POST /api/frequencia/marcar

**Purpose:** Submit attendance marking for students in an active session
**Authentication:** Required (Professor role)
**Parameters:**
```typescript
{
  aula_id: string;
  frequencias: Array<{
    aluno_id: string;
    presente: boolean;
    observacoes?: string;
  }>;
}
```
**Response:**
```typescript
{
  success: boolean;
  data: {
    processados: number;
    sucessos: number;
    erros: Array<{
      aluno_id: string;
      erro: string;
    }>;
    resumo: {
      presentes: number;
      ausentes: number;
      total: number;
    };
  }
}
```
**Errors:**
- 401: Unauthorized
- 403: Session locked or not accessible
- 404: Session not found
- 422: Validation error (invalid aluno_id or session closed)

### GET /api/frequencia/sessao/:aula_id

**Purpose:** Get current attendance status for all students in a session
**Authentication:** Required (Professor role)
**Parameters:** aula_id (URL parameter)
**Response:**
```typescript
{
  success: boolean;
  data: {
    aula_id: string;
    pode_alterar: boolean;
    tempo_restante?: string;
    alunos: Array<{
      id: string;
      nome: string;
      numero_chamada: number;
      frequencia: {
        presente?: boolean; // null if not marked yet
        marcado_em?: string;
        observacoes?: string;
      };
      estatisticas: {
        percentual_presenca: number;
        total_faltas_mes: number;
        em_risco: boolean; // < 80% attendance
      };
    }>;
  }
}
```
**Errors:**
- 401: Unauthorized
- 403: Access denied
- 404: Session not found

### POST /api/frequencia/travar/:aula_id

**Purpose:** Manually lock attendance for a session (admin/emergency use)
**Authentication:** Required (Admin or Director role)
**Parameters:** aula_id (URL parameter)
**Response:**
```typescript
{
  success: boolean;
  data: {
    aula_id: string;
    status: 'travada';
    travada_em: string;
    travada_por: string; // user_id who locked it
    motivo: 'manual' | 'automatico';
  }
}
```
**Errors:**
- 401: Unauthorized
- 403: Insufficient permissions
- 404: Session not found
- 409: Already locked

## Real-time Features

### Server-Sent Events (SSE)

**Endpoint:** `/api/realtime/aula/:aula_id`
**Purpose:** Real-time updates for class session status and attendance changes
**Authentication:** Required (Professor role)

**Event Types:**
```typescript
// Session status changes
{
  type: 'session_status';
  data: {
    aula_id: string;
    status: 'aberta' | 'fechada' | 'travada';
    timestamp: string;
  }
}

// Attendance marking updates
{
  type: 'attendance_update';
  data: {
    aula_id: string;
    aluno_id: string;
    presente: boolean;
    marcado_por: string;
    timestamp: string;
  }
}

// Lock warning (5 minutes before auto-lock)
{
  type: 'lock_warning';
  data: {
    aula_id: string;
    tempo_restante_minutos: number;
    sera_travada_em: string;
  }
}

// Session locked
{
  type: 'session_locked';
  data: {
    aula_id: string;
    travada_em: string;
    motivo: 'automatico' | 'manual';
  }
}
```

## Error Handling

### Standard Error Response Format
```typescript
{
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}
```

### Common Error Codes
- `AUTH_REQUIRED`: Authentication required
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `SESSION_NOT_FOUND`: Class session doesn't exist
- `SESSION_LOCKED`: Cannot modify locked session
- `VALIDATION_ERROR`: Invalid request parameters
- `BUSINESS_RULE_VIOLATION`: Action violates business rules
- `RATE_LIMIT_EXCEEDED`: Too many requests

## Rate Limiting

- **Session operations**: 10 requests per minute per professor
- **Attendance marking**: 5 submissions per minute per session
- **Status queries**: 30 requests per minute per professor
- **Real-time connections**: 3 concurrent connections per professor

## Integration Notes

### Supabase Integration
- All endpoints use the existing Supabase client from `lib/supabase`
- RLS policies automatically filter data by school and user permissions
- Real-time subscriptions use Supabase's built-in WebSocket support
- Database operations follow the existing transaction patterns

### Next.js App Router
- All API routes are implemented in `app/api/` directory structure
- Middleware handles authentication and role verification
- TypeScript strict mode with generated types from Supabase
- Error boundaries and logging follow existing patterns

### Performance Considerations
- Attendance marking uses batch operations for multiple students
- Session status caching reduces database queries
- Real-time events are debounced to prevent spam
- Database indexes support all query patterns

### Security Features
- CSRF protection on all mutation endpoints
- Input sanitization and validation with Zod schemas
- Audit logging for all attendance modifications
- Rate limiting to prevent abuse
- School-based multi-tenancy through RLS

## Implementation Priority

1. **Phase 1 (Week 1)**: Core session management (abrir, fechar, status)
2. **Phase 2 (Week 2)**: Attendance marking and retrieval
3. **Phase 3 (Week 3)**: Real-time features and SSE
4. **Phase 4 (Week 4)**: Manual lock functionality and admin features

This API specification provides a complete foundation for the "Abrir Aula" workflow while maintaining compatibility with the existing gestao_fronteira architecture and Brazilian educational compliance requirements.