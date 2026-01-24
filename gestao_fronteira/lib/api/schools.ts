import { BaseApiService } from './base'
import { supabase, Tables, Escola } from '@/lib/supabase'
import { SchoolFormData } from '@/lib/validation'
import { logger } from '@/lib/logger'
import { auditApi } from './audit'

export type SchoolWithDetails = Escola & {
  diretor?: Tables<'users'>
  turmas?: (Tables<'turmas'> & {
    professor?: Tables<'users'>
  })[]
  _count?: {
    students: number
    teachers: number
    classes: number
  }
}

export class SchoolsApiService extends BaseApiService {
  constructor() {
    super('escolas')
  }

  // Get schools with related data
  async getSchoolsWithDetails(options?: {
    filter?: Record<string, any>
    searchTerm?: string
    types?: ('creche' | 'pre_escola' | 'fundamental')[]
    activeOnly?: boolean
    limit?: number
    offset?: number
  }): Promise<SchoolWithDetails[]> {
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

      // Apply filters
      if (options?.activeOnly !== false) {
        query = query.eq('ativo', true)
      }

      if (options?.filter) {
        Object.entries(options.filter).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value)
          }
        })
      }

      // Type filter
      if (options?.types && options.types.length > 0) {
        query = query.in('tipo', options.types)
      }

      // Search filter
      if (options?.searchTerm) {
        query = query.or(`nome.ilike.%${options.searchTerm}%,codigo.ilike.%${options.searchTerm}%`)
      }

      // Apply pagination
      if (options?.limit) {
        const from = options.offset || 0
        const to = from + options.limit - 1
        query = query.range(from, to)
      }

      // Order by name
      query = query.order('nome', { ascending: true })

      const { data, error } = await query

      if (error) throw error

      // Add counts for each school
      const schoolsWithCounts = await Promise.all(
        (data as SchoolWithDetails[]).map(async (school) => {
          const counts = await this.getSchoolCounts(school.id)
          return {
            ...school,
            _count: counts
          }
        })
      )

      return schoolsWithCounts
    } catch (error) {
      logger.error('Error fetching schools with details', error as Error, { feature: 'schools', action: 'fetch_schools_with_details' })
      throw error
    }
  }

  // Create school with initial setup
  async createSchool(schoolData: SchoolFormData & {
    diretor_id?: string
  }) {
    try {
      // Extract only the fields that exist in escolas table
      const insertData = {
        nome: schoolData.nome,
        codigo: schoolData.codigo,
        codigo_inep: schoolData.codigo_inep,
        tipo: schoolData.tipo,
        endereco: schoolData.endereco,
        telefone: schoolData.telefone,
        diretor_id: schoolData.diretor_id,
        ativo: true,
      }

      const { data: result, error } = await supabase
        .from('escolas')
        .insert(insertData)
        .select()
        .single()

      if (error) throw error

      // If director assigned, update their escola_id
      if (schoolData.diretor_id && result) {
        await supabase
          .from('users')
          .update({ escola_id: result.id })
          .eq('id', schoolData.diretor_id)
      }

      return result
    } catch (error) {
      logger.error('Error creating school', error as Error, { feature: 'schools', action: 'create_school' })
      throw error
    }
  }

  // Assign director to school
  async assignDirector(schoolId: string, directorId: string) {
    try {
      // Update school's director
      const schoolResult = await supabase
        .from('escolas')
        .update({ diretor_id: directorId })
        .eq('id', schoolId)
        .select()
        .single()

      // Update director's school assignment
      const userResult = await supabase
        .from('users')
        .update({ escola_id: schoolId })
        .eq('id', directorId)
        .select()
        .single()

      return { school: schoolResult.data, director: userResult.data }
    } catch (error) {
      logger.error('Error assigning director', error as Error, { feature: 'schools', action: 'assign_director' })
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
      logger.error('Error getting school counts', error as Error, { feature: 'schools', action: 'get_school_counts', schoolId })
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
      const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

      // Get matricula IDs for these turmas
      const { data: matriculasData } = await supabase
        .from('matriculas')
        .select('id')
        .in('turma_id', turmaIds.length > 0 ? turmaIds : [''])
        .eq('situacao', 'ativa')

      const matriculaIds = matriculasData?.map((m) => m.id) ?? []

      const attendanceData = await supabase
        .from('frequencia')
        .select('status_presenca, presente, data_aula')
        .in('matricula_id', matriculaIds.length > 0 ? matriculaIds : [''])
        .gte('data_aula', `${currentMonth}-01`)
        .lte('data_aula', `${currentMonth}-31`)

      const attendanceSummary = attendanceData.data?.reduce((acc, record) => {
        const status = record.status_presenca || (record.presente ? 'presente' : 'falta')
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
      logger.error('Error fetching school dashboard', error as Error, { feature: 'schools', action: 'get_school_dashboard', schoolId })
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
      logger.error('Error fetching available teachers', error as Error, { feature: 'schools', action: 'get_available_teachers' })
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
      logger.error('Error fetching available directors', error as Error, { feature: 'schools', action: 'get_available_directors' })
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
      // Get current status before update
      const { data: currentSchool, error: fetchError } = await supabase
        .from('escolas')
        .select('ativo, nome')
        .eq('id', id)
        .single()

      if (fetchError) {
        logger.error('Error fetching current school status', fetchError, {
          feature: 'schools',
          action: 'update_school_status_fetch',
          schoolId: id
        })
        throw fetchError
      }

      const previousStatus = currentSchool?.ativo

      // Update the status
      const result = await this.update(id, { ativo })

      // Log to structured logger
      logger.info(`School status updated to ${ativo ? 'active' : 'inactive'}`, {
        feature: 'schools',
        action: 'update_school_status',
        schoolId: id,
        metadata: { ativo, reason }
      })

      // Log to audit trail (async, don't block on failure)
      this.logStatusChangeAudit(id, currentSchool?.nome || '', previousStatus ?? undefined, ativo, reason)
        .catch((auditError) => {
          // Audit logging should not fail the main operation
          logger.warn('Failed to log school status change to audit', {
            feature: 'schools',
            action: 'audit_log_failed',
            schoolId: id,
            metadata: { error: auditError instanceof Error ? auditError.message : String(auditError) }
          })
        })

      return result
    } catch (error) {
      logger.error('Error updating school status', error as Error, {
        feature: 'schools',
        action: 'update_school_status',
        schoolId: id
      })
      throw error
    }
  }

  /**
   * Log school status change to audit trail
   * Called internally by updateSchoolStatus
   */
  private async logStatusChangeAudit(
    schoolId: string,
    schoolName: string,
    previousStatus: boolean | undefined,
    newStatus: boolean,
    reason?: string
  ): Promise<void> {
    try {
      // Get current user for audit
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || 'system'

      await auditApi.logAudit({
        user_id: userId,
        action: 'status_change',
        resource_type: 'escolas',
        resource_id: schoolId,
        old_values: { ativo: previousStatus },
        new_values: { ativo: newStatus },
        timestamp: new Date().toISOString(),
      })

      logger.info('School status change logged to audit', {
        feature: 'schools',
        action: 'audit_log_success',
        schoolId,
        metadata: { previousStatus, newStatus }
      })
    } catch (error) {
      // Re-throw so the caller can handle it
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
        active: schools.filter((s: any) => s.ativo).length,
        byType: {} as Record<string, number>,
        totalStudents: 0,
        totalTeachers: 0,
        totalClasses: 0
      }

      // Calculate type distribution
      schools.forEach((school: any) => {
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
      logger.error('Error fetching system stats', error as Error, { feature: 'schools', action: 'get_system_stats' })
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