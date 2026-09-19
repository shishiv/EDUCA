/**
 * Students API - student CRUD, enrollment queries, and class roster.  RLS enforces school isolation via matriculas → turmas → escolas chain.
 */
'use client'

import { BaseApiService } from './base'
import { createStudentAdmission } from './student-admission'
import { supabase, Tables } from '@/lib/supabase'
import type { StudentFormData } from '@/lib/validation/brazilian'
import { logger } from '@/lib/logger'
import { loadCanonicalAttendanceFacts } from './canonical-attendance-facts'
import { countAttendanceRecords } from '@/lib/attendance/attendance-calculations'
import { resolveAttendanceBands } from '@/lib/attendance/resolve-attendance-bands'
import {
  getAuthorizedStudentProfiles,
  type AuthorizedStudentProfile,
} from '@/lib/sensitive-family-access'

export type StudentWithDetails = AuthorizedStudentProfile & {
  responsavel?: Partial<Tables<'responsaveis'>>
  escola?: Partial<Tables<'escolas'>>
  turma?: Partial<Tables<'turmas'>>
  matriculas?: (Partial<Tables<'matriculas'>> & {
    turma?: Partial<Tables<'turmas'>> & {
      escola?: Partial<Tables<'escolas'>>
    }
  })[]
}

type StudentQueryOptions = {
  schoolId?: string
  searchTerm?: string
  specialNeeds?: 'all' | 'yes' | 'no'
  activeOnly?: boolean
  limit?: number
  offset?: number
}

type GuardianAdmissionInput = {
  nome: string
  cpf?: string
  telefone?: string
  email?: string
  endereco?: string
  profissao?: string
  grau_parentesco: string
}

type StudentCreationInput = StudentFormData & {
  responsavel?: GuardianAdmissionInput
  escola_id_override?: string
}

function filterStudents(
  students: AuthorizedStudentProfile[],
  options: StudentQueryOptions,
): AuthorizedStudentProfile[] {
  const activeStudents = options.activeOnly === false
    ? students
    : students.filter(student => student.ativo)
  const matchingSearch = options.searchTerm
    ? activeStudents.filter(student => {
        const search = options.searchTerm?.toLocaleLowerCase() ?? ''
        return student.nome_completo.toLocaleLowerCase().includes(search) || student.cpf?.includes(search)
      })
    : activeStudents
  if (options.specialNeeds === 'yes') {
    return matchingSearch.filter(student => student.necessidades_especiais)
  }
  if (options.specialNeeds === 'no') {
    return matchingSearch.filter(student => !student.necessidades_especiais)
  }
  return matchingSearch
}

function paginateStudents(
  students: AuthorizedStudentProfile[],
  options: StudentQueryOptions,
): AuthorizedStudentProfile[] {
  const offset = options.offset ?? 0
  const end = options.limit === undefined ? undefined : offset + options.limit
  return students.slice(offset, end)
}

async function resolveStudentSchoolId(escolaIdOverride?: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('PILOT_STUDENT_AUTH_REQUIRED')

  const { data: actorProfile, error } = await supabase
    .from('users')
    .select('escola_id')
    .eq('id', user.id)
    .single()
  if (error) throw error

  const schoolId = actorProfile?.escola_id ?? escolaIdOverride
  if (!schoolId) {
    throw new Error('PILOT_STUDENT_SCHOOL_REQUIRED: selecione uma escola antes de cadastrar um aluno')
  }
  return schoolId
}

function mapGuardianAdmission(guardian?: GuardianAdmissionInput) {
  if (!guardian) return undefined
  return {
    nome: guardian.nome,
    cpf: guardian.cpf,
    telefone: guardian.telefone,
    email: guardian.email,
    endereco: guardian.endereco,
    profissao: guardian.profissao,
    grau_parentesco: guardian.grau_parentesco,
  }
}

export class StudentsApiService extends BaseApiService<'alunos'> {
  constructor() {
    super('alunos')
  }

  // Get students with related data
  async getStudentsWithDetails(options: StudentQueryOptions = {}): Promise<StudentWithDetails[]> {
    const students = await getAuthorizedStudentProfiles(supabase, { schoolId: options.schoolId })
    return paginateStudents(filterStudents(students, options), options)
  }

  // Create student with guardian relationship.
  // escola_id_override: required when the caller is a secretariat-level admin
  // (escola_id IS NULL on their users row) and must supply the target school from
  // the UI's school-context selector. School-scoped users (diretor, secretario)
  // always use their own escola_id.
  async createStudent(studentData: StudentCreationInput) {
    const { responsavel, escola_id_override, ...aluno } = studentData
    const schoolId = await resolveStudentSchoolId(escola_id_override)

    return createStudentAdmission(supabase, {
      p_nome_completo: aluno.nome_completo,
      p_data_nascimento: aluno.data_nascimento,
      p_sexo: aluno.sexo,
      p_escola_id: schoolId,
      p_cpf: aluno.cpf ?? undefined,
      p_rg: aluno.rg ?? undefined,
      p_email: aluno.email ?? undefined,
      p_telefone: aluno.telefone ?? undefined,
      p_endereco: aluno.endereco ?? undefined,
      p_nome_mae: aluno.nome_mae ?? undefined,
      p_nome_pai: aluno.nome_pai ?? undefined,
      p_necessidades_especiais: aluno.necessidades_especiais ?? undefined,
      p_responsavel: mapGuardianAdmission(responsavel),
    })
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
      const summary = countAttendanceRecords(records.map(record => ({
        presente: record.presente,
        status_presenca: record.statusPresenca,
      })))
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

  // Each student's school resolves its own general attendance reference.
  async getAtRiskStudents(schoolId?: string) {
    try {
      // This is a complex query that would need to be implemented as a database view
      // or stored procedure for optimal performance
      const students = await this.getStudentsWithDetails({ schoolId, activeOnly: true })

      const atRiskStudents = []

      for (const student of students) {
        const summary = await this.getStudentAttendanceSummary(student.id)

        const bands = await resolveAttendanceBands(supabase, student.escola_id)
        if (summary.attendanceRate < bands.reference) {
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
      const failure = error instanceof Error ? error : new Error('Error updating student status')
      logger.error('Error updating student status', failure, {
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
      const students = await this.getStudentsWithDetails({ schoolId })
      const byAge: Record<string, number> = {}
      const byGrade: Record<string, number> = {}

      const stats = {
        total: students.length,
        active: students.filter(s => s.ativo).length,
        byAge,
        byGrade,
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
    } catch {
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
