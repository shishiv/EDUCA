'use client'

import { BaseApiService } from './base'
import { supabase, Tables, Aluno } from '@/lib/supabase'
import { StudentFormData } from '@/lib/validators/brazilian'
import { logger } from '@/lib/logger'

export type StudentWithDetails = Aluno & {
  responsavel?: Tables<'responsaveis'>
  escola?: Tables<'escolas'>
  turma?: Tables<'turmas'>
  matriculas?: (Tables<'matriculas'> & {
    turma?: Tables<'turmas'> & {
      escola?: Tables<'escolas'>
    }
  })[]
}

export class StudentsApiService extends BaseApiService {
  constructor() {
    super('alunos')
  }

  // Get students enrolled in a specific class
  async getStudentsByClass(classId: string): Promise<StudentWithDetails[]> {
    try {
      const { data, error } = await supabase
        .from('alunos')
        .select(`
          *,
          responsavel:responsaveis(
            id,
            nome,
            telefone,
            email,
            grau_parentesco
          ),
          matriculas!inner(
            id,
            situacao,
            data_matricula,
            turma_id
          )
        `)
        .eq('ativo', true)
        .eq('matriculas.turma_id', classId)
        .eq('matriculas.situacao', 'ativa')
        .order('nome_completo', { ascending: true })

      if (error) throw error
      return data as StudentWithDetails[]
    } catch (error) {
      // console.error('Error fetching students by class:', error)
      throw error
    }
  }

  // Get students with related data
  async getStudentsWithDetails(options?: {
    filter?: Record<string, any>
    searchTerm?: string
    schools?: string[]
    classes?: string[]
    ageRange?: [number, number]
    specialNeeds?: 'all' | 'yes' | 'no'
    activeOnly?: boolean
    limit?: number
    offset?: number
  }): Promise<StudentWithDetails[]> {
    try {
      let query = supabase
        .from('alunos')
        .select(`
          *,
          responsavel:responsaveis(
            id,
            nome,
            telefone,
            email
          ),
          matriculas(
            id,
            situacao,
            data_matricula,
            turma:turmas(
              id,
              nome,
              serie,
              turno,
              escola:escolas(
                id,
                nome,
                codigo
              )
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

      // Search filter
      if (options?.searchTerm) {
        query = query.or(`nome_completo.ilike.%${options.searchTerm}%,cpf.ilike.%${options.searchTerm}%`)
      }

      // Special needs filter
      if (options?.specialNeeds === 'yes') {
        query = query.not('necessidades_especiais', 'is', null)
      } else if (options?.specialNeeds === 'no') {
        query = query.is('necessidades_especiais', null)
      }

      // Apply pagination
      if (options?.limit) {
        const from = options.offset || 0
        const to = from + options.limit - 1
        query = query.range(from, to)
      }

      // Order by name
      query = query.order('nome_completo', { ascending: true })

      const { data, error } = await query

      if (error) throw error
      return data as StudentWithDetails[]
    } catch (error) {
      // console.error('Error fetching students with details:', error)
      throw error
    }
  }

  // Create student with guardian relationship
  async createStudent(studentData: StudentFormData & {
    responsavel?: {
      nome: string
      telefone?: string
      email?: string
      grau_parentesco: string
    }
  }) {
    try {
      const { responsavel, ...aluno } = studentData

      // Create student
      const studentResult = await this.create({
        ...aluno,
        ativo: true,
        created_at: new Date().toISOString()
      })

      // Create guardian relationship if provided
      if (responsavel && studentResult) {
        await supabase
          .from('responsaveis')
          .insert({
            aluno_id: studentResult.id,
            nome: responsavel.nome,
            telefone: responsavel.telefone,
            email: responsavel.email,
            grau_parentesco: responsavel.grau_parentesco,
            ativo: true
          })
      }

      return studentResult
    } catch (error) {
      // console.error('Error creating student:', error)
      throw error
    }
  }

  // Enroll student in class
  async enrollStudent(studentId: string, turmaId: string, observacoes?: string) {
    try {
      const { data, error } = await supabase
        .from('matriculas')
        .insert({
          aluno_id: studentId,
          turma_id: turmaId,
          situacao: 'ativa',
          data_matricula: new Date().toISOString(),
          observacoes
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      // console.error('Error enrolling student:', error)
      throw error
    }
  }

  // Update enrollment status
  async updateEnrollmentStatus(matriculaId: string, situacao: 'ativa' | 'transferida' | 'concluida' | 'cancelada') {
    try {
      const { data, error } = await supabase
        .from('matriculas')
        .update({ situacao })
        .eq('id', matriculaId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      // console.error('Error updating enrollment status:', error)
      throw error
    }
  }

  // Get student attendance summary
  async getStudentAttendanceSummary(studentId: string, period?: { start: string; end: string }) {
    try {
      let query = supabase
        .from('frequencia')
        .select('data, status')
        .eq('aluno_id', studentId)

      if (period) {
        query = query
          .gte('data', period.start)
          .lte('data', period.end)
      }

      const { data, error } = await query

      if (error) throw error

      const totalDays = data.length
      const presentDays = data.filter(f => f.status === 'presente').length
      const absentDays = data.filter(f => f.status === 'falta').length
      const excusedDays = data.filter(f => f.status === 'justificada').length

      const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0

      return {
        totalDays,
        presentDays,
        absentDays,
        excusedDays,
        attendanceRate,
        details: data
      }
    } catch (error) {
      // console.error('Error fetching student attendance:', error)
      throw error
    }
  }

  // Get at-risk students (below 80% attendance)
  async getAtRiskStudents(schoolId?: string, threshold: number = 80) {
    try {
      // This is a complex query that would need to be implemented as a database view
      // or stored procedure for optimal performance
      const students = await this.getStudentsWithDetails({ activeOnly: true })

      const atRiskStudents = []

      for (const student of students) {
        const summary = await this.getStudentAttendanceSummary(student.id)

        if (summary.attendanceRate < threshold) {
          atRiskStudents.push({
            ...student,
            attendanceRate: summary.attendanceRate,
            totalDays: summary.totalDays,
            presentDays: summary.presentDays
          })
        }
      }

      return atRiskStudents.sort((a, b) => a.attendanceRate - b.attendanceRate)
    } catch (error) {
      // console.error('Error fetching at-risk students:', error)
      throw error
    }
  }

  // Bulk enrollment
  async bulkEnrollStudents(enrollments: { studentId: string; turmaId: string; observacoes?: string }[]) {
    try {
      const matriculas = enrollments.map(enrollment => ({
        aluno_id: enrollment.studentId,
        turma_id: enrollment.turmaId,
        situacao: 'ativa' as const,
        data_matricula: new Date().toISOString(),
        observacoes: enrollment.observacoes
      }))

      const { data, error } = await supabase
        .from('matriculas')
        .insert(matriculas)
        .select()

      if (error) throw error
      return data
    } catch (error) {
      // console.error('Error bulk enrolling students:', error)
      throw error
    }
  }

  // Update student status
  async updateStudentStatus(id: string, ativo: boolean, reason?: string) {
    try {
      const result = await this.update(id, { ativo })

      logger.info(`Student status updated to ${ativo ? 'active' : 'inactive'}`, {
        feature: 'students',
        action: 'update_student_status',
        studentId: id,
        ativo,
        reason
      })

      return result
    } catch (error) {
      logger.error('Error updating student status', error as Error, {
        feature: 'students',
        action: 'update_student_status',
        studentId: id
      })
      throw error
    }
  }

  // Get student statistics
  async getStudentStats(schoolId?: string): Promise<{
    total: number
    active: number
    byAge: Record<string, number>
    byGrade: Record<string, number>
    specialNeeds: number
    atRisk: number
  }> {
    try {
      const filters = schoolId ? { escola_id: schoolId } : {}
      const students = await this.getStudentsWithDetails({ filter: filters })

      const stats = {
        total: students.length,
        active: students.filter(s => s.ativo).length,
        byAge: {} as Record<string, number>,
        byGrade: {} as Record<string, number>,
        specialNeeds: students.filter(s => s.necessidades_especiais).length,
        atRisk: 0
      }

      // Calculate age distribution
      students.forEach(student => {
        if (student.data_nascimento) {
          const age = new Date().getFullYear() - new Date(student.data_nascimento).getFullYear()
          const ageGroup = `${Math.floor(age / 2) * 2}-${Math.floor(age / 2) * 2 + 1}`
          stats.byAge[ageGroup] = (stats.byAge[ageGroup] || 0) + 1
        }
      })

      // Calculate grade distribution from enrollments
      students.forEach(student => {
        student.matriculas?.forEach(matricula => {
          if (matricula.situacao === 'ativa' && matricula.turma) {
            const serie = matricula.turma.serie
            stats.byGrade[serie] = (stats.byGrade[serie] || 0) + 1
          }
        })
      })

      // Get at-risk count (simplified - in production this would be cached)
      const atRiskStudents = await this.getAtRiskStudents(schoolId)
      stats.atRisk = atRiskStudents.length

      return stats
    } catch (error) {
      // console.error('Error fetching student stats:', error)
      return {
        total: 0,
        active: 0,
        byAge: {},
        byGrade: {},
        specialNeeds: 0,
        atRisk: 0
      }
    }
  }
}

export const studentsApi = new StudentsApiService()