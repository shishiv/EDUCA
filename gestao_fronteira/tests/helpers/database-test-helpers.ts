/**
 * Database Test Helpers for Real Supabase Integration
 * Provides utilities for setting up and tearing down test data
 */

import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const testSupabase = createClient(supabaseUrl, supabaseKey)

// Test data interfaces
export interface TestSchool {
  id: string
  nome: string
  codigo: string
  endereco: string
  telefone: string
  ativo: boolean
}

export interface TestUser {
  id: string
  email: string
  nome: string
  role: 'admin' | 'diretor' | 'secretario' | 'professor' | 'responsavel'
  escola_id: string
  ativo: boolean
}

export interface TestClass {
  id: string
  nome: string
  serie: string
  escola_id: string
  professor_id: string
  ano_letivo: number
  ativo: boolean
}

export interface TestStudent {
  id: string
  nome_completo: string
  data_nascimento: string
  cpf: string
  turma_id: string
  escola_id: string
  ativo: boolean
}

export interface TestSession {
  id: string
  turma_id: string
  professor_id: string
  data_aula: string
  conteudo_programatico: string
  metodologia?: string
  recursos_utilizados?: string
  observacoes?: string
  duracao_minutos: number
  status: 'aberta' | 'fechada'
  inicio_aula: string
  fim_aula?: string
}

export interface TestAttendanceRecord {
  id: string
  sessao_id: string
  aluno_id: string
  turma_id: string
  data: string
  status: 'presente' | 'falta' | 'justificada' | 'atestado'
  observacoes?: string
}

/**
 * Test Environment Builder
 * Creates a complete test environment with school, teacher, class, and students
 */
export class TestEnvironmentBuilder {
  private school?: TestSchool
  private teacher?: TestUser
  private class?: TestClass
  private students: TestStudent[] = []
  private sessions: TestSession[] = []
  private attendanceRecords: TestAttendanceRecord[] = []

  async createSchool(overrides?: Partial<TestSchool>): Promise<TestSchool> {
    const schoolData = {
      nome: 'E2E Test School',
      codigo: `TEST${Date.now()}`,
      endereco: 'Rua Teste, 123 - Centro',
      telefone: '(34) 9999-9999',
      ativo: true,
      ...overrides
    }

    const { data, error } = await testSupabase
      .from('escolas')
      .insert(schoolData)
      .select()
      .single()

    if (error) throw error

    this.school = data
    return data
  }

  async createTeacher(schoolId?: string, overrides?: Partial<TestUser>): Promise<TestUser> {
    if (!schoolId && !this.school) {
      await this.createSchool()
    }

    const teacherData = {
      email: `professor.${Date.now()}@fronteira.mg.gov.br`,
      nome: 'Professor Teste E2E',
      role: 'professor' as const,
      escola_id: schoolId || this.school!.id,
      ativo: true,
      ...overrides
    }

    const { data, error } = await testSupabase
      .from('users')
      .insert(teacherData)
      .select()
      .single()

    if (error) throw error

    this.teacher = data
    return data
  }

  async createClass(
    schoolId?: string,
    teacherId?: string,
    overrides?: Partial<TestClass>
  ): Promise<TestClass> {
    if (!schoolId && !this.school) {
      await this.createSchool()
    }
    if (!teacherId && !this.teacher) {
      await this.createTeacher(schoolId)
    }

    const classData = {
      nome: '3º Ano A',
      serie: '3º ano',
      escola_id: schoolId || this.school!.id,
      professor_id: teacherId || this.teacher!.id,
      ano_letivo: new Date().getFullYear(),
      ativo: true,
      ...overrides
    }

    const { data, error } = await testSupabase
      .from('turmas')
      .insert(classData)
      .select()
      .single()

    if (error) throw error

    this.class = data
    return data
  }

  async createStudents(
    count: number = 5,
    classId?: string,
    schoolId?: string,
    overrides?: Partial<TestStudent>
  ): Promise<TestStudent[]> {
    if (!classId && !this.class) {
      await this.createClass()
    }
    if (!schoolId && !this.school) {
      await this.createSchool()
    }

    const studentsData = Array.from({ length: count }, (_, i) => ({
      nome_completo: `Aluno Teste ${i + 1}`,
      data_nascimento: '2010-01-01',
      cpf: this.generateValidCPF(),
      turma_id: classId || this.class!.id,
      escola_id: schoolId || this.school!.id,
      ativo: true,
      ...overrides
    }))

    const { data, error } = await testSupabase
      .from('alunos')
      .insert(studentsData)
      .select()

    if (error) throw error

    this.students = data
    return data
  }

  async createSession(
    classId?: string,
    teacherId?: string,
    overrides?: Partial<TestSession>
  ): Promise<TestSession> {
    if (!classId && !this.class) {
      await this.createClass()
    }
    if (!teacherId && !this.teacher) {
      await this.createTeacher()
    }

    const sessionData = {
      turma_id: classId || this.class!.id,
      professor_id: teacherId || this.teacher!.id,
      data_aula: new Date().toISOString().split('T')[0],
      conteudo_programatico: 'E2E Test Content',
      metodologia: 'Aula expositiva',
      recursos_utilizados: 'Quadro, livro',
      observacoes: 'Teste automatizado',
      duracao_minutos: 50,
      status: 'aberta' as const,
      inicio_aula: new Date().toISOString(),
      ...overrides
    }

    const { data, error } = await testSupabase
      .from('sessoes_aula')
      .insert(sessionData)
      .select()
      .single()

    if (error) throw error

    this.sessions.push(data)
    return data
  }

  async createAttendanceRecords(
    sessionId: string,
    studentIds: string[],
    classId?: string,
    overrides?: Partial<TestAttendanceRecord>
  ): Promise<TestAttendanceRecord[]> {
    const attendanceData = studentIds.map(studentId => ({
      sessao_id: sessionId,
      aluno_id: studentId,
      turma_id: classId || this.class!.id,
      data: new Date().toISOString().split('T')[0],
      status: 'presente' as const,
      ...overrides
    }))

    const { data, error } = await testSupabase
      .from('frequencia')
      .insert(attendanceData)
      .select()

    if (error) throw error

    this.attendanceRecords.push(...data)
    return data
  }

  /**
   * Complete test environment setup
   */
  async buildCompleteEnvironment(
    studentCount: number = 5
  ): Promise<{
    school: TestSchool
    teacher: TestUser
    class: TestClass
    students: TestStudent[]
  }> {
    const school = await this.createSchool()
    const teacher = await this.createTeacher(school.id)
    const testClass = await this.createClass(school.id, teacher.id)
    const students = await this.createStudents(studentCount, testClass.id, school.id)

    return {
      school,
      teacher,
      class: testClass,
      students
    }
  }

  /**
   * Clean up all created test data
   */
  async cleanup(): Promise<void> {
    try {
      // Delete in correct order due to foreign key constraints

      // Delete attendance records
      if (this.attendanceRecords.length > 0) {
        await testSupabase
          .from('frequencia')
          .delete()
          .in('id', this.attendanceRecords.map(r => r.id))
      }

      // Delete sessions
      if (this.sessions.length > 0) {
        await testSupabase
          .from('sessoes_aula')
          .delete()
          .in('id', this.sessions.map(s => s.id))
      }

      // Delete students
      if (this.students.length > 0) {
        await testSupabase
          .from('alunos')
          .delete()
          .in('id', this.students.map(s => s.id))
      }

      // Delete class
      if (this.class) {
        await testSupabase
          .from('turmas')
          .delete()
          .eq('id', this.class.id)
      }

      // Delete teacher
      if (this.teacher) {
        await testSupabase
          .from('users')
          .delete()
          .eq('id', this.teacher.id)
      }

      // Delete school
      if (this.school) {
        await testSupabase
          .from('escolas')
          .delete()
          .eq('id', this.school.id)
      }

      // Reset internal state
      this.school = undefined
      this.teacher = undefined
      this.class = undefined
      this.students = []
      this.sessions = []
      this.attendanceRecords = []
    } catch (error) {
      console.error('Error during test cleanup:', error)
      throw error
    }
  }

  /**
   * Generate a valid Brazilian CPF for testing
   */
  private generateValidCPF(): string {
    // Generate first 9 digits
    const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10))

    // Calculate first verification digit
    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += base[i] * (10 - i)
    }
    const digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11)

    // Calculate second verification digit
    sum = 0
    for (let i = 0; i < 9; i++) {
      sum += base[i] * (11 - i)
    }
    sum += digit1 * 2
    const digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11)

    // Format CPF
    const cpfDigits = [...base, digit1, digit2]
    return `${cpfDigits.slice(0, 3).join('')}.${cpfDigits.slice(3, 6).join('')}.${cpfDigits.slice(6, 9).join('')}-${cpfDigits.slice(9).join('')}`
  }

  /**
   * Get created resources for test access
   */
  getResources() {
    return {
      school: this.school,
      teacher: this.teacher,
      class: this.class,
      students: this.students,
      sessions: this.sessions,
      attendanceRecords: this.attendanceRecords
    }
  }
}

/**
 * Performance Testing Utilities
 */
export class PerformanceTestHelper {
  private measurements: Map<string, number[]> = new Map()

  startMeasurement(key: string): () => number {
    const start = Date.now()
    return () => {
      const duration = Date.now() - start

      if (!this.measurements.has(key)) {
        this.measurements.set(key, [])
      }
      this.measurements.get(key)!.push(duration)

      return duration
    }
  }

  getMeasurements(key: string): number[] {
    return this.measurements.get(key) || []
  }

  getAverageMeasurement(key: string): number {
    const measurements = this.getMeasurements(key)
    if (measurements.length === 0) return 0

    return measurements.reduce((sum, value) => sum + value, 0) / measurements.length
  }

  assertPerformance(key: string, maxTime: number): void {
    const measurements = this.getMeasurements(key)
    const average = this.getAverageMeasurement(key)

    if (average > maxTime) {
      throw new Error(
        `Performance assertion failed for '${key}': ` +
        `average ${average}ms exceeds maximum ${maxTime}ms ` +
        `(measurements: ${measurements.join(', ')}ms)`
      )
    }
  }

  reset(): void {
    this.measurements.clear()
  }
}

/**
 * Legal Compliance Testing Utilities
 */
export class ComplianceTestHelper {
  /**
   * Verify session immutability after closure
   */
  static async verifySessionImmutability(sessionId: string): Promise<{
    isImmutable: boolean
    errors: string[]
  }> {
    const errors: string[] = []
    let isImmutable = true

    try {
      // Check if session is closed
      const { data: session, error } = await testSupabase
        .from('sessoes_aula')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (error) {
        errors.push(`Failed to fetch session: ${error.message}`)
        return { isImmutable: false, errors }
      }

      if (session.status !== 'fechada') {
        errors.push('Session is not closed - immutability not enforced')
        isImmutable = false
      }

      if (!session.fim_aula) {
        errors.push('Session end time not recorded')
        isImmutable = false
      }

      // Try to modify session (should fail)
      const { error: updateError } = await testSupabase
        .from('sessoes_aula')
        .update({ conteudo_programatico: 'SHOULD NOT UPDATE' })
        .eq('id', sessionId)

      if (!updateError) {
        errors.push('Session modification allowed - immutability not enforced')
        isImmutable = false
      }

      // Check attendance records immutability
      const { data: attendanceRecords, error: attendanceError } = await testSupabase
        .from('frequencia')
        .select('*')
        .eq('sessao_id', sessionId)

      if (attendanceError) {
        errors.push(`Failed to fetch attendance records: ${attendanceError.message}`)
        isImmutable = false
      }

      if (attendanceRecords && attendanceRecords.length > 0) {
        // Try to modify attendance record (should fail in a properly configured system)
        const { error: attendanceUpdateError } = await testSupabase
          .from('frequencia')
          .update({ status: 'presente' })
          .eq('id', attendanceRecords[0].id)

        if (!attendanceUpdateError) {
          errors.push('Attendance record modification allowed - immutability not enforced')
          isImmutable = false
        }
      }

    } catch (error) {
      errors.push(`Compliance check failed: ${error}`)
      isImmutable = false
    }

    return { isImmutable, errors }
  }

  /**
   * Verify audit trail completeness
   */
  static async verifyAuditTrail(sessionId: string): Promise<{
    isComplete: boolean
    errors: string[]
    auditData: any
  }> {
    const errors: string[] = []
    let isComplete = true
    let auditData: any = {}

    try {
      // Check session audit fields
      const { data: session } = await testSupabase
        .from('sessoes_aula')
        .select('*')
        .eq('id', sessionId)
        .single()

      auditData.session = session

      if (!session.created_at) {
        errors.push('Session creation timestamp missing')
        isComplete = false
      }

      if (!session.inicio_aula) {
        errors.push('Session start timestamp missing')
        isComplete = false
      }

      if (session.status === 'fechada' && !session.fim_aula) {
        errors.push('Session end timestamp missing for closed session')
        isComplete = false
      }

      // Check attendance audit fields
      const { data: attendanceRecords } = await testSupabase
        .from('frequencia')
        .select('*')
        .eq('sessao_id', sessionId)

      auditData.attendanceRecords = attendanceRecords

      if (attendanceRecords) {
        for (const record of attendanceRecords) {
          if (!record.created_at) {
            errors.push(`Attendance record ${record.id} missing creation timestamp`)
            isComplete = false
          }
        }
      }

    } catch (error) {
      errors.push(`Audit trail check failed: ${error}`)
      isComplete = false
    }

    return { isComplete, errors, auditData }
  }
}

/**
 * Accessibility Testing Utilities
 */
export class AccessibilityTestHelper {
  /**
   * Check color contrast ratios
   */
  static checkColorContrast(
    backgroundColor: string,
    textColor: string
  ): { ratio: number; passes: boolean } {
    // Simplified contrast calculation for testing
    // In real implementation, you'd use a proper contrast calculation library

    const bgLuminance = this.getLuminance(backgroundColor)
    const textLuminance = this.getLuminance(textColor)

    const ratio = (Math.max(bgLuminance, textLuminance) + 0.05) /
                  (Math.min(bgLuminance, textLuminance) + 0.05)

    return {
      ratio,
      passes: ratio >= 4.5 // WCAG AA standard
    }
  }

  private static getLuminance(color: string): number {
    // Simplified luminance calculation
    // This would need to be more sophisticated in a real implementation
    return 0.5 // Placeholder
  }
}

/**
 * Global test utilities
 */
export const testUtils = {
  TestEnvironmentBuilder,
  PerformanceTestHelper,
  ComplianceTestHelper,
  AccessibilityTestHelper,
  testSupabase
}