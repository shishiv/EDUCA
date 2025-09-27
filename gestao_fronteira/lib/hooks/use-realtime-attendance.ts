/**
 * Real-time Attendance Hook with Supabase Subscriptions
 * Enables live updates for concurrent teacher scenarios
 */

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AttendanceSession, AttendanceRecord } from '@/lib/api/attendance'
import { toast } from 'sonner'

interface UseRealtimeAttendanceOptions {
  classId: string
  teacherId: string
  enabled?: boolean
}

interface RealtimeAttendanceState {
  activeSession: AttendanceSession | null
  attendanceRecords: AttendanceRecord[]
  loading: boolean
  error: string | null
  conflictingSession: AttendanceSession | null
}

/**
 * Hook for real-time attendance updates
 * Prevents conflicts when multiple teachers try to mark attendance for the same class
 */
export function useRealtimeAttendance({
  classId,
  teacherId,
  enabled = true
}: UseRealtimeAttendanceOptions) {
  const [state, setState] = useState<RealtimeAttendanceState>({
    activeSession: null,
    attendanceRecords: [],
    loading: false,
    error: null,
    conflictingSession: null
  })

  useEffect(() => {
    if (!enabled || !classId) return

    let sessionSubscription: any
    let attendanceSubscription: any

    const setupRealtimeSubscriptions = async () => {
      setState(prev => ({ ...prev, loading: true }))

      try {
        // Subscribe to session changes
        sessionSubscription = supabase
          .channel(`sessions-${classId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'sessoes_aula',
              filter: `turma_id=eq.${classId}`
            },
            (payload) => {
              handleSessionChange(payload)
            }
          )
          .subscribe()

        // Subscribe to attendance record changes
        attendanceSubscription = supabase
          .channel(`attendance-${classId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'frequencia',
              filter: `turma_id=eq.${classId}`
            },
            (payload) => {
              handleAttendanceChange(payload)
            }
          )
          .subscribe()

        // Load initial data
        await loadInitialData()

      } catch (error) {
        setState(prev => ({
          ...prev,
          error: 'Erro ao configurar atualizações em tempo real',
          loading: false
        }))
      }
    }

    const handleSessionChange = (payload: any) => {
      const session = payload.new as AttendanceSession

      if (payload.eventType === 'INSERT') {
        // New session created
        if (session.professor_id === teacherId) {
          setState(prev => ({
            ...prev,
            activeSession: session,
            conflictingSession: null
          }))
          toast.success('Aula aberta com sucesso!')
        } else {
          // Another teacher opened a session for the same class
          setState(prev => ({
            ...prev,
            conflictingSession: session
          }))
          toast.warning(
            'Atenção: Outro professor já abriu uma aula para esta turma hoje.',
            {
              duration: 5000,
              description: 'Verifique se há conflito de horários.'
            }
          )
        }
      } else if (payload.eventType === 'UPDATE') {
        // Session updated
        if (session.professor_id === teacherId) {
          setState(prev => ({
            ...prev,
            activeSession: session
          }))

          if (session.status === 'fechada') {
            toast.success('Aula finalizada com sucesso!')
          }
        } else if (prev => prev.conflictingSession?.id === session.id) {
          setState(prev => ({
            ...prev,
            conflictingSession: session
          }))
        }
      } else if (payload.eventType === 'DELETE') {
        // Session deleted (rare case)
        if (session.professor_id === teacherId) {
          setState(prev => ({
            ...prev,
            activeSession: null
          }))
          toast.info('Sessão de aula removida')
        }
      }
    }

    const handleAttendanceChange = (payload: any) => {
      const record = payload.new as AttendanceRecord

      if (payload.eventType === 'INSERT') {
        setState(prev => {
          // Only add if it's for our active session
          if (prev.activeSession?.id === record.sessao_id) {
            return {
              ...prev,
              attendanceRecords: [...prev.attendanceRecords, record]
            }
          }
          return prev
        })
      } else if (payload.eventType === 'UPDATE') {
        setState(prev => ({
          ...prev,
          attendanceRecords: prev.attendanceRecords.map(r =>
            r.id === record.id ? record : r
          )
        }))
      } else if (payload.eventType === 'DELETE') {
        setState(prev => ({
          ...prev,
          attendanceRecords: prev.attendanceRecords.filter(r => r.id !== record.id)
        }))
      }
    }

    const loadInitialData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0]

        // Check for existing session today
        const { data: sessions, error: sessionError } = await supabase
          .from('sessoes_aula')
          .select('*')
          .eq('turma_id', classId)
          .eq('data_aula', today)

        if (sessionError) throw sessionError

        const mySession = sessions?.find(s => s.professor_id === teacherId)
        const conflictingSession = sessions?.find(s => s.professor_id !== teacherId)

        setState(prev => ({
          ...prev,
          activeSession: mySession || null,
          conflictingSession: conflictingSession || null
        }))

        // Load attendance records if we have an active session
        if (mySession) {
          const { data: attendance, error: attendanceError } = await supabase
            .from('frequencia')
            .select('*')
            .eq('sessao_id', mySession.id)

          if (attendanceError) throw attendanceError

          setState(prev => ({
            ...prev,
            attendanceRecords: attendance || []
          }))
        }

      } catch (error) {
        setState(prev => ({
          ...prev,
          error: 'Erro ao carregar dados iniciais'
        }))
      } finally {
        setState(prev => ({ ...prev, loading: false }))
      }
    }

    setupRealtimeSubscriptions()

    // Cleanup subscriptions
    return () => {
      sessionSubscription?.unsubscribe()
      attendanceSubscription?.unsubscribe()
    }
  }, [classId, teacherId, enabled])

  /**
   * Check if another teacher has an active session for this class
   */
  const hasConflictingSession = (): boolean => {
    return state.conflictingSession !== null && state.conflictingSession.status === 'aberta'
  }

  /**
   * Get the status of our current session
   */
  const getSessionStatus = (): 'none' | 'opening' | 'open' | 'marking' | 'closed' => {
    if (!state.activeSession) return 'none'

    if (state.activeSession.status === 'fechada') return 'closed'

    // If we have attendance records, we're in marking phase
    if (state.attendanceRecords.length > 0) return 'marking'

    return 'open'
  }

  /**
   * Get real-time metrics for the current session
   */
  const getSessionMetrics = () => {
    if (!state.activeSession || state.attendanceRecords.length === 0) {
      return {
        totalStudents: 0,
        markedAttendance: 0,
        presentStudents: 0,
        absentStudents: 0,
        progressPercentage: 0
      }
    }

    const totalStudents = state.attendanceRecords.length
    const presentStudents = state.attendanceRecords.filter(r => r.status === 'presente').length
    const absentStudents = state.attendanceRecords.filter(r => r.status === 'falta').length

    return {
      totalStudents,
      markedAttendance: totalStudents,
      presentStudents,
      absentStudents,
      progressPercentage: 100 // All marked if we have records
    }
  }

  /**
   * Force refresh data (useful for conflict resolution)
   */
  const refreshData = async () => {
    setState(prev => ({ ...prev, loading: true }))

    try {
      const today = new Date().toISOString().split('T')[0]

      const { data: sessions } = await supabase
        .from('sessoes_aula')
        .select('*')
        .eq('turma_id', classId)
        .eq('data_aula', today)

      const mySession = sessions?.find(s => s.professor_id === teacherId)
      const conflictingSession = sessions?.find(s => s.professor_id !== teacherId)

      setState(prev => ({
        ...prev,
        activeSession: mySession || null,
        conflictingSession: conflictingSession || null,
        loading: false
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Erro ao atualizar dados',
        loading: false
      }))
    }
  }

  return {
    // State
    activeSession: state.activeSession,
    attendanceRecords: state.attendanceRecords,
    loading: state.loading,
    error: state.error,
    conflictingSession: state.conflictingSession,

    // Computed properties
    hasConflictingSession: hasConflictingSession(),
    sessionStatus: getSessionStatus(),
    metrics: getSessionMetrics(),

    // Actions
    refreshData
  }
}

/**
 * Hook for monitoring multiple classes simultaneously (for administrators)
 */
export function useRealtimeClassMonitoring(classIds: string[]) {
  const [activeSessions, setActiveSessions] = useState<Record<string, AttendanceSession>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (classIds.length === 0) return

    setLoading(true)
    const subscriptions: any[] = []

    classIds.forEach(classId => {
      const subscription = supabase
        .channel(`monitor-${classId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sessoes_aula',
            filter: `turma_id=eq.${classId}`
          },
          (payload) => {
            const session = payload.new as AttendanceSession

            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              if (session.status === 'aberta') {
                setActiveSessions(prev => ({
                  ...prev,
                  [classId]: session
                }))
              } else {
                setActiveSessions(prev => {
                  const { [classId]: removed, ...rest } = prev
                  return rest
                })
              }
            } else if (payload.eventType === 'DELETE') {
              setActiveSessions(prev => {
                const { [classId]: removed, ...rest } = prev
                return rest
              })
            }
          }
        )
        .subscribe()

      subscriptions.push(subscription)
    })

    // Load initial data
    const loadInitialData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0]

        const { data: sessions } = await supabase
          .from('sessoes_aula')
          .select('*')
          .in('turma_id', classIds)
          .eq('data_aula', today)
          .eq('status', 'aberta')

        const sessionMap: Record<string, AttendanceSession> = {}
        sessions?.forEach(session => {
          sessionMap[session.turma_id] = session
        })

        setActiveSessions(sessionMap)
      } catch (error) {
        console.error('Error loading initial session data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()

    // Cleanup
    return () => {
      subscriptions.forEach(sub => sub.unsubscribe())
    }
  }, [classIds])

  return {
    activeSessions,
    loading,
    activeClassCount: Object.keys(activeSessions).length
  }
}