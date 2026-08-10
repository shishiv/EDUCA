/**
 * Class Diary API Layer
 * Brazilian Educational Compliance: Diário de Classe Implementation
 *
 * Legal Context:
 * The Class Diary (Diário de Classe) is a legal document in Brazilian education that must:
 * - Record all classes taught with date and content
 * - Track attendance for Bolsa Família compliance (minimum 75% attendance)
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
): Promise<{ data: ClassDiaryEntry[] | null; error: unknown }> {
  try {
    // Sessions and session-scoped attendance are the canonical diary source.
    let query = supabase
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
      `)

    // Apply filters
    if (filters.turma_id) {
      query = query.eq('turma_id', filters.turma_id)
    }

    if (filters.professor_id) {
      query = query.eq('professor_id', filters.professor_id)
    }

    if (filters.disciplina) {
      query = query.eq('disciplina_id', filters.disciplina)
    }

    if (filters.status) {
      query = query.eq('status', getCanonicalStatusFilter(filters.status))
      if (filters.status === 'travada') {
        query = query.not('travada_em', 'is', null)
      }
    }

    if (filters.date_from) {
      query = query.gte('data_aula', filters.date_from)
    }

    if (filters.date_to) {
      query = query.lte('data_aula', filters.date_to)
    }

    // Apply escola_id filter through turmas relationship
    if (filters.escola_id) {
      query = query.eq('turmas.escola_id', filters.escola_id)
    }

    // Order by date descending (most recent first)
    query = query.order('data_aula', { ascending: false })

    // Apply pagination
    const limit = filters.limit ?? 20
    const offset = filters.offset ?? 0
    query = query.range(offset, offset + limit - 1)

    const { data: aulas, error } = await query

    if (error) {
      logger.error('Error fetching class diary', error as Error, { feature: 'class-diary', action: 'fetch_diary' })
      return { data: null, error }
    }

    if (!aulas || aulas.length === 0) {
      return { data: [], error: null }
    }

    // Attendance belongs to the canonical session, never the legacy aula_id.
    const sessionIds = aulas.map((session) => session.id)
    const { data: frequencias } = await supabase
      .from('frequencia')
      .select('sessao_id, presente, status_presenca')
      .in('sessao_id', sessionIds)

    // Build frequency facts by canonical session ID.
    const frequenciaMap = new Map<string, { presentes: number; ausentes: number; total: number }>()
    frequencias?.forEach((freq) => {
      if (!freq.sessao_id || freq.status_presenca === 'NAO_MARCADO') return
      if (!frequenciaMap.has(freq.sessao_id)) {
        frequenciaMap.set(freq.sessao_id, { presentes: 0, ausentes: 0, total: 0 })
      }
      const stats = frequenciaMap.get(freq.sessao_id)!
      stats.total++
      if (freq.presente) {
        stats.presentes++
      } else {
        stats.ausentes++
      }
    })

    // Transform data to match ClassDiaryEntry interface
    const transformedData: ClassDiaryEntry[] = aulas.map((session) => {
      const stats = frequenciaMap.get(session.id) || { presentes: 0, ausentes: 0, total: 0 }
      const turma = session.turmas
      const escola = turma?.escolas
      const professor = session.professor
      const disciplina = session.disciplina

      return {
        id: session.id,
        data_aula: session.data_aula,
        turma_id: session.turma_id,
        turma_nome: turma?.nome || 'N/A',
        turma_ano: turma?.ano_letivo || new Date().getFullYear(),
        turma_serie: turma?.serie || 'N/A',
        escola_id: escola?.id || '',
        escola_nome: escola?.nome || 'N/A',
        professor_id: session.professor_id,
        professor_nome: professor?.nome || 'N/A',
        disciplina: disciplina?.nome || null,
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
    })

    return { data: transformedData, error: null }
  } catch (error) {
    logger.error('Exception in getClassDiary', error as Error, { feature: 'class-diary', action: 'fetch_diary_exception' })
    return { data: null, error }
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
      logger.error('Error fetching attendance history', error as Error, { feature: 'class-diary', action: 'fetch_attendance_history' })
      return { data: null, error }
    }

    // Transform data
    const transformedData: AttendanceHistoryRecord[] = (data || [])
      .filter(record => record.status_presenca !== 'NAO_MARCADO')
      .map((record) => ({
        id: record.id,
        aula_id: record.sessao_id || '',
        data: record.data_aula,
        aluno_id: record.matriculas?.alunos?.id || '',
        aluno_nome: record.matriculas?.alunos?.nome_completo || 'N/A',
        presente: record.presente,
        observacoes: record.observacoes,
        turma_nome: record.sessoes_aula?.turmas?.nome || 'N/A',
        is_locked: true,
      }))

    return { data: transformedData, error: null }
  } catch (error) {
    logger.error('Exception in getAttendanceHistory', error as Error, { feature: 'class-diary', action: 'fetch_attendance_history_exception' })
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
export async function getClassDetail(
  supabase: SupabaseClient<Database>,
  sessionId: string
): Promise<{ data: DetailedSession | null; error: unknown }> {
  try {
    const { data: sessionData, error: sessionError } = await supabase
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

    if (sessionError || !sessionData) {
      logger.error('Error fetching canonical session', sessionError as Error, { feature: 'class-diary', action: 'fetch_session_detail' })
      return { data: null, error: sessionError }
    }

    const { data: attendanceData, error: attendanceError } = await supabase
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

    if (attendanceError) {
      logger.error('Error fetching attendance records', attendanceError as Error, { feature: 'class-diary', action: 'fetch_attendance_records' })
      return { data: null, error: attendanceError }
    }

    // Calculate attendance statistics
    const markedAttendanceData = (attendanceData || []).filter(
      record => record.status_presenca !== 'NAO_MARCADO'
    )
    const totalAlunos = markedAttendanceData.length
    const totalPresentes = markedAttendanceData.filter(record => record.presente).length
    const totalAusentes = totalAlunos - totalPresentes

    const session = sessionData
    const turma = session.turmas
    const escola = turma?.escolas
    const professor = session.professor
    const disciplina = session.disciplina

    // Transform attendance records
    const attendanceRecords: AttendanceHistoryRecord[] = markedAttendanceData.map(
      (record) => ({
        id: record.id,
        aula_id: record.sessao_id || sessionId,
        data: record.data_aula,
        aluno_id: record.matriculas?.alunos?.id || '',
        aluno_nome: record.matriculas?.alunos?.nome_completo || 'N/A',
        presente: record.presente,
        observacoes: record.observacoes,
        turma_nome: turma?.nome || 'N/A',
        is_locked: isDiarySessionLocked(session.status, session.travada_em),
      })
    )

    // Calculate attendance percentage
    const attendance_percentage =
      totalAlunos > 0
        ? Math.round((totalPresentes / totalAlunos) * 100)
        : 0

    // Build detailed session object
    const detailedSession: DetailedSession = {
      id: session.id,
      data_aula: session.data_aula,
      turma_id: session.turma_id,
      turma_nome: turma?.nome || 'N/A',
      turma_ano: turma?.ano_letivo || new Date().getFullYear(),
      turma_serie: turma?.serie || 'N/A',
      escola_id: escola?.id || '',
      escola_nome: escola?.nome || 'N/A',
      professor_id: session.professor_id,
      professor_nome: professor?.nome || 'N/A',
      disciplina: disciplina?.nome || null,
      status: session.status,
      fase: getDiaryPhase(session.status, session.travada_em),
      observacoes_abertura: session.observacoes,
      observacoes_fechamento: session.observacoes_fechamento,
      observacoes: session.conteudo_programatico || session.observacoes || session.observacoes_fechamento || null,
      total_alunos: totalAlunos,
      total_presentes: totalPresentes,
      total_ausentes: totalAusentes,
      aberta_em: session.aberta_em || session.created_at || '',
      fechada_em: session.fechada_em,
      travada_em: session.travada_em,
      bloqueado: isDiarySessionLocked(session.status, session.travada_em),
      bloqueado_em: session.travada_em || session.fechada_em,
      hash_integridade: session.hash_integridade,
      attendance_records: attendanceRecords,
      attendance_percentage,
    }

    return { data: detailedSession, error: null }
  } catch (error) {
    logger.error('Exception in getClassDetail', error as Error, { feature: 'class-diary', action: 'fetch_class_detail_exception' })
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
      logger.error('Error fetching available turmas', error as Error, { feature: 'class-diary', action: 'fetch_available_turmas' })
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
    logger.error('Exception in getAvailableTurmas', error as Error, { feature: 'class-diary', action: 'fetch_available_turmas_exception' })
    return { data: null, error }
  }
}

/**
 * Update a class session
 *
 * @param supabase - Supabase client instance
 * @param sessionId - Session UUID
 * @param updates - Fields to update
 * @returns Updated session or error
 */
export interface UpdateSessionInput {
  conteudo_programatico?: string
  observacoes_fechamento?: string
  status?: 'aberta' | 'fechada' | 'travada'
}

export async function updateSession(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  updates: UpdateSessionInput
): Promise<{ data: { id: string } | null; error: unknown }> {
  try {
    const { data, error } = await supabase
      .from('sessoes_aula')
      .update(updates)
      .eq('id', sessionId)
      .select('id')
      .single()

    if (error) {
      logger.error('Error updating session', error as Error, { feature: 'class-diary', action: 'update_session' })
      return { data: null, error }
    }

    logger.info('Session updated successfully', {
      feature: 'class-diary',
      action: 'update_session',
      metadata: { sessionId, updatedFields: Object.keys(updates) }
    })

    return { data, error: null }
  } catch (error) {
    logger.error('Exception in updateSession', error as Error, { feature: 'class-diary', action: 'update_session_exception' })
    return { data: null, error }
  }
}

/**
 * Minimal client shape for the optional conteudo_aula cleanup.
 *
 * The table is not part of the generated schema (it belongs to a future
 * migration), so the typed client cannot reach it. This narrow interface keeps
 * the delete scoped to exactly one table and one column instead of an any cast.
 */
interface ConteudoAulaCleanupClient {
  from(table: 'conteudo_aula'): {
    delete(): {
      eq(column: 'sessao_id', value: string): Promise<unknown>
    }
  }
}

/**
 * Delete a class session and associated data
 *
 * @param supabase - Supabase client instance
 * @param sessionId - Session UUID
 * @returns Success or error
 */
export async function deleteSession(
  supabase: SupabaseClient<Database>,
  sessionId: string
): Promise<{ success: boolean; error: unknown }> {
  try {
    // First try to delete associated conteudo_aula (if table exists)
    try {
      await (supabase as unknown as ConteudoAulaCleanupClient)
        .from('conteudo_aula')
        .delete()
        .eq('sessao_id', sessionId)
    } catch {
      // Content table might not exist, continue
    }

    // Delete the session
    const { error } = await supabase
      .from('sessoes_aula')
      .delete()
      .eq('id', sessionId)

    if (error) {
      logger.error('Error deleting session', error as Error, { feature: 'class-diary', action: 'delete_session' })
      return { success: false, error }
    }

    logger.info('Session deleted successfully', {
      feature: 'class-diary',
      action: 'delete_session',
      metadata: { sessionId }
    })

    return { success: true, error: null }
  } catch (error) {
    logger.error('Exception in deleteSession', error as Error, { feature: 'class-diary', action: 'delete_session_exception' })
    return { success: false, error }
  }
}
