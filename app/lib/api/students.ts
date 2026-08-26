/**
 * Students API - student CRUD, enrollment queries, and class roster.  RLS enforces school isolation via matriculas → turmas → escolas chain.
 */
'use client'

import { BaseApiService } from './base'
import { createStudentAdmission } from './student-admission'
import { supabase, Tables, Aluno } from '@/lib/supabase'
import { StudentFormData } from '@/lib/validation'
import { logger } from '@/lib/logger'
import { loadCanonicalAttendanceFacts, summarizeCanonicalAttendanceFacts } from './canonical-attendance-facts'
import { CONFORMIDADE } from '@/lib/attendance/attendance-policy'
import { getAuthorizedStudentProfiles } from '@/lib/sensitive-family-access'

export type StudentWithDetails = Omit<Aluno, 'bolsa_familia' | 'nis'> & {
  responsavel?: Partial<Tables<'responsaveis'>>
  escola?: Partial<Tables<'escolas'>>
  turma?: Partial<Tables<'turmas'>>
  matriculas?: (Partial<Tables<'matriculas'>> & {
    turma?: Partial<Tables<'turmas'>> & {
      escola?: Partial<Tables<'escolas'>>
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
          aluno:alunos(id,nome_completo,data_nascimento,sexo,ativo,created_at)
        `)
        .eq('turma_id', classId)
        .eq('situacao', 'ativa')

      if (matriculasError) throw matriculasError
      if (!matriculasData || matriculasData.length === 0) return []

      const result = matriculasData
        .filter((m) => m.aluno)
        .map((m) => {
          const aluno = m.aluno
          return {
            ...aluno,
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
      const schoolId = typeof options?.filter?.escola_id === 'string' ? options.filter.escola_id : undefined
      let students = await getAuthorizedStudentProfiles(supabase, { schoolId })
      if (options?.activeOnly !== false) students = students.filter(student => student.ativo)
      if (options?.searchTerm) {
        const search = options.searchTerm.toLocaleLowerCase()
        students = students.filter(student =>
          student.nome_completo.toLocaleLowerCase().includes(search) || student.cpf?.includes(search)
        )
      }
      if (options?.specialNeeds === 'yes') students = students.filter(student => student.necessidades_especiais)
      if (options?.specialNeeds === 'no') students = students.filter(student => !student.necessidades_especiais)
      const offset = options?.offset ?? 0
      return students.slice(offset, options?.limit ? offset + options.limit : undefined) as StudentWithDetails[]
    } catch (error) {
      throw error
    }
  }

  // Create student with guardian relationship.
  // escola_id_override: required when the caller is a secretariat-level admin
  // (escola_id IS NULL on their users row) and must supply the target school from
  // the UI's school-context selector. School-scoped users (diretor, secretario)
  // always use their own escola_id.
  async createStudent(studentData: StudentFormData & {
    responsavel?: {
      nome: string
      telefone?: string
      email?: string
      grau_parentesco: string
    }
    escola_id_override?: string
  }) {
    try {
      const { responsavel, escola_id_override, ...aluno } = studentData
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('PILOT_STUDENT_AUTH_REQUIRED')
      const { data: actorProfile } = await supabase.from('users').select('escola_id, tipo_usuario').eq('id', user.id).single()
      // Secretariat admins (escola_id IS NULL) must supply the target school from the
      // school-context selector via escola_id_override.
      const resolvedEscolaId = actorProfile?.escola_id ?? escola_id_override ?? null
      if (!resolvedEscolaId) {
        throw new Error('PILOT_STUDENT_SCHOOL_REQUIRED: selecione uma escola antes de cadastrar um aluno')
      }

      // The RPC owns the three related writes in one database transaction.
      // Auth/profile reads remain preflight checks; school RLS is enforced again
      // by the invoker function and each table policy.
      return await createStudentAdmission(supabase, {
        p_nome_completo: aluno.nome_completo,
        p_data_nascimento: aluno.data_nascimento,
        p_sexo: aluno.sexo,
        p_escola_id: resolvedEscolaId,
        p_cpf: aluno.cpf ?? null,
        p_rg: aluno.rg ?? null,
        p_email: aluno.email ?? null,
        p_telefone: aluno.telefone ?? null,
        p_endereco: aluno.endereco ?? null,
        p_nome_mae: aluno.nome_mae ?? null,
        p_nome_pai: aluno.nome_pai ?? null,
        p_necessidades_especiais: aluno.necessidades_especiais ?? null,
        p_responsavel: responsavel
          ? {
              nome: responsavel.nome,
              telefone: responsavel.telefone,
              email: responsavel.email,
              grau_parentesco: responsavel.grau_parentesco,
            }
          : null,
      })
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

      const records = await loadCanonicalAttendanceFacts(supabase, matriculaIds, {
        startDate: period?.start,
        endDate: period?.end,
      })
      const summaries = summarizeCanonicalAttendanceFacts(records, matriculaIds)
      const summary = matriculaIds.reduce((total, matriculaId) => {
        const enrollment = summaries.get(matriculaId)
        if (!enrollment) return total
        return {
          total: total.total + enrollment.total,
          presencas: total.presencas + enrollment.presencas,
          faltas: total.faltas + enrollment.faltas,
          atestados: total.atestados + enrollment.atestados,
        }
      }, { total: 0, presencas: 0, faltas: 0, atestados: 0 })
      const attendanceRate = summary.total > 0
        ? Math.round(((summary.presencas + summary.atestados) / summary.total) * 100)
        : 0

      return {
        totalDays: summary.total,
        presentDays: summary.presencas + summary.atestados,
        absentDays: summary.faltas,
        excusedDays: summary.atestados,
        attendanceRate,
        details: records
      }
    } catch (error) {
      throw error
    }
  }

  // Get at-risk students (below 80% attendance)
  async getAtRiskStudents(schoolId?: string, threshold: number = CONFORMIDADE) {
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
      const { error } = await supabase
        .from('alunos')
        .update({ ativo })
        .eq('id', id)

      if (error) throw error

      logger.info(`Student status updated to ${ativo ? 'active' : 'inactive'}`, {
        feature: 'students',
        action: 'update_student_status',
        metadata: { studentId: id, ativo, reason }
      })

      return { id, ativo }
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
          if (matricula.situacao === 'ativa' && matricula.turma?.serie) {
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
