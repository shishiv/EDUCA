/**
 * @module services/attendance-module
 * @see {@link createAttendanceModule} for the factory function
 * @see {@link AttendanceSessionModule} for the full operation interface
 */
/**
 * Canonical Attendance session module.
 *
 * This is the domain seam for the canonical attendance flow. Server actions,
 * HTTP handlers, and browser UI are adapters. The injected Supabase client is
 * the database adapter, while RLS and the attendance triggers remain the final
 * authorization and immutability seam.
 *
 * The module deliberately uses attendance-auth for the existing actor and
 * school rules. C03 consolidates the attendance session flow without changing
 * those authorization semantics.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { logger } from '@/lib/logger'
import {
  assertCanRecordAttendance,
  assertMatriculaInTurma,
  assertSessionReadAccess,
  assertSessionWriteAccess,
  assertTurmaReadAccess,
  assertTurmaWriteAccess,
  AttendanceAuthError,
  type AttendanceActor,
  requireAttendanceActor,
} from './attendance-auth'

export type AttendanceDatabase = Database['public']['Tables']
export type AttendanceSessionRow = AttendanceDatabase['sessoes_aula']['Row']
export type AttendanceSessionInsert = AttendanceDatabase['sessoes_aula']['Insert']
export type AttendanceRecordRow = AttendanceDatabase['frequencia']['Row']
export type AttendanceRecordInsert = AttendanceDatabase['frequencia']['Insert']
export type AttendanceTurmaRow = AttendanceDatabase['turmas']['Row']
export type AttendanceMatriculaRow = AttendanceDatabase['matriculas']['Row']

type AttendanceWriteContext =
  | {
    session: AttendanceSessionReadRow
    turma: Pick<AttendanceTurmaRow, 'id' | 'professor_id' | 'escola_id' | 'ativo'>
    error: null
  }
  | {
    session: null
    turma: null
    error: AttendanceAuthError
  }

export type CanonicalSessionStatus = 'PLANEJADA' | 'ABERTA' | 'FECHADA' | 'CANCELADA'
export type CanonicalAttendanceStatus = 'P' | 'F' | 'J' | 'A' | 'NAO_MARCADO'
export type AttendanceStatusInput =
  | CanonicalAttendanceStatus
  | 'presente'
  | 'falta'
  | 'ausente'
  | 'justificada'
  | 'atestado'
  | 'atestado_medico'
  | null

export type AttendanceSession = Omit<AttendanceSessionRow, 'status'> & {
  status: CanonicalSessionStatus
}

export type AttendanceSessionReadRow = Pick<
  AttendanceSessionRow,
  | 'id'
  | 'turma_id'
  | 'professor_id'
  | 'escola_id'
  | 'status'
  | 'data_aula'
  | 'travada_em'
  | 'fechada_em'
  | 'auto_fechamento_agendado'
  | 'created_at'
>

export interface OpenSessionParams {
  turma_id: string
  data_aula: string
  conteudo_programatico?: string
  /** Deprecated. The module derives the professor from the turma. */
  professor_id?: string
  /** Deprecated. The module derives the school from the turma. */
  escola_id?: string
}

export interface MarkAttendanceParams {
  sessao_id: string
  matricula_id: string
  status?: AttendanceStatusInput
  /** Deprecated. Use status. Kept for old callers and normalized here. */
  presente?: boolean
  justificativa?: string | null
  /** Optional compatibility check. The session date remains authoritative. */
  data_aula?: string
}

export interface BatchAttendanceRecord {
  matricula_id: string
  status: AttendanceStatusInput
  justificativa?: string | null
}

export interface MarkAttendanceBatchParams {
  sessao_id: string
  records: BatchAttendanceRecord[]
}

export interface CloseSessionParams {
  session_id: string
  observacoes?: string
}

export interface CheckLockStatusParams {
  sessionIdOrTurmaId: string
  date?: string
}

export interface OpenSessionResult {
  success: boolean
  session?: AttendanceSessionRow
  error?: string
  code?: string
}

export interface MarkAttendanceResult {
  success: boolean
  record?: AttendanceRecordRow
  /** Internal adapter metadata used to revalidate the class page. */
  turma_id?: string
  error?: string
  code?: string
}

export interface MarkAttendanceBatchResult {
  success: boolean
  processed_count: number
  /** Internal adapter metadata used to revalidate the class page. */
  turma_id?: string
  error?: string
  code?: string
}

export interface CloseSessionResult {
  success: boolean
  session?: AttendanceSessionRow
  error?: string
  code?: string
}

export interface CheckLockStatusResult {
  success: boolean
  session?: AttendanceSession | null
  isLocked: boolean
  lockReason?: 'manual_close' | 'auto_lock' | null
  error?: string
  code?: string
}

export interface ChamadaStudent {
  id: string
  nome: string
  matriculaId: string
  frequencia: number
}

export interface ChamadaAttendanceRecord {
  matricula_id: string
  status: CanonicalAttendanceStatus
  justificativa: string | null
}

type ChamadaRosterRow = {
  id: string
  aluno: { id: string; nome_completo: string } | null
}

type AttendanceFrequencyFact = Pick<
  AttendanceRecordRow,
  'matricula_id' | 'sessao_id' | 'status_presenca' | 'presente'
>

function monthlyAttendanceTotals(records: AttendanceFrequencyFact[]): Map<string, { total: number; present: number }> {
  const totals = new Map<string, { total: number; present: number }>()
  for (const record of records) {
    const status = record.sessao_id
      ? normalizeAttendanceStatus(record.status_presenca, record.presente)
      : null
    if (!status || status === 'NAO_MARCADO') continue
    const current = totals.get(record.matricula_id) ?? { total: 0, present: 0 }
    current.total += 1
    if (presenceFromStatus(status)) current.present += 1
    totals.set(record.matricula_id, current)
  }
  return totals
}

function chamadaStudentsFromRoster(
  roster: ChamadaRosterRow[],
  totals: Map<string, { total: number; present: number }>
): ChamadaStudent[] {
  return roster
    .flatMap(matricula => {
      if (!matricula.aluno) return []
      const total = totals.get(matricula.id)
      return [{
        id: matricula.aluno.id,
        nome: matricula.aluno.nome_completo,
        matriculaId: matricula.id,
        frequencia: total && total.total > 0 ? Math.round((total.present / total.total) * 100) : 0,
      }]
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

export class AttendanceSessionReadError extends Error {
  readonly code: 'TURMA_NOT_FOUND' | 'SESSION_NOT_FOUND' | 'SESSION_STATUS_INVALID' | 'ATTENDANCE_READ_FAILED'

  constructor(
    code: AttendanceSessionReadError['code'],
    message: string
  ) {
    super(message)
    this.name = 'AttendanceSessionReadError'
    this.code = code
  }
}

export interface AttendanceSessionModuleOptions {
  /** Injectable clock for deterministic module tests. */
  now?: () => Date
}

export interface AttendanceSessionModule {
  /** Open one current-date session for an authorized turma. */
  openSession(params: OpenSessionParams): Promise<OpenSessionResult>
  /** Mark one enrollment through the same canonical write preparation as batch. */
  markAttendance(params: MarkAttendanceParams): Promise<MarkAttendanceResult>
  /** Validate all enrollments, then upsert one canonical batch. */
  markAttendanceBatch(params: MarkAttendanceBatchParams): Promise<MarkAttendanceBatchResult>
  /** Close an open session inside its database-authorized editing window. */
  closeSession(params: CloseSessionParams): Promise<CloseSessionResult>
  /** Read canonical lock state by session ID or turma plus date. */
  checkLockStatus(params: CheckLockStatusParams): Promise<CheckLockStatusResult>
  /** Read the sessions and active roster needed by the canonical chamada. */
  getSessionsForChamada(
    turmaId: string,
    date: string,
    requestedSessionId?: string | null
  ): Promise<AttendanceSession[]>
  /** Read active students and canonical historical frequency facts for chamada. */
  getStudentsForChamada(turmaId: string): Promise<ChamadaStudent[]>
  /** Read canonical frequency records for one authorized session. */
  getAttendanceForSession(sessionId: string): Promise<Map<string, ChamadaAttendanceRecord>>
}

const SAO_PAULO_TIME_ZONE = 'America/Sao_Paulo'

/** Return the canonical session status used by the database contract. */
export function normalizeSessionStatus(value: string | null | undefined): CanonicalSessionStatus | null {
  switch (value?.trim().toUpperCase()) {
    case 'PLANEJADA':
      return 'PLANEJADA'
    case 'ABERTA':
    case 'EM_ANDAMENTO':
      return 'ABERTA'
    case 'FECHADA':
    case 'TRAVADA':
      return 'FECHADA'
    case 'CANCELADA':
      return 'CANCELADA'
    default:
      return null
  }
}

/** Return the canonical status used by public.frequencia. */
export function normalizeAttendanceStatus(
  value: string | null | undefined,
  presente?: boolean | null
): CanonicalAttendanceStatus | null {
  if (value === null || value === undefined) return presente === true ? 'P' : presente === false ? 'F' : null
  const statuses = new Map<string, CanonicalAttendanceStatus>([
    ['', 'NAO_MARCADO'], ['nao_marcado', 'NAO_MARCADO'],
    ['p', 'P'], ['presente', 'P'], ['f', 'F'], ['falta', 'F'], ['ausente', 'F'],
    ['j', 'J'], ['justificada', 'J'], ['a', 'A'], ['atestado', 'A'], ['atestado_medico', 'A'],
  ])
  return statuses.get(value.trim().toLowerCase()) ?? null
}

/** Convert a public status to its boolean presence fact. */
export function presenceFromStatus(status: CanonicalAttendanceStatus): boolean {
  return status === 'P' || status === 'J' || status === 'A'
}

/** Validate and preserve an ISO calendar date without timezone conversion. */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

/** Return the current calendar date in the database's São Paulo contract. */
export function getSaoPauloDate(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SAO_PAULO_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const part = (type: string) => parts.find(value => value.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

export interface CanonicalSessionLockInfo {
  isLocked: boolean
  lockReason: 'time_cutoff' | 'session_closed' | 'past_date' | 'date_not_current' | 'correction_expired' | null
  canEdit: boolean
  message: string
  timeUntilLockMinutes: number | null
}

function closedSessionLockInfo(
  sessionStatus: string | undefined,
  status: CanonicalSessionStatus | null
): CanonicalSessionLockInfo | null {
  if (
    (sessionStatus !== undefined && sessionStatus !== null && !status)
    || status === 'FECHADA'
    || status === 'CANCELADA'
    || status === 'PLANEJADA'
  ) {
    return {
      isLocked: true,
      lockReason: 'session_closed',
      canEdit: false,
      message: 'Sessão finalizada. Frequência não pode ser modificada.',
      timeUntilLockMinutes: null,
    }
  }
  return null
}

function nonCurrentDateLockInfo(
  sessionDate: string | undefined,
  today: string
): CanonicalSessionLockInfo | null {
  if (!sessionDate || sessionDate === today) return null
  return {
    isLocked: true,
    lockReason: sessionDate < today ? 'past_date' : 'date_not_current',
    canEdit: false,
    message: sessionDate < today
      ? 'Data passada. Frequência bloqueada para garantir integridade dos registros.'
      : 'A frequência só pode ser registrada na data atual de São Paulo.',
    timeUntilLockMinutes: null,
  }
}

function timeLockInfo(currentTime: Date, scheduledCutoffAt?: string | null): CanonicalSessionLockInfo {
  if (!scheduledCutoffAt) {
    return { isLocked: false, lockReason: null, canEdit: true, message: '', timeUntilLockMinutes: null }
  }
  const remaining = Date.parse(scheduledCutoffAt) - currentTime.getTime()
  if (!Number.isFinite(remaining) || remaining <= 0) {
    return {
      isLocked: true,
      lockReason: 'time_cutoff',
      canEdit: false,
      message: 'O prazo de edição desta sessão encerrou. Frequência bloqueada.',
      timeUntilLockMinutes: 0,
    }
  }
  const timeUntilLockMinutes = Math.ceil(remaining / 60000)
  return {
    isLocked: false,
    lockReason: null,
    canEdit: true,
    message: timeUntilLockMinutes <= 60 ? `Atenção: Bloqueio automático em ${formatLockTime(timeUntilLockMinutes)}` : '',
    timeUntilLockMinutes,
  }
}

/**
 * Normalize the client lock projection from the same session/date contract as
 * the server module. Database RPC and triggers remain the final write check.
 */
export function getCanonicalSessionLockInfo(
  sessionDate?: string,
  sessionStatus?: string,
  currentTime: Date = new Date(),
  correctionDeadlineAt?: string | null,
  scheduledCutoffAt?: string | null
): CanonicalSessionLockInfo {
  const status = normalizeSessionStatus(sessionStatus)
  const closedLock = closedSessionLockInfo(sessionStatus, status)
  if (closedLock) return closedLock
  if (correctionDeadlineAt) return correctionWindowLockInfo(correctionDeadlineAt, currentTime)
  const dateLock = nonCurrentDateLockInfo(sessionDate, getSaoPauloDate(currentTime))
  return dateLock ?? timeLockInfo(currentTime, scheduledCutoffAt)
}

function correctionWindowLockInfo(deadline: string, currentTime: Date): CanonicalSessionLockInfo {
  const remaining = new Date(deadline).getTime() - currentTime.getTime()
  const canEdit = Number.isFinite(remaining) && remaining > 0
  return {
    isLocked: !canEdit,
    lockReason: canEdit ? null : 'correction_expired',
    canEdit,
    message: canEdit ? 'Janela de correção autorizada pelo diretor.' : 'A janela de correção encerrou. Frequência bloqueada.',
    timeUntilLockMinutes: canEdit ? Math.ceil(remaining / 60000) : 0,
  }
}

function formatLockTime(minutes: number): string {
  if (minutes <= 0) return 'Bloqueado'
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}min`
}

function firstDayOfSaoPauloMonth(date: string): string {
  const [year, month] = date.split('-')
  return `${year}-${month}-01`
}

function normalizedSessionRow(row: AttendanceSessionRow): AttendanceSession {
  const status = normalizeSessionStatus(row.status)
  if (!status) {
    throw new AttendanceSessionReadError(
      'SESSION_STATUS_INVALID',
      `Status de sessão inválido: ${row.status}`
    )
  }
  return { ...row, status }
}

function normalizeWriteStatus(
  status: AttendanceStatusInput | undefined,
  presente?: boolean | null
): CanonicalAttendanceStatus | 'INVALID' {
  if (status === null) return 'NAO_MARCADO'
  if (status === undefined) {
    if (presente === undefined || presente === null) return 'INVALID'
    return presente ? 'P' : 'F'
  }
  return normalizeAttendanceStatus(status) ?? 'INVALID'
}

function statusFromMarkParams(
  params: MarkAttendanceParams
): CanonicalAttendanceStatus | 'INVALID' {
  return normalizeWriteStatus(params.status, params.presente)
}

function validateOpenSessionInput(
  params: OpenSessionParams | null | undefined,
  now: () => Date
): { content: string } | { result: OpenSessionResult } {
  if (!params || !params.turma_id) {
    return { result: { success: false, code: 'TURMA_REQUIRED', error: 'ID da turma é obrigatório' } }
  }
  if (!isIsoDate(params.data_aula)) {
    return { result: { success: false, code: 'DATE_INVALID', error: 'Data da aula inválida' } }
  }
  if (!isCurrentSaoPauloDate(params.data_aula, now())) {
    return {
      result: {
        success: false,
        code: 'DATE_NOT_CURRENT',
        error: 'A chamada só pode ser aberta na data atual de São Paulo',
      },
    }
  }
  const content = params.conteudo_programatico?.trim() || 'Chamada'
  if (content.length > 500) {
    return { result: { success: false, code: 'CONTENT_TOO_LONG', error: 'Conteúdo da aula muito longo' } }
  }
  return { content }
}

function openingFailure(error: { code: string; message: string } | null): OpenSessionResult {
  if (error?.code === '23505') {
    return { success: false, code: 'SESSION_ALREADY_OPEN', error: 'Já existe uma chamada aberta para esta turma nesta data' }
  }
  if (error?.message.startsWith('ATTENDANCE_OPEN_CUTOFF_PASSED:')) {
    return { success: false, code: 'SESSION_CUTOFF_PASSED', error: 'O prazo configurado pela escola para abrir a chamada encerrou.' }
  }
  if (error?.message.startsWith('ATTENDANCE_OPEN_DATE_NOT_CURRENT:')) {
    return { success: false, code: 'DATE_NOT_CURRENT', error: 'A chamada só pode ser aberta na data atual de São Paulo.' }
  }
  return { success: false, code: 'SESSION_OPEN_FAILED', error: error?.message || 'Não foi possível abrir a chamada' }
}

function validateMarkAttendanceInput(
  params: MarkAttendanceParams | null | undefined
): { status: CanonicalAttendanceStatus } | { result: MarkAttendanceResult } {
  if (!params || !params.sessao_id || !params.matricula_id) {
    return { result: { success: false, code: 'INPUT_REQUIRED', error: 'Sessão e matrícula são obrigatórias' } }
  }

  const status = statusFromMarkParams(params)
  if (status === 'INVALID') {
    return { result: { success: false, code: 'STATUS_REQUIRED', error: 'Status da presença é obrigatório' } }
  }
  if (status === 'J' && !params.justificativa?.trim()) {
    return {
      result: {
        success: false,
        code: 'JUSTIFICATION_REQUIRED',
        error: 'A presença justificada exige um motivo',
      },
    }
  }
  if (params.data_aula !== undefined && !isIsoDate(params.data_aula)) {
    return { result: { success: false, code: 'DATE_INVALID', error: 'Data da frequência inválida' } }
  }
  return { status }
}

type NormalizedBatchAttendanceRecord = {
  matricula_id: string
  status: CanonicalAttendanceStatus
  justificativa?: string | null
}

function validateBatchRecord(
  record: BatchAttendanceRecord | null | undefined
): NormalizedBatchAttendanceRecord | MarkAttendanceBatchResult {
  if (!record?.matricula_id) {
    return {
      success: false,
      processed_count: 0,
      code: 'STATUS_INVALID',
      error: 'Status de presença inválido',
    }
  }
  const status = normalizeWriteStatus(record.status)
  if (status === 'INVALID') {
    return {
      success: false,
      processed_count: 0,
      code: 'STATUS_INVALID',
      error: 'Status de presença inválido',
    }
  }
  if (status === 'J' && !record.justificativa?.trim()) {
    return {
      success: false,
      processed_count: 0,
      code: 'JUSTIFICATION_REQUIRED',
      error: 'A presença justificada exige um motivo',
    }
  }
  return { matricula_id: record.matricula_id, status, justificativa: record.justificativa }
}

function isBatchValidationFailure(
  result: NormalizedBatchAttendanceRecord | MarkAttendanceBatchResult
): result is MarkAttendanceBatchResult {
  return 'success' in result
}

function validateBatchAttendanceInput(
  params: MarkAttendanceBatchParams | null | undefined
): { records: NormalizedBatchAttendanceRecord[] } | { result: MarkAttendanceBatchResult } {
  if (!params || !params.sessao_id || !Array.isArray(params.records) || params.records.length === 0) {
    return {
      result: {
        success: false,
        processed_count: 0,
        code: 'INPUT_REQUIRED',
        error: 'Sessão e pelo menos uma matrícula são obrigatórias',
      },
    }
  }

  const records: NormalizedBatchAttendanceRecord[] = []
  for (const record of params.records) {
    const validated = validateBatchRecord(record)
    if (isBatchValidationFailure(validated)) return { result: validated }
    records.push(validated)
  }

  const matriculaIds = records.map(record => record.matricula_id)
  if (new Set(matriculaIds).size !== matriculaIds.length) {
    return {
      result: {
        success: false,
        processed_count: 0,
        code: 'DUPLICATE_ENROLLMENT',
        error: 'Cada matrícula pode aparecer uma vez por lote',
      },
    }
  }
  return { records }
}

function prepareAttendanceInsert(
  session: AttendanceSessionReadRow,
  record: NormalizedBatchAttendanceRecord,
  actorId: string,
  timestamp: string
): AttendanceRecordInsert {
  return {
    sessao_id: session.id,
    matricula_id: record.matricula_id,
    data_aula: session.data_aula,
    status_presenca: record.status,
    presente: presenceFromStatus(record.status),
    justificativa: record.status === 'J' || record.status === 'A'
      ? record.justificativa?.trim() || null
      : null,
    professor_id: session.professor_id,
    marcado_por: actorId,
    marcado_em: timestamp,
  }
}

function isCurrentSaoPauloDate(dateAula: string, now: Date): boolean {
  return dateAula === getSaoPauloDate(now)
}

function lockReasonForSession(
  session: AttendanceSessionReadRow
): 'manual_close' | 'auto_lock' | null {
  const rawStatus = session.status.trim().toUpperCase()
  const status = normalizeSessionStatus(session.status)
  if (rawStatus === 'TRAVADA' || session.travada_em) {
    return 'auto_lock'
  }
  if (status === 'FECHADA' || status === 'CANCELADA' || session.fechada_em) {
    return 'manual_close'
  }
  if (status !== 'ABERTA') return 'auto_lock'
  return null
}

function invalidLockStatusInput(params: CheckLockStatusParams): CheckLockStatusResult | null {
  if (!params || !params.sessionIdOrTurmaId) {
    return {
      success: false,
      isLocked: false,
      code: 'INPUT_REQUIRED',
      error: 'ID da sessão ou turma é obrigatório',
    }
  }

  if (params.date && !isIsoDate(params.date)) {
    return {
      success: false,
      isLocked: false,
      code: 'DATE_INVALID',
      error: 'Data da aula inválida',
    }
  }
  return null
}

export function createAttendanceModule(
  supabase: SupabaseClient<Database>,
  options: AttendanceSessionModuleOptions = {}
): AttendanceSessionModule {
  const now = options.now ?? (() => new Date())

  async function loadWriteContext(sessionId: string): Promise<AttendanceWriteContext> {
    const { data: session, error: sessionError } = await supabase
      .from('sessoes_aula')
      .select('id, turma_id, professor_id, escola_id, status, data_aula, travada_em, fechada_em, auto_fechamento_agendado, created_at')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return { session: null, turma: null, error: new AttendanceAuthError('SESSION_NOT_FOUND', 'Sessão de aula não encontrada') }
    }

    const { data: turma, error: turmaError } = await supabase
      .from('turmas')
      .select('id, professor_id, escola_id, ativo')
      .eq('id', session.turma_id)
      .single()

    if (turmaError || !turma) {
      return { session: null, turma: null, error: new AttendanceAuthError('TURMA_NOT_FOUND', 'Turma da sessão não encontrada') }
    }

    return { session, turma, error: null }
  }

  async function checkEditable(
    session: AttendanceSessionReadRow
  ): Promise<{ editable: true } | { editable: false; code: string; error: string }> {
    const status = normalizeSessionStatus(session.status)
    if (!status || status !== 'ABERTA') {
      return {
        editable: false,
        code: 'SESSION_CLOSED',
        error: 'A sessão está fechada ou bloqueada e não aceita alterações',
      }
    }

    if (session.travada_em || session.fechada_em) {
      return {
        editable: false,
        code: 'SESSION_CLOSED',
        error: 'A sessão está fechada ou bloqueada e não aceita alterações',
      }
    }

    // The database evaluates both the ordinary cutoff and the captured
    // correction window. A local date check cannot reject an approved window.
    const { data: isEditable, error } = await supabase.rpc(
      'is_session_editable',
      { session_id: session.id }
    )

    if (error) {
      return {
        editable: false,
        code: 'SESSION_LOCK_CHECK_FAILED',
        error: `Erro ao verificar o fechamento da sessão: ${error.message}`,
      }
    }

    if (isEditable !== true) {
      if (!isCurrentSaoPauloDate(session.data_aula, now())) {
        return {
          editable: false,
          code: 'SESSION_DATE_NOT_CURRENT',
          error: 'A sessão está fora do prazo de edição autorizado',
        }
      }
      return {
        editable: false,
        code: 'SESSION_CLOSED',
        error: 'A sessão está fechada ou bloqueada e não aceita alterações',
      }
    }

    return { editable: true }
  }

  async function existingOpenSessionFailure(turmaId: string, dateAula: string): Promise<OpenSessionResult | null> {
    const { data: existingSession, error: existingError } = await supabase
      .from('sessoes_aula')
      .select('id, status, data_aula')
      .eq('turma_id', turmaId)
      .eq('data_aula', dateAula)
      .in('status', ['PLANEJADA', 'ABERTA', 'planejada', 'aberta'])
      .limit(1)
      .maybeSingle()

    if (existingError && existingError.code !== 'PGRST116') {
      return {
        success: false,
        code: 'SESSION_LOOKUP_FAILED',
        error: `Erro ao verificar chamada existente: ${existingError.message}`,
      }
    }

    if (existingSession) {
      return {
        success: false,
        code: 'SESSION_ALREADY_OPEN',
        error: 'Já existe uma chamada aberta para esta turma nesta data',
      }
    }
      return null
  }

  async function insertOpenSession(sessionInsert: AttendanceSessionInsert): Promise<OpenSessionResult> {
    const { data: session, error: insertError } = await supabase
      .from('sessoes_aula')
      .insert(sessionInsert)
      .select()
      .single()

    if (insertError || !session) {
      logger.error('ATTENDANCE_SESSION_OPEN_FAILED', insertError ?? new Error('Sessão não retornada'), {
        metadata: { turmaId: sessionInsert.turma_id, date: sessionInsert.data_aula },
      })

      return openingFailure(insertError)
    }

    return { success: true, session: normalizedSessionRow(session) }
  }

  async function openSession(params: OpenSessionParams): Promise<OpenSessionResult> {
    try {
      const input = validateOpenSessionInput(params, now)
      if ('result' in input) return input.result

      const actor = await requireAttendanceActor(supabase)
      assertCanRecordAttendance(actor)

      const { data: turma } = await supabase
        .from('turmas')
        .select('id, escola_id, professor_id, ativo')
        .eq('id', params.turma_id)
        .single()

      if (!turma) {
        return { success: false, code: 'TURMA_NOT_FOUND', error: 'Turma não encontrada' }
      }

      assertTurmaWriteAccess(actor, turma)

      if (!turma.professor_id) {
        return {
          success: false,
          code: 'TURMA_WITHOUT_PROFESSOR',
          error: 'A turma não possui professor titular para abrir a chamada',
        }
      }

      const existingFailure = await existingOpenSessionFailure(turma.id, params.data_aula)
      if (existingFailure) return existingFailure

      const sessionInsert: AttendanceSessionInsert = {
        turma_id: turma.id,
        escola_id: turma.escola_id,
        professor_id: turma.professor_id,
        data_aula: params.data_aula,
        status: 'ABERTA',
        conteudo_programatico: input.content,
      }

      return await insertOpenSession(sessionInsert)
    } catch (error) {
      if (error instanceof AttendanceAuthError) {
        return { success: false, code: error.code, error: error.message }
      }

      const failure = error instanceof Error ? error : new Error('Erro desconhecido')
      logger.error('ATTENDANCE_SESSION_OPEN_UNEXPECTED', failure, {
        metadata: { turmaId: params?.turma_id, date: params?.data_aula },
      })

      return {
        success: false,
        code: 'SESSION_OPEN_FAILED',
        error: failure.message,
      }
    }
  }

  async function markSessionAttendance(
    session: AttendanceSessionReadRow,
    params: MarkAttendanceParams,
    status: CanonicalAttendanceStatus,
    actorId: string
  ): Promise<MarkAttendanceResult> {
    const { data: matricula } = await supabase
      .from('matriculas')
      .select('id, turma_id, situacao')
      .eq('id', params.matricula_id)
      .single()

    if (!matricula) {
      return { success: false, code: 'MATRICULA_NOT_FOUND', error: 'Matrícula não encontrada' }
    }

    assertMatriculaInTurma(matricula, session.turma_id)

    if (params.data_aula && params.data_aula !== session.data_aula) {
      return {
        success: false,
        code: 'DATA_MISMATCH',
        error: 'A data da frequência deve ser a data da sessão de aula',
      }
    }

    const editable = await checkEditable(session)
    if (!editable.editable) {
      return { success: false, code: editable.code, error: editable.error }
    }

    const timestamp = now().toISOString()
    const attendanceInsert = prepareAttendanceInsert(session, {
      matricula_id: matricula.id,
      status: status,
      justificativa: params.justificativa,
    }, actorId, timestamp)

    const { data: attendanceRecord, error: upsertError } = await supabase
      .from('frequencia')
      .upsert(attendanceInsert, { onConflict: 'sessao_id,matricula_id' })
      .select()
      .single()

    if (upsertError || !attendanceRecord) {
      logger.error('ATTENDANCE_RECORD_WRITE_FAILED', upsertError ?? new Error('Registro não retornado'), {
        metadata: { sessionId: session.id, matriculaId: matricula.id },
      })
      return {
        success: false,
        code: 'ATTENDANCE_WRITE_FAILED',
        error: upsertError?.message || 'Não foi possível salvar a frequência',
      }
    }

    return {
      success: true,
      record: attendanceRecord,
      turma_id: session.turma_id,
    }
  }

  async function markAttendance(params: MarkAttendanceParams): Promise<MarkAttendanceResult> {
    try {
      const input = validateMarkAttendanceInput(params)
      if ('result' in input) return input.result

      const actor = await requireAttendanceActor(supabase)
      assertCanRecordAttendance(actor)
      const context = await loadWriteContext(params.sessao_id)
      if (context.error) throw context.error

      const { session, turma } = context
      assertSessionWriteAccess(actor, session, turma)

      return await markSessionAttendance(session, params, input.status, actor.userId)
    } catch (error) {
      if (error instanceof AttendanceAuthError) {
        return { success: false, code: error.code, error: error.message }
      }

      logger.error('ATTENDANCE_RECORD_WRITE_UNEXPECTED', error instanceof Error ? error : new Error('Erro desconhecido'), {
        metadata: { sessionId: params?.sessao_id, matriculaId: params?.matricula_id },
      })

      return {
        success: false,
        code: 'ATTENDANCE_WRITE_FAILED',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }
    }
  }

  async function writeAttendanceBatch(
    session: AttendanceSessionReadRow,
    records: NormalizedBatchAttendanceRecord[],
    actorId: string
  ): Promise<MarkAttendanceBatchResult> {
    const timestamp = now().toISOString()
    const upsertRecords: AttendanceRecordInsert[] = []

    for (const record of records) {
      const { data: matricula } = await supabase
        .from('matriculas')
        .select('id, turma_id, situacao')
        .eq('id', record.matricula_id)
        .single()

      if (!matricula) {
        return {
          success: false,
          processed_count: 0,
          code: 'MATRICULA_NOT_FOUND',
          error: 'Uma matrícula da chamada não foi encontrada',
        }
      }

      assertMatriculaInTurma(matricula, session.turma_id)
      upsertRecords.push(prepareAttendanceInsert(
        session,
        { ...record, matricula_id: matricula.id },
        actorId,
        timestamp
      ))
    }

    const { error: upsertError } = await supabase
      .from('frequencia')
      .upsert(upsertRecords, { onConflict: 'sessao_id,matricula_id' })

    if (upsertError) {
      logger.error('ATTENDANCE_BATCH_WRITE_FAILED', upsertError, {
        metadata: { sessionId: session.id, recordCount: upsertRecords.length },
      })
      return {
        success: false,
        processed_count: 0,
        code: 'ATTENDANCE_WRITE_FAILED',
        error: upsertError.message,
      }
    }

    return {
      success: true,
      processed_count: upsertRecords.length,
      turma_id: session.turma_id,
    }
  }

  async function markAttendanceBatch(
    params: MarkAttendanceBatchParams
  ): Promise<MarkAttendanceBatchResult> {
    try {
      const input = validateBatchAttendanceInput(params)
      if ('result' in input) return input.result

      const actor = await requireAttendanceActor(supabase)
      assertCanRecordAttendance(actor)
      const context = await loadWriteContext(params.sessao_id)
      if (context.error) throw context.error

      const { session, turma } = context
      assertSessionWriteAccess(actor, session, turma)

      const editable = await checkEditable(session)
      if (!editable.editable) {
        return {
          success: false,
          processed_count: 0,
          code: editable.code,
          error: editable.error,
        }
      }

      return await writeAttendanceBatch(session, input.records, actor.userId)
    } catch (error) {
      if (error instanceof AttendanceAuthError) {
        return {
          success: false,
          processed_count: 0,
          code: error.code,
          error: error.message,
        }
      }

      const failure = error instanceof Error ? error : new Error('Erro desconhecido')
      logger.error('ATTENDANCE_BATCH_WRITE_UNEXPECTED', failure, {
        metadata: {
          sessionId: params?.sessao_id,
          recordCount: Array.isArray(params?.records) ? params.records.length : 0,
        },
      })

      return {
        success: false,
        processed_count: 0,
        code: 'ATTENDANCE_WRITE_FAILED',
        error: failure.message,
      }
    }
  }

  async function closeEditableSession(
    session: AttendanceSessionReadRow,
    observacoes: string | undefined
  ): Promise<CloseSessionResult> {
    const editable = await checkEditable(session)
    if (!editable.editable) {
      return {
        success: false,
        code: editable.code,
        error: editable.code === 'SESSION_DATE_NOT_CURRENT'
          ? editable.error
          : 'A sessão já está fechada ou bloqueada e não pode ser alterada',
      }
    }
    const timestamp = now().toISOString()
    const { data: closedSession, error: updateError } = await supabase
      .from('sessoes_aula')
      .update({
        status: 'FECHADA',
        fechada_em: timestamp,
        observacoes_fechamento: observacoes?.trim() || null,
        updated_at: timestamp,
      })
      .eq('id', session.id)
      .select()
      .single()
    if (updateError || !closedSession) {
      logger.error('ATTENDANCE_SESSION_CLOSE_FAILED', updateError ?? new Error('Sessão não retornada'), {
        metadata: { sessionId: session.id },
      })
      return {
        success: false,
        code: 'SESSION_CLOSE_FAILED',
        error: updateError?.message || 'Não foi possível fechar a chamada',
      }
    }
    return { success: true, session: normalizedSessionRow(closedSession) }
  }

  async function closeSession(params: CloseSessionParams): Promise<CloseSessionResult> {
    try {
      if (!params || !params.session_id) {
        return { success: false, code: 'SESSION_REQUIRED', error: 'ID da sessão é obrigatório' }
      }

      const actor = await requireAttendanceActor(supabase)
      assertCanRecordAttendance(actor)
      const context = await loadWriteContext(params.session_id)
      if (context.error) throw context.error

      const { session, turma } = context
      assertSessionWriteAccess(actor, session, turma)

      return closeEditableSession(session, params.observacoes)
    } catch (error) {
      if (error instanceof AttendanceAuthError) {
        return { success: false, code: error.code, error: error.message }
      }

      logger.error('ATTENDANCE_SESSION_CLOSE_UNEXPECTED', error instanceof Error ? error : new Error('Erro desconhecido'), {
        metadata: { sessionId: params?.session_id },
      })

      return {
        success: false,
        code: 'SESSION_CLOSE_FAILED',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }
    }
  }

  async function sessionLockStatus(session: AttendanceSessionRow): Promise<CheckLockStatusResult> {
    const sessionView = normalizedSessionRow(session)
    const reason = lockReasonForSession(session)
    const { data: isEditable, error: editableError } = await supabase.rpc(
      'is_session_editable',
      { session_id: session.id }
    )

    if (editableError) {
      return {
        success: false,
        session: sessionView,
        isLocked: false,
        lockReason: null,
        code: 'SESSION_LOCK_CHECK_FAILED',
        error: `Erro ao verificar o fechamento da sessão: ${editableError.message}`,
      }
    }

    const isLocked = reason !== null || isEditable !== true
    return {
      success: true,
      session: sessionView,
      isLocked,
      lockReason: reason ?? (isLocked ? 'auto_lock' : null),
    }
  }

  function absentLockStatus(params: CheckLockStatusParams): CheckLockStatusResult {
    // A class/date lookup is empty only after that class was authorized above.
    if (params.date) return { success: true, session: null, isLocked: false, lockReason: null }
    return {
      success: false,
      isLocked: true,
      code: 'SESSION_NOT_FOUND',
      error: 'Sessão de aula não encontrada',
    }
  }

  async function readAuthorizedLockStatus(
    actor: AttendanceActor,
    params: CheckLockStatusParams
  ): Promise<CheckLockStatusResult> {
    let query = supabase.from('sessoes_aula').select('*')

    if (params.date) {
      const { data: turma } = await supabase
        .from('turmas')
        .select('id, escola_id, professor_id, ativo')
        .eq('id', params.sessionIdOrTurmaId)
        .single()

      if (!turma) {
        return { success: false, isLocked: true, code: 'TURMA_NOT_FOUND', error: 'Turma não encontrada' }
      }

      assertTurmaReadAccess(actor, turma)
      query = query
        .eq('turma_id', params.sessionIdOrTurmaId)
        .eq('data_aula', params.date)
        .order('created_at', { ascending: false })
        .limit(1)
    } else {
      query = query.eq('id', params.sessionIdOrTurmaId)
    }

    const { data: session, error: queryError } = await query.maybeSingle()
    if (queryError && queryError.code !== 'PGRST116') {
      return {
        success: false,
        isLocked: false,
        code: 'SESSION_READ_FAILED',
        error: `Erro ao buscar sessão: ${queryError.message}`,
      }
    }

    if (!session) return absentLockStatus(params)

    if (!params.date) {
      assertSessionReadAccess(actor, session)
    }

    return await sessionLockStatus(session)
  }

  async function checkLockStatus(params: CheckLockStatusParams): Promise<CheckLockStatusResult> {
    try {
      const invalid = invalidLockStatusInput(params)
      if (invalid) return invalid

      const actor = await requireAttendanceActor(supabase)
      return await readAuthorizedLockStatus(actor, params)
    } catch (error) {
      if (error instanceof AttendanceAuthError) {
        return {
          success: false,
          isLocked: false,
          code: error.code,
          error: error.message,
        }
      }

      logger.error('ATTENDANCE_SESSION_LOCK_READ_UNEXPECTED', error instanceof Error ? error : new Error('Erro desconhecido'), {
        metadata: { sessionIdOrTurmaId: params?.sessionIdOrTurmaId, date: params?.date },
      })
      return {
        success: false,
        isLocked: false,
        code: 'SESSION_READ_FAILED',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }
    }
  }

  async function getSessionsForChamada(
    turmaId: string,
    date: string,
    requestedSessionId?: string | null
  ): Promise<AttendanceSession[]> {
    if (!turmaId || !isIsoDate(date)) {
      throw new AttendanceSessionReadError('ATTENDANCE_READ_FAILED', 'Turma ou data da chamada inválida')
    }

    const actor = await requireAttendanceActor(supabase)
    const { data: turma } = await supabase
      .from('turmas')
      .select('id, escola_id, professor_id, ativo')
      .eq('id', turmaId)
      .single()

    if (!turma) {
      throw new AttendanceSessionReadError('TURMA_NOT_FOUND', 'Turma não encontrada')
    }
    assertTurmaReadAccess(actor, turma)

    let query = supabase
      .from('sessoes_aula')
      .select('*')
      .eq('turma_id', turmaId)
      .order('created_at', { ascending: true })

    if (requestedSessionId) {
      query = query.eq('id', requestedSessionId)
    } else {
      query = query.eq('data_aula', date)
    }

    const { data, error } = await query
    if (error) {
      throw new AttendanceSessionReadError('ATTENDANCE_READ_FAILED', error.message)
    }

    return (data ?? []).map(normalizedSessionRow)
  }

  async function getStudentsForChamada(turmaId: string): Promise<ChamadaStudent[]> {
    const actor = await requireAttendanceActor(supabase)
    const { data: turma } = await supabase
      .from('turmas')
      .select('id, escola_id, professor_id, ativo')
      .eq('id', turmaId)
      .single()

    if (!turma) {
      throw new AttendanceSessionReadError('TURMA_NOT_FOUND', 'Turma não encontrada')
    }
    assertTurmaReadAccess(actor, turma)

    const { data, error } = await supabase
      .from('matriculas')
      .select('id, aluno:alunos(id, nome_completo)')
      .eq('turma_id', turmaId)
      .eq('situacao', 'ativa')

    if (error) {
      throw new AttendanceSessionReadError('ATTENDANCE_READ_FAILED', error.message)
    }

    const matriculaIds = (data ?? []).map(matricula => matricula.id)
    if (matriculaIds.length === 0) return []

    const today = getSaoPauloDate(now())
    const { data: attendance, error: attendanceError } = await supabase
      .from('frequencia')
      .select('matricula_id, sessao_id, data_aula, status_presenca, presente')
      .in('matricula_id', matriculaIds)
      .gte('data_aula', firstDayOfSaoPauloMonth(today))
      .lte('data_aula', today)

    if (attendanceError) {
      throw new AttendanceSessionReadError('ATTENDANCE_READ_FAILED', attendanceError.message)
    }

    return chamadaStudentsFromRoster(data ?? [], monthlyAttendanceTotals(attendance ?? []))
  }

  async function getAttendanceForSession(
    sessionId: string
  ): Promise<Map<string, ChamadaAttendanceRecord>> {
    const actor = await requireAttendanceActor(supabase)
    const { data: session, error: sessionError } = await supabase
      .from('sessoes_aula')
      .select('id, turma_id, professor_id, escola_id, status, data_aula, travada_em, fechada_em, auto_fechamento_agendado, created_at')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      throw new AttendanceSessionReadError('SESSION_NOT_FOUND', 'Sessão de aula não encontrada')
    }
    assertSessionReadAccess(actor, session)

    const { data, error } = await supabase
      .from('frequencia')
      .select('matricula_id, status_presenca, presente, justificativa')
      .eq('sessao_id', sessionId)

    if (error) {
      throw new AttendanceSessionReadError('ATTENDANCE_READ_FAILED', error.message)
    }

    const records = new Map<string, ChamadaAttendanceRecord>()
    for (const record of data ?? []) {
      const status = normalizeAttendanceStatus(record.status_presenca, record.presente)
      if (!status || status === 'NAO_MARCADO') continue
      records.set(record.matricula_id, {
        matricula_id: record.matricula_id,
        status,
        justificativa: record.justificativa,
      })
    }
    return records
  }

  return {
    openSession,
    markAttendance,
    markAttendanceBatch,
    closeSession,
    checkLockStatus,
    getSessionsForChamada,
    getStudentsForChamada,
    getAttendanceForSession,
  }
}
