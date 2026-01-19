/**
 * React Hook for Attendance History Management
 * Provides access to attendance history, audit trails, and compliance reports
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  attendanceHistory,
  AttendanceHistoryEntry,
  AttendanceAuditReport,
  AttendancePattern
} from '@/lib/services/attendance-history'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

interface UseAttendanceHistoryOptions {
  sessionId?: string
  studentId?: string
  autoLoad?: boolean
  realTimeUpdates?: boolean
}

interface HistoryFilters {
  operation?: string[]
  userId?: string
  startDate?: string
  endDate?: string
  complianceFlags?: string[]
  source?: string[]
}

interface HistoryActions {
  // History retrieval
  loadSessionHistory: (sessionId: string) => Promise<AttendanceHistoryEntry[]>
  searchHistory: (filters: HistoryFilters) => Promise<void>
  clearHistory: () => void

  // Audit reports
  generateAuditReport: (sessionId: string) => Promise<AttendanceAuditReport | null>
  downloadAuditReport: (report: AttendanceAuditReport, format: 'pdf' | 'excel') => Promise<void>

  // Student patterns
  getStudentPattern: (studentId: string, startDate: string, endDate: string) => Promise<AttendancePattern | null>

  // Recording (internal use)
  recordChange: (
    sessionId: string,
    studentId: string,
    operation: string,
    previousValues: any,
    currentValues: any,
    userId: string
  ) => Promise<boolean>

  // Pagination
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
}

interface HistoryState {
  entries: AttendanceHistoryEntry[]
  total: number
  hasMore: boolean
  currentPage: number
  loading: boolean
  error: string | null
}

interface AuditReportState {
  report: AttendanceAuditReport | null
  generating: boolean
  error: string | null
}

interface StudentPatternState {
  pattern: AttendancePattern | null
  loading: boolean
  error: string | null
}

export function useAttendanceHistory({
  sessionId,
  studentId,
  autoLoad = false,
  realTimeUpdates = false
}: UseAttendanceHistoryOptions = {}) {
  // History state
  const [historyState, setHistoryState] = useState<HistoryState>({
    entries: [],
    total: 0,
    hasMore: false,
    currentPage: 0,
    loading: false,
    error: null
  })

  // Audit report state
  const [auditReportState, setAuditReportState] = useState<AuditReportState>({
    report: null,
    generating: false,
    error: null
  })

  // Student pattern state
  const [studentPatternState, setStudentPatternState] = useState<StudentPatternState>({
    pattern: null,
    loading: false,
    error: null
  })

  // Current filters
  const [currentFilters, setCurrentFilters] = useState<HistoryFilters>({})

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad && sessionId) {
      loadSessionHistory(sessionId)
    }
  }, [autoLoad, sessionId])

  // Real-time updates (simplified for demo)
  useEffect(() => {
    if (!realTimeUpdates) return

    const interval = setInterval(() => {
      if (sessionId || Object.keys(currentFilters).length > 0) {
        refresh()
      }
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [realTimeUpdates, sessionId, currentFilters])

  // Load session history
  const loadSessionHistory = useCallback(async (sessionId: string): Promise<AttendanceHistoryEntry[]> => {
    setHistoryState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const entries = await attendanceHistory.getSessionHistory(sessionId)

      setHistoryState({
        entries,
        total: entries.length,
        hasMore: false,
        currentPage: 1,
        loading: false,
        error: null
      })

      return entries
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setHistoryState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
      toast.error('Erro ao carregar histórico: ' + errorMessage)
      return []
    }
  }, [])

  // Search history with filters
  const searchHistory = useCallback(async (filters: HistoryFilters): Promise<void> => {
    setHistoryState(prev => ({ ...prev, loading: true, error: null }))
    setCurrentFilters(filters)

    try {
      const searchFilters = {
        ...filters,
        sessionId,
        studentId,
        limit: 50,
        offset: 0
      }

      const result = await attendanceHistory.searchAttendanceHistory(searchFilters)

      setHistoryState({
        entries: result.entries,
        total: result.total,
        hasMore: result.hasMore,
        currentPage: 1,
        loading: false,
        error: null
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setHistoryState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
      toast.error('Erro na pesquisa: ' + errorMessage)
    }
  }, [sessionId, studentId])

  // Load more results (pagination)
  const loadMore = useCallback(async (): Promise<void> => {
    if (!historyState.hasMore || historyState.loading) return

    setHistoryState(prev => ({ ...prev, loading: true }))

    try {
      const searchFilters = {
        ...currentFilters,
        sessionId,
        studentId,
        limit: 50,
        offset: historyState.entries.length
      }

      const result = await attendanceHistory.searchAttendanceHistory(searchFilters)

      setHistoryState(prev => ({
        ...prev,
        entries: [...prev.entries, ...result.entries],
        hasMore: result.hasMore,
        currentPage: prev.currentPage + 1,
        loading: false
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setHistoryState(prev => ({ ...prev, loading: false, error: errorMessage }))
      toast.error('Erro ao carregar mais resultados: ' + errorMessage)
    }
  }, [historyState.hasMore, historyState.loading, historyState.entries.length, currentFilters, sessionId, studentId])

  // Refresh current results
  const refresh = useCallback(async (): Promise<void> => {
    if (sessionId && Object.keys(currentFilters).length === 0) {
      await loadSessionHistory(sessionId)
    } else if (Object.keys(currentFilters).length > 0) {
      await searchHistory(currentFilters)
    }
  }, [sessionId, currentFilters, loadSessionHistory, searchHistory])

  // Clear history
  const clearHistory = useCallback((): void => {
    setHistoryState({
      entries: [],
      total: 0,
      hasMore: false,
      currentPage: 0,
      loading: false,
      error: null
    })
    setCurrentFilters({})
  }, [])

  // Generate audit report
  const generateAuditReport = useCallback(async (sessionId: string): Promise<AttendanceAuditReport | null> => {
    setAuditReportState({ report: null, generating: true, error: null })

    try {
      const report = await attendanceHistory.generateSessionAuditReport(sessionId)

      setAuditReportState({
        report,
        generating: false,
        error: null
      })

      toast.success('Relatório de auditoria gerado com sucesso')
      return report
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setAuditReportState({
        report: null,
        generating: false,
        error: errorMessage
      })
      toast.error('Erro ao gerar relatório: ' + errorMessage)
      return null
    }
  }, [])

  // Download audit report
  const downloadAuditReport = useCallback(async (
    report: AttendanceAuditReport,
    format: 'pdf' | 'excel'
  ): Promise<void> => {
    try {
      // In a real implementation, this would generate and download the file
      // For now, show success message
      const fileName = `audit_report_${report.sessionId}_${new Date().toISOString().split('T')[0]}.${format}`
      toast.success(`Relatório baixado: ${fileName}`)

      // Simulate file generation
      logger.info('Downloading audit report', {
        feature: 'attendance',
        action: 'download_audit_report',
        metadata: { fileName, format }
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast.error('Erro ao baixar relatório: ' + errorMessage)
    }
  }, [])

  // Get student attendance pattern
  const getStudentPattern = useCallback(async (
    studentId: string,
    startDate: string,
    endDate: string
  ): Promise<AttendancePattern | null> => {
    setStudentPatternState({ pattern: null, loading: true, error: null })

    try {
      const pattern = await attendanceHistory.getStudentAttendancePattern(studentId, startDate, endDate)

      setStudentPatternState({
        pattern,
        loading: false,
        error: null
      })

      return pattern
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setStudentPatternState({
        pattern: null,
        loading: false,
        error: errorMessage
      })
      toast.error('Erro ao analisar padrão: ' + errorMessage)
      return null
    }
  }, [])

  // Record attendance change (for internal use by other hooks)
  const recordChange = useCallback(async (
    sessionId: string,
    studentId: string,
    operation: string,
    previousValues: any,
    currentValues: any,
    userId: string
  ): Promise<boolean> => {
    try {
      const result = await attendanceHistory.recordAttendanceChange(
        sessionId,
        studentId,
        operation as any,
        previousValues,
        currentValues,
        userId
      )

      if (result.success) {
        // Refresh history if we're currently viewing this session
        if (sessionId === sessionId) {
          refresh()
        }
        return true
      } else {
        logger.warn('Failed to record attendance change', {
          feature: 'attendance',
          action: 'record_change',
          metadata: { error: result.error }
        })
        return false
      }
    } catch (error) {
      logger.error('Error recording attendance change', error as Error, {
        feature: 'attendance',
        action: 'record_change'
      })
      return false
    }
  }, [refresh])

  // Actions object
  const actions: HistoryActions = {
    loadSessionHistory,
    searchHistory,
    clearHistory,
    generateAuditReport,
    downloadAuditReport,
    getStudentPattern,
    recordChange,
    loadMore,
    refresh
  }

  // Computed values
  const computedValues = useMemo(() => {
    const { entries } = historyState
    const { report } = auditReportState
    const { pattern } = studentPatternState

    // Recent activity summary
    const recentActivity = entries.slice(0, 10)

    // Compliance summary
    const complianceIssues = entries.filter(entry =>
      entry.complianceFlags.some(flag =>
        ['POST_CLOSURE_MODIFICATION', 'RETROACTIVE_CHANGE', 'CRITICAL_FIELD_CHANGE'].some(critical =>
          flag.includes(critical)
        )
      )
    )

    // User activity summary
    const userActivity = entries.reduce((acc, entry) => {
      if (!acc[entry.userId]) {
        acc[entry.userId] = {
          userName: entry.userName,
          count: 0,
          lastActivity: entry.timestamp
        }
      }
      acc[entry.userId].count++
      if (entry.timestamp > acc[entry.userId].lastActivity) {
        acc[entry.userId].lastActivity = entry.timestamp
      }
      return acc
    }, {} as Record<string, { userName: string; count: number; lastActivity: string }>)

    // Operation summary
    const operationSummary = entries.reduce((acc, entry) => {
      acc[entry.operation] = (acc[entry.operation] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      recentActivity,
      complianceIssues,
      userActivity: Object.values(userActivity),
      operationSummary,
      hasComplianceIssues: complianceIssues.length > 0,
      auditScore: report?.summary.integrityScore,
      complianceStatus: report?.summary.complianceStatus
    }
  }, [historyState.entries, auditReportState.report, studentPatternState.pattern])

  return {
    // State
    history: historyState,
    auditReport: auditReportState,
    studentPattern: studentPatternState,
    currentFilters,

    // Computed values
    ...computedValues,

    // Actions
    actions
  }
}