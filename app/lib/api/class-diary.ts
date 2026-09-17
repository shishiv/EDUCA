/**
 * Class Diary API - Diário de Classe (legal document in Brazilian education).  Reads canonical sessoes_aula with frequencia.sessao_id.
 */
/**
 * Class Diary API Layer
 * Brazilian Educational Compliance: Diário de Classe Implementation
 *
 * Legal Context:
 * The Class Diary (Diário de Classe) is a legal document in Brazilian education that must:
 * - Record all classes taught with date and content
 * - Report canonical session attendance using the general municipal alert bands
 * - Be auditable and immutable after locking
 * - Support director/secretary review
 *
 * Data Source: canonical sessoes_aula rows with frequencia.sessao_id.
 *
 * IMPORTANT: All functions accept a Supabase client as first parameter.
 * The client should be created in the calling context (API route or Server Component)
 * using createServerClient from @supabase/ssr with proper cookie handling.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { logger } from '@/lib/logger'
import {
  loadCanonicalAttendanceFacts,
  type CanonicalAttendanceFact,
} from '@/lib/api/canonical-attendance-facts'
import { countAttendanceRecords } from '@/lib/attendance/attendance-calculations'

/**
 * Interface: Class Diary Entry
 * Represents a single class session in the diary
 */
export interface ClassDiaryEntry {
  id: string
  data_aula: string // ISO date format YYYY-MM-DD
  turma_id: string
  turma_nome: string
  turma_ano: number
  turma_serie: string // e.g., "1º Ano", "2º Ano"
  escola_id: string
  escola_nome: string
  professor_id: string
  professor_nome: string
  disciplina: string | null
  status: string // raw TEXT column; known values map via `fase`
  fase: 'planejamento' | 'chamada' | 'finalizada' | 'bloqueada'
  observacoes_abertura: string | null
  observacoes_fechamento: string | null
  total_alunos: number
  total_presentes: number
  total_ausentes: number
  aberta_em: string
  fechada_em: string | null
  travada_em: string | null
  bloqueado: boolean
}

/**
 * Interface: Attendance History Record
 * Individual student attendance record for a specific session
 */
export interface AttendanceHistoryRecord {
  id: string
  aula_id: string
  data: string
  aluno_id: string
  aluno_nome: string
  presente: boolean
  observacoes: string | null
  turma_nome: string
  is_locked?: boolean
}

/**
 * Interface: Detailed Session View
 * Complete information about a specific class session
 */
export interface DetailedSession extends ClassDiaryEntry {
  attendance_records: AttendanceHistoryRecord[]
  attendance_percentage: number
  observacoes: string | null
  bloqueado_em: string | null
  hash_integridade: string | null
}

/**
 * Interface: Class Diary Filters
 * Query parameters for filtering diary entries
 */
export interface ClassDiaryFilters {
  turma_id?: string
  professor_id?: string
  escola_id?: string
  disciplina?: string
  date_from?: string // YYYY-MM-DD
  date_to?: string // YYYY-MM-DD
  status?: 'aberta' | 'fechada' | 'travada'
  limit?: number
  offset?: number
}

interface DiarySessionSummarySource {
  id: string
  data_aula: string
  turma_id: string
  professor_id: string
  status: string
  observacoes: string | null
  observacoes_fechamento: string | null
  aberta_em: string | null
  fechada_em: string | null
  travada_em: string | null
  created_at: string | null
  turmas: {
    nome: string
    serie: string
    ano_letivo: number
    escolas: { id: string; nome: string } | null
  } | null
  professor: { nome: string } | null
  disciplina: { nome: string } | null
}

interface AttendanceStats {
  presentes: number
  ausentes: number
  total: number
}

interface AttendanceStudentSource {
  matriculas: {
    alunos: { id: string; nome_completo: string } | null
  } | null
}

interface AttendanceHistorySource extends AttendanceStudentSource {
  id: string
  sessao_id: string | null
  data_aula: string
  presente: boolean | null
  observacoes: string | null
  sessoes_aula: {
    turmas: { nome: string } | null
  } | null
}

/** Maps the canonical session lifecycle into the diary's display phases. */
function getDiaryPhase(
  status: string,
  travadaEm: string | null
): ClassDiaryEntry['fase'] {
  if (travadaEm || status === 'CANCELADA') return 'bloqueada'
  if (status === 'FECHADA') return 'finalizada'
  if (status === 'ABERTA') return 'chamada'
  return 'planejamento'
}

/** Returns the canonical session status used by each legacy diary filter. */
function getCanonicalStatusFilter(status: NonNullable<ClassDiaryFilters['status']>): string {
  switch (status) {
    case 'aberta':
      return 'ABERTA'
    case 'fechada':
    case 'travada':
      return 'FECHADA'
  }
}

/** A closed, cancelled, or explicitly locked session is immutable in the diary. */
function isDiarySessionLocked(status: string, travadaEm: string | null): boolean {
  return Boolean(travadaEm) || status === 'FECHADA' || status === 'CANCELADA'
}

function buildDiaryClassInfo(session: DiarySessionSummarySource) {
  const turma = session.turmas
  return {
    turma_nome: turma?.nome || 'N/A',
    turma_ano: turma?.ano_letivo || new Date().getFullYear(),
    turma_serie: turma?.serie || 'N/A',
  }
}

function buildDiarySchoolInfo(session: DiarySessionSummarySource) {
  const escola = session.turmas?.escolas
  return {
    escola_id: escola?.id || '',
    escola_nome: escola?.nome || 'N/A',
  }
}

function buildDiaryTeachingInfo(session: DiarySessionSummarySource) {
  return {
    professor_nome: session.professor?.nome || 'N/A',
    disciplina: session.disciplina?.nome || null,
  }
}

function buildDiaryEntryState(
  session: DiarySessionSummarySource,
  stats: AttendanceStats,
) {
  return {
    status: session.status,
    fase: getDiaryPhase(session.status, session.travada_em),
    observacoes_abertura: session.observacoes,
    observacoes_fechamento: session.observacoes_fechamento,
    total_alunos: stats.total,
    total_presentes: stats.presentes,
    total_ausentes: stats.ausentes,
    aberta_em: session.aberta_em || session.created_at || '',
    fechada_em: session.fechada_em,
    travada_em: session.travada_em,
    bloqueado: isDiarySessionLocked(session.status, session.travada_em),
  }
}

function buildDiaryEntry(
  session: DiarySessionSummarySource,
  stats: AttendanceStats,
): ClassDiaryEntry {
  return {
    id: session.id,
    data_aula: session.data_aula,
    turma_id: session.turma_id,
    professor_id: session.professor_id,
    ...buildDiaryClassInfo(session),
    ...buildDiarySchoolInfo(session),
    ...buildDiaryTeachingInfo(session),
    ...buildDiaryEntryState(session, stats),
  }
}

function buildAttendanceStats(
  attendanceFacts: CanonicalAttendanceFact[],
): Map<string, AttendanceStats> {
  const statsBySession = new Map<string, AttendanceStats>()

  for (const fact of attendanceFacts) {
    const stats = statsBySession.get(fact.sessaoId) ?? { presentes: 0, ausentes: 0, total: 0 }
    const counts = countAttendanceRecords([{
      presente: fact.presente,
      status_presenca: fact.statusPresenca,
    }])
    statsBySession.set(fact.sessaoId, {
      total: stats.total + counts.total,
      presentes: stats.presentes + counts.presencas + counts.atestados,
      ausentes: stats.ausentes + counts.faltas,
    })
  }

  return statsBySession
}

function createClassDiaryQuery(supabase: SupabaseClient<Database>) {
  return supabase
    .from('sessoes_aula')
    .select(`
      id,
      data_aula,
      turma_id,
      professor_id,
      disciplina_id,
      status,
      observacoes,
      observacoes_fechamento,
      aberta_em,
      fechada_em,
      travada_em,
      created_at,
      turmas!inner(
        id,
        nome,
        serie,
        ano_letivo,
        escola_id,
        escolas!inner(
          id,
          nome
        )
      ),
      professor:users(
        id,
        nome
      ),
      disciplina:disciplinas(
        nome
      )
    `, { count: 'exact' })
}

type ClassDiaryQuery = ReturnType<typeof createClassDiaryQuery>

function applyDiaryStatusFilter(
  query: ClassDiaryQuery,
  status: ClassDiaryFilters['status'],
): ClassDiaryQuery {
  if (!status) return query

  const statusQuery = query.eq('status', getCanonicalStatusFilter(status))
  if (status === 'travada') return statusQuery.not('travada_em', 'is', null)
  return statusQuery
}

async function readClassDiaryPage(
  supabase: SupabaseClient<Database>,
  filters: ClassDiaryFilters,
) {
  let query = applyDiaryStatusFilter(createClassDiaryQuery(supabase), filters.status)

  if (filters.turma_id) query = query.eq('turma_id', filters.turma_id)
  if (filters.professor_id) query = query.eq('professor_id', filters.professor_id)
  if (filters.disciplina) query = query.eq('disciplina_id', filters.disciplina)
  if (filters.date_from) query = query.gte('data_aula', filters.date_from)
  if (filters.date_to) query = query.lte('data_aula', filters.date_to)
  if (filters.escola_id) query = query.eq('turmas.escola_id', filters.escola_id)

  const { limit = 20, offset = 0 } = filters
  return query
    .order('data_aula', { ascending: false })
    .range(offset, offset + limit - 1)
}

/**
 * Get Class Diary entries with optional filters
 *
 * Returns a paginated list of class sessions with attendance statistics
 * Ordered by date descending (most recent first)
 *
 * @param supabase - Supabase client instance
 * @param filters - Optional filters for turma, professor, date range, etc.
 * @returns Array of ClassDiaryEntry objects
 *
 * @example
 * const diary = await getClassDiary(supabase, { turma_id: 'uuid', date_from: '2025-09-01' })
 */
export async function getClassDiary(
  supabase: SupabaseClient<Database>,
  filters: ClassDiaryFilters = {}
): Promise<{ data: ClassDiaryEntry[] | null; total: number; error: unknown }> {
  try {
    const { data: aulas, count, error } = await readClassDiaryPage(supabase, filters)

    if (error) {
      logger.error('Error fetching class diary', error.message, { feature: 'class-diary', action: 'fetch_diary' })
      return { data: null, total: 0, error }
    }

    if (!aulas || aulas.length === 0) {
      return { data: [], total: count ?? 0, error: null }
    }

    // Attendance belongs to the canonical session, never the legacy aula_id.
    const sessionIds = aulas.map((session) => session.id)
    const frequencias = await loadCanonicalAttendanceFacts(supabase, [], {
      sessaoIds: sessionIds,
    })

    const statsBySession = buildAttendanceStats(frequencias)
    const transformedData = aulas.map((session) => buildDiaryEntry(
      session,
      statsBySession.get(session.id) ?? { presentes: 0, ausentes: 0, total: 0 },
    ))

    return { data: transformedData, total: count ?? 0, error: null }
  } catch (error) {
    logger.error('Exception in getClassDiary', error instanceof Error ? error : String(error), { feature: 'class-diary', action: 'fetch_diary_exception' })
    return { data: null, total: 0, error }
  }
}

function buildAttendanceStudentInfo(record: AttendanceStudentSource) {
  return {
    aluno_id: record.matriculas?.alunos?.id || '',
    aluno_nome: record.matriculas?.alunos?.nome_completo || 'N/A',
  }
}

function buildAttendanceHistoryRecord(
  record: AttendanceHistorySource,
): AttendanceHistoryRecord {
  return {
    id: record.id,
    aula_id: record.sessao_id || '',
    data: record.data_aula,
    ...buildAttendanceStudentInfo(record),
    presente: record.presente ?? false,
    observacoes: record.observacoes,
    turma_nome: record.sessoes_aula?.turmas?.nome || 'N/A',
    is_locked: true,
  }
}

/**
 * Get Attendance History for a specific student in a class
 *
 * Returns all attendance records for a student within a specific turma
 * Ordered by date ascending (chronological order)
 *
 * @param supabase - Supabase client instance
 * @param aluno_id - Student UUID
 * @param turma_id - Class UUID
 * @param date_from - Optional start date filter (YYYY-MM-DD)
 * @param date_to - Optional end date filter (YYYY-MM-DD)
 * @returns Array of AttendanceHistoryRecord objects
 *
 * @example
 * const history = await getAttendanceHistory(supabase, 'aluno-uuid', 'turma-uuid')
 */
export async function getAttendanceHistory(
  supabase: SupabaseClient<Database>,
  aluno_id: string,
  turma_id: string,
  date_from?: string,
  date_to?: string
): Promise<{ data: AttendanceHistoryRecord[] | null; error: unknown }> {
  try {

    let query = supabase
      .from('frequencia')
      .select(`
        id,
        sessao_id,
        data_aula,
        status_presenca,
        matricula_id,
        presente,
        observacoes,
        matriculas!inner(
          aluno_id,
          alunos!inner(
            id,
            nome_completo
          )
        ),
        sessoes_aula!inner(
          id,
          turma_id,
          turmas!inner(
            nome
          )
        )
      `)
      .eq('matriculas.aluno_id', aluno_id)
      .eq('sessoes_aula.turma_id', turma_id)
      .not('sessao_id', 'is', null)

    if (date_from) {
      query = query.gte('data_aula', date_from)
    }

    if (date_to) {
      query = query.lte('data_aula', date_to)
    }

    query = query.order('data_aula', { ascending: true })

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching attendance history', error.message, { feature: 'class-diary', action: 'fetch_attendance_history' })
      return { data: null, error }
    }

    // Transform data
    const transformedData: AttendanceHistoryRecord[] = (data || [])
      .filter(record => record.status_presenca !== 'NAO_MARCADO')
      .map(buildAttendanceHistoryRecord)

    return { data: transformedData, error: null }
  } catch (error) {
    logger.error('Exception in getAttendanceHistory', error instanceof Error ? error : String(error), { feature: 'class-diary', action: 'fetch_attendance_history_exception' })
    return { data: null, error }
  }
}

/**
 * Get Detailed Session Information
 *
 * Returns complete information about a specific class session including:
 * - Session metadata
 * - All attendance records for that session
 * - Calculated attendance percentage
 *
 * @param supabase - Supabase client instance
 * @param sessionId - Canonical session UUID
 * @returns DetailedSession object or null
 *
 * @example
 * const session = await getClassDetail(supabase, 'session-uuid')
 */
async function readClassDetailSession(
  supabase: SupabaseClient<Database>,
  sessionId: string
) {
  return supabase
    .from('sessoes_aula')
    .select(`
      id,
      data_aula,
      turma_id,
      professor_id,
      disciplina_id,
      status,
      observacoes,
      observacoes_fechamento,
      aberta_em,
      fechada_em,
      travada_em,
      created_at,
      hash_integridade,
      conteudo_programatico,
      turmas!inner(
        id,
        nome,
        serie,
        ano_letivo,
        escola_id,
        escolas!inner(
          id,
          nome
        )
      ),
      professor:users(
        id,
        nome
      ),
      disciplina:disciplinas(
        nome
      )
    `)
    .eq('id', sessionId)
    .single()
}

async function readClassDetailAttendance(
  supabase: SupabaseClient<Database>,
  sessionId: string
) {
  return supabase
    .from('frequencia')
    .select(`
      id,
      sessao_id,
      data_aula,
      status_presenca,
      matricula_id,
      presente,
      observacoes,
      matriculas!inner(
        aluno_id,
        alunos!inner(
          id,
          nome_completo
        )
      )
    `)
    .eq('sessao_id', sessionId)
}

type ClassDetailSession = NonNullable<Awaited<ReturnType<typeof readClassDetailSession>>['data']>
type ClassDetailAttendance = NonNullable<Awaited<ReturnType<typeof readClassDetailAttendance>>['data']>[number]

function buildClassDetailAttendance(
  attendanceData: ClassDetailAttendance[],
  session: ClassDetailSession,
  sessionId: string
): AttendanceHistoryRecord[] {
  const turmaNome = session.turmas?.nome || 'N/A'
  const isLocked = isDiarySessionLocked(session.status, session.travada_em)

  return attendanceData
    .filter((record) => record.status_presenca !== 'NAO_MARCADO')
    .map((record) => ({
      id: record.id,
      aula_id: record.sessao_id || sessionId,
      data: record.data_aula,
      aluno_id: record.matriculas?.alunos?.id || '',
      aluno_nome: record.matriculas?.alunos?.nome_completo || 'N/A',
      presente: record.presente ?? false,
      observacoes: record.observacoes,
      turma_nome: turmaNome,
      is_locked: isLocked,
    }))
}

function buildClassDetailIdentity(session: ClassDetailSession) {
  return {
    id: session.id,
    data_aula: session.data_aula,
    turma_id: session.turma_id,
    professor_id: session.professor_id,
    ...buildDiaryClassInfo(session),
    ...buildDiarySchoolInfo(session),
    ...buildDiaryTeachingInfo(session),
  }
}

function buildClassDetailState(
  session: ClassDetailSession,
  totalAlunos: number,
  totalPresentes: number
) {
  return {
    status: session.status,
    fase: getDiaryPhase(session.status, session.travada_em),
    observacoes_abertura: session.observacoes,
    observacoes_fechamento: session.observacoes_fechamento,
    observacoes: session.conteudo_programatico || session.observacoes || session.observacoes_fechamento || null,
    total_alunos: totalAlunos,
    total_presentes: totalPresentes,
    total_ausentes: totalAlunos - totalPresentes,
    aberta_em: session.aberta_em || session.created_at || '',
    fechada_em: session.fechada_em,
    travada_em: session.travada_em,
    bloqueado: isDiarySessionLocked(session.status, session.travada_em),
    bloqueado_em: session.travada_em || session.fechada_em,
    hash_integridade: session.hash_integridade,
  }
}

function buildClassDetail(
  session: ClassDetailSession,
  attendanceData: ClassDetailAttendance[],
  sessionId: string
): DetailedSession {
  const attendanceRecords = buildClassDetailAttendance(attendanceData, session, sessionId)
  const totalAlunos = attendanceRecords.length
  const totalPresentes = attendanceRecords.filter((record) => record.presente).length

  return {
    ...buildClassDetailIdentity(session),
    ...buildClassDetailState(session, totalAlunos, totalPresentes),
    attendance_records: attendanceRecords,
    attendance_percentage: totalAlunos > 0 ? Math.round((totalPresentes / totalAlunos) * 100) : 0,
  }
}

export async function getClassDetail(
  supabase: SupabaseClient<Database>,
  sessionId: string
): Promise<{ data: DetailedSession | null; error: unknown }> {
  try {
    const { data: sessionData, error: sessionError } = await readClassDetailSession(supabase, sessionId)

    if (sessionError || !sessionData) {
      logger.error('Error fetching canonical session', sessionError?.message || 'Canonical session not found', { feature: 'class-diary', action: 'fetch_session_detail' })
      return { data: null, error: sessionError }
    }

    const { data: attendanceData, error: attendanceError } = await readClassDetailAttendance(supabase, sessionId)

    if (attendanceError) {
      logger.error('Error fetching attendance records', attendanceError.message, { feature: 'class-diary', action: 'fetch_attendance_records' })
      return { data: null, error: attendanceError }
    }

    return { data: buildClassDetail(sessionData, attendanceData || [], sessionId), error: null }
  } catch (error) {
    logger.error('Exception in getClassDetail', error instanceof Error ? error : String(error), { feature: 'class-diary', action: 'fetch_class_detail_exception' })
    return { data: null, error }
  }
}

/**
 * Get list of unique turmas (classes) that have diary entries
 * Useful for populating filter dropdowns
 *
 * @param supabase - Supabase client instance
 * @param professor_id - Optional professor filter
 * @param escola_id - Optional school filter
 * @returns Array of turma objects with basic info
 */
export async function getAvailableTurmas(
  supabase: SupabaseClient<Database>,
  professor_id?: string,
  escola_id?: string
): Promise<{ data: Array<{ id: string; nome: string; serie: string; ano_letivo: number }> | null; error: unknown }> {
  try {

    let query = supabase
      .from('sessoes_aula')
      .select(`
        turma_id,
        turmas!inner(
          id,
          nome,
          serie,
          ano_letivo,
          escola_id
        )
      `)

    if (professor_id) {
      query = query.eq('professor_id', professor_id)
    }

    if (escola_id) {
      query = query.eq('turmas.escola_id', escola_id)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching available turmas', error.message, { feature: 'class-diary', action: 'fetch_available_turmas' })
      return { data: null, error }
    }

    // Extract unique turmas
    const turmasMap = new Map<string, { id: string; nome: string; serie: string; ano_letivo: number }>()
    data?.forEach((session) => {
      if (session.turmas) {
        turmasMap.set(session.turmas.id, {
          id: session.turmas.id,
          nome: session.turmas.nome,
          serie: session.turmas.serie,
          ano_letivo: session.turmas.ano_letivo,
        })
      }
    })

    const uniqueTurmas = Array.from(turmasMap.values())

    return { data: uniqueTurmas, error: null }
  } catch (error) {
    logger.error('Exception in getAvailableTurmas', error instanceof Error ? error : String(error), { feature: 'class-diary', action: 'fetch_available_turmas_exception' })
    return { data: null, error }
  }
}
