import type { SupabaseClient } from '@supabase/supabase-js'
import {
  loadCanonicalAttendanceFacts,
  type CanonicalAttendanceFact,
} from '@/lib/api/canonical-attendance-facts'
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

export interface DashboardClass {
  id: string
  professorId: string | null
}

export interface DashboardEnrollment {
  id: string
  studentId: string
}

export interface DashboardStatsReader {
  getActiveClasses(escolaId: string, academicYear: number): Promise<DashboardClass[]>
  getActiveSchoolCount(escolaId: string): Promise<number>
  getActiveEnrollments(classIds: string[], academicYear: number): Promise<DashboardEnrollment[]>
  getActiveTeacherCount(teacherIds: string[]): Promise<number>
  getAttendanceFacts(
    enrollmentIds: string[],
    period: Pick<ResolvedAcademicYear, 'startDate' | 'endDate'>,
  ): Promise<CanonicalAttendanceFact[]>
}

function getTeacherIds(classes: DashboardClass[]): string[] {
  return [...new Set(classes.flatMap((turma) => turma.professorId ? [turma.professorId] : []))]
}

function getAttendancePercentage(facts: CanonicalAttendanceFact[]): number {
  if (facts.length === 0) return 0

  const presentes = facts.filter((fact) => fact.presente).length
  return Number(((presentes / facts.length) * 100).toFixed(1))
}

export class DashboardStatsApiService {
  constructor(private readonly reader: DashboardStatsReader) {}

  async getStats({ escolaId, academicYear }: DashboardStatsOptions): Promise<DashboardStats> {
    try {
      const classes = await this.reader.getActiveClasses(escolaId, academicYear.year)
      const classIds = classes.map((turma) => turma.id)
      const teacherIds = getTeacherIds(classes)
      const [totalEscolas, enrollments, totalProfessores] = await Promise.all([
        this.reader.getActiveSchoolCount(escolaId),
        this.reader.getActiveEnrollments(classIds, academicYear.year),
        this.reader.getActiveTeacherCount(teacherIds),
      ])
      const facts = await this.reader.getAttendanceFacts(
        enrollments.map((matricula) => matricula.id),
        academicYear,
      )

      return {
        totalAlunos: new Set(enrollments.map((matricula) => matricula.studentId)).size,
        totalEscolas,
        totalTurmas: classIds.length,
        totalProfessores,
        frequenciaGeral: getAttendancePercentage(facts),
      }
    } catch (error) {
      logger.error(
        'DASHBOARD_STATS_LOAD_FAILED',
        error instanceof Error ? error : new Error(String(error)),
        {
          feature: 'dashboard',
          action: 'load_stats',
          metadata: { escolaId, academicYear: academicYear.year },
        },
      )
      throw error
    }
  }
}

class SupabaseDashboardStatsReader implements DashboardStatsReader {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async getActiveClasses(escolaId: string, academicYear: number): Promise<DashboardClass[]> {
    const { data, error } = await this.client
      .from('turmas')
      .select('id, professor_id')
      .eq('escola_id', escolaId)
      .eq('ano_letivo', academicYear)
      .eq('ativo', true)

    if (error) throw error

    return (data ?? []).map((turma) => ({
      id: turma.id,
      professorId: turma.professor_id,
    }))
  }

  async getActiveSchoolCount(escolaId: string): Promise<number> {
    const { count, error } = await this.client
      .from('escolas')
      .select('id', { count: 'exact', head: true })
      .eq('id', escolaId)
      .eq('ativo', true)

    if (error) throw error

    return count ?? 0
  }

  async getActiveEnrollments(classIds: string[], academicYear: number): Promise<DashboardEnrollment[]> {
    if (classIds.length === 0) return []

    const { data, error } = await this.client
      .from('matriculas')
      .select('id, aluno_id')
      .in('turma_id', classIds)
      .eq('ano_letivo', academicYear)
      .eq('situacao', 'ativa')

    if (error) throw error

    return (data ?? []).map((matricula) => ({
      id: matricula.id,
      studentId: matricula.aluno_id,
    }))
  }

  async getActiveTeacherCount(teacherIds: string[]): Promise<number> {
    if (teacherIds.length === 0) return 0

    const { count, error } = await this.client
      .from('users')
      .select('id', { count: 'exact', head: true })
      .in('id', teacherIds)
      .eq('tipo_usuario', 'professor')
      .eq('ativo', true)

    if (error) throw error

    return count ?? 0
  }

  getAttendanceFacts(
    enrollmentIds: string[],
    { startDate, endDate }: Pick<ResolvedAcademicYear, 'startDate' | 'endDate'>,
  ): Promise<CanonicalAttendanceFact[]> {
    return loadCanonicalAttendanceFacts(this.client, enrollmentIds, { startDate, endDate })
  }
}

export function createDashboardStatsService(reader: DashboardStatsReader) {
  return new DashboardStatsApiService(reader)
}

export function createDashboardStatsApi(client: SupabaseClient<Database>) {
  return createDashboardStatsService(new SupabaseDashboardStatsReader(client))
}

export const dashboardStatsApi = createDashboardStatsApi(supabase)
