'use client'

import { BaseApiService } from './base'
import { supabase, Tables, Aluno } from '@/lib/supabase'
import { StudentFormData } from '@/lib/validation'
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
      // First get matriculas with aluno info for this class
      const { data: matriculasData, error: matriculasError } = await supabase
        .from('matriculas')
        .select(`
          id,
          situacao,
          data_matricula,
          turma_id,
          aluno:alunos(*)
        `)
        .eq('turma_id', classId)
        .eq('situacao', 'ativa')

      if (matriculasError) throw matriculasError
      if (!matriculasData || matriculasData.length === 0) return []

      // Get aluno IDs for responsaveis lookup
      const alunoIds = matriculasData
        .map((m) => (m.aluno as { id: string } | null)?.id)
        .filter((id): id is string => !!id)

      // Get responsaveis through aluno_responsaveis join table
      const { data: alunoResponsaveisData } = await supabase
        .from('aluno_responsaveis')
        .select(`
          aluno_id,
          responsavel:responsaveis(*)
        `)
        .in('aluno_id', alunoIds)
        .eq('ativo', true)

      const responsaveisMap = new Map(
        (alunoResponsaveisData ?? []).map((ar) => [ar.aluno_id, ar.responsavel])
      )

      // Transform data
      const result = matriculasData
        .filter((m) => m.aluno)
        .map((m) => {
          const aluno = m.aluno as Tables<'alunos'>
          return {
            ...aluno,
            responsavel: responsaveisMap.get(aluno.id) as Tables<'responsaveis'> | undefined,
            matriculas: [{
              id: m.id,
              situacao: m.situacao,
              data_matricula: m.data_matricula,
              turma_id: m.turma_id
            }]
          } as StudentWithDetails
        })
        .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo))

      return result
    } catch (error) {
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

      // Create student - extract only known fields
      const insertData = {
        nome_completo: aluno.nome_completo,
        data_nascimento: aluno.data_nascimento,
        sexo: aluno.sexo,
        cpf: aluno.cpf,
        rg: aluno.rg,
        email: aluno.email,
        telefone: aluno.telefone,
        endereco: aluno.endereco,
        nome_mae: aluno.nome_mae,
        nome_pai: aluno.nome_pai,
        necessidades_especiais: aluno.necessidades_especiais,
        ativo: true,
      }

      const { data: studentResult, error: studentError } = await supabase
        .from('alunos')
        .insert(insertData)
        .select()
        .single()

      if (studentError) throw studentError

      // Create guardian relationship if provided
      if (responsavel && studentResult) {
        // First create the responsavel
        const { data: responsavelData, error: responsavelError } = await supabase
          .from('responsaveis')
          .insert({
            nome: responsavel.nome,
            telefone: responsavel.telefone ?? '',
            email: responsavel.email,
            parentesco: responsavel.grau_parentesco,
            cpf: '', // Required field
            ativo: true
          })
          .select()
          .single()

        if (!responsavelError && responsavelData) {
          // Then create the join table entry
          await supabase
            .from('aluno_responsaveis')
            .insert({
              aluno_id: studentResult.id,
              responsavel_id: responsavelData.id,
              tipo_responsabilidade: responsavel.grau_parentesco,
              ativo: true
            })
        }
      }

      return studentResult
    } catch (error) {
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
          ano_letivo: new Date().getFullYear(),
          situacao: 'ativa' as const,
          data_matricula: new Date().toISOString().split('T')[0],
          observacoes
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
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
      throw error
    }
  }

  // Get student attendance summary
  async getStudentAttendanceSummary(studentId: string, period?: { start: string; end: string }) {
    try {
      // First get matriculas for this student
      const { data: matriculas, error: matriculasError } = await supabase
        .from('matriculas')
        .select('id')
        .eq('aluno_id', studentId)

      if (matriculasError) throw matriculasError
      if (!matriculas || matriculas.length === 0) {
        return {
          totalDays: 0,
          presentDays: 0,
          absentDays: 0,
          excusedDays: 0,
          attendanceRate: 0,
          details: []
        }
      }

      const matriculaIds = matriculas.map((m) => m.id)

      let query = supabase
        .from('frequencia')
        .select('data_aula, status_presenca, presente')
        .in('matricula_id', matriculaIds)

      if (period) {
        query = query
          .gte('data_aula', period.start)
          .lte('data_aula', period.end)
      }

      const { data, error } = await query

      if (error) throw error

      const records = data ?? []
      const totalDays = records.length
      const presentDays = records.filter(f => f.presente || f.status_presenca === 'presente').length
      const absentDays = records.filter(f => !f.presente && (!f.status_presenca || f.status_presenca === 'falta')).length
      const excusedDays = records.filter(f => f.status_presenca === 'justificada').length

      const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0

      return {
        totalDays,
        presentDays,
        absentDays,
        excusedDays,
        attendanceRate,
        details: records
      }
    } catch (error) {
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
      throw error
    }
  }

  // Bulk enrollment
  async bulkEnrollStudents(enrollments: { studentId: string; turmaId: string; observacoes?: string }[]) {
    try {
      const anoLetivo = new Date().getFullYear()
      const matriculas = enrollments.map(enrollment => ({
        aluno_id: enrollment.studentId,
        turma_id: enrollment.turmaId,
        ano_letivo: anoLetivo,
        situacao: 'ativa' as const,
        data_matricula: new Date().toISOString().split('T')[0],
        observacoes: enrollment.observacoes
      }))

      const { data, error } = await supabase
        .from('matriculas')
        .insert(matriculas)
        .select()

      if (error) throw error
      return data
    } catch (error) {
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
        metadata: { studentId: id, ativo, reason }
      })

      return result
    } catch (error) {
      logger.error('Error updating student status', error as Error, {
        feature: 'students',
        action: 'update_student_status',
        metadata: { studentId: id }
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