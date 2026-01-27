/**
 * React Query hooks for Diario de Classe feature
 * Task 5.2.3: Optimize queries with React Query caching
 *
 * Provides cached data fetching with:
 * - Automatic background refetching
 * - Deduplication of concurrent requests
 * - Optimistic updates for attendance
 * - Stale time configured for educational data
 *
 * @see openspec/changes/2025-12-04-diario-de-classe/PERFORMANCE-AUDIT.md
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { toast } from 'sonner'
import type { AttendanceStatus } from '@/components/attendance/AttendanceCell'

// ============================================================================
// Types
// ============================================================================

export interface Turma {
  id: string
  nome: string
  serie: string
  ano_letivo: number
  escola_id: string
  professor_id?: string
}

export interface LessonSummary {
  id: string
  data_aula: string
  tema: string
  disciplina?: string | null
  resumo?: string | null
  objetivo?: string | null
  total_alunos: number
  total_presentes: number
  total_ausentes: number
  total_atestados: number
  status: string
}

export interface LessonDetail extends LessonSummary {
  sessao_id?: string
  metodologia?: string | null
  recursos?: string | null
  observacoes?: string | null
  habilidades_bncc?: string[]
  professor_nome?: string
  turma_nome?: string
}

export interface SessionInfo {
  id: string
  turma_id: string
  data_aula: string
  status: 'PLANEJADA' | 'ABERTA' | 'FECHADA' | 'CANCELADA'
  professor_id: string
  escola_id: string
}

export interface StudentAttendance {
  id: string
  aluno_id: string
  matricula_id: string
  nome_completo: string
  data_nascimento: string
  foto_url?: string
  status_presenca: AttendanceStatus
  horario_marcacao?: string
  is_locked: boolean
}

export interface StudentAtRisk {
  id: string
  nome: string
  nis?: string
  frequenciaPercentual: number
  totalFaltas: number
  totalAtestados: number
  matriculaId: string
}

// ============================================================================
// Query Keys - Extend existing queryKeys
// ============================================================================

export const diaryQueryKeys = {
  // Turmas
  turmas: {
    all: () => ['diary', 'turmas'] as const,
    list: (filters?: { escolaId?: string; professorId?: string }) =>
      [...diaryQueryKeys.turmas.all(), 'list', filters] as const,
  },

  // Lessons/Sessions
  lessons: {
    all: () => ['diary', 'lessons'] as const,
    list: (turmaId: string) => [...diaryQueryKeys.lessons.all(), 'list', turmaId] as const,
    detail: (lessonId: string) => [...diaryQueryKeys.lessons.all(), 'detail', lessonId] as const,
  },

  // Sessions
  sessions: {
    all: () => ['diary', 'sessions'] as const,
    byTurmaDate: (turmaId: string, date: string) =>
      [...diaryQueryKeys.sessions.all(), turmaId, date] as const,
  },

  // Attendance
  attendance: {
    all: () => ['diary', 'attendance'] as const,
    bySession: (sessionId: string) =>
      [...diaryQueryKeys.attendance.all(), 'session', sessionId] as const,
    students: (turmaId: string) =>
      [...diaryQueryKeys.attendance.all(), 'students', turmaId] as const,
  },

  // Risk
  risk: {
    all: () => ['diary', 'risk'] as const,
    byTurma: (turmaId: string) => [...diaryQueryKeys.risk.all(), turmaId] as const,
  },
}

// ============================================================================
// Hooks: Turmas
// ============================================================================

interface UseTurmasOptions {
  escolaId?: string
  professorId?: string
  enabled?: boolean
}

export function useTurmas(options: UseTurmasOptions = {}) {
  const { escolaId, professorId, enabled = true } = options

  return useQuery({
    queryKey: diaryQueryKeys.turmas.list({ escolaId, professorId }),
    queryFn: async (): Promise<Turma[]> => {
      let query = supabase
        .from('turmas')
        .select('id, nome, serie, ano_letivo, escola_id, professor_id')
        .eq('ativo', true)
        .order('nome')

      if (escolaId) {
        query = query.eq('escola_id', escolaId)
      }

      if (professorId) {
        query = query.eq('professor_id', professorId)
      }

      const { data, error } = await query

      if (error) {
        logger.error('Error loading turmas:', error, {
          feature: 'diary-query',
          action: 'load_turmas',
        })
        throw error
      }

      return (data || []) as Turma[]
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - turmas rarely change
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled,
  })
}

// ============================================================================
// Hooks: Lessons (Sessions with Content and Stats)
// ============================================================================

interface UseLessonsOptions {
  turmaId: string
  limit?: number
  enabled?: boolean
}

export function useLessons(options: UseLessonsOptions) {
  const { turmaId, limit = 50, enabled = true } = options

  return useQuery({
    queryKey: diaryQueryKeys.lessons.list(turmaId),
    queryFn: async (): Promise<LessonSummary[]> => {
      // Get sessions with content
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessoes_aula')
        .select(`
          id,
          data_aula,
          conteudo_programatico,
          status,
          turma_id
        `)
        .eq('turma_id', turmaId)
        .order('data_aula', { ascending: false })
        .limit(limit)

      if (sessionsError) {
        logger.error('Error loading sessions:', sessionsError, {
          feature: 'diary-query',
          action: 'load_lessons',
        })
        throw sessionsError
      }

      if (!sessions || sessions.length === 0) {
        return []
      }

      // Batch load content and attendance for all sessions
      const sessionIds = sessions.map((s) => s.id)

      // Try to load content (table might not exist)
      let contentMap = new Map<string, any>()
      try {
        const { data: content } = await (supabase as any)
          .from('conteudo_aula')
          .select('sessao_id, tema, objetivo, observacoes')
          .in('sessao_id', sessionIds)

        if (content) {
          content.forEach((c: any) => contentMap.set(c.sessao_id, c))
        }
      } catch {
        // Content table might not exist yet
      }

      // Load attendance stats for all sessions in one query
      const { data: attendance } = await supabase
        .from('frequencia')
        .select('sessao_id, presente, status_presenca')
        .in('sessao_id', sessionIds)

      // Aggregate attendance by session
      const attendanceStats = new Map<
        string,
        { total: number; presentes: number; ausentes: number; atestados: number }
      >()

      if (attendance) {
        attendance.forEach((a: any) => {
          const stats = attendanceStats.get(a.sessao_id) || {
            total: 0,
            presentes: 0,
            ausentes: 0,
            atestados: 0,
          }

          stats.total++
          if (a.status_presenca === 'P' || (a.presente && !a.status_presenca)) {
            stats.presentes++
          } else if (a.status_presenca === 'F' || (!a.presente && !a.status_presenca)) {
            stats.ausentes++
          } else if (a.status_presenca === 'A') {
            stats.atestados++
          }

          attendanceStats.set(a.sessao_id, stats)
        })
      }

      // Build lesson summaries
      return sessions.map((session: any): LessonSummary => {
        const content = contentMap.get(session.id)
        const stats = attendanceStats.get(session.id) || {
          total: 0,
          presentes: 0,
          ausentes: 0,
          atestados: 0,
        }

        return {
          id: session.id,
          data_aula: session.data_aula,
          tema: content?.tema || session.conteudo_programatico || 'Aula registrada',
          disciplina: null,
          resumo: content?.objetivo || null,
          objetivo: content?.objetivo || null,
          total_alunos: stats.total,
          total_presentes: stats.presentes,
          total_ausentes: stats.ausentes,
          total_atestados: stats.atestados,
          status: session.status,
        }
      })
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - lessons change more frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: enabled && !!turmaId,
  })
}

// ============================================================================
// Hooks: Lesson Detail
// ============================================================================

export function useLessonDetail(lessonId: string | null) {
  return useQuery({
    queryKey: diaryQueryKeys.lessons.detail(lessonId || ''),
    queryFn: async (): Promise<LessonDetail | null> => {
      if (!lessonId) return null

      // Get session data
      const { data: session, error: sessionError } = await supabase
        .from('sessoes_aula')
        .select(`
          id,
          data_aula,
          status,
          turma_id,
          conteudo_programatico,
          turmas (
            id,
            nome,
            serie
          )
        `)
        .eq('id', lessonId)
        .single()

      if (sessionError) {
        logger.error('Error loading session detail:', sessionError, {
          feature: 'diary-query',
          action: 'load_lesson_detail',
        })
        throw sessionError
      }

      // Try to get content
      let content: any = null
      try {
        const { data: contentData } = await (supabase as any)
          .from('conteudo_aula')
          .select('id, tema, objetivo, metodologia, recursos, observacoes, habilidades_bncc')
          .eq('sessao_id', lessonId)
          .maybeSingle()

        content = contentData
      } catch {
        // Content table might not exist
      }

      // Get attendance stats
      const { data: attendance } = await supabase
        .from('frequencia')
        .select('presente, status_presenca')
        .eq('sessao_id', lessonId)

      let total = 0,
        presentes = 0,
        ausentes = 0,
        atestados = 0
      if (attendance) {
        attendance.forEach((a: any) => {
          total++
          if (a.status_presenca === 'P' || (a.presente && !a.status_presenca)) {
            presentes++
          } else if (a.status_presenca === 'F' || (!a.presente && !a.status_presenca)) {
            ausentes++
          } else if (a.status_presenca === 'A') {
            atestados++
          }
        })
      }

      const turma = session.turmas as { id: string; nome: string; serie: string } | null

      return {
        id: session.id,
        sessao_id: session.id,
        data_aula: session.data_aula,
        tema: content?.tema || session.conteudo_programatico || 'Aula registrada',
        disciplina: null,
        objetivo: content?.objetivo || null,
        metodologia: content?.metodologia || null,
        recursos: content?.recursos || null,
        observacoes: content?.observacoes || null,
        habilidades_bncc: content?.habilidades_bncc || [],
        total_alunos: total,
        total_presentes: presentes,
        total_ausentes: ausentes,
        total_atestados: atestados,
        status: session.status,
        turma_nome: turma?.nome,
      }
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!lessonId,
  })
}

// ============================================================================
// Hooks: Session by Turma and Date
// ============================================================================

interface UseSessionOptions {
  turmaId: string
  date: string // YYYY-MM-DD format
  enabled?: boolean
}

export function useSession(options: UseSessionOptions) {
  const { turmaId, date, enabled = true } = options

  return useQuery({
    queryKey: diaryQueryKeys.sessions.byTurmaDate(turmaId, date),
    queryFn: async (): Promise<SessionInfo | null> => {
      const { data, error } = await supabase
        .from('sessoes_aula')
        .select('id, turma_id, data_aula, status, professor_id, escola_id')
        .eq('turma_id', turmaId)
        .eq('data_aula', date)
        .maybeSingle()

      if (error) {
        logger.error('Error loading session:', error, {
          feature: 'diary-query',
          action: 'load_session',
        })
        throw error
      }

      return data as SessionInfo | null
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: enabled && !!turmaId && !!date,
  })
}

// ============================================================================
// Hooks: Students at Risk
// ============================================================================

export function useStudentsAtRisk(turmaId: string | null) {
  return useQuery({
    queryKey: diaryQueryKeys.risk.byTurma(turmaId || ''),
    queryFn: async (): Promise<StudentAtRisk[]> => {
      if (!turmaId) return []

      // Get all matriculas in the turma with their student info
      const { data: matriculas, error: matriculasError } = await supabase
        .from('matriculas')
        .select(`
          id,
          aluno_id,
          turma_id,
          situacao,
          alunos (
            id,
            nome_completo
          )
        `)
        .eq('turma_id', turmaId)
        .eq('situacao', 'ativa')

      if (matriculasError) {
        logger.error('Error loading matriculas for risk:', matriculasError, {
          feature: 'diary-query',
          action: 'load_risk',
        })
        throw matriculasError
      }

      if (!matriculas || matriculas.length === 0) {
        return []
      }

      // Get attendance records for these matriculas
      const matriculaIds = matriculas.map((m) => m.id)
      const { data: attendance, error: attendanceError } = await supabase
        .from('frequencia')
        .select('matricula_id, presente, status_presenca')
        .in('matricula_id', matriculaIds)

      if (attendanceError) {
        logger.error('Error loading attendance for risk:', attendanceError, {
          feature: 'diary-query',
          action: 'load_risk_attendance',
        })
        throw attendanceError
      }

      // Calculate attendance percentage for each student
      const studentsAtRisk: StudentAtRisk[] = []

      for (const matricula of matriculas) {
        const studentAttendance = attendance?.filter((a) => a.matricula_id === matricula.id) || []
        const total = studentAttendance.length

        if (total === 0) continue // Skip students with no attendance records

        const presentes = studentAttendance.filter(
          (a) => a.status_presenca === 'P' || (a.presente && !a.status_presenca)
        ).length
        const atestados = studentAttendance.filter((a) => a.status_presenca === 'A').length
        const faltas = studentAttendance.filter(
          (a) => a.status_presenca === 'F' || (!a.presente && !a.status_presenca)
        ).length

        // Calculate attendance rate (presentes + atestados count as attended)
        const attended = presentes + atestados
        const percentage = Math.round((attended / total) * 100)

        // Only include students below 80% threshold
        if (percentage < 80) {
          const aluno = matricula.alunos as { id: string; nome_completo: string } | null
          studentsAtRisk.push({
            id: aluno?.id || matricula.aluno_id,
            nome: aluno?.nome_completo || 'Aluno',
            nis: undefined,
            frequenciaPercentual: percentage,
            totalFaltas: faltas,
            totalAtestados: atestados,
            matriculaId: matricula.id,
          })
        }
      }

      // Sort by percentage (lowest first)
      return studentsAtRisk.sort((a, b) => a.frequenciaPercentual - b.frequenciaPercentual)
    },
    staleTime: 3 * 60 * 1000, // 3 minutes - risk doesn't change often
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!turmaId,
  })
}

// ============================================================================
// Mutations: Create Session
// ============================================================================

interface CreateSessionParams {
  turmaId: string
  date: string
  professorId: string
  escolaId: string
  conteudo?: string
}

export function useCreateSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CreateSessionParams): Promise<SessionInfo> => {
      const { data, error } = await supabase
        .from('sessoes_aula')
        .insert({
          turma_id: params.turmaId,
          data_aula: params.date,
          status: 'ABERTA',
          professor_id: params.professorId,
          escola_id: params.escolaId,
          conteudo_programatico: params.conteudo || `Aula do dia ${params.date}`,
        })
        .select('id, turma_id, data_aula, status, professor_id, escola_id')
        .single()

      if (error) {
        logger.error('Error creating session:', error, {
          feature: 'diary-query',
          action: 'create_session',
        })
        throw error
      }

      return data as SessionInfo
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: diaryQueryKeys.sessions.byTurmaDate(variables.turmaId, variables.date),
      })
      queryClient.invalidateQueries({
        queryKey: diaryQueryKeys.lessons.list(variables.turmaId),
      })
      toast.success('Sessao de aula criada com sucesso')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar sessao de aula')
    },
  })
}

// ============================================================================
// Mutations: Delete Lesson
// ============================================================================

export function useDeleteLesson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      lessonId,
      turmaId,
    }: {
      lessonId: string
      turmaId: string
    }): Promise<void> => {
      // Try to delete associated content first
      try {
        await (supabase as any).from('conteudo_aula').delete().eq('sessao_id', lessonId)
      } catch {
        // Content table might not exist
      }

      // Delete the session
      const { error } = await supabase.from('sessoes_aula').delete().eq('id', lessonId)

      if (error) {
        logger.error('Error deleting lesson:', error, {
          feature: 'diary-query',
          action: 'delete_lesson',
        })
        throw error
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: diaryQueryKeys.lessons.list(variables.turmaId),
      })
      queryClient.removeQueries({
        queryKey: diaryQueryKeys.lessons.detail(variables.lessonId),
      })
      toast.success('Aula excluida com sucesso')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir aula')
    },
  })
}

// ============================================================================
// Cache Invalidation Helpers
// ============================================================================

export const invalidateDiaryQueries = {
  turmas: () => {
    const queryClient = useQueryClient()
    return queryClient.invalidateQueries({ queryKey: diaryQueryKeys.turmas.all() })
  },

  lessons: (turmaId?: string) => {
    const queryClient = useQueryClient()
    if (turmaId) {
      return queryClient.invalidateQueries({
        queryKey: diaryQueryKeys.lessons.list(turmaId),
      })
    }
    return queryClient.invalidateQueries({ queryKey: diaryQueryKeys.lessons.all() })
  },

  session: (turmaId: string, date: string) => {
    const queryClient = useQueryClient()
    return queryClient.invalidateQueries({
      queryKey: diaryQueryKeys.sessions.byTurmaDate(turmaId, date),
    })
  },

  risk: (turmaId?: string) => {
    const queryClient = useQueryClient()
    if (turmaId) {
      return queryClient.invalidateQueries({
        queryKey: diaryQueryKeys.risk.byTurma(turmaId),
      })
    }
    return queryClient.invalidateQueries({ queryKey: diaryQueryKeys.risk.all() })
  },

  all: () => {
    const queryClient = useQueryClient()
    return queryClient.invalidateQueries({ queryKey: ['diary'] })
  },
}
