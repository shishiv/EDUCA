/**
 * Session Real-time Context Provider
 * Provides WebSocket integration for Brazilian educational compliance
 * Manages session state and attendance updates across the application
 */

'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { SessionRealtimeManager, type SessionRealtimeData, type AttendanceStats, type SessionRealtimeCallbacks } from '@/lib/realtime/session-realtime'
import { toast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'

// Context Types
interface SessionRealtimeContextValue {
  // Connection management
  connectionStatus: 'connected' | 'disconnected' | 'error'
  isOnline: boolean
  pendingSync: number

  // Session management
  currentSession: SessionRealtimeData | null
  activeSessions: SessionRealtimeData[]
  attendanceStats: Map<string, AttendanceStats>

  // Actions
  subscribeToSession: (sessionId: string) => void
  unsubscribeFromSession: (sessionId: string) => void
  subscribeToTeacherSessions: (professorId: string) => void
  subscribeToSchoolSessions: (escolaId: string) => void
  broadcastSessionUpdate: (sessionId: string, updateType: string, data?: any) => Promise<void>
  forceReconnect: () => Promise<void>

  // Notification management
  notifications: SessionNotification[]
  clearNotification: (id: string) => void
  clearAllNotifications: () => void
}

interface SessionNotification {
  id: string
  type: 'session_locked' | 'session_updated' | 'attendance_updated' | 'compliance_warning'
  title: string
  message: string
  sessionId?: string
  timestamp: Date
  read: boolean
}

interface SessionRealtimeProviderProps {
  children: React.ReactNode
  user: {
    id: string
    tipo_usuario: string
    escola_id: string
  }
}

// Create context
const SessionRealtimeContext = createContext<SessionRealtimeContextValue | null>(null)

// Provider component
export function SessionRealtimeProvider({ children, user }: SessionRealtimeProviderProps) {
  // State
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected')
  const [isOnline, setIsOnline] = useState(true)
  const [pendingSync, setPendingSync] = useState(0)
  const [currentSession, setCurrentSession] = useState<SessionRealtimeData | null>(null)
  const [activeSessions, setActiveSessions] = useState<SessionRealtimeData[]>([])
  const [attendanceStats, setAttendanceStats] = useState<Map<string, AttendanceStats>>(new Map())
  const [notifications, setNotifications] = useState<SessionNotification[]>([])

  // Refs
  const realtimeManager = useRef<SessionRealtimeManager | null>(null)
  const subscribedSessions = useRef<Set<string>>(new Set())
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null)

  // Create notification helper
  const createNotification = useCallback((
    type: SessionNotification['type'],
    title: string,
    message: string,
    sessionId?: string
  ) => {
    const notification: SessionNotification = {
      id: `${type}-${Date.now()}-${Math.random()}`,
      type,
      title,
      message,
      sessionId,
      timestamp: new Date(),
      read: false
    }

    setNotifications(prev => [notification, ...prev.slice(0, 9)]) // Keep last 10 notifications
    return notification
  }, [])

  // Real-time callbacks
  const realtimeCallbacks: SessionRealtimeCallbacks = {
    onSessionUpdate: (session, eventType) => {
      // Update sessions list
      setActiveSessions(prev => {
        if (eventType === 'DELETE') {
          return prev.filter(s => s.id !== session.id)
        } else {
          const exists = prev.find(s => s.id === session.id)
          if (exists) {
            return prev.map(s => s.id === session.id ? session : s)
          } else {
            return [...prev, session]
          }
        }
      })

      // Update current session if it matches
      if (currentSession?.id === session.id) {
        setCurrentSession(eventType === 'DELETE' ? null : session)
      }

      // Create notification for session updates
      if (eventType === 'UPDATE') {
        createNotification(
          'session_updated',
          'Sessão Atualizada',
          `${session.turma_id}: ${session.fase}`,
          session.id
        )
      }
    },

    onAttendanceUpdate: (attendance, eventType) => {
      createNotification(
        'attendance_updated',
        'Frequência Atualizada',
        `Aluno ${attendance.presente ? 'presente' : 'ausente'}`,
        attendance.session_id
      )
    },

    onSessionLocked: (sessionId, lockedAt) => {
      createNotification(
        'session_locked',
        'Sessão Bloqueada',
        'A sessão foi bloqueada automaticamente às 18:00',
        sessionId
      )

      toast({
        title: 'Sessão Bloqueada',
        description: 'A sessão foi bloqueada automaticamente. "Não existe o esquecer"',
        variant: 'default'
      })
    },

    onAttendanceStats: (sessionId, stats) => {
      setAttendanceStats(prev => new Map(prev.set(sessionId, stats)))
    },

    onConnectionStatus: (status) => {
      setConnectionStatus(status)

      if (status === 'connected') {
        setIsOnline(true)
        setPendingSync(0)

        // Clear reconnect timer
        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current)
          reconnectTimer.current = null
        }
      } else {
        setIsOnline(false)

        // Start reconnect attempts
        if (!reconnectTimer.current) {
          reconnectTimer.current = setTimeout(() => {
            realtimeManager.current?.reconnect()
          }, 5000)
        }
      }
    },

    onError: (error) => {
      logger.error('Session realtime error:', error instanceof Error ? error : String(error))

      createNotification(
        'compliance_warning',
        'Erro de Conexão',
        'Problemas na conexão em tempo real. Tentando reconectar...'
      )
    }
  }

  // Initialize real-time manager
  useEffect(() => {
    realtimeManager.current = new SessionRealtimeManager(realtimeCallbacks)

    // Auto-subscribe based on user role
    if (user.tipo_usuario === 'professor') {
      subscribeToTeacherSessions(user.id)
    } else if (['admin', 'diretor', 'secretario'].includes(user.tipo_usuario)) {
      subscribeToSchoolSessions(user.escola_id)
    }

    return () => {
      realtimeManager.current?.unsubscribeAll()
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
      }
    }
  }, [user.id, user.tipo_usuario, user.escola_id])

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      realtimeManager.current?.reconnect()
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Action functions
  const subscribeToSession = useCallback((sessionId: string) => {
    if (!subscribedSessions.current.has(sessionId)) {
      realtimeManager.current?.subscribeToAttendance([sessionId])
      subscribedSessions.current.add(sessionId)
    }
  }, [])

  const unsubscribeFromSession = useCallback((sessionId: string) => {
    if (subscribedSessions.current.has(sessionId)) {
      realtimeManager.current?.unsubscribe(`attendance-updates-${sessionId}`)
      subscribedSessions.current.delete(sessionId)
    }
  }, [])

  const subscribeToTeacherSessions = useCallback((professorId: string) => {
    realtimeManager.current?.subscribeToSessions({
      professor_id: professorId
    })
  }, [])

  const subscribeToSchoolSessions = useCallback((escolaId: string) => {
    realtimeManager.current?.subscribeToDashboard(escolaId)
  }, [])

  const broadcastSessionUpdate = useCallback(async (sessionId: string, updateType: string, data?: any) => {
    try {
      await realtimeManager.current?.broadcastSessionUpdate(sessionId, updateType, data)
    } catch (error) {
      logger.error('Failed to broadcast session update:', error instanceof Error ? error : String(error))
      setPendingSync(prev => prev + 1)
    }
  }, [])

  const forceReconnect = useCallback(async () => {
    await realtimeManager.current?.reconnect()
  }, [])

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const clearAllNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  // Context value
  const contextValue: SessionRealtimeContextValue = {
    // Connection state
    connectionStatus,
    isOnline,
    pendingSync,

    // Session state
    currentSession,
    activeSessions,
    attendanceStats,

    // Actions
    subscribeToSession,
    unsubscribeFromSession,
    subscribeToTeacherSessions,
    subscribeToSchoolSessions,
    broadcastSessionUpdate,
    forceReconnect,

    // Notifications
    notifications,
    clearNotification,
    clearAllNotifications
  }

  return (
    <SessionRealtimeContext.Provider value={contextValue}>
      {children}
    </SessionRealtimeContext.Provider>
  )
}

// Hook to use the context
export function useSessionRealtime(): SessionRealtimeContextValue {
  const context = useContext(SessionRealtimeContext)

  if (!context) {
    throw new Error('useSessionRealtime must be used within a SessionRealtimeProvider')
  }

  return context
}

// Specialized hooks for different use cases
export function useSessionRealtimeForTeacher(professorId: string) {
  const context = useSessionRealtime()

  useEffect(() => {
    context.subscribeToTeacherSessions(professorId)
  }, [professorId, context])

  return {
    sessions: context.activeSessions.filter(s => s.professor_id === professorId),
    connectionStatus: context.connectionStatus,
    pendingSync: context.pendingSync,
    broadcastUpdate: context.broadcastSessionUpdate
  }
}

export function useSessionRealtimeForAdmin(escolaId: string) {
  const context = useSessionRealtime()

  useEffect(() => {
    context.subscribeToSchoolSessions(escolaId)
  }, [escolaId, context])

  return {
    allSessions: context.activeSessions,
    attendanceStats: context.attendanceStats,
    connectionStatus: context.connectionStatus,
    notifications: context.notifications,
    clearNotification: context.clearNotification
  }
}

export function useSessionRealtimeForAttendance(sessionId: string) {
  const context = useSessionRealtime()

  useEffect(() => {
    context.subscribeToSession(sessionId)

    return () => {
      context.unsubscribeFromSession(sessionId)
    }
  }, [sessionId, context])

  return {
    session: context.activeSessions.find(s => s.id === sessionId),
    stats: context.attendanceStats.get(sessionId),
    connectionStatus: context.connectionStatus,
    isOnline: context.isOnline,
    broadcastUpdate: context.broadcastSessionUpdate
  }
}