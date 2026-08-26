import type { SupabaseClient } from '@supabase/supabase-js'
import { loadCanonicalAttendanceFacts } from '@/lib/api/canonical-attendance-facts'
import { logger } from '@/lib/logger'
import { supabase } from '@/lib/supabase'
import type { ResolvedAcademicYear } from '@/lib/services/academic-year'
import type { Database } from '@/types/database'

export interface DashboardStats {
  totalAlunos: number
  totalEscolas: number
  totalTurmas: number
  totalProfessores: number
  frequenciaGeral: number
}

export interface DashboardStatsOptions {
  escolaId: string
  academicYear: ResolvedAcademicYear
}

export class DashboardStatsApiService {
  constructor(private client: SupabaseClient<Database>) {}

  async getStats(options: DashboardStatsOptions): Promise<DashboardStats> {
    const { escolaId, academicYear } = options

    try {
      const { data: turmaRows, error: turmasError } = await this.client
        .from('turmas')
        .select('id, professor_id')
        .eq('escola_id', escolaId)
        .eq('ano_letivo', academicYear.year)
        .eq('ativo', true)

      if (turmasError) throw turmasError

      const turmaIds = (turmaRows ?? []).map(turma => turma.id)
      const professorIds = [...new Set(
        (turmaRows ?? []).map(turma => turma.professor_id).filter((id): id is string => Boolean(id))
      )]

      const schoolPromise = this.client
        .from('escolas')
        .select('id', { count: 'exact', head: true })
        .eq('id', escolaId)
        .eq('ativo', true)

      const matriculasPromise = turmaIds.length === 0
        ? Promise.resolve({ data: [], error: null })
        : this.client
            .from('matriculas')
            .select('id, aluno_id')
            .in('turma_id', turmaIds)
            .eq('ano_letivo', academicYear.year)
            .eq('situacao', 'ativa')

      const professoresPromise = professorIds.length === 0
        ? Promise.resolve({ count: 0, error: null })
        : this.client
            .from('users')
            .select('id', { count: 'exact', head: true })
            .in('id', professorIds)
            .eq('tipo_usuario', 'professor')
            .eq('ativo', true)

      const [schoolResult, matriculasResult, professoresResult] = await Promise.all([
        schoolPromise,
        matriculasPromise,
        professoresPromise,
      ])

      if (schoolResult.error) throw schoolResult.error
      if (matriculasResult.error) throw matriculasResult.error
      if (professoresResult.error) throw professoresResult.error

      const matriculas = matriculasResult.data ?? []
      const attendanceFacts = await loadCanonicalAttendanceFacts(
        this.client,
        matriculas.map(matricula => matricula.id),
        { startDate: academicYear.startDate, endDate: academicYear.endDate },
      )
      const presentes = attendanceFacts.filter(fact => fact.presente).length

      return {
        totalAlunos: new Set(matriculas.map(matricula => matricula.aluno_id)).size,
        totalEscolas: schoolResult.count ?? 0,
        totalTurmas: turmaIds.length,
        totalProfessores: professoresResult.count ?? 0,
        frequenciaGeral: attendanceFacts.length === 0
          ? 0
          : Number(((presentes / attendanceFacts.length) * 100).toFixed(1)),
      }
    } catch (error) {
      logger.error('DASHBOARD_STATS_LOAD_FAILED', error as Error, {
        feature: 'dashboard',
        action: 'load_stats',
        metadata: { escolaId, academicYear: academicYear.year },
      })
      throw error
    }
  }
}

export function createDashboardStatsApi(client: SupabaseClient<Database>) {
  return new DashboardStatsApiService(client)
}

export const dashboardStatsApi = createDashboardStatsApi(supabase)
