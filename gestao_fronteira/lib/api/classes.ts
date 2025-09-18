'use client'

import { BaseApiService } from './base'
import { supabase, Tables, Turma } from '@/lib/supabase'
import { ClassFormData } from '@/lib/validators/brazilian'

export type ClassWithDetails = Turma & {
  escola?: Tables<'escolas'>
  professor?: Tables<'users'>
  _count?: {
    students: number
    matriculas: number
  }
  matriculas?: (Tables<'matriculas'> & {
    aluno?: Tables<'alunos'>
  })[]
}

export class ClassesApiService extends BaseApiService {
  constructor() {
    super('turmas')
  }

  // Get classes with related data
  async getClassesWithDetails(options?: {
    filter?: Record<string, any>
    searchTerm?: string
    schools?: string[]
    series?: string[]
    turnos?: ('matutino' | 'vespertino' | 'integral')[]
    academicYear?: number
    activeOnly?: boolean
    limit?: number
    offset?: number
  }): Promise<ClassWithDetails[]> {
    try {
      let query = supabase
        .from('turmas')
        .select(`
          *,
          escola:escolas(
            id,
            nome,
            codigo,
            tipo
          ),
          professor:users!professor_id(
            id,
            nome,
            email
          ),
          matriculas(
            id,
            situacao,
            data_matricula,
            aluno:alunos(
              id,
              nome_completo,
              data_nascimento
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

      // School filter
      if (options?.schools && options.schools.length > 0) {
        query = query.in('escola_id', options.schools)
      }

      // Series filter
      if (options?.series && options.series.length > 0) {
        query = query.in('serie', options.series)
      }

      // Shift filter
      if (options?.turnos && options.turnos.length > 0) {
        query = query.in('turno', options.turnos)
      }

      // Academic year filter
      if (options?.academicYear) {
        query = query.eq('ano_letivo', options.academicYear)
      }

      // Search filter
      if (options?.searchTerm) {
        query = query.or(`nome.ilike.%${options.searchTerm}%,serie.ilike.%${options.searchTerm}%`)
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

      // Add counts for each class
      const classesWithCounts = (data as ClassWithDetails[]).map(classData => {
        const activeEnrollments = classData.matriculas?.filter(m => m.situacao === 'ativa') || []

        return {
          ...classData,
          _count: {
            students: activeEnrollments.length,
            matriculas: classData.matriculas?.length || 0
          }
        }
      })

      return classesWithCounts
    } catch (error) {
      // console.error('Error fetching classes with details:', error)
      throw error
    }
  }

  // Create class
  async createClass(classData: ClassFormData) {
    try {
      const result = await this.create({
        ...classData,
        ativo: true,
        created_at: new Date().toISOString()
      })

      return result
    } catch (error) {
      // console.error('Error creating class:', error)
      throw error
    }
  }

  // Assign teacher to class
  async assignTeacher(classId: string, teacherId: string) {
    try {
      const result = await this.update(classId, { professor_id: teacherId })

      return result
    } catch (error) {
      // console.error('Error assigning teacher:', error)
      throw error
    }
  }

  // Get class statistics
  async getClassStats(classId: string) {
    try {
      // Get enrollments
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('matriculas')
        .select(`
          *,
          aluno:alunos(id, nome_completo, data_nascimento)
        `)
        .eq('turma_id', classId)

      if (enrollmentsError) throw enrollmentsError

      // Get attendance summary for current month
      const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('frequencia')
        .select('status, data, aluno_id')
        .eq('turma_id', classId)
        .gte('data', `${currentMonth}-01`)
        .lte('data', `${currentMonth}-31`)

      if (attendanceError) throw attendanceError

      const activeEnrollments = enrollments?.filter(e => e.situacao === 'ativa') || []

      const attendanceSummary = attendanceData?.reduce((acc, record) => {
        acc[record.status] = (acc[record.status] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      // Calculate attendance rate
      const totalAttendanceRecords = attendanceData?.length || 0
      const presentRecords = attendanceSummary['presente'] || 0
      const attendanceRate = totalAttendanceRecords > 0
        ? Math.round((presentRecords / totalAttendanceRecords) * 100)
        : 0

      return {
        totalEnrollments: enrollments?.length || 0,
        activeEnrollments: activeEnrollments.length,
        attendanceSummary,
        attendanceRate,
        students: activeEnrollments.map(e => e.aluno).filter(Boolean)
      }
    } catch (error) {
      // console.error('Error fetching class stats:', error)
      throw error
    }
  }

  // Get classes by school
  async getClassesBySchool(schoolId: string, academicYear?: number) {
    try {
      const options = {
        filter: { escola_id: schoolId },
        academicYear: academicYear || new Date().getFullYear(),
        activeOnly: true
      }

      return this.getClassesWithDetails(options)
    } catch (error) {
      // console.error('Error fetching classes by school:', error)
      throw error
    }
  }

  // Get classes by teacher
  async getClassesByTeacher(teacherId: string, academicYear?: number) {
    try {
      const options = {
        filter: { professor_id: teacherId },
        academicYear: academicYear || new Date().getFullYear(),
        activeOnly: true
      }

      return this.getClassesWithDetails(options)
    } catch (error) {
      // console.error('Error fetching classes by teacher:', error)
      throw error
    }
  }

  // Update class capacity
  async updateCapacity(classId: string, newCapacity: number) {
    try {
      // Check current enrollments
      const stats = await this.getClassStats(classId)

      if (stats.activeEnrollments > newCapacity) {
        throw new Error(`Cannot reduce capacity below current enrollment count (${stats.activeEnrollments})`)
      }

      const result = await this.update(classId, { capacidade: newCapacity })
      return result
    } catch (error) {
      // console.error('Error updating class capacity:', error)
      throw error
    }
  }

  // Update class status
  async updateClassStatus(id: string, ativo: boolean, reason?: string) {
    try {
      const result = await this.update(id, { ativo })

      // TODO: Add audit logging for status changes
      // console.log(`Class ${id} status updated to ${ativo ? 'active' : 'inactive'}`, { reason })

      return result
    } catch (error) {
      // console.error('Error updating class status:', error)
      throw error
    }
  }

  // Get available students for enrollment (not already enrolled in any active class)
  async getAvailableStudents(schoolId?: string, ageRange?: [number, number]) {
    try {
      let query = supabase
        .from('alunos')
        .select(`
          id,
          nome_completo,
          data_nascimento,
          matriculas!left(
            id,
            situacao,
            turma:turmas(escola_id)
          )
        `)
        .eq('ativo', true)

      const { data, error } = await query

      if (error) throw error

      // Filter students not currently enrolled in any active class
      const availableStudents = data?.filter(student => {
        const activeEnrollment = student.matriculas?.find(m =>
          m.situacao === 'ativa' &&
          (!schoolId || m.turma?.escola_id === schoolId)
        )
        return !activeEnrollment
      }) || []

      // Apply age filtering if provided
      if (ageRange) {
        const [minAge, maxAge] = ageRange
        return availableStudents.filter(student => {
          if (!student.data_nascimento) return false

          const birthDate = new Date(student.data_nascimento)
          const today = new Date()
          let age = today.getFullYear() - birthDate.getFullYear()
          const monthDiff = today.getMonth() - birthDate.getMonth()

          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--
          }

          return age >= minAge && age <= maxAge
        })
      }

      return availableStudents.map(({ matriculas, ...student }) => student)
    } catch (error) {
      // console.error('Error fetching available students:', error)
      throw error
    }
  }

  // Get system-wide class statistics
  async getSystemStats(schoolId?: string): Promise<{
    total: number
    active: number
    byType: Record<string, number>
    bySeries: Record<string, number>
    byShift: Record<string, number>
    totalStudents: number
    averageCapacity: number
    utilizationRate: number
  }> {
    try {
      const filter = schoolId ? { escola_id: schoolId } : {}
      const classes = await this.getClassesWithDetails({ filter })

      const stats = {
        total: classes.length,
        active: classes.filter(c => c.ativo).length,
        byType: {} as Record<string, number>,
        bySeries: {} as Record<string, number>,
        byShift: {} as Record<string, number>,
        totalStudents: 0,
        averageCapacity: 0,
        utilizationRate: 0
      }

      // Calculate distributions and metrics
      let totalCapacity = 0
      let totalEnrolled = 0

      classes.forEach(classData => {
        if (classData.escola?.tipo) {
          stats.byType[classData.escola.tipo] = (stats.byType[classData.escola.tipo] || 0) + 1
        }

        stats.bySeries[classData.serie] = (stats.bySeries[classData.serie] || 0) + 1
        stats.byShift[classData.turno] = (stats.byShift[classData.turno] || 0) + 1

        const enrolled = classData._count?.students || 0
        stats.totalStudents += enrolled
        totalCapacity += classData.capacidade
        totalEnrolled += enrolled
      })

      stats.averageCapacity = classes.length > 0 ? Math.round(totalCapacity / classes.length) : 0
      stats.utilizationRate = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0

      return stats
    } catch (error) {
      // console.error('Error fetching system stats:', error)
      return {
        total: 0,
        active: 0,
        byType: {},
        bySeries: {},
        byShift: {},
        totalStudents: 0,
        averageCapacity: 0,
        utilizationRate: 0
      }
    }
  }
}

export const classesApi = new ClassesApiService()