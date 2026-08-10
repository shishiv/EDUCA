import { supabase } from '@/lib/supabase'
import { loadCanonicalAttendanceFacts } from '@/lib/api/canonical-attendance-facts'
import { logger } from '@/lib/logger'

/** Dashboard indicators calculated from active records and canonical attendance. */
export interface DashboardStats {
  totalAlunos: number
  totalEscolas: number
  totalTurmas: number
  totalProfessores: number
  frequenciaGeral: number
}

/** Optional school scope for dashboard indicators. */
export interface DashboardStatsOptions {
  escolaId?: string
  includeInactive?: boolean
}

/** Loads dashboard indicators without sampling or synthesizing attendance data. */
export class DashboardStatsApiService {
  async getStats(options: DashboardStatsOptions = {}): Promise<DashboardStats> {
    const { escolaId, includeInactive = false } = options

    try {
      const [
        totalAlunos,
        totalEscolas,
        totalTurmas,
        totalProfessores,
        attendanceFacts,
      ] = await Promise.all([
        this.countAlunos(escolaId, includeInactive),
        this.countEscolas(escolaId, includeInactive),
        this.countTurmas(escolaId, includeInactive),
        this.countProfessores(escolaId, includeInactive),
        this.loadAttendanceFacts(escolaId),
      ])

      const presentes = attendanceFacts.filter(fact => fact.presente).length
      const frequenciaGeral = attendanceFacts.length === 0
        ? 0
        : Number(((presentes / attendanceFacts.length) * 100).toFixed(1))

      return {
        totalAlunos,
        totalEscolas,
        totalTurmas,
        totalProfessores,
        frequenciaGeral,
      }
    } catch (error) {
      logger.error('DASHBOARD_STATS_LOAD_FAILED', error as Error, {
        feature: 'dashboard',
        action: 'load_stats',
        metadata: { escolaId, includeInactive },
      })
      throw error
    }
  }

  /** Counts active students, scoped through active enrollments when needed. */
  private async countAlunos(escolaId?: string, includeInactive = false): Promise<number> {
    if (!escolaId) {
      let query = supabase.from('alunos').select('id', { count: 'exact', head: true })
      if (!includeInactive) query = query.eq('ativo', true)
      const { count, error } = await query
      if (error) throw error
      return count ?? 0
    }

    const turmaIds = await this.loadActiveTurmaIds(escolaId)
    if (turmaIds.length === 0) return 0

    const { count, error } = await supabase
      .from('matriculas')
      .select('aluno_id', { count: 'exact', head: true })
      .eq('situacao', 'ativa')
      .in('turma_id', turmaIds)

    if (error) throw error
    return count ?? 0
  }

  /** Counts active schools in the current dashboard scope. */
  private async countEscolas(escolaId?: string, includeInactive = false): Promise<number> {
    let query = supabase.from('escolas').select('id', { count: 'exact', head: true })
    if (escolaId) query = query.eq('id', escolaId)
    if (!includeInactive) query = query.eq('ativo', true)

    const { count, error } = await query
    if (error) throw error
    return count ?? 0
  }

  /** Counts active classes in the current dashboard scope. */
  private async countTurmas(escolaId?: string, includeInactive = false): Promise<number> {
    let query = supabase.from('turmas').select('id', { count: 'exact', head: true })
    if (escolaId) query = query.eq('escola_id', escolaId)
    if (!includeInactive) query = query.eq('ativo', true)

    const { count, error } = await query
    if (error) throw error
    return count ?? 0
  }

  /** Counts active teacher profiles instead of using the enrollment total. */
  private async countProfessores(escolaId?: string, includeInactive = false): Promise<number> {
    let query = supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('tipo_usuario', 'professor')

    if (escolaId) query = query.eq('escola_id', escolaId)
    if (!includeInactive) query = query.eq('ativo', true)

    const { count, error } = await query
    if (error) throw error
    return count ?? 0
  }

  /** Loads active class identifiers for a school-scoped attendance query. */
  private async loadActiveTurmaIds(escolaId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('turmas')
      .select('id')
      .eq('escola_id', escolaId)
      .eq('ativo', true)

    if (error) throw error
    return (data ?? []).map(turma => turma.id)
  }

  /** Loads canonical attendance for active enrollments in the requested scope. */
  private async loadAttendanceFacts(escolaId?: string) {
    let query = supabase
      .from('matriculas')
      .select('id')
      .eq('situacao', 'ativa')

    if (escolaId) {
      const turmaIds = await this.loadActiveTurmaIds(escolaId)
      if (turmaIds.length === 0) return []
      query = query.in('turma_id', turmaIds)
    }

    const { data, error } = await query
    if (error) throw error

    return loadCanonicalAttendanceFacts(supabase, (data ?? []).map(matricula => matricula.id))
  }
}

/** Singleton dashboard stats service used by the dashboard client page. */
export const dashboardStatsApi = new DashboardStatsApiService()
