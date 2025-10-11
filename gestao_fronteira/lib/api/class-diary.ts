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
 * Data Source: aulas_abertas table (with frequencia relationship)
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
  escola_id: string
  escola_nome: string
  professor_id: string
  professor_nome: string
  disciplina: string | null
  status: 'aberta' | 'fechada' | 'travada'
  observacoes_abertura: string | null
  observacoes_fechamento: string | null
  total_alunos: number
  total_presentes: number
  total_ausentes: number
  aberta_em: string
  fechada_em: string | null
  travada_em: string | null
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
  observacao: string | null
  turma_nome: string
}

/**
 * Interface: Detailed Session View
 * Complete information about a specific class session
 */
export interface DetailedSession extends ClassDiaryEntry {
  attendance_records: AttendanceHistoryRecord[]
  attendance_percentage: number
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
): Promise<{ data: ClassDiaryEntry[] | null; error: any }> {
  try {

    // Build query with relationships
    let query = supabase
      .from('aulas_abertas')
      .select(`
        id,
        data_aula,
        turma_id,
        professor_id,
        disciplina,
        status,
        observacoes_abertura,
        observacoes_fechamento,
        aberta_em,
        fechada_em,
        travada_em,
        turmas!inner(
          id,
          nome,
          ano,
          escola_id,
          escolas!inner(
            id,
            nome
          )
        ),
        users!inner(
          id,
          name
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
      query = query.eq('disciplina', filters.disciplina)
    }

    if (filters.status) {
      query = query.eq('status', filters.status)
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

    const { data: aulas, error } = await query

    if (error) {
      logger.error('Error fetching class diary', error as Error, { feature: 'class-diary', action: 'fetch_diary' })
      return { data: null, error }
    }

    if (!aulas || aulas.length === 0) {
      return { data: [], error: null }
    }

    // Fetch attendance statistics for each aula
    const aulaIds = aulas.map((a) => a.id)
    const { data: frequencias } = await supabase
      .from('frequencia')
      .select('aula_id, presente')
      .in('aula_id', aulaIds)

    // Build frequency map
    const frequenciaMap = new Map<string, { presentes: number; ausentes: number; total: number }>()
    frequencias?.forEach((freq) => {
      if (!frequenciaMap.has(freq.aula_id)) {
        frequenciaMap.set(freq.aula_id, { presentes: 0, ausentes: 0, total: 0 })
      }
      const stats = frequenciaMap.get(freq.aula_id)!
      stats.total++
      if (freq.presente) {
        stats.presentes++
      } else {
        stats.ausentes++
      }
    })

    // Transform data to match ClassDiaryEntry interface
    const transformedData: ClassDiaryEntry[] = (aulas as any[]).map((aula) => {
      const stats = frequenciaMap.get(aula.id) || { presentes: 0, ausentes: 0, total: 0 }
      const turma = aula.turmas as any
      const escola = turma?.escolas as any
      const professor = aula.users as any

      return {
        id: aula.id,
        data_aula: aula.data_aula,
        turma_id: aula.turma_id,
        turma_nome: turma?.nome || 'N/A',
        turma_ano: turma?.ano || 1,
        escola_id: escola?.id || '',
        escola_nome: escola?.nome || 'N/A',
        professor_id: aula.professor_id,
        professor_nome: professor?.name || 'N/A',
        disciplina: aula.disciplina,
        status: aula.status,
        observacoes_abertura: aula.observacoes_abertura,
        observacoes_fechamento: aula.observacoes_fechamento,
        total_alunos: stats.total,
        total_presentes: stats.presentes,
        total_ausentes: stats.ausentes,
        aberta_em: aula.aberta_em,
        fechada_em: aula.fechada_em,
        travada_em: aula.travada_em,
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
): Promise<{ data: AttendanceHistoryRecord[] | null; error: any }> {
  try {

    let query = supabase
      .from('frequencia')
      .select(`
        id,
        aula_id,
        data,
        aluno_id,
        presente,
        observacao,
        alunos!inner(
          id,
          nome_completo
        ),
        aulas_abertas!inner(
          id,
          turma_id,
          turmas!inner(
            nome
          )
        )
      `)
      .eq('aluno_id', aluno_id)
      .eq('aulas_abertas.turma_id', turma_id)

    if (date_from) {
      query = query.gte('data', date_from)
    }

    if (date_to) {
      query = query.lte('data', date_to)
    }

    query = query.order('data', { ascending: true })

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching attendance history', error as Error, { feature: 'class-diary', action: 'fetch_attendance_history' })
      return { data: null, error }
    }

    // Transform data
    const transformedData: AttendanceHistoryRecord[] = (data || []).map((record: any) => ({
      id: record.id,
      aula_id: record.aula_id,
      data: record.data,
      aluno_id: record.aluno_id,
      aluno_nome: record.alunos?.nome_completo || 'N/A',
      presente: record.presente,
      observacao: record.observacao,
      turma_nome: record.aulas_abertas?.turmas?.nome || 'N/A',
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
 * @param aula_id - Aula UUID
 * @returns DetailedSession object or null
 *
 * @example
 * const session = await getClassDetail(supabase, 'aula-uuid')
 */
export async function getClassDetail(
  supabase: SupabaseClient<Database>,
  aula_id: string
): Promise<{ data: DetailedSession | null; error: any }> {
  try {

    // Fetch aula data
    const { data: aulaData, error: aulaError } = await supabase
      .from('aulas_abertas')
      .select(`
        id,
        data_aula,
        turma_id,
        professor_id,
        disciplina,
        status,
        observacoes_abertura,
        observacoes_fechamento,
        aberta_em,
        fechada_em,
        travada_em,
        turmas!inner(
          id,
          nome,
          ano,
          escola_id,
          escolas!inner(
            id,
            nome
          )
        ),
        users!inner(
          id,
          name
        )
      `)
      .eq('id', aula_id)
      .single()

    if (aulaError || !aulaData) {
      logger.error('Error fetching aula', aulaError as Error, { feature: 'class-diary', action: 'fetch_aula_detail' })
      return { data: null, error: aulaError }
    }

    // Fetch attendance records for this aula
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('frequencia')
      .select(`
        id,
        aula_id,
        data,
        aluno_id,
        presente,
        observacao,
        alunos!inner(
          id,
          nome_completo
        )
      `)
      .eq('aula_id', aula_id)
      .order('alunos(nome_completo)', { ascending: true })

    if (attendanceError) {
      logger.error('Error fetching attendance records', attendanceError as Error, { feature: 'class-diary', action: 'fetch_attendance_records' })
      return { data: null, error: attendanceError }
    }

    // Calculate attendance statistics
    const totalAlunos = attendanceData?.length || 0
    const totalPresentes = attendanceData?.filter(r => r.presente).length || 0
    const totalAusentes = totalAlunos - totalPresentes

    // Type assertions for relationships
    const aula = aulaData as any
    const turma = aula.turmas as any
    const escola = turma?.escolas as any
    const professor = aula.users as any

    // Transform attendance records
    const attendanceRecords: AttendanceHistoryRecord[] = (attendanceData || []).map(
      (record: any) => ({
        id: record.id,
        aula_id: record.aula_id,
        data: record.data,
        aluno_id: record.aluno_id,
        aluno_nome: record.alunos?.nome_completo || 'N/A',
        presente: record.presente,
        observacao: record.observacao,
        turma_nome: turma?.nome || 'N/A',
      })
    )

    // Calculate attendance percentage
    const attendance_percentage =
      totalAlunos > 0
        ? Math.round((totalPresentes / totalAlunos) * 100)
        : 0

    // Build detailed session object
    const detailedSession: DetailedSession = {
      id: aula.id,
      data_aula: aula.data_aula,
      turma_id: aula.turma_id,
      turma_nome: turma?.nome || 'N/A',
      turma_ano: turma?.ano || 1,
      escola_id: escola?.id || '',
      escola_nome: escola?.nome || 'N/A',
      professor_id: aula.professor_id,
      professor_nome: professor?.name || 'N/A',
      disciplina: aula.disciplina,
      status: aula.status,
      observacoes_abertura: aula.observacoes_abertura,
      observacoes_fechamento: aula.observacoes_fechamento,
      total_alunos: totalAlunos,
      total_presentes: totalPresentes,
      total_ausentes: totalAusentes,
      aberta_em: aula.aberta_em,
      fechada_em: aula.fechada_em,
      travada_em: aula.travada_em,
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
): Promise<{ data: Array<{ id: string; nome: string; ano: number }> | null; error: any }> {
  try {

    let query = supabase
      .from('aulas_abertas')
      .select(`
        turma_id,
        turmas!inner(
          id,
          nome,
          ano,
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
    const turmasMap = new Map()
    data?.forEach((aula: any) => {
      if (aula.turmas) {
        turmasMap.set(aula.turmas.id, {
          id: aula.turmas.id,
          nome: aula.turmas.nome,
          ano: aula.turmas.ano,
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
