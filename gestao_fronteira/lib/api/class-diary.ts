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
 * Data Source: aula_sessions table (with frequencia relationship)
 */

import { supabase as createClient } from '@/lib/supabase'

/**
 * Interface: Class Diary Entry
 * Represents a single class session in the diary
 */
export interface ClassDiaryEntry {
  id: string
  data_aula: string // ISO date format YYYY-MM-DD
  turma_id: string
  turma_nome: string
  turma_serie: string
  escola_id: string
  escola_nome: string
  professor_id: string
  professor_nome: string
  fase: 'planejamento' | 'chamada' | 'finalizada' | 'bloqueada'
  bloqueado: boolean
  observacoes: string | null
  total_alunos: number
  total_presentes: number
  total_ausentes: number
  created_at: string
  updated_at: string
}

/**
 * Interface: Attendance History Record
 * Individual student attendance record for a specific session
 */
export interface AttendanceHistoryRecord {
  id: string
  session_id: string
  data_aula: string
  aluno_id: string
  aluno_nome: string
  presente: boolean
  observacoes: string | null
  is_locked: boolean
  turma_nome: string
}

/**
 * Interface: Detailed Session View
 * Complete information about a specific class session
 */
export interface DetailedSession extends ClassDiaryEntry {
  attendance_records: AttendanceHistoryRecord[]
  attendance_percentage: number
  hash_integridade: string | null
  bloqueado_em: string | null
}

/**
 * Interface: Class Diary Filters
 * Query parameters for filtering diary entries
 */
export interface ClassDiaryFilters {
  turma_id?: string
  professor_id?: string
  escola_id?: string
  date_from?: string // YYYY-MM-DD
  date_to?: string // YYYY-MM-DD
  fase?: 'planejamento' | 'chamada' | 'finalizada' | 'bloqueada'
  limit?: number
  offset?: number
}

/**
 * Get Class Diary entries with optional filters
 *
 * Returns a paginated list of class sessions with attendance statistics
 * Ordered by date descending (most recent first)
 *
 * @param filters - Optional filters for turma, professor, date range, etc.
 * @returns Array of ClassDiaryEntry objects
 *
 * @example
 * const diary = await getClassDiary({ turma_id: 'uuid', date_from: '2025-09-01' })
 */
export async function getClassDiary(
  filters: ClassDiaryFilters = {}
): Promise<{ data: ClassDiaryEntry[] | null; error: any }> {
  const supabase = createClient()

  try {
    // Build query with relationships
    let query = supabase
      .from('aula_sessions')
      .select(`
        id,
        data_aula,
        turma_id,
        professor_id,
        fase,
        bloqueado,
        observacoes,
        total_alunos,
        total_presentes,
        total_ausentes,
        created_at,
        updated_at,
        turmas:turma_id (
          id,
          nome,
          serie,
          escola_id,
          escolas:escola_id (
            id,
            nome
          )
        ),
        users:professor_id (
          id,
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

    if (filters.fase) {
      query = query.eq('fase', filters.fase)
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
    const limit = filters.limit || 20
    const offset = filters.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching class diary:', error)
      return { data: null, error }
    }

    // Transform data to match ClassDiaryEntry interface
    const transformedData: ClassDiaryEntry[] = (data || []).map((session: any) => ({
      id: session.id,
      data_aula: session.data_aula,
      turma_id: session.turma_id,
      turma_nome: session.turmas?.nome || 'N/A',
      turma_serie: session.turmas?.serie || 'N/A',
      escola_id: session.turmas?.escolas?.id || '',
      escola_nome: session.turmas?.escolas?.nome || 'N/A',
      professor_id: session.professor_id,
      professor_nome: session.users?.nome || 'N/A',
      fase: session.fase,
      bloqueado: session.bloqueado,
      observacoes: session.observacoes,
      total_alunos: session.total_alunos || 0,
      total_presentes: session.total_presentes || 0,
      total_ausentes: session.total_ausentes || 0,
      created_at: session.created_at,
      updated_at: session.updated_at,
    }))

    return { data: transformedData, error: null }
  } catch (error) {
    console.error('Exception in getClassDiary:', error)
    return { data: null, error }
  }
}

/**
 * Get Attendance History for a specific student in a class
 *
 * Returns all attendance records for a student within a specific turma
 * Ordered by date ascending (chronological order)
 *
 * @param aluno_id - Student UUID
 * @param turma_id - Class UUID
 * @param date_from - Optional start date filter (YYYY-MM-DD)
 * @param date_to - Optional end date filter (YYYY-MM-DD)
 * @returns Array of AttendanceHistoryRecord objects
 *
 * @example
 * const history = await getAttendanceHistory('aluno-uuid', 'turma-uuid')
 */
export async function getAttendanceHistory(
  aluno_id: string,
  turma_id: string,
  date_from?: string,
  date_to?: string
): Promise<{ data: AttendanceHistoryRecord[] | null; error: any }> {
  const supabase = createClient()

  try {
    let query = supabase
      .from('frequencia')
      .select(`
        id,
        session_id,
        data,
        aluno_id,
        presente,
        observacoes,
        is_locked,
        alunos:aluno_id (
          id,
          nome_completo
        ),
        aula_sessions:session_id (
          turma_id,
          turmas:turma_id (
            nome
          )
        )
      `)
      .eq('aluno_id', aluno_id)

    // Filter by turma through session relationship
    // Note: This requires the session to be part of the specified turma
    // We'll need to verify turma_id matches in the post-processing

    if (date_from) {
      query = query.gte('data', date_from)
    }

    if (date_to) {
      query = query.lte('data', date_to)
    }

    query = query.order('data', { ascending: true })

    const { data, error } = await query

    if (error) {
      console.error('Error fetching attendance history:', error)
      return { data: null, error }
    }

    // Filter by turma_id and transform data
    const transformedData: AttendanceHistoryRecord[] = (data || [])
      .filter((record: any) => record.aula_sessions?.turma_id === turma_id)
      .map((record: any) => ({
        id: record.id,
        session_id: record.session_id,
        data_aula: record.data,
        aluno_id: record.aluno_id,
        aluno_nome: record.alunos?.nome_completo || 'N/A',
        presente: record.presente,
        observacoes: record.observacoes,
        is_locked: record.is_locked,
        turma_nome: record.aula_sessions?.turmas?.nome || 'N/A',
      }))

    return { data: transformedData, error: null }
  } catch (error) {
    console.error('Exception in getAttendanceHistory:', error)
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
 * @param session_id - Session UUID
 * @returns DetailedSession object or null
 *
 * @example
 * const session = await getClassDetail('session-uuid')
 */
export async function getClassDetail(
  session_id: string
): Promise<{ data: DetailedSession | null; error: any }> {
  const supabase = createClient()

  try {
    // Fetch session data
    const { data: sessionData, error: sessionError } = await supabase
      .from('aula_sessions')
      .select(`
        id,
        data_aula,
        turma_id,
        professor_id,
        fase,
        bloqueado,
        bloqueado_em,
        observacoes,
        hash_integridade,
        total_alunos,
        total_presentes,
        total_ausentes,
        created_at,
        updated_at,
        turmas:turma_id (
          id,
          nome,
          serie,
          escola_id,
          escolas:escola_id (
            id,
            nome
          )
        ),
        users:professor_id (
          id,
          nome
        )
      `)
      .eq('id', session_id)
      .single()

    if (sessionError || !sessionData) {
      console.error('Error fetching session:', sessionError)
      return { data: null, error: sessionError }
    }

    // Fetch attendance records for this session
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('frequencia')
      .select(`
        id,
        session_id,
        data,
        aluno_id,
        presente,
        observacoes,
        is_locked,
        alunos:aluno_id (
          id,
          nome_completo
        )
      `)
      .eq('session_id', session_id)
      .order('alunos(nome_completo)', { ascending: true })

    if (attendanceError) {
      console.error('Error fetching attendance records:', attendanceError)
      return { data: null, error: attendanceError }
    }

    // Transform attendance records
    const attendanceRecords: AttendanceHistoryRecord[] = (attendanceData || []).map(
      (record: any) => ({
        id: record.id,
        session_id: record.session_id,
        data_aula: record.data,
        aluno_id: record.aluno_id,
        aluno_nome: record.alunos?.nome_completo || 'N/A',
        presente: record.presente,
        observacoes: record.observacoes,
        is_locked: record.is_locked,
        turma_nome: sessionData.turmas?.nome || 'N/A',
      })
    )

    // Calculate attendance percentage
    const attendance_percentage =
      sessionData.total_alunos > 0
        ? Math.round((sessionData.total_presentes / sessionData.total_alunos) * 100)
        : 0

    // Build detailed session object
    const detailedSession: DetailedSession = {
      id: sessionData.id,
      data_aula: sessionData.data_aula,
      turma_id: sessionData.turma_id,
      turma_nome: sessionData.turmas?.nome || 'N/A',
      turma_serie: sessionData.turmas?.serie || 'N/A',
      escola_id: sessionData.turmas?.escolas?.id || '',
      escola_nome: sessionData.turmas?.escolas?.nome || 'N/A',
      professor_id: sessionData.professor_id,
      professor_nome: sessionData.users?.nome || 'N/A',
      fase: sessionData.fase,
      bloqueado: sessionData.bloqueado,
      bloqueado_em: sessionData.bloqueado_em,
      observacoes: sessionData.observacoes,
      hash_integridade: sessionData.hash_integridade,
      total_alunos: sessionData.total_alunos || 0,
      total_presentes: sessionData.total_presentes || 0,
      total_ausentes: sessionData.total_ausentes || 0,
      created_at: sessionData.created_at,
      updated_at: sessionData.updated_at,
      attendance_records: attendanceRecords,
      attendance_percentage,
    }

    return { data: detailedSession, error: null }
  } catch (error) {
    console.error('Exception in getClassDetail:', error)
    return { data: null, error }
  }
}

/**
 * Get list of unique turmas (classes) that have diary entries
 * Useful for populating filter dropdowns
 *
 * @param professor_id - Optional professor filter
 * @param escola_id - Optional school filter
 * @returns Array of turma objects with basic info
 */
export async function getAvailableTurmas(
  professor_id?: string,
  escola_id?: string
): Promise<{ data: Array<{ id: string; nome: string; serie: string }> | null; error: any }> {
  const supabase = createClient()

  try {
    let query = supabase
      .from('aula_sessions')
      .select(`
        turma_id,
        turmas:turma_id (
          id,
          nome,
          serie,
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
      console.error('Error fetching available turmas:', error)
      return { data: null, error }
    }

    // Extract unique turmas
    const turmasMap = new Map()
    data?.forEach((session: any) => {
      if (session.turmas) {
        turmasMap.set(session.turmas.id, {
          id: session.turmas.id,
          nome: session.turmas.nome,
          serie: session.turmas.serie,
        })
      }
    })

    const uniqueTurmas = Array.from(turmasMap.values())

    return { data: uniqueTurmas, error: null }
  } catch (error) {
    console.error('Exception in getAvailableTurmas:', error)
    return { data: null, error }
  }
}
