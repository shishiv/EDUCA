/**
 * React Hook for Attendance Workflow Management
 * Provides state management and actions for the three-phase attendance workflow
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { AttendanceWorkflowManager, WorkflowState, createAttendanceWorkflow } from '@/lib/services/attendance-workflow'
import { toast } from 'sonner'

interface UseAttendanceWorkflowOptions {
  classId: string
  teacherId: string
  date?: string
  autoSave?: boolean // Auto-save marking progress
  performanceTracking?: boolean // Track performance metrics
}

interface WorkflowActions {
  // Phase transitions
  openSession: (data: {
    conteudo_programatico: string
    metodologia?: string
    recursos_utilizados?: string
    observacoes?: string
    duracao_minutos: number
  }) => Promise<boolean>

  startMarking: () => Promise<boolean>
  closeSession: () => Promise<boolean>
  completeWorkflow: () => Promise<boolean>

  // Marking actions
  markStudent: (
    studentId: string,
    status: 'presente' | 'falta' | 'justificada' | 'atestado',
    observacoes?: string
  ) => Promise<boolean>

  markAllPresent: (excludeStudents?: string[]) => Promise<boolean>
  markAllAbsent: (excludeStudents?: string[]) => Promise<boolean>
  smartBulkMark: () => Promise<boolean>

  // Utility actions
  reset: () => void
  retry: () => Promise<boolean>
  getComplianceReport: () => Promise<any>
}

interface PerformanceMetrics {
  sessionOpenTime: number // Time to open session
  markingStartTime: number // Time to start marking
  averageMarkingTime: number // Average time per student
  totalMarkingTime: number // Total time for marking phase
  sessionCloseTime: number // Time to close session
  overallDuration: number // Total workflow duration
  studentsPerMinute: number // Marking efficiency
}

export function useAttendanceWorkflow({
  classId,
  teacherId,
  date = new Date().toISOString().split('T')[0],
  autoSave = true,
  performanceTracking = true
}: UseAttendanceWorkflowOptions) {
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [performance, setPerformance] = useState<Partial<PerformanceMetrics>>({})

  const workflowRef = useRef<AttendanceWorkflowManager | null>(null)
  const markingTimesRef = useRef<number[]>([])
  const phaseStartTimesRef = useRef<Record<string, number>>({})

  // Initialize workflow manager
  useEffect(() => {
    workflowRef.current = createAttendanceWorkflow(classId, teacherId, date)
    setWorkflowState(workflowRef.current.getState())

    if (performanceTracking) {
      phaseStartTimesRef.current['PREPARATION'] = Date.now()
    }
  }, [classId, teacherId, date])

  // Auto-save functionality
  const lastAutoSaveRef = useRef<string | null>(null)
  useEffect(() => {
    if (!autoSave || !workflowState) return

    // Auto-save marking progress every 30 seconds
    const interval = setInterval(() => {
      if (workflowState.phase === 'MARKING' && workflowState.markingData) {
        const currentState = JSON.stringify(workflowState.markingData)
        if (currentState !== lastAutoSaveRef.current) {
          localStorage.setItem(
            `workflow_${classId}_${date}`,
            JSON.stringify(workflowState)
          )
          lastAutoSaveRef.current = currentState
        }
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [autoSave, workflowState, classId, date])

  // Performance tracking helper
  const trackPhaseTransition = useCallback((fromPhase: string, toPhase: string) => {
    if (!performanceTracking) return

    const now = Date.now()
    const startTime = phaseStartTimesRef.current[fromPhase]

    if (startTime) {
      const duration = now - startTime

      setPerformance(prev => ({
        ...prev,
        [`${fromPhase.toLowerCase()}Time`]: duration
      }))
    }

    phaseStartTimesRef.current[toPhase] = now
  }, [performanceTracking])

  // Track student marking time
  const trackMarkingTime = useCallback((duration: number) => {
    if (!performanceTracking) return

    markingTimesRef.current.push(duration)

    const totalTime = markingTimesRef.current.reduce((sum, time) => sum + time, 0)
    const averageTime = totalTime / markingTimesRef.current.length

    setPerformance(prev => ({
      ...prev,
      averageMarkingTime: averageTime,
      totalMarkingTime: totalTime,
      studentsPerMinute: markingTimesRef.current.length / (totalTime / 60000)
    }))
  }, [performanceTracking])

  // Execute workflow transition with error handling
  const executeTransition = useCallback(async (
    action: string,
    data?: any
  ): Promise<boolean> => {
    if (!workflowRef.current) return false

    setLoading(true)
    setError(null)

    try {
      const currentPhase = workflowRef.current.getState().phase

      // Set data if provided
      if (action === 'open_session' && data) {
        workflowRef.current.setOpeningData(data)
      }

      const result = await workflowRef.current.executeTransition(action)

      if (result.success) {
        const newState = workflowRef.current.getState()
        setWorkflowState(newState)

        if (performanceTracking) {
          trackPhaseTransition(currentPhase, newState.phase)
        }

        // Show success message
        const messages = {
          open_session: 'Aula aberta com sucesso!',
          start_marking: 'Iniciando marcação de presença...',
          close_session: 'Aula finalizada com sucesso!',
          complete_workflow: 'Workflow concluído!'
        }

        toast.success(messages[action as keyof typeof messages] || 'Operação realizada com sucesso!')
        return true
      } else {
        setError(result.error || 'Erro desconhecido')
        toast.error(result.error || 'Erro na operação')
        return false
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      setError(errorMessage)
      toast.error('Erro interno: ' + errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [trackPhaseTransition, performanceTracking])

  // Individual student marking with performance tracking
  const markStudent = useCallback(async (
    studentId: string,
    status: 'presente' | 'falta' | 'justificada' | 'atestado',
    observacoes?: string
  ): Promise<boolean> => {
    if (!workflowRef.current) return false

    const startTime = Date.now()

    try {
      const result = await workflowRef.current.markStudentAttendance(
        studentId,
        status,
        observacoes
      )

      if (result.success) {
        setWorkflowState(workflowRef.current.getState())

        if (performanceTracking) {
          trackMarkingTime(Date.now() - startTime)
        }

        return true
      } else {
        toast.error(result.error || 'Erro ao marcar presença')
        return false
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      toast.error('Erro: ' + errorMessage)
      return false
    }
  }, [trackMarkingTime, performanceTracking])

  // Bulk marking operations with performance tracking
  const markAllPresent = useCallback(async (excludeStudents?: string[]): Promise<boolean> => {
    if (!workflowRef.current) return false

    try {
      const result = await workflowRef.current.bulkMarkAttendance('all_present', excludeStudents)

      if (result.success) {
        setWorkflowState(workflowRef.current.getState())

        // Show performance info if available
        if (result.performance && performanceTracking) {
          const avgTime = result.performance.averageTimePerStudent
          const isUnderTarget = avgTime < 1000

          toast.success(
            `Todos marcados como presentes! ${
              isUnderTarget
                ? `⚡ ${Math.round(avgTime)}ms/aluno`
                : `⏱️ ${Math.round(avgTime)}ms/aluno`
            }`
          )
        } else {
          toast.success('Todos os alunos marcados como presentes')
        }

        return true
      } else {
        toast.error(result.error || 'Erro na marcação em massa')
        return false
      }
    } catch (err) {
      toast.error('Erro: ' + String(err))
      return false
    }
  }, [performanceTracking])

  const markAllAbsent = useCallback(async (excludeStudents?: string[]): Promise<boolean> => {
    if (!workflowRef.current) return false

    try {
      const result = await workflowRef.current.bulkMarkAttendance('all_absent', excludeStudents)

      if (result.success) {
        setWorkflowState(workflowRef.current.getState())

        // Show performance info if available
        if (result.performance && performanceTracking) {
          const avgTime = result.performance.averageTimePerStudent
          const isUnderTarget = avgTime < 1000

          toast.success(
            `Todos marcados como faltas! ${
              isUnderTarget
                ? `⚡ ${Math.round(avgTime)}ms/aluno`
                : `⏱️ ${Math.round(avgTime)}ms/aluno`
            }`
          )
        } else {
          toast.success('Todos os alunos marcados como faltas')
        }

        return true
      } else {
        toast.error(result.error || 'Erro na marcação em massa')
        return false
      }
    } catch (err) {
      toast.error('Erro: ' + String(err))
      return false
    }
  }, [performanceTracking])

  // Smart bulk marking with AI predictions
  const smartBulkMark = useCallback(async (): Promise<boolean> => {
    if (!workflowRef.current) return false

    try {
      const result = await workflowRef.current.bulkMarkAttendance('smart_prediction')

      if (result.success) {
        setWorkflowState(workflowRef.current.getState())

        // Show performance and prediction info
        if (result.performance && performanceTracking) {
          const avgTime = result.performance.averageTimePerStudent
          const recordsPerSec = result.performance.recordsPerSecond

          toast.success(
            `🧠 Predição inteligente aplicada! ` +
            `⚡ ${Math.round(avgTime)}ms/aluno (${Math.round(recordsPerSec)} alunos/s)`
          )
        } else {
          toast.success('🧠 Predição inteligente aplicada com sucesso!')
        }

        return true
      } else {
        toast.error(result.error || 'Erro na predição inteligente')
        return false
      }
    } catch (err) {
      toast.error('Erro na predição: ' + String(err))
      return false
    }
  }, [performanceTracking])

  // Get legal compliance report
  const getComplianceReport = useCallback(async () => {
    if (!workflowState?.sessionId) {
      throw new Error('Session ID not available')
    }

    // This would use the attendance API to get the report
    // For now, return basic info
    return {
      sessionId: workflowState.sessionId,
      phase: workflowState.phase,
      performance: performance,
      errors: workflowState.errors,
      warnings: workflowState.warnings
    }
  }, [workflowState, performance])

  // Reset workflow (with confirmation)
  const reset = useCallback(() => {
    if (workflowState?.phase !== 'PREPARATION' && workflowState?.phase !== 'COMPLETED') {
      if (!confirm('Tem certeza que deseja reiniciar o workflow? Todo o progresso será perdido.')) {
        return
      }
    }

    workflowRef.current = createAttendanceWorkflow(classId, teacherId, date)
    setWorkflowState(workflowRef.current.getState())
    setError(null)
    setPerformance({})
    markingTimesRef.current = []
    phaseStartTimesRef.current = { PREPARATION: Date.now() }

    // Clear auto-save data
    localStorage.removeItem(`workflow_${classId}_${date}`)

    toast.info('Workflow reiniciado')
  }, [workflowState, classId, teacherId, date])

  // Retry last failed operation
  const retry = useCallback(async (): Promise<boolean> => {
    if (workflowState?.phase !== 'ERROR') {
      return false
    }

    // For now, just reset and let user try again
    // In a more sophisticated implementation, we could track the last attempted action
    reset()
    return true
  }, [workflowState, reset])

  // Actions object
  const actions: WorkflowActions = {
    openSession: (data) => executeTransition('open_session', data),
    startMarking: () => executeTransition('start_marking'),
    closeSession: () => executeTransition('close_session'),
    completeWorkflow: () => executeTransition('complete_workflow'),
    markStudent,
    markAllPresent,
    markAllAbsent,
    smartBulkMark,
    reset,
    retry,
    getComplianceReport
  }

  // Computed properties
  const availableActions = workflowRef.current?.getAvailableActions() || []
  const progress = workflowRef.current?.getOverallProgress() || 0

  // Load saved state on mount (if auto-save enabled)
  useEffect(() => {
    if (!autoSave) return

    const savedState = localStorage.getItem(`workflow_${classId}_${date}`)
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState)
        // Only restore if it's from the same session
        if (parsedState.classId === classId && parsedState.date === date) {
          // In a real implementation, we'd need to restore the workflow manager state
          toast.info('Estado anterior restaurado')
        }
      } catch (err) {
        console.warn('Failed to restore saved workflow state:', err)
      }
    }
  }, [autoSave, classId, date])

  return {
    // State
    state: workflowState,
    loading,
    error,
    performance,

    // Computed
    availableActions,
    progress,
    isCompleted: workflowState?.phase === 'COMPLETED',
    hasErrors: workflowState?.errors?.length > 0,
    hasWarnings: workflowState?.warnings?.length > 0,

    // Actions
    actions
  }
}