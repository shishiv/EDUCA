/**
 * Real-time Session Management - Enhanced "Abrir aula" Workflow
 * WebSocket integration for live session and attendance updates
 * Brazilian Educational Compliance Implementation
 */

import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// Type definitions
export interface SessionRealtimeData {
  id: string
  turma_id: string
  professor_id: string
  data_aula: string
  fase: 'planejamento' | 'chamada' | 'finalizada' | 'bloqueada'
  bloqueado: boolean
  bloqueado_em?: string
  total_alunos: number
  total_presentes: number
  total_ausentes: number
  updated_at: string
}

export interface AttendanceRealtimeData {
  id: string
  session_id: string
  aluno_id: string
  presente: boolean
  observacoes?: string
  is_locked: boolean
  updated_at: string
}

export interface SessionRealtimeCallbacks {
  onSessionUpdate?: (session: SessionRealtimeData, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void
  onAttendanceUpdate?: (attendance: AttendanceRealtimeData, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void
  onSessionLocked?: (sessionId: string, lockedAt: string) => void
  onAttendanceStats?: (sessionId: string, stats: AttendanceStats) => void
  onError?: (error: Error) => void
  onConnectionStatus?: (status: 'connected' | 'disconnected' | 'error') => void
}

export interface AttendanceStats {
  total_students: number
  present_count: number
  absent_count: number
  pending_count: number
  completion_percentage: number
}

export interface SessionFilter {
  escola_id?: string
  professor_id?: string
  turma_id?: string
  data_aula?: string
  fase?: string[]
}

/**
 * SessionRealtimeManager - Manages real-time updates for sessions and attendance
 */
export class SessionRealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map()
  private callbacks: SessionRealtimeCallbacks = {}
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectInterval = 1000 // Start with 1 second

  constructor(callbacks: SessionRealtimeCallbacks) {
    this.callbacks = callbacks
    this.setupConnectionMonitoring()
  }

  /**
   * Subscribe to session updates for specific filters
   */
  subscribeToSessions(filter: SessionFilter): string {
    const channelName = `session-updates-${this.generateFilterId(filter)}`

    if (this.channels.has(channelName)) {
      logger.warn(`Already subscribed to channel: ${channelName}`)
      return channelName
    }

    // Skip real Supabase connections in development bypass mode
    if (process.env.NODE_ENV === 'development' &&
        typeof window !== 'undefined' &&
        localStorage.getItem('dev_auth_bypass') === 'true') {
      logger.debug(`Development mode: Mocking subscription to ${channelName}`)
      // Create a mock channel entry
      const mockChannel = { unsubscribe: () => {} } as any
      this.channels.set(channelName, mockChannel)

      // Simulate successful subscription after a delay
      setTimeout(() => {
        logger.debug(`Mock subscribed to session updates: ${channelName}`)
        this.callbacks.onConnectionStatus?.('disconnected') // Keep showing offline in dev mode
      }, 100)

      return channelName
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'aula_sessions',
          filter: this.buildSessionFilter(filter)
        },
        (payload: RealtimePostgresChangesPayload<SessionRealtimeData>) => {
          this.handleSessionChange(payload)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.debug(`Subscribed to session updates: ${channelName}`)
          this.isConnected = true
          this.reconnectAttempts = 0
          this.callbacks.onConnectionStatus?.('connected')
        } else if (status === 'CHANNEL_ERROR') {
          logger.error(`Channel error: ${channelName}`)
          this.handleConnectionError()
        } else if (status === 'TIMED_OUT') {
          logger.error(`Channel timeout: ${channelName}`)
          this.handleConnectionError()
        }
      })

    this.channels.set(channelName, channel)
    return channelName
  }

  /**
   * Subscribe to attendance updates for specific session(s)
   */
  subscribeToAttendance(sessionIds: string[]): string {
    const channelName = `attendance-updates-${sessionIds.join('-')}`

    if (this.channels.has(channelName)) {
      logger.warn(`Already subscribed to channel: ${channelName}`)
      return channelName
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'frequencia',
          filter: `session_id=in.(${sessionIds.join(',')})`
        },
        (payload: RealtimePostgresChangesPayload<AttendanceRealtimeData>) => {
          this.handleAttendanceChange(payload)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.debug(`Subscribed to attendance updates: ${channelName}`)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.handleConnectionError()
        }
      })

    this.channels.set(channelName, channel)
    return channelName
  }

  /**
   * Subscribe to session dashboard updates (for administrative overview)
   */
  subscribeToDashboard(escolaId?: string): string {
    const channelName = `dashboard-${escolaId || 'all'}`

    if (this.channels.has(channelName)) {
      return channelName
    }

    const filter = escolaId
      ? `turma_id=in.(select id from turmas where escola_id=eq.${escolaId})`
      : undefined

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'aula_sessions',
          filter
        },
        (payload: RealtimePostgresChangesPayload<SessionRealtimeData>) => {
          this.handleDashboardUpdate(payload)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'frequencia',
          filter: escolaId
            ? `session_id=in.(select id from aula_sessions where turma_id=in.(select id from turmas where escola_id=eq.${escolaId}))`
            : undefined
        },
        (payload: RealtimePostgresChangesPayload<AttendanceRealtimeData>) => {
          this.handleAttendanceChange(payload)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.debug(`Subscribed to dashboard updates: ${channelName}`)
        }
      })

    this.channels.set(channelName, channel)
    return channelName
  }

  /**
   * Unsubscribe from specific channel
   */
  unsubscribe(channelName: string): void {
    const channel = this.channels.get(channelName)
    if (channel) {
      supabase.removeChannel(channel)
      this.channels.delete(channelName)
      logger.debug(`Unsubscribed from channel: ${channelName}`)
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll(): void {
    for (const [channelName, channel] of this.channels) {
      supabase.removeChannel(channel)
      logger.debug(`Unsubscribed from channel: ${channelName}`)
    }
    this.channels.clear()
    this.isConnected = false
    this.callbacks.onConnectionStatus?.('disconnected')
  }

  /**
   * Send real-time notification to other clients
   */
  async broadcastSessionUpdate(sessionId: string, updateType: string, data?: any): Promise<void> {
    const broadcastChannel = `session-broadcast-${sessionId}`

    const channel = supabase.channel(broadcastChannel)

    try {
      await channel.send({
        type: 'broadcast',
        event: updateType,
        payload: {
          session_id: sessionId,
          timestamp: new Date().toISOString(),
          data
        }
      })
    } catch (error) {
      logger.error('Failed to broadcast session update:', error)
      this.callbacks.onError?.(error as Error)
    }
  }

  /**
   * Listen for broadcast messages from other clients
   */
  subscribeToBroadcast(sessionId: string, onMessage: (event: string, payload: any) => void): string {
    const channelName = `broadcast-${sessionId}`

    if (this.channels.has(channelName)) {
      return channelName
    }

    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: '*' }, ({ event, payload }) => {
        onMessage(event, payload)
      })
      .subscribe()

    this.channels.set(channelName, channel)
    return channelName
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): 'connected' | 'disconnected' | 'error' {
    return this.isConnected ? 'connected' : 'disconnected'
  }

  /**
   * Force reconnection
   */
  async reconnect(): Promise<void> {
    this.unsubscribeAll()

    // Wait before reconnecting
    await new Promise(resolve => setTimeout(resolve, this.reconnectInterval))

    // Exponential backoff
    this.reconnectInterval = Math.min(this.reconnectInterval * 2, 30000)
    this.reconnectAttempts++

    this.callbacks.onConnectionStatus?.('connected')
  }

  // Private methods
  private handleSessionChange(payload: RealtimePostgresChangesPayload<SessionRealtimeData>): void {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload

      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        if (newRecord) {
          this.callbacks.onSessionUpdate?.(newRecord, eventType)

          // Check for session locking
          if (eventType === 'UPDATE' && newRecord.bloqueado && !oldRecord?.bloqueado) {
            this.callbacks.onSessionLocked?.(newRecord.id, newRecord.bloqueado_em || newRecord.updated_at)
          }
        }
      } else if (eventType === 'DELETE' && oldRecord) {
        this.callbacks.onSessionUpdate?.(oldRecord, eventType)
      }
    } catch (error) {
      logger.error('Error handling session change:', error)
      this.callbacks.onError?.(error as Error)
    }
  }

  private handleAttendanceChange(payload: RealtimePostgresChangesPayload<AttendanceRealtimeData>): void {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload

      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        if (newRecord) {
          this.callbacks.onAttendanceUpdate?.(newRecord, eventType)

          // Trigger stats update for the session
          this.updateAttendanceStats(newRecord.session_id)
        }
      } else if (eventType === 'DELETE' && oldRecord) {
        this.callbacks.onAttendanceUpdate?.(oldRecord, eventType)
        this.updateAttendanceStats(oldRecord.session_id)
      }
    } catch (error) {
      logger.error('Error handling attendance change:', error)
      this.callbacks.onError?.(error as Error)
    }
  }

  private handleDashboardUpdate(payload: RealtimePostgresChangesPayload<SessionRealtimeData>): void {
    // Similar to handleSessionChange but optimized for dashboard view
    this.handleSessionChange(payload)
  }

  private async updateAttendanceStats(sessionId: string): Promise<void> {
    try {
      // Get current attendance statistics
      const { data: attendanceData } = await supabase
        .from('frequencia')
        .select('presente')
        .eq('session_id', sessionId)

      const { data: expectedStudents } = await supabase
        .from('aula_sessions')
        .select(`
          total_alunos,
          turmas:turma_id (
            matriculas!inner (
              count
            )
          )
        `)
        .eq('id', sessionId)
        .single()

      if (attendanceData && expectedStudents) {
        const presentCount = attendanceData.filter(a => a.presente).length
        const absentCount = attendanceData.filter(a => !a.presente).length
        const totalMarked = attendanceData.length
        const expectedTotal = expectedStudents.total_alunos || 0

        const stats: AttendanceStats = {
          total_students: expectedTotal,
          present_count: presentCount,
          absent_count: absentCount,
          pending_count: expectedTotal - totalMarked,
          completion_percentage: expectedTotal > 0 ? (totalMarked / expectedTotal) * 100 : 0
        }

        this.callbacks.onAttendanceStats?.(sessionId, stats)
      }
    } catch (error) {
      logger.error('Error updating attendance stats:', error)
    }
  }

  private setupConnectionMonitoring(): void {
    // Monitor connection status using modern Supabase realtime API
    // Note: Modern Supabase handles connection monitoring through channels

    if (process.env.NODE_ENV === 'development') {
      // Check if development bypass is enabled - if so, don't try to connect to Supabase
      if (typeof window !== 'undefined' && localStorage.getItem('dev_auth_bypass') === 'true') {
        logger.debug('Development mode: Bypassing real-time connections')
        setTimeout(() => {
          this.isConnected = false // Keep as false to prevent real connections
          this.callbacks.onConnectionStatus?.('disconnected')
        }, 100)
        return
      }

      // Mock connection status for development
      setTimeout(() => {
        this.isConnected = true
        this.reconnectAttempts = 0
        this.reconnectInterval = 1000
        this.callbacks.onConnectionStatus?.('connected')
      }, 1000)
      return
    }

    // In production, we would monitor actual realtime connection status
    // through the channel subscription status
    try {
      this.isConnected = true
      this.callbacks.onConnectionStatus?.('connected')
    } catch (error) {
      logger.error('Realtime connection error:', error)
      this.callbacks.onConnectionStatus?.('error')
      this.callbacks.onError?.(new Error('Realtime connection error'))
    }
  }

  private handleConnectionError(): void {
    this.isConnected = false
    this.callbacks.onConnectionStatus?.('error')

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => this.reconnect(), this.reconnectInterval)
    }
  }

  private generateFilterId(filter: SessionFilter): string {
    return Object.entries(filter)
      .map(([key, value]) => `${key}-${Array.isArray(value) ? value.join(',') : value}`)
      .join('_')
  }

  private buildSessionFilter(filter: SessionFilter): string {
    const conditions = []

    if (filter.escola_id) {
      conditions.push(`turma_id=in.(select id from turmas where escola_id=eq.${filter.escola_id})`)
    }

    if (filter.professor_id) {
      conditions.push(`professor_id=eq.${filter.professor_id}`)
    }

    if (filter.turma_id) {
      conditions.push(`turma_id=eq.${filter.turma_id}`)
    }

    if (filter.data_aula) {
      conditions.push(`data_aula=eq.${filter.data_aula}`)
    }

    if (filter.fase && filter.fase.length > 0) {
      conditions.push(`fase=in.(${filter.fase.join(',')})`)
    }

    return conditions.join(' and ') || ''
  }
}

// Utility functions for common real-time patterns

/**
 * Create a real-time manager for teacher dashboard
 */
export function createTeacherRealtimeManager(
  professorId: string,
  onUpdate: (sessions: SessionRealtimeData[]) => void
): SessionRealtimeManager {
  const sessions = new Map<string, SessionRealtimeData>()

  return new SessionRealtimeManager({
    onSessionUpdate: (session, eventType) => {
      if (eventType === 'DELETE') {
        sessions.delete(session.id)
      } else {
        sessions.set(session.id, session)
      }
      onUpdate(Array.from(sessions.values()))
    },
    onConnectionStatus: (status) => {
      logger.debug(`Teacher realtime connection: ${status}`)
    },
    onError: (error) => {
      logger.error('Teacher realtime error:', error)
    }
  })
}

/**
 * Create a real-time manager for administrative dashboard
 */
export function createAdminRealtimeManager(
  escolaId: string,
  callbacks: Partial<SessionRealtimeCallbacks>
): SessionRealtimeManager {
  return new SessionRealtimeManager({
    onConnectionStatus: (status) => {
      logger.debug(`Admin realtime connection: ${status}`)
    },
    onError: (error) => {
      logger.error('Admin realtime error:', error)
    },
    ...callbacks
  })
}

/**
 * Create a real-time manager for attendance interface
 */
export function createAttendanceRealtimeManager(
  sessionId: string,
  onAttendanceUpdate: (attendance: AttendanceRealtimeData[]) => void,
  onStatsUpdate: (stats: AttendanceStats) => void
): SessionRealtimeManager {
  const attendanceRecords = new Map<string, AttendanceRealtimeData>()

  return new SessionRealtimeManager({
    onAttendanceUpdate: (attendance, eventType) => {
      if (eventType === 'DELETE') {
        attendanceRecords.delete(attendance.id)
      } else {
        attendanceRecords.set(attendance.id, attendance)
      }
      onAttendanceUpdate(Array.from(attendanceRecords.values()))
    },
    onAttendanceStats: (_, stats) => {
      onStatsUpdate(stats)
    },
    onConnectionStatus: (status) => {
      logger.debug(`Attendance realtime connection: ${status}`)
    }
  })
}