/**
 * Real-time Notification Provider for Session Events
 * Task 5.4: Add real-time notifications for session events
 * Brazilian Educational Compliance Implementation
 */

'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { toast } from '@/components/ui/use-toast'
import { Bell, Clock, Lock, Unlock, AlertTriangle, CheckCircle } from 'lucide-react'
import {
  AulasAbertasListener,
  createTeacherAulasListener,
  createSchoolAulasListener,
  type AulaAbertaData,
  type AulaStatusChange
} from '@/lib/realtime/aulas-abertas-listener'

export interface NotificationEvent {
  id: string
  type: 'aula_opened' | 'aula_closed' | 'aula_locked' | 'time_warning' | 'connection_issue' | 'compliance_alert'
  title: string
  message: string
  timestamp: Date
  severity: 'info' | 'warning' | 'error' | 'success'
  sessionId?: string
  turmaId?: string
  metadata?: Record<string, any>
  read: boolean
  persistent?: boolean
}

export interface NotificationSettings {
  enableAulaEvents: boolean
  enableTimeWarnings: boolean
  enableConnectionAlerts: boolean
  enableComplianceAlerts: boolean
  soundEnabled: boolean
  warningThresholds: number[] // Minutes for time warnings
}

interface RealtimeNotificationContextValue {
  notifications: NotificationEvent[]
  unreadCount: number
  settings: NotificationSettings
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearNotification: (id: string) => void
  clearAllNotifications: () => void
  updateSettings: (settings: Partial<NotificationSettings>) => void
  isConnected: boolean
  lastActivity: Date | null
}

interface RealtimeNotificationProviderProps {
  children: React.ReactNode
  user: {
    id: string
    tipo_usuario: string
    escola_id: string
  }
  defaultSettings?: Partial<NotificationSettings>
}

const RealtimeNotificationContext = createContext<RealtimeNotificationContextValue | null>(null)

const defaultNotificationSettings: NotificationSettings = {
  enableAulaEvents: true,
  enableTimeWarnings: true,
  enableConnectionAlerts: true,
  enableComplianceAlerts: true,
  soundEnabled: false, // Disabled by default for classroom environment
  warningThresholds: [30, 15, 10, 5] // Warning at 30, 15, 10, and 5 minutes
}

export function RealtimeNotificationProvider({
  children,
  user,
  defaultSettings = {}
}: RealtimeNotificationProviderProps) {
  const [notifications, setNotifications] = useState<NotificationEvent[]>([])
  const [settings, setSettings] = useState<NotificationSettings>({
    ...defaultNotificationSettings,
    ...defaultSettings
  })
  const [isConnected, setIsConnected] = useState(false)
  const [lastActivity, setLastActivity] = useState<Date | null>(null)

  const listenerRef = useRef<AulasAbertasListener | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const notificationIdRef = useRef(0)

  // Initialize audio for notifications
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/sounds/notification.mp3') // Add notification sound
      audioRef.current.volume = 0.3
    }
  }, [])

  const generateNotificationId = useCallback(() => {
    return `notification-${Date.now()}-${++notificationIdRef.current}`
  }, [])

  const playNotificationSound = useCallback(() => {
    if (settings.soundEnabled && audioRef.current) {
      audioRef.current.play().catch(console.warn)
    }
  }, [settings.soundEnabled])

  const addNotification = useCallback((
    type: NotificationEvent['type'],
    title: string,
    message: string,
    severity: NotificationEvent['severity'] = 'info',
    metadata?: Record<string, any>,
    persistent: boolean = false
  ) => {
    const notification: NotificationEvent = {
      id: generateNotificationId(),
      type,
      title,
      message,
      timestamp: new Date(),
      severity,
      sessionId: metadata?.sessionId,
      turmaId: metadata?.turmaId,
      metadata,
      read: false,
      persistent
    }

    setNotifications(prev => [notification, ...prev.slice(0, 49)]) // Keep last 50 notifications
    setLastActivity(new Date())

    // Show toast notification
    const icon = severity === 'success' ? CheckCircle :
                severity === 'warning' ? AlertTriangle :
                severity === 'error' ? AlertTriangle :
                Bell

    toast({
      title,
      description: message,
      variant: severity === 'error' ? 'destructive' : 'default',
      duration: persistent ? 10000 : 5000
    })

    // Play sound if enabled
    playNotificationSound()

    return notification.id
  }, [generateNotificationId, playNotificationSound])

  const createAulaNotifications = useCallback(() => {
    return {
      onAulaOpened: (aula: AulaAbertaData) => {
        if (settings.enableAulaEvents) {
          addNotification(
            'aula_opened',
            'Aula Aberta',
            `Frequência liberada para marcação na turma ${aula.turma_id}`,
            'success',
            {
              sessionId: aula.id,
              turmaId: aula.turma_id,
              tempo_limite: aula.tempo_limite_minutos
            }
          )
        }
      },

      onAulaClosed: (aula: AulaAbertaData) => {
        if (settings.enableAulaEvents) {
          addNotification(
            'aula_closed',
            'Aula Fechada',
            `Aguardando travamento automático da turma ${aula.turma_id}`,
            'info',
            {
              sessionId: aula.id,
              turmaId: aula.turma_id,
              fechada_em: aula.fechada_em
            }
          )
        }
      },

      onAulaLocked: (aula: AulaAbertaData, isAutomatic: boolean) => {
        if (settings.enableAulaEvents) {
          addNotification(
            'aula_locked',
            'Aula Travada',
            isAutomatic
              ? `Registro bloqueado automaticamente às 18:00 (turma ${aula.turma_id})`
              : `Registro permanentemente bloqueado (turma ${aula.turma_id})`,
            'warning',
            {
              sessionId: aula.id,
              turmaId: aula.turma_id,
              automatic: isAutomatic,
              travada_em: aula.travada_em
            },
            true // Persistent notification for compliance
          )
        }
      },

      onTimeWarning: (aula: AulaAbertaData, minutesRemaining: number) => {
        if (settings.enableTimeWarnings && settings.warningThresholds.includes(minutesRemaining)) {
          const isUrgent = minutesRemaining <= 10
          addNotification(
            'time_warning',
            `${minutesRemaining} minutos restantes`,
            isUrgent
              ? `Tempo crítico! Conclua a marcação de frequência da turma ${aula.turma_id}`
              : `Tempo se esgotando para marcação da turma ${aula.turma_id}`,
            isUrgent ? 'error' : 'warning',
            {
              sessionId: aula.id,
              turmaId: aula.turma_id,
              minutesRemaining,
              urgent: isUrgent
            },
            isUrgent
          )
        }
      },

      onStatusChange: (aula: AulaAbertaData, change: AulaStatusChange) => {
        // Log for compliance but don't always notify
        console.log('Aula status change logged:', {
          sessionId: aula.id,
          turmaId: aula.turma_id,
          change
        })

        // Notify for critical compliance events
        if (settings.enableComplianceAlerts) {
          if (change.changedBy === 'system' && change.newStatus === 'travada') {
            addNotification(
              'compliance_alert',
              'Bloqueio Automático Executado',
              `Sistema bloqueou automaticamente a aula da turma ${aula.turma_id} às 18:00 (legislação brasileira)`,
              'warning',
              {
                sessionId: aula.id,
                turmaId: aula.turma_id,
                compliance_rule: 'automatic_18h_lock',
                timestamp: change.timestamp
              },
              true
            )
          }
        }
      },

      onConnectionChange: (status: 'connected' | 'disconnected' | 'error' | 'reconnecting') => {
        setIsConnected(status === 'connected')

        if (settings.enableConnectionAlerts) {
          switch (status) {
            case 'connected':
              addNotification(
                'connection_issue',
                'Conexão Restabelecida',
                'Atualizações em tempo real ativas',
                'success',
                { connection_status: status }
              )
              break

            case 'error':
            case 'disconnected':
              addNotification(
                'connection_issue',
                'Problema de Conexão',
                'Tentando reconectar... Atualizações podem estar atrasadas',
                'error',
                { connection_status: status },
                true
              )
              break

            case 'reconnecting':
              addNotification(
                'connection_issue',
                'Reconectando',
                'Restabelecendo conexão com o servidor',
                'warning',
                { connection_status: status }
              )
              break
          }
        }
      },

      onError: (error: Error, context?: string) => {
        console.error('Real-time listener error:', error, context)

        if (settings.enableConnectionAlerts) {
          addNotification(
            'connection_issue',
            'Erro na Conexão',
            `Problema na atualização em tempo real: ${error.message}`,
            'error',
            {
              error_message: error.message,
              context,
              timestamp: new Date().toISOString()
            },
            true
          )
        }
      }
    }
  }, [settings, addNotification])

  // Setup real-time listener based on user role
  useEffect(() => {
    if (listenerRef.current) {
      listenerRef.current.stop()
    }

    const callbacks = createAulaNotifications()

    if (user.tipo_usuario === 'professor') {
      listenerRef.current = createTeacherAulasListener(user.id, callbacks)
    } else if (['admin', 'diretor', 'secretario'].includes(user.tipo_usuario)) {
      listenerRef.current = createSchoolAulasListener(user.escola_id, callbacks)
    }

    if (listenerRef.current) {
      listenerRef.current.start()
    }

    return () => {
      if (listenerRef.current) {
        listenerRef.current.stop()
        listenerRef.current = null
      }
    }
  }, [user.id, user.tipo_usuario, user.escola_id, createAulaNotifications])

  // Mark notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }, [])

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    )
  }, [])

  // Clear specific notification
  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  // Update notification settings
  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }, [])

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length

  // Context value
  const contextValue: RealtimeNotificationContextValue = {
    notifications,
    unreadCount,
    settings,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    updateSettings,
    isConnected,
    lastActivity
  }

  return (
    <RealtimeNotificationContext.Provider value={contextValue}>
      {children}
    </RealtimeNotificationContext.Provider>
  )
}

// Hook to use the notification context
export function useRealtimeNotifications(): RealtimeNotificationContextValue {
  const context = useContext(RealtimeNotificationContext)

  if (!context) {
    throw new Error('useRealtimeNotifications must be used within a RealtimeNotificationProvider')
  }

  return context
}

// Specialized hooks for different components
export function useNotificationSettings() {
  const { settings, updateSettings } = useRealtimeNotifications()
  return { settings, updateSettings }
}

export function useNotificationHistory() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications
  } = useRealtimeNotifications()

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications
  }
}

export function useConnectionStatus() {
  const { isConnected, lastActivity } = useRealtimeNotifications()
  return { isConnected, lastActivity }
}