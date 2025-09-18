'use client'

import { BaseApiService } from './base'
import { supabase, Tables, Escola } from '@/lib/supabase'
import { SchoolFormData } from '@/lib/validators/brazilian'

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
      // console.error('Error fetching schools with details:', error)
      throw error
    }
  }

  // Create school with initial setup
  async createSchool(schoolData: SchoolFormData & {
    diretor_id?: string
  }) {
    try {
      const result = await this.create({
        ...schoolData,
        ativo: true,
        created_at: new Date().toISOString()
      })

      // If director assigned, update their escola_id
      if (schoolData.diretor_id && result) {
        await supabase
          .from('users')
          .update({ escola_id: result.id })
          .eq('id', schoolData.diretor_id)
      }

      return result
    } catch (error) {
      // console.error('Error creating school:', error)
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
      // console.error('Error assigning director:', error)
      throw error
    }
  }

  // Get school statistics
  private async getSchoolCounts(schoolId: string) {
    try {
      // Count students (through matriculas)
      const { count: studentsCount } = await supabase
        .from('matriculas')
        .select('*', { count: 'exact', head: true })
        .eq('turmas.escola_id', schoolId)
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
      // console.error('Error getting school counts:', error)
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

      // Get recent activities
      const recentEnrollments = await supabase
        .from('matriculas')
        .select(`
          *,
          aluno:alunos(nome_completo),
          turma:turmas(nome)
        `)
        .eq('turmas.escola_id', schoolId)
        .order('data_matricula', { ascending: false })
        .limit(10)

      // Get attendance summary for current month
      const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
      const attendanceData = await supabase
        .from('frequencia')
        .select('status, data')
        .eq('turmas.escola_id', schoolId)
        .gte('data', `${currentMonth}-01`)
        .lte('data', `${currentMonth}-31`)

      const attendanceSummary = attendanceData.data?.reduce((acc, record) => {
        acc[record.status] = (acc[record.status] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      return {
        school,
        counts,
        recentEnrollments: recentEnrollments.data,
        attendanceSummary
      }
    } catch (error) {
      // console.error('Error fetching school dashboard:', error)
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
      // console.error('Error fetching available teachers:', error)
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
      // console.error('Error fetching available directors:', error)
      throw error
    }
  }

  // Update school status
  async updateSchoolStatus(id: string, ativo: boolean, reason?: string) {
    try {
      const result = await this.update(id, { ativo })

      // TODO: Add audit logging for status changes
      // console.log(`School ${id} status updated to ${ativo ? 'active' : 'inactive'}`, { reason })

      return result
    } catch (error) {
      // console.error('Error updating school status:', error)
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
      // console.error('Error fetching system stats:', error)
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