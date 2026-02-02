/**
 * Three-Phase Attendance Workflow Manager
 * Implements the complete "Abrir Aula" → "Marcar Frequência" → "Fechar Aula" workflow
 *
 * Phases:
 * 1. OPENING: Teacher opens class session with lesson plan
 * 2. MARKING: Teacher marks student attendance
 * 3. CLOSING: Session is closed and records become immutable
 */

import { supabase } from '@/lib/supabase'
import { attendanceImmutability } from './attendance-immutability'
import { attendanceBulkOperations } from './attendance-bulk-operations'
import { AttendanceSession, AttendanceRecord } from '@/lib/api/attendance'

export type WorkflowPhase = 'PREPARATION' | 'OPENING' | 'MARKING' | 'CLOSING' | 'COMPLETED' | 'ERROR'

export interface WorkflowState {
  phase: WorkflowPhase
  sessionId?: string
  classId: string
  teacherId: string
  date: string

  // Phase-specific data
  openingData?: {
    conteudo_programatico: string
    metodologia?: string
    recursos_utilizados?: string
    observacoes?: string
    duracao_minutos: number
  }

  markingData?: {
    students: Array<{
      id: string
      nome_completo: string
      status: 'presente' | 'falta' | 'justificada' | 'atestado' | 'pending'
      observacoes?: string
    }>
    progress: {
      total: number
      marked: number
      percentage: number
    }
  }

  closingData?: {
    closed_at: string
    legal_hash: string
    total_students: number
    present_count: number
    absent_count: number
  }

  // Workflow metadata
  started_at: string
  current_phase_started: string
  estimated_completion?: string
  errors: string[]
  warnings: string[]
}

export interface WorkflowTransition {
  from: WorkflowPhase
  to: WorkflowPhase
  action: string
  validation?: () => Promise<boolean>
  execute: () => Promise<void>
}

/**
 * Manages the complete attendance workflow with state tracking and validation
 */
export class AttendanceWorkflowManager {
  private state: WorkflowState
  private transitions: Map<string, WorkflowTransition[]> = new Map()

  constructor(classId: string, teacherId: string, date: string) {
    this.state = {
      phase: 'PREPARATION',
      classId,
      teacherId,
      date,
      started_at: new Date().toISOString(),
      current_phase_started: new Date().toISOString(),
      errors: [],
      warnings: []
    }

    this.initializeTransitions()
  }

  /**
   * Initialize valid workflow transitions
   */
  private initializeTransitions() {
    // PREPARATION → OPENING
    this.addTransition('PREPARATION', 'OPENING', 'open_session', {
      validation: () => this.validateOpeningPrerequisites(),
      execute: () => this.executeOpeningPhase()
    })

    // OPENING → MARKING
    this.addTransition('OPENING', 'MARKING', 'start_marking', {
      validation: () => this.validateMarkingPrerequisites(),
      execute: () => this.executeMarkingPhase()
    })

    // MARKING → CLOSING
    this.addTransition('MARKING', 'CLOSING', 'close_session', {
      validation: () => this.validateClosingPrerequisites(),
      execute: () => this.executeClosingPhase()
    })

    // CLOSING → COMPLETED
    this.addTransition('CLOSING', 'COMPLETED', 'complete_workflow', {
      validation: () => this.validateCompletionPrerequisites(),
      execute: () => this.executeCompletionPhase()
    })

    // Error transitions (from any phase)
    for (const phase of ['PREPARATION', 'OPENING', 'MARKING', 'CLOSING']) {
      this.addTransition(phase as WorkflowPhase, 'ERROR', 'handle_error', {
        execute: () => this.executeErrorPhase()
      })
    }
  }

  private addTransition(from: WorkflowPhase, to: WorkflowPhase, action: string, handlers: {
    validation?: () => Promise<boolean>
    execute: () => Promise<void>
  }) {
    const key = `${from}_${action}`
    if (!this.transitions.has(key)) {
      this.transitions.set(key, [])
    }

    this.transitions.get(key)!.push({
      from,
      to,
      action,
      validation: handlers.validation,
      execute: handlers.execute
    })
  }

  /**
   * Execute a workflow transition
   */
  async executeTransition(action: string): Promise<{ success: boolean; error?: string }> {
    const key = `${this.state.phase}_${action}`
    const transitions = this.transitions.get(key)

    if (!transitions || transitions.length === 0) {
      return {
        success: false,
        error: `Transição inválida: ${action} não permitido na fase ${this.state.phase}`
      }
    }

    try {
      const transition = transitions[0]

      // Run validation if present
      if (transition.validation) {
        const isValid = await transition.validation()
        if (!isValid) {
          return {
            success: false,
            error: `Validação falhou para transição ${action}`
          }
        }
      }

      // Execute transition
      await transition.execute()

      // Update state
      this.state.phase = transition.to
      this.state.current_phase_started = new Date().toISOString()

      return { success: true }
    } catch (error) {
      this.state.errors.push(`Erro na transição ${action}: ${error}`)
      this.state.phase = 'ERROR'

      return {
        success: false,
        error: `Erro ao executar transição: ${error}`
      }
    }
  }

  /**
   * PHASE 1: OPENING - Session Creation
   */
  private async validateOpeningPrerequisites(): Promise<boolean> {
    try {
      // Check if session already exists for today
      const { data: existingSession } = await supabase
        .from('sessoes_aula')
        .select('id, status')
        .eq('turma_id', this.state.classId)
        .eq('professor_id', this.state.teacherId)
        .eq('data_aula', this.state.date)

      if (existingSession && existingSession.length > 0) {
        const session = existingSession[0]
        this.state.warnings.push('Sessão já existe para hoje')

        if (session.status === 'fechada') {
          this.state.errors.push('Sessão já foi finalizada - não é possível reabrir')
          return false
        }

        // Resume existing session
        this.state.sessionId = session.id
        return true
      }

      // Check if teacher has permission for this class
      const { data: classPermission } = await supabase
        .from('turmas')
        .select('professor_id')
        .eq('id', this.state.classId)
        .single()

      if (classPermission?.professor_id !== this.state.teacherId) {
        this.state.errors.push('Professor não tem permissão para esta turma')
        return false
      }

      // Check time restrictions (not too early, not too late)
      const currentHour = new Date().getHours()
      if (currentHour < 6 || currentHour > 22) {
        this.state.warnings.push('Horário não usual para abertura de aula')
      }

      return true
    } catch (error) {
      this.state.errors.push(`Erro na validação de abertura: ${error}`)
      return false
    }
  }

  private async executeOpeningPhase(): Promise<void> {
    if (!this.state.openingData) {
      throw new Error('Dados de abertura não fornecidos')
    }

    // Create new session if one doesn't exist
    if (!this.state.sessionId) {
      // Get escola_id from turma
      const { data: turma } = await supabase
        .from('turmas')
        .select('escola_id')
        .eq('id', this.state.classId)
        .single()

      if (!turma?.escola_id) {
        throw new Error('Turma não encontrada ou sem escola associada')
      }

      const sessionData = {
        turma_id: this.state.classId,
        professor_id: this.state.teacherId,
        data_aula: this.state.date,
        status: 'aberta' as const,
        inicio_aula: new Date().toISOString(),
        escola_id: turma.escola_id,
        ...this.state.openingData
      }

      const { data: session, error } = await supabase
        .from('sessoes_aula')
        .insert(sessionData)
        .select()
        .single()

      if (error) throw error

      this.state.sessionId = session.id
    }

    // Log workflow transition
    await this.logWorkflowEvent('OPENING_COMPLETED', {
      sessionId: this.state.sessionId,
      openingData: this.state.openingData
    })
  }

  /**
   * PHASE 2: MARKING - Attendance Marking
   */
  private async validateMarkingPrerequisites(): Promise<boolean> {
    try {
      if (!this.state.sessionId) {
        this.state.errors.push('Sessão não foi aberta')
        return false
      }

      // Load students for this class
      const { data: students, error } = await supabase
        .from('alunos')
        .select(`
          id,
          nome_completo,
          matriculas!inner(
            situacao,
            turma_id
          )
        `)
        .eq('matriculas.turma_id', this.state.classId)
        .eq('matriculas.situacao', 'ativa')
        .eq('ativo', true)
        .order('nome_completo')

      if (error) throw error

      if (!students || students.length === 0) {
        this.state.errors.push('Nenhum aluno encontrado nesta turma')
        return false
      }

      // Initialize marking data
      this.state.markingData = {
        students: students.map(student => ({
          id: student.id,
          nome_completo: student.nome_completo,
          status: 'pending' as const
        })),
        progress: {
          total: students.length,
          marked: 0,
          percentage: 0
        }
      }

      return true
    } catch (error) {
      this.state.errors.push(`Erro na validação de marcação: ${error}`)
      return false
    }
  }

  private async executeMarkingPhase(): Promise<void> {
    if (!this.state.markingData) {
      throw new Error('Dados de marcação não inicializados')
    }

    // Log workflow transition
    await this.logWorkflowEvent('MARKING_STARTED', {
      sessionId: this.state.sessionId,
      totalStudents: this.state.markingData.students.length
    })
  }

  /**
   * Update attendance for a specific student
   */
  async markStudentAttendance(
    studentId: string,
    status: 'presente' | 'falta' | 'justificada' | 'atestado',
    observacoes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.state.phase !== 'MARKING') {
        return {
          success: false,
          error: 'Workflow não está na fase de marcação'
        }
      }

      if (!this.state.markingData) {
        return {
          success: false,
          error: 'Dados de marcação não inicializados'
        }
      }

      // Find and update student
      const studentIndex = this.state.markingData.students.findIndex(s => s.id === studentId)
      if (studentIndex === -1) {
        return {
          success: false,
          error: 'Aluno não encontrado'
        }
      }

      const wasMarked = this.state.markingData.students[studentIndex].status !== 'pending'

      this.state.markingData.students[studentIndex] = {
        ...this.state.markingData.students[studentIndex],
        status,
        observacoes
      }

      // Update progress
      if (!wasMarked) {
        this.state.markingData.progress.marked++
      }

      this.state.markingData.progress.percentage = Math.round(
        (this.state.markingData.progress.marked / this.state.markingData.progress.total) * 100
      )

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: `Erro ao marcar presença: ${error}`
      }
    }
  }

  /**
   * Bulk update attendance for all students with high performance
   */
  async bulkMarkAttendance(
    action: 'all_present' | 'all_absent' | 'smart_prediction',
    excludeStudents?: string[]
  ): Promise<{ success: boolean; error?: string; performance?: any }> {
    try {
      if (this.state.phase !== 'MARKING' || !this.state.markingData) {
        return {
          success: false,
          error: 'Workflow não está na fase de marcação'
        }
      }

      if (!this.state.sessionId) {
        return {
          success: false,
          error: 'ID da sessão não encontrado'
        }
      }

      // Get student IDs for bulk operation
      const studentIds = this.state.markingData.students
        .filter(s => !excludeStudents?.includes(s.id))
        .map(s => s.id)

      let bulkResult

      // Use high-performance bulk operations service
      switch (action) {
        case 'all_present':
          bulkResult = await attendanceBulkOperations.markAllPresent(
            this.state.sessionId,
            this.state.classId,
            this.state.date,
            studentIds,
            excludeStudents
          )
          break

        case 'all_absent':
          bulkResult = await attendanceBulkOperations.markAllAbsent(
            this.state.sessionId,
            this.state.classId,
            this.state.date,
            studentIds,
            excludeStudents
          )
          break

        case 'smart_prediction':
          bulkResult = await attendanceBulkOperations.smartBulkMarkAttendance(
            this.state.sessionId,
            this.state.classId,
            this.state.date,
            studentIds
          )
          break

        default:
          return {
            success: false,
            error: 'Ação de marcação em massa inválida'
          }
      }

      if (!bulkResult.success) {
        return {
          success: false,
          error: `Erro na operação em massa: ${bulkResult.errors.length} erros encontrados`
        }
      }

      // Update local state based on bulk operation results
      if (action === 'all_present' || action === 'all_absent') {
        const targetStatus = action === 'all_present' ? 'presente' : 'falta'

        for (const student of this.state.markingData.students) {
          if (!excludeStudents?.includes(student.id) && student.status === 'pending') {
            student.status = targetStatus
          }
        }
      }

      // Recalculate progress
      const markedCount = this.state.markingData.students.filter(s => s.status !== 'pending').length
      this.state.markingData.progress.marked = markedCount
      this.state.markingData.progress.percentage = Math.round(
        (markedCount / this.state.markingData.progress.total) * 100
      )

      return {
        success: true,
        performance: bulkResult.performance
      }
    } catch (error) {
      return {
        success: false,
        error: `Erro na marcação em massa: ${error}`
      }
    }
  }

  /**
   * PHASE 3: CLOSING - Session Closure with Immutability
   */
  private async validateClosingPrerequisites(): Promise<boolean> {
    try {
      if (!this.state.sessionId || !this.state.markingData) {
        this.state.errors.push('Sessão ou dados de marcação ausentes')
        return false
      }

      // Check if all students have been marked
      const unmarkedStudents = this.state.markingData.students.filter(s => s.status === 'pending')

      if (unmarkedStudents.length > 0) {
        this.state.warnings.push(`${unmarkedStudents.length} alunos ainda não foram marcados`)

        // Allow closing but warn user
        const unmarkedNames = unmarkedStudents.map(s => s.nome_completo).slice(0, 3).join(', ')
        this.state.warnings.push(`Alunos não marcados: ${unmarkedNames}${unmarkedStudents.length > 3 ? '...' : ''}`)
      }

      // Check immutability permissions
      const permission = await attendanceImmutability.validateModificationPermission(
        this.state.sessionId,
        this.state.teacherId,
        'CREATE'
      )

      if (!permission.allowed) {
        this.state.errors.push(permission.error?.message || 'Permissão negada para fechamento')
        return false
      }

      return true
    } catch (error) {
      this.state.errors.push(`Erro na validação de fechamento: ${error}`)
      return false
    }
  }

  private async executeClosingPhase(): Promise<void> {
    if (!this.state.sessionId || !this.state.markingData) {
      throw new Error('Dados necessários para fechamento ausentes')
    }

    // Prepare attendance records (mark unmarked students as absent)
    const attendanceRecords = this.state.markingData.students.map(student => ({
      student_id: student.id,
      status: student.status === 'pending' ? 'falta' as const : student.status,
      observacoes: student.observacoes
    }))

    // Save attendance records using immutability service
    const result = await attendanceImmutability.createImmutableAttendanceRecords(
      this.state.sessionId,
      attendanceRecords,
      this.state.teacherId
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Erro ao salvar registros imutáveis')
    }

    // Calculate closing statistics
    const presentCount = attendanceRecords.filter(r => r.status === 'presente').length
    const absentCount = attendanceRecords.filter(r => r.status === 'falta').length

    this.state.closingData = {
      closed_at: new Date().toISOString(),
      legal_hash: 'WORKFLOW_' + this.state.sessionId + '_' + Date.now(),
      total_students: attendanceRecords.length,
      present_count: presentCount,
      absent_count: absentCount
    }

    // Log workflow completion
    await this.logWorkflowEvent('CLOSING_COMPLETED', {
      sessionId: this.state.sessionId,
      attendanceRecords: attendanceRecords.length,
      presentCount,
      absentCount
    })
  }

  /**
   * PHASE 4: COMPLETION - Final validation and cleanup
   */
  private async validateCompletionPrerequisites(): Promise<boolean> {
    try {
      if (!this.state.sessionId || !this.state.closingData) {
        return false
      }

      // Verify session was properly closed
      const { data: session } = await supabase
        .from('sessoes_aula')
        .select('status, fim_aula')
        .eq('id', this.state.sessionId)
        .single()

      if (!session || session.status !== 'fechada' || !session.fim_aula) {
        this.state.errors.push('Sessão não foi adequadamente fechada')
        return false
      }

      return true
    } catch (error) {
      this.state.errors.push(`Erro na validação de completude: ${error}`)
      return false
    }
  }

  private async executeCompletionPhase(): Promise<void> {
    // Generate final workflow report
    const completionTime = new Date().toISOString()

    await this.logWorkflowEvent('WORKFLOW_COMPLETED', {
      sessionId: this.state.sessionId,
      totalDuration: this.calculateWorkflowDuration(),
      finalState: this.state.closingData,
      completedAt: completionTime
    })

    this.state.estimated_completion = completionTime
  }

  /**
   * ERROR PHASE - Handle workflow errors
   */
  private async executeErrorPhase(): Promise<void> {
    await this.logWorkflowEvent('WORKFLOW_ERROR', {
      sessionId: this.state.sessionId,
      errors: this.state.errors,
      warnings: this.state.warnings,
      lastSuccessfulPhase: this.state.phase
    })
  }

  /**
   * Get current workflow state
   */
  getState(): WorkflowState {
    return { ...this.state }
  }

  /**
   * Get available actions for current phase
   */
  getAvailableActions(): string[] {
    const actions: string[] = []

    for (const [key, transitions] of this.transitions) {
      if (key.startsWith(`${this.state.phase}_`)) {
        const action = key.split('_').slice(1).join('_')
        actions.push(action)
      }
    }

    return actions
  }

  /**
   * Calculate total workflow duration
   */
  private calculateWorkflowDuration(): number {
    const start = new Date(this.state.started_at)
    const end = new Date()
    return end.getTime() - start.getTime()
  }

  /**
   * Log workflow events for audit and debugging
   */
  private async logWorkflowEvent(event: string, data: any): Promise<void> {
    try {
      await supabase
        .from('audit_trail')
        .insert({
          tabela: 'workflow',
          registro_id: this.state.sessionId || 'no_session',
          operacao: 'CREATE',
          dados_anteriores: null,
          dados_novos: { event, ...data },
          usuario_id: this.state.teacherId,
          timestamp_operacao: new Date().toISOString(),
          sessao_id: this.state.sessionId || null,
          nivel_criticidade: 'baixo'
        })
    } catch (error) {
      console.warn('Failed to log workflow event:', error)
    }
  }

  /**
   * Set opening data for phase 1
   */
  setOpeningData(data: WorkflowState['openingData']): void {
    this.state.openingData = data
  }

  /**
   * Get workflow progress as percentage
   */
  getOverallProgress(): number {
    const phaseWeights = {
      PREPARATION: 0,
      OPENING: 25,
      MARKING: 50,
      CLOSING: 75,
      COMPLETED: 100,
      ERROR: 0
    }

    let baseProgress = phaseWeights[this.state.phase] || 0

    // Add marking progress if in marking phase
    if (this.state.phase === 'MARKING' && this.state.markingData) {
      const markingProgress = (this.state.markingData.progress.percentage * 25) / 100
      baseProgress += markingProgress
    }

    return Math.min(100, Math.max(0, baseProgress))
  }
}

/**
 * Factory function to create workflow manager
 */
export function createAttendanceWorkflow(
  classId: string,
  teacherId: string,
  date: string
): AttendanceWorkflowManager {
  return new AttendanceWorkflowManager(classId, teacherId, date)
}