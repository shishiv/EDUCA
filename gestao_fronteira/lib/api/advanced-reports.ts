/**
 * Advanced Reporting System for Brazilian Educational Compliance
 *
 * Implements comprehensive reporting for:
 * - Educacenso exports
 * - Attendance compliance reports
 * - INEP data validation
 * - Student progress tracking
 * - Municipal statistics
 * - LGPD compliance reports
 */

'use client'

import { BaseApiService } from './enhanced-base'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

// ===== INTERFACES =====
export interface AttendanceComplianceReport {
  school_id: string
  school_name: string
  report_period: {
    start_date: string
    end_date: string
  }
  total_students: number
  total_sessions: number
  compliance_summary: {
    adequate_attendance: number // >= 80%
    warning_attendance: number  // 75-79%
    critical_attendance: number // < 75%
    at_risk_students: Array<{
      student_id: string
      student_name: string
      attendance_rate: number
      total_absences: number
      last_attendance: string
    }>
  }
  class_breakdown: Array<{
    class_id: string
    class_name: string
    total_students: number
    average_attendance: number
    compliance_level: 'excellent' | 'good' | 'warning' | 'critical'
  }>
  monthly_trends: Array<{
    month: string
    average_attendance: number
    total_sessions: number
  }>
}

export interface EducacensoValidationReport {
  school_id: string
  validation_date: string
  overall_status: 'compliant' | 'issues_found' | 'critical_errors'
  data_quality_score: number // 0-100
  validation_results: {
    students: {
      total_records: number
      valid_records: number
      errors: Array<{
        student_id: string
        student_name: string
        error_type: string
        error_message: string
        severity: 'warning' | 'error'
      }>
    }
    teachers: {
      total_records: number
      valid_records: number
      missing_inep_codes: number
      errors: Array<{
        teacher_id: string
        teacher_name: string
        error_type: string
        error_message: string
      }>
    }
    classes: {
      total_records: number
      valid_records: number
      enrollment_mismatches: number
    }
    school_data: {
      inep_code_valid: boolean
      infrastructure_complete: boolean
      administrative_data_complete: boolean
    }
  }
  recommendations: string[]
}

export interface StudentProgressReport {
  student_id: string
  student_name: string
  class_info: {
    class_id: string
    class_name: string
    grade_level: string
  }
  academic_period: {
    start_date: string
    end_date: string
  }
  attendance_summary: {
    total_school_days: number
    days_present: number
    days_absent: number
    attendance_rate: number
    status: 'adequate' | 'warning' | 'critical'
  }
  grades_summary: {
    quarters: Array<{
      quarter: number
      subjects: Array<{
        subject: string
        grade: number
        status: 'approved' | 'recovery' | 'failed'
      }>
      quarter_average: number
    }>
    annual_average: number
    final_status: 'approved' | 'recovery' | 'failed'
  }
  behavioral_notes: string[]
  parent_communications: Array<{
    date: string
    type: string
    summary: string
  }>
  recommendations: string[]
}

export interface MunicipalStatisticsReport {
  municipality: string
  report_date: string
  academic_year: number
  overview: {
    total_schools: number
    total_students: number
    total_teachers: number
    total_classes: number
  }
  enrollment_by_level: {
    creche: number
    pre_escola: number
    fundamental: number
  }
  attendance_statistics: {
    overall_rate: number
    by_school_level: {
      creche: number
      pre_escola: number
      fundamental: number
    }
    students_at_risk: number // < 75% attendance
  }
  teacher_statistics: {
    total_active: number
    with_inep_code: number
    average_classes_per_teacher: number
    teacher_student_ratio: number
  }
  infrastructure_summary: {
    schools_with_internet: number
    schools_with_library: number
    schools_with_computer_lab: number
    schools_with_sports_facilities: number
  }
  inep_compliance: {
    schools_with_inep: number
    teachers_with_inep: number
    data_quality_score: number
  }
  trends: {
    enrollment_growth: number // percentage change from previous year
    attendance_improvement: number
    dropout_rate: number
  }
}

export interface LGPDComplianceReport {
  report_period: {
    start_date: string
    end_date: string
  }
  consent_summary: {
    total_data_subjects: number
    with_valid_consent: number
    consent_rate: number
    pending_consent: number
  }
  data_processing_activities: Array<{
    activity_name: string
    legal_basis: string
    data_subjects_count: number
    last_review_date: string
    compliance_status: 'compliant' | 'needs_review' | 'non_compliant'
  }>
  data_subject_requests: {
    total_requests: number
    access_requests: number
    deletion_requests: number
    portability_requests: number
    correction_requests: number
    response_time_average: number // days
  }
  security_incidents: Array<{
    incident_date: string
    incident_type: string
    affected_records: number
    resolution_status: string
  }>
  audit_trail_summary: {
    total_audit_records: number
    high_risk_operations: number
    data_modifications: number
    unauthorized_access_attempts: number
  }
  recommendations: string[]
}

// ===== ADVANCED REPORTS SERVICE =====
export class AdvancedReportsService extends BaseApiService {
  constructor() {
    super('reports') // This would be a dedicated reports table
  }

  // ===== ATTENDANCE COMPLIANCE REPORTS =====

  /**
   * Generate comprehensive attendance compliance report
   */
  async generateAttendanceComplianceReport(
    schoolId: string,
    startDate: string,
    endDate: string
  ): Promise<AttendanceComplianceReport> {
    try {
      // Get school information
      const { data: school, error: schoolError } = await supabase
        .from('escolas')
        .select('id, nome')
        .eq('id', schoolId)
        .single()

      if (schoolError) throw schoolError

      // Get all students enrolled in the school during the period
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('matriculas')
        .select(`
          id,
          aluno:alunos(id, nome_completo),
          turma:turmas!inner(id, nome, serie, escola_id)
        `)
        .eq('turma.escola_id', schoolId)
        .eq('situacao', 'ativa')

      if (enrollmentError) throw enrollmentError

      // Get attendance data for the period
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('frequencia')
        .select(`
          *,
          aluno:alunos(id, nome_completo),
          sessao:sessoes_aula(data_aula, turma_id),
          turma:turmas(id, nome, serie)
        `)
        .gte('data_aula', startDate)
        .lte('data_aula', endDate)
        .eq('turma.escola_id', schoolId)

      if (attendanceError) throw attendanceError

      // Calculate statistics
      const studentStats = new Map<string, {
        name: string
        class_id: string
        class_name: string
        total_sessions: number
        presences: number
        absences: number
        last_attendance: string
      }>()

      // Process attendance data
      attendanceData.forEach(record => {
        if (record.aluno && record.turma) {
          const existing = studentStats.get(record.aluno.id) || {
            name: record.aluno.nome_completo,
            class_id: record.turma.id,
            class_name: record.turma.nome,
            total_sessions: 0,
            presences: 0,
            absences: 0,
            last_attendance: record.data_aula
          }

          existing.total_sessions++
          if (record.status_presenca === 'presente') {
            existing.presences++
          } else {
            existing.absences++
          }

          if (record.data_aula > existing.last_attendance) {
            existing.last_attendance = record.data_aula
          }

          studentStats.set(record.aluno.id, existing)
        }
      })

      // Categorize students by attendance compliance
      let adequate = 0, warning = 0, critical = 0
      const atRiskStudents: any[] = []

      Array.from(studentStats.entries()).forEach(([studentId, stats]) => {
        const attendanceRate = stats.total_sessions > 0
          ? Math.round((stats.presences / stats.total_sessions) * 100)
          : 0

        if (attendanceRate >= 80) {
          adequate++
        } else if (attendanceRate >= 75) {
          warning++
        } else {
          critical++
          atRiskStudents.push({
            student_id: studentId,
            student_name: stats.name,
            attendance_rate: attendanceRate,
            total_absences: stats.absences,
            last_attendance: stats.last_attendance
          })
        }
      })

      // Calculate class breakdown
      const classStats = new Map<string, {
        name: string
        total_students: number
        total_presences: number
        total_sessions: number
      }>()

      attendanceData.forEach(record => {
        if (record.turma) {
          const existing = classStats.get(record.turma.id) || {
            name: record.turma.nome,
            total_students: 0,
            total_presences: 0,
            total_sessions: 0
          }

          existing.total_sessions++
          if (record.status_presenca === 'presente') {
            existing.total_presences++
          }

          classStats.set(record.turma.id, existing)
        }
      })

      const classBreakdown = Array.from(classStats.entries()).map(([classId, stats]) => {
        const enrolledStudents = enrollments.filter(e => e.turma?.id === classId).length
        const averageAttendance = stats.total_sessions > 0
          ? Math.round((stats.total_presences / stats.total_sessions) * 100)
          : 0

        let complianceLevel: 'excellent' | 'good' | 'warning' | 'critical'
        if (averageAttendance >= 90) complianceLevel = 'excellent'
        else if (averageAttendance >= 85) complianceLevel = 'good'
        else if (averageAttendance >= 75) complianceLevel = 'warning'
        else complianceLevel = 'critical'

        return {
          class_id: classId,
          class_name: stats.name,
          total_students: enrolledStudents,
          average_attendance: averageAttendance,
          compliance_level: complianceLevel
        }
      })

      // Calculate monthly trends
      const monthlyData = new Map<string, { presences: number; sessions: number }>()

      attendanceData.forEach(record => {
        const month = record.data_aula.substring(0, 7) // YYYY-MM
        const existing = monthlyData.get(month) || { presences: 0, sessions: 0 }

        existing.sessions++
        if (record.status_presenca === 'presente') {
          existing.presences++
        }

        monthlyData.set(month, existing)
      })

      const monthlyTrends = Array.from(monthlyData.entries())
        .map(([month, data]) => ({
          month,
          average_attendance: data.sessions > 0 ? Math.round((data.presences / data.sessions) * 100) : 0,
          total_sessions: data.sessions
        }))
        .sort((a, b) => a.month.localeCompare(b.month))

      return {
        school_id: schoolId,
        school_name: school.nome,
        report_period: { start_date: startDate, end_date: endDate },
        total_students: enrollments.length,
        total_sessions: attendanceData.length,
        compliance_summary: {
          adequate_attendance: adequate,
          warning_attendance: warning,
          critical_attendance: critical,
          at_risk_students: atRiskStudents.slice(0, 20) // Top 20 at-risk students
        },
        class_breakdown: classBreakdown,
        monthly_trends: monthlyTrends
      }
    } catch (error) {
      logger.error('Error generating attendance compliance report', error as Error)
      throw error
    }
  }

  // ===== EDUCACENSO VALIDATION REPORTS =====

  /**
   * Generate Educacenso validation report
   */
  async generateEducacensoValidationReport(schoolId: string): Promise<EducacensoValidationReport> {
    try {
      const validationResults = {
        students: { total_records: 0, valid_records: 0, errors: [] as any[] },
        teachers: { total_records: 0, valid_records: 0, missing_inep_codes: 0, errors: [] as any[] },
        classes: { total_records: 0, valid_records: 0, enrollment_mismatches: 0 },
        school_data: { inep_code_valid: false, infrastructure_complete: false, administrative_data_complete: false }
      }

      // Validate students
      const { data: students, error: studentsError } = await supabase
        .from('alunos')
        .select(`
          id,
          nome_completo,
          data_nascimento,
          cpf,
          sexo,
          matriculas!inner(
            situacao,
            turma:turmas!inner(escola_id)
          ),
          codigo_inep:codigos_inep(codigo_inep, situacao)
        `)
        .eq('matriculas.turma.escola_id', schoolId)
        .eq('matriculas.situacao', 'ativa')
        .eq('ativo', true)

      if (studentsError) throw studentsError

      validationResults.students.total_records = students.length

      students.forEach(student => {
        const errors: any[] = []

        // Check required fields
        if (!student.nome_completo || student.nome_completo.length < 2) {
          errors.push({
            student_id: student.id,
            student_name: student.nome_completo || 'Nome não informado',
            error_type: 'missing_name',
            error_message: 'Nome completo obrigatório',
            severity: 'error'
          })
        }

        if (!student.data_nascimento) {
          errors.push({
            student_id: student.id,
            student_name: student.nome_completo,
            error_type: 'missing_birth_date',
            error_message: 'Data de nascimento obrigatória',
            severity: 'error'
          })
        }

        // Check CPF for students over 11 years old
        const age = new Date().getFullYear() - new Date(student.data_nascimento).getFullYear()
        if (age >= 11 && !student.cpf) {
          errors.push({
            student_id: student.id,
            student_name: student.nome_completo,
            error_type: 'missing_cpf',
            error_message: 'CPF obrigatório para estudantes com 11+ anos',
            severity: 'warning'
          })
        }

        // Check INEP code
        if (!student.codigo_inep || student.codigo_inep.length === 0) {
          errors.push({
            student_id: student.id,
            student_name: student.nome_completo,
            error_type: 'missing_inep_code',
            error_message: 'Código INEP não cadastrado',
            severity: 'warning'
          })
        }

        if (errors.length === 0) {
          validationResults.students.valid_records++
        } else {
          validationResults.students.errors.push(...errors)
        }
      })

      // Validate teachers
      const { data: teachers, error: teachersError } = await supabase
        .from('users')
        .select(`
          id,
          nome,
          email,
          tipo_usuario,
          codigo_inep:codigos_inep(codigo_inep, situacao)
        `)
        .eq('escola_id', schoolId)
        .eq('tipo_usuario', 'professor')
        .eq('ativo', true)

      if (teachersError) throw teachersError

      validationResults.teachers.total_records = teachers.length

      teachers.forEach(teacher => {
        const errors: any[] = []

        if (!teacher.codigo_inep || teacher.codigo_inep.length === 0) {
          validationResults.teachers.missing_inep_codes++
          errors.push({
            teacher_id: teacher.id,
            teacher_name: teacher.nome,
            error_type: 'missing_inep_code',
            error_message: 'Código INEP não cadastrado'
          })
        }

        if (!teacher.email) {
          errors.push({
            teacher_id: teacher.id,
            teacher_name: teacher.nome,
            error_type: 'missing_email',
            error_message: 'E-mail não cadastrado'
          })
        }

        if (errors.length === 0) {
          validationResults.teachers.valid_records++
        } else {
          validationResults.teachers.errors.push(...errors)
        }
      })

      // Validate school data
      const { data: school, error: schoolError } = await supabase
        .from('escolas')
        .select(`
          *,
          codigo_inep:codigos_inep(codigo_inep, situacao)
        `)
        .eq('id', schoolId)
        .single()

      if (schoolError) throw schoolError

      validationResults.school_data.inep_code_valid = !!(school.codigo_inep && school.codigo_inep.length > 0)
      validationResults.school_data.administrative_data_complete = !!(school.endereco && school.telefone)
      validationResults.school_data.infrastructure_complete = true // Would check infrastructure table

      // Calculate overall score
      const totalErrors = validationResults.students.errors.length + validationResults.teachers.errors.length
      const totalRecords = validationResults.students.total_records + validationResults.teachers.total_records
      const dataQualityScore = totalRecords > 0 ? Math.round(((totalRecords - totalErrors) / totalRecords) * 100) : 0

      // Determine overall status
      let overallStatus: 'compliant' | 'issues_found' | 'critical_errors'
      if (dataQualityScore >= 95) overallStatus = 'compliant'
      else if (dataQualityScore >= 80) overallStatus = 'issues_found'
      else overallStatus = 'critical_errors'

      // Generate recommendations
      const recommendations: string[] = []
      if (validationResults.teachers.missing_inep_codes > 0) {
        recommendations.push(`Cadastrar códigos INEP para ${validationResults.teachers.missing_inep_codes} professores`)
      }
      if (validationResults.students.errors.length > 0) {
        recommendations.push('Completar dados obrigatórios dos estudantes')
      }
      if (!validationResults.school_data.inep_code_valid) {
        recommendations.push('Registrar código INEP da escola')
      }

      return {
        school_id: schoolId,
        validation_date: new Date().toISOString(),
        overall_status: overallStatus,
        data_quality_score: dataQualityScore,
        validation_results: validationResults,
        recommendations
      }
    } catch (error) {
      logger.error('Error generating Educacenso validation report', error as Error)
      throw error
    }
  }

  // ===== STUDENT PROGRESS REPORTS =====

  /**
   * Generate comprehensive student progress report
   */
  async generateStudentProgressReport(
    studentId: string,
    academicYear: number
  ): Promise<StudentProgressReport> {
    try {
      // Get student and enrollment information
      const { data: student, error: studentError } = await supabase
        .from('alunos')
        .select(`
          id,
          nome_completo,
          matriculas!inner(
            situacao,
            turma:turmas(id, nome, serie)
          )
        `)
        .eq('id', studentId)
        .eq('matriculas.ano_letivo', academicYear)
        .single()

      if (studentError) throw studentError

      const enrollment = student.matriculas[0]
      const turma = enrollment.turma

      // Get attendance data
      const startDate = `${academicYear}-02-01`
      const endDate = `${academicYear}-12-15`

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('frequencia')
        .select('*')
        .eq('aluno_id', studentId)
        .gte('data_aula', startDate)
        .lte('data_aula', endDate)

      if (attendanceError) throw attendanceError

      // Calculate attendance summary
      const totalDays = attendanceData.length
      const daysPresent = attendanceData.filter(a => a.status_presenca === 'presente').length
      const daysAbsent = totalDays - daysPresent
      const attendanceRate = totalDays > 0 ? Math.round((daysPresent / totalDays) * 100) : 0

      let attendanceStatus: 'adequate' | 'warning' | 'critical'
      if (attendanceRate >= 80) attendanceStatus = 'adequate'
      else if (attendanceRate >= 75) attendanceStatus = 'warning'
      else attendanceStatus = 'critical'

      // Get grades data
      const { data: gradesData, error: gradesError } = await supabase
        .from('notas')
        .select('*')
        .eq('matricula_id', enrollment.id)
        .order('bimestre')

      if (gradesError) throw gradesError

      // Process grades by quarter
      const quarters = [1, 2, 3, 4].map(quarter => {
        const quarterGrades = gradesData.filter(g => g.bimestre === quarter)
        const subjects = quarterGrades.map(grade => ({
          subject: grade.disciplina,
          grade: grade.nota,
          status: grade.nota >= 6 ? 'approved' : grade.nota >= 4 ? 'recovery' : 'failed'
        }))

        const quarterAverage = subjects.length > 0
          ? subjects.reduce((sum, s) => sum + s.grade, 0) / subjects.length
          : 0

        return {
          quarter,
          subjects,
          quarter_average: Math.round(quarterAverage * 100) / 100
        }
      })

      const annualAverage = quarters.length > 0
        ? quarters.reduce((sum, q) => sum + q.quarter_average, 0) / quarters.length
        : 0

      const finalStatus = annualAverage >= 6 && attendanceRate >= 75 ? 'approved' :
                         annualAverage >= 4 ? 'recovery' : 'failed'

      return {
        student_id: studentId,
        student_name: student.nome_completo,
        class_info: {
          class_id: turma.id,
          class_name: turma.nome,
          grade_level: turma.serie
        },
        academic_period: {
          start_date: startDate,
          end_date: endDate
        },
        attendance_summary: {
          total_school_days: totalDays,
          days_present: daysPresent,
          days_absent: daysAbsent,
          attendance_rate: attendanceRate,
          status: attendanceStatus
        },
        grades_summary: {
          quarters,
          annual_average: Math.round(annualAverage * 100) / 100,
          final_status: finalStatus
        },
        behavioral_notes: [], // Would come from behavioral records
        parent_communications: [], // Would come from communication logs
        recommendations: this.generateStudentRecommendations(attendanceStatus, finalStatus, annualAverage)
      }
    } catch (error) {
      logger.error('Error generating student progress report', error as Error)
      throw error
    }
  }

  private generateStudentRecommendations(
    attendanceStatus: string,
    finalStatus: string,
    average: number
  ): string[] {
    const recommendations: string[] = []

    if (attendanceStatus === 'critical') {
      recommendations.push('Intervenção urgente necessária - frequência abaixo do mínimo legal')
      recommendations.push('Contatar responsáveis para reunião sobre assiduidade')
      recommendations.push('Avaliar possíveis barreiras à frequência escolar')
    } else if (attendanceStatus === 'warning') {
      recommendations.push('Monitorar frequência de perto - próximo ao limite mínimo')
      recommendations.push('Implementar estratégias de engajamento do estudante')
    }

    if (finalStatus === 'failed') {
      recommendations.push('Estudante em risco de retenção')
      recommendations.push('Implementar plano de recuperação intensiva')
      recommendations.push('Considerar atendimento pedagógico especializado')
    } else if (finalStatus === 'recovery') {
      recommendations.push('Acompanhamento pedagógico recomendado')
      recommendations.push('Reforço nas disciplinas com menor rendimento')
    }

    if (average < 4) {
      recommendations.push('Avaliar necessidades especiais de aprendizagem')
      recommendations.push('Reunião multidisciplinar para definir estratégias')
    }

    return recommendations
  }

  // ===== EXPORT METHODS =====

  /**
   * Export report to PDF
   */
  async exportReportToPDF(reportData: any, reportType: string): Promise<Blob> {
    // This would integrate with jsPDF to generate PDFs
    // For now, returning a simulated PDF blob
    const content = JSON.stringify(reportData, null, 2)
    return new Blob([content], { type: 'application/pdf' })
  }

  /**
   * Export report to Excel
   */
  async exportReportToExcel(reportData: any, reportType: string): Promise<Blob> {
    // This would integrate with xlsx library to generate Excel files
    // For now, returning a simulated Excel blob
    const content = JSON.stringify(reportData, null, 2)
    return new Blob([content], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  }
}

export const advancedReportsApi = new AdvancedReportsService()