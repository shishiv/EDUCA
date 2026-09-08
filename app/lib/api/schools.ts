/**
 * Schools API Service - school CRUD, dashboard, statistics, and director assignment.
 *
 * ## Authentication & RLS
 *
 * Uses the browser Supabase client.  `escolas` table RLS policies scope
 * visibility: school-bound users see only their own escola; secretariat
 * users see all active schools.
 *
 * ## Audit
 *
 * Mutations use governed RPCs that resolve the actor and commit the school
 * change together with its audit receipt; a failed audit rolls back the change.
 *
 * ## Mode availability
 *
 * All modes.  Demo sandbox allows reads and simulated writes (no-op for
 * destructive operations like deactivation).
 *
 * @module api/schools
 */
import { BaseApiService } from './base'
import { supabase } from '@/lib/supabase'
import type { SchoolFormData } from '@/lib/validation/brazilian'
import { logger } from '@/lib/logger'
import { getCurrentUtcMonthRange } from '@/lib/date-utils'
import { loadCanonicalAttendanceFacts } from './canonical-attendance-facts'
import {
  assignGovernedSchoolDirector,
  createGovernedSchool,
  updateGovernedSchool,
} from './governed-management'

export class SchoolsApiService extends BaseApiService<'escolas'> {
  constructor() {
    super('escolas')
  }

  // Get schools with related data
  async getSchoolsWithDetails(options?: {
    filter?: Record<string, string | number | boolean | null | undefined>
    searchTerm?: string
    types?: ('creche' | 'pre_escola' | 'fundamental')[]
    activeOnly?: boolean
    limit?: number
    offset?: number
  }) {
    try {
      let query = supabase
        .from('escolas')
        .select(`
          *,
          diretor:users!diretor_id(
            id,
            nome,
            email,
            tipo_usuario
          ),
          turmas(
            id,
            nome,
            serie,
            capacidade,
            turno,
            professor:users!professor_id(
              id,
              nome,
              email
            )
          )
        `)

      const applyBaseFilters = () => {
        if (options?.activeOnly !== false) query = query.eq('ativo', true)
        Object.entries(options?.filter ?? {}).forEach(([key, value]) => {
          if (value !== undefined && value !== null) query = query.eq(key, value)
        })
      }

      const applySearchAndPagination = () => {
        if (options?.types?.length) query = query.in('tipo', options.types)
        if (options?.searchTerm) query = query.or(`nome.ilike.%${options.searchTerm}%,codigo.ilike.%${options.searchTerm}%`)
        if (options?.limit) {
          const from = options.offset || 0
          query = query.range(from, from + options.limit - 1)
        }
      }

      applyBaseFilters()
      applySearchAndPagination()

      // Order by name
      query = query.order('nome', { ascending: true })

      const { data, error } = await query

      if (error) throw error

      // Add counts for each school
      const schoolsWithCounts = await Promise.all(
        data.map(async (school) => {
          const counts = await this.getSchoolCounts(school.id)
          return {
            ...school,
            _count: counts
          }
        })
      )

      return schoolsWithCounts
    } catch (error) {
      logger.error('Error fetching schools with details', error instanceof Error ? error : String(error), { feature: 'schools', action: 'fetch_schools_with_details' })
      throw error
    }
  }

  // Create school with initial setup
  async createSchool(schoolData: SchoolFormData & {
    diretor_id?: string
    email?: string
  }) {
    try {
      return createGovernedSchool(supabase, {
        nome: schoolData.nome,
        codigo: schoolData.codigo,
        tipo: schoolData.tipo,
        diretorId: schoolData.diretor_id ?? null,
        email: schoolData.email ?? null,
        endereco: schoolData.endereco,
        telefone: schoolData.telefone,
      })
    } catch (error) {
      logger.error('Error creating school', error instanceof Error ? error : String(error), { feature: 'schools', action: 'create_school' })
      throw error
    }
  }

  // Assign director to school
  async assignDirector(schoolId: string, directorId: string) {
    try {
      return assignGovernedSchoolDirector(supabase, schoolId, directorId)
    } catch (error) {
      logger.error('Error assigning director', error instanceof Error ? error : String(error), { feature: 'schools', action: 'assign_director' })
      throw error
    }
  }

  // Get school statistics
  private async getSchoolCounts(schoolId: string) {
    try {
      // Count students (through matriculas with turmas relationship)
      // First, get all turma IDs for this school
      const { data: turmasData } = await supabase
        .from('turmas')
        .select('id')
        .eq('escola_id', schoolId)

      const turmaIds = turmasData?.map(t => t.id) || []

      // Count students enrolled in those turmas
      const { count: studentsCount } = await supabase
        .from('matriculas')
        .select('*', { count: 'exact', head: true })
        .in('turma_id', turmaIds.length > 0 ? turmaIds : [''])
        .eq('situacao', 'ativa')

      // Count teachers
      const { count: teachersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('escola_id', schoolId)
        .eq('tipo_usuario', 'professor')
        .eq('ativo', true)

      // Count classes
      const { count: classesCount } = await supabase
        .from('turmas')
        .select('*', { count: 'exact', head: true })
        .eq('escola_id', schoolId)
        .eq('ativo', true)

      return {
        students: studentsCount || 0,
        teachers: teachersCount || 0,
        classes: classesCount || 0
      }
    } catch (error) {
      logger.error('Error getting school counts', error instanceof Error ? error : String(error), { feature: 'schools', action: 'get_school_counts', schoolId })
      return {
        students: 0,
        teachers: 0,
        classes: 0
      }
    }
  }

  // Get school dashboard data
  async getSchoolDashboard(schoolId: string) {
    try {
      const school = await this.getById(schoolId)
      const counts = await this.getSchoolCounts(schoolId)

      // Get turma IDs for this school
      const { data: turmasData } = await supabase
        .from('turmas')
        .select('id')
        .eq('escola_id', schoolId)

      const turmaIds = turmasData?.map(t => t.id) || []

      // Get recent activities
      const recentEnrollments = await supabase
        .from('matriculas')
        .select(`
          *,
          aluno:alunos(nome_completo),
          turma:turmas(nome)
        `)
        .in('turma_id', turmaIds.length > 0 ? turmaIds : [''])
        .order('data_matricula', { ascending: false })
        .limit(10)

      // Get attendance summary for current month
      const currentMonth = getCurrentUtcMonthRange()

      // Get matricula IDs for these turmas
      const { data: matriculasData } = await supabase
        .from('matriculas')
        .select('id')
        .in('turma_id', turmaIds.length > 0 ? turmaIds : [''])
        .eq('situacao', 'ativa')

      const matriculaIds = matriculasData?.map((m) => m.id) ?? []

      const attendanceData = await loadCanonicalAttendanceFacts(supabase, matriculaIds, {
        startDate: currentMonth.startDate,
        endDate: currentMonth.endDate,
      })

      // SAFETY: Attendance status values are string keys and the accumulator starts empty.
      const attendanceSummary = attendanceData.reduce((acc, record) => {
        const status = record.statusPresenca || (record.presente ? 'presente' : 'falta')
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      return {
        school,
        counts,
        recentEnrollments: recentEnrollments.data,
        attendanceSummary
      }
    } catch (error) {
      logger.error('Error fetching school dashboard', error instanceof Error ? error : String(error), { feature: 'schools', action: 'get_school_dashboard', schoolId })
      throw error
    }
  }

  // Get available teachers for assignment
  async getAvailableTeachers(schoolId?: string) {
    try {
      let query = supabase
        .from('users')
        .select('id, nome, email')
        .eq('tipo_usuario', 'professor')
        .eq('ativo', true)

      if (schoolId) {
        query = query.eq('escola_id', schoolId)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    } catch (error) {
      logger.error('Error fetching available teachers', error instanceof Error ? error : String(error), { feature: 'schools', action: 'get_available_teachers' })
      throw error
    }
  }

  // Get available directors
  async getAvailableDirectors() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, nome, email')
        .eq('tipo_usuario', 'diretor')
        .eq('ativo', true)
        .is('escola_id', null) // Directors not yet assigned to a school

      if (error) throw error
      return data
    } catch (error) {
      logger.error('Error fetching available directors', error instanceof Error ? error : String(error), { feature: 'schools', action: 'get_available_directors' })
      throw error
    }
  }

  /**
   * Update school active status with audit logging
   * Status changes are logged for compliance tracking
   *
   * @param id - School ID
   * @param ativo - New active status
   * @param reason - Optional reason for the status change
   * @returns Updated school record
   */
  async updateSchoolStatus(id: string, ativo: boolean, reason?: string) {
    try {
      const result = await updateGovernedSchool(supabase, id, { ativo })

      // Log to structured logger
      logger.info(`School status updated to ${ativo ? 'active' : 'inactive'}`, {
        feature: 'schools',
        action: 'update_school_status',
        schoolId: id,
        metadata: { ativo, reason }
      })

      return result
    } catch (error) {
      logger.error('Error updating school status', error instanceof Error ? error : String(error), {
        feature: 'schools',
        action: 'update_school_status',
        schoolId: id
      })
      throw error
    }
  }

  // Get system-wide school statistics
  async getSystemStats(): Promise<{
    total: number
    active: number
    byType: Record<string, number>
    totalStudents: number
    totalTeachers: number
    totalClasses: number
  }> {
    try {
      // Get all schools
      const schools = await this.getAll()

      const stats = {
        total: schools.length,
        active: schools.filter(s => s.ativo).length,
        // SAFETY: The type distribution starts empty and receives only school-type keys below.
        byType: {} as Record<string, number>,
        totalStudents: 0,
        totalTeachers: 0,
        totalClasses: 0
      }

      // Calculate type distribution
      schools.forEach(school => {
        stats.byType[school.tipo] = (stats.byType[school.tipo] || 0) + 1
      })

      // Get system-wide counts
      const { count: totalStudents } = await supabase
        .from('matriculas')
        .select('*', { count: 'exact', head: true })
        .eq('situacao', 'ativa')

      const { count: totalTeachers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('tipo_usuario', 'professor')
        .eq('ativo', true)

      const { count: totalClasses } = await supabase
        .from('turmas')
        .select('*', { count: 'exact', head: true })
        .eq('ativo', true)

      stats.totalStudents = totalStudents || 0
      stats.totalTeachers = totalTeachers || 0
      stats.totalClasses = totalClasses || 0

      return stats
    } catch (error) {
      logger.error('Error fetching system stats', error instanceof Error ? error : String(error), { feature: 'schools', action: 'get_system_stats' })
      return {
        total: 0,
        active: 0,
        byType: {},
        totalStudents: 0,
        totalTeachers: 0,
        totalClasses: 0
      }
    }
  }
}

export const schoolsApi = new SchoolsApiService()
