/**
 * Attendance Reopen - workflow for requesting and deciding session reopening.  Only titular teacher requests; only same-school director decides.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import {
  AttendanceAuthError,
  requireAttendanceActor,
} from './attendance-auth'
import {
  asAttendanceReopenClient,
  type AttendanceReopenRequestRow,
  type AttendanceReopenStatus,
} from './attendance-reopen-database'

export type { AttendanceReopenStatus }

export type AttendanceReopenRequest = AttendanceReopenRequestRow
type GeneratedAttendanceReopenRequest = Database['public']['Tables']['attendance_reopen_requests']['Row']

export interface RequestAttendanceReopenParams {
  session_id: string
  reason: string
}

export interface DecideAttendanceReopenParams {
  request_id: string
  decision: 'APROVADA' | 'REJEITADA'
  reason?: string
}

export type AttendanceReopenErrorCode =
  | 'SESSION_REQUIRED'
  | 'REASON_REQUIRED'
  | 'FORBIDDEN_ROLE'
  | 'SESSION_NOT_FOUND'
  | 'SESSION_NOT_OWNED'
  | 'SCHOOL_MISMATCH'
  | 'REQUEST_NOT_FOUND'
  | 'REQUEST_PENDING'
  | 'DECISION_INVALID'
  | 'DECISION_REASON_REQUIRED'
  | 'SESSION_NOT_CLOSED'
  | 'SESSION_STATE_CHANGED'
  | 'SESSION_ALREADY_OPEN'
  | 'REOPEN_FAILED'

export interface AttendanceReopenResult {
  success: boolean
  request?: AttendanceReopenRequest
  error?: string
  code?: AttendanceReopenErrorCode
}

type DatabaseErrorResult = {
  code: AttendanceReopenErrorCode
  error: string
}

const OPEN_SESSION_UNIQUE_CONSTRAINT = 'idx_sessoes_aula_open_turma_date'
const OPEN_SESSION_CONFLICT_MESSAGE =
  'Já existe uma sessão aberta para esta turma nesta data. Feche a sessão aberta antes de aprovar a reabertura.'

function mapDatabaseError(
  error: { code?: string; constraint?: string; message?: string } | null
): DatabaseErrorResult {
  const message = error?.message ?? 'Não foi possível processar a reabertura da chamada'
  const isOpenSessionConflict = error?.code === '23505'
    && (
      error.constraint === OPEN_SESSION_UNIQUE_CONSTRAINT
      || message.includes(OPEN_SESSION_UNIQUE_CONSTRAINT)
    )

  if (isOpenSessionConflict) {
    return {
      code: 'SESSION_ALREADY_OPEN',
      error: OPEN_SESSION_CONFLICT_MESSAGE,
    }
  }

  const knownCodes = [
    ['ATTENDANCE_REOPEN_REASON_REQUIRED', 'REASON_REQUIRED'],
    ['ATTENDANCE_REOPEN_DECISION_REASON_REQUIRED', 'DECISION_REASON_REQUIRED'],
    ['ATTENDANCE_REOPEN_ROLE_DENIED', 'FORBIDDEN_ROLE'],
    ['ATTENDANCE_REOPEN_AUDIT_ROLE_DENIED', 'FORBIDDEN_ROLE'],
    ['ATTENDANCE_REOPEN_SCHOOL_DENIED', 'SCHOOL_MISMATCH'],
    ['ATTENDANCE_REOPEN_AUDIT_SCHOOL_DENIED', 'SCHOOL_MISMATCH'],
    ['ATTENDANCE_REOPEN_SESSION_NOT_OWNED', 'SESSION_NOT_OWNED'],
    ['ATTENDANCE_REOPEN_SESSION_NOT_FOUND', 'SESSION_NOT_FOUND'],
    ['ATTENDANCE_REOPEN_REQUEST_NOT_FOUND', 'REQUEST_NOT_FOUND'],
    ['ATTENDANCE_REOPEN_PENDING', 'REQUEST_PENDING'],
    ['ATTENDANCE_REOPEN_ALREADY_DECIDED', 'SESSION_STATE_CHANGED'],
    ['ATTENDANCE_REOPEN_SESSION_STATE_CHANGED', 'SESSION_STATE_CHANGED'],
    ['ATTENDANCE_REOPEN_SESSION_NOT_CLOSED', 'SESSION_NOT_CLOSED'],
    ['ATTENDANCE_REOPEN_DECISION_INVALID', 'DECISION_INVALID'],
  ] satisfies ReadonlyArray<readonly [string, AttendanceReopenErrorCode]>

  const code = knownCodes.find(([prefix]) => message.includes(prefix))?.[1] ?? 'REOPEN_FAILED'
  return { code, error: message }
}

export interface AttendanceReopenService {
  getRequestForSession(sessionId: string): Promise<AttendanceReopenRequest | null>
  request(params: RequestAttendanceReopenParams): Promise<AttendanceReopenResult>
  decide(params: DecideAttendanceReopenParams): Promise<AttendanceReopenResult>
}

function requestValidationResult(
  params: RequestAttendanceReopenParams
): AttendanceReopenResult | null {
  if (!params?.session_id) {
    return { success: false, code: 'SESSION_REQUIRED', error: 'ID da sessão é obrigatório' }
  }
  if (!params.reason?.trim()) {
    return { success: false, code: 'REASON_REQUIRED', error: 'O motivo da reabertura é obrigatório' }
  }
  return null
}

function decisionValidationResult(
  params: DecideAttendanceReopenParams
): AttendanceReopenResult | null {
  if (!params?.request_id) {
    return { success: false, code: 'REQUEST_NOT_FOUND', error: 'ID da solicitação é obrigatório' }
  }
  if (params.decision !== 'APROVADA' && params.decision !== 'REJEITADA') {
    return { success: false, code: 'DECISION_INVALID', error: 'Decisão de reabertura inválida' }
  }
  if (params.decision === 'REJEITADA' && !params.reason?.trim()) {
    return {
      success: false,
      code: 'DECISION_REASON_REQUIRED',
      error: 'O motivo da rejeição é obrigatório',
    }
  }
  return null
}

async function requireReopenRole(
  supabase: SupabaseClient<Database>,
  role: 'professor' | 'diretor',
  message: string
): Promise<void> {
  const actor = await requireAttendanceActor(supabase)
  if (actor.tipo_usuario !== role) throw new AttendanceAuthError('FORBIDDEN_ROLE', message)
}

function toAttendanceReopenRequest(
  request: GeneratedAttendanceReopenRequest
): AttendanceReopenRequest {
  if (
    request.status !== 'PENDENTE'
    && request.status !== 'APROVADA'
    && request.status !== 'REJEITADA'
  ) {
    throw new Error('Status de reabertura inválido retornado pelo banco')
  }
  return { ...request, status: request.status }
}

export function createAttendanceReopenService(
  supabase: SupabaseClient<Database>
): AttendanceReopenService {
  const client = asAttendanceReopenClient(supabase)

  async function getRequestForSession(sessionId: string): Promise<AttendanceReopenRequest | null> {
    const { data, error } = await client
      .from('attendance_reopen_requests')
      .select('*')
      .eq('sessao_id', sessionId)
      .order('requested_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data ? toAttendanceReopenRequest(data) : null
  }

  async function request(
    params: RequestAttendanceReopenParams
  ): Promise<AttendanceReopenResult> {
    try {
      const validation = requestValidationResult(params)
      if (validation) return validation
      await requireReopenRole(supabase, 'professor', 'Apenas o professor da sessão pode solicitar a reabertura')

      const { data, error } = await client.rpc('request_attendance_reopen', {
        p_session_id: params.session_id,
        p_reason: params.reason.trim(),
      })
      if (error || !data) {
        return { success: false, ...mapDatabaseError(error) }
      }
      return { success: true, request: toAttendanceReopenRequest(data) }
    } catch (error) {
      if (error instanceof AttendanceAuthError) {
        return {
          success: false,
          code: error.code === 'FORBIDDEN_ROLE' ? 'FORBIDDEN_ROLE' : 'REOPEN_FAILED',
          error: error.message,
        }
      }
      return {
        success: false,
        code: 'REOPEN_FAILED',
        error: error instanceof Error ? error.message : 'Não foi possível solicitar a reabertura',
      }
    }
  }

  async function decide(
    params: DecideAttendanceReopenParams
  ): Promise<AttendanceReopenResult> {
    try {
      const validation = decisionValidationResult(params)
      if (validation) return validation
      await requireReopenRole(supabase, 'diretor', 'Apenas o diretor da escola pode decidir a reabertura')

      const { data, error } = await client.rpc('decide_attendance_reopen', {
        p_request_id: params.request_id,
        p_decision: params.decision,
        p_reason: params.reason?.trim() || undefined,
      })
      if (error || !data) {
        return { success: false, ...mapDatabaseError(error) }
      }
      return { success: true, request: toAttendanceReopenRequest(data) }
    } catch (error) {
      if (error instanceof AttendanceAuthError) {
        return {
          success: false,
          code: error.code === 'FORBIDDEN_ROLE' ? 'FORBIDDEN_ROLE' : 'REOPEN_FAILED',
          error: error.message,
        }
      }
      return {
        success: false,
        code: 'REOPEN_FAILED',
        error: error instanceof Error ? error.message : 'Não foi possível decidir a reabertura',
      }
    }
  }

  return { getRequestForSession, request, decide }
}
