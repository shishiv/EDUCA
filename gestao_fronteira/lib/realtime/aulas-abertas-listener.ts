/**
 * Enhanced Real-time Listener for aulas_abertas Table Changes
 * Task 5.2: Set up real-time listener for aulas_abertas table changes
 * Brazilian Educational Compliance Implementation
 */

import { supabase } from '@/lib/supabase'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface AulaAbertaData {
  id: string
  turma_id: string
  professor_id: string
  aberta_em: string
  fechada_em?: string
  travada_em?: string
  status: 'aberta' | 'fechada' | 'travada'
  observacoes?: string
  tempo_limite_minutos: number
  travada_automaticamente: boolean
  conteudo_programatico?: string
  escola_id: string
  created_at: string
  updated_at: string
}

export interface AulaStatusChange {
  previousStatus: string | null
  newStatus: string
  changedBy: 'teacher' | 'system' | 'admin'
  timestamp: string
  metadata?: Record<string, any>
}

export interface AulaAbertaListenerCallbacks {
  onAulaOpened?: (aula: AulaAbertaData) => void
  onAulaClosed?: (aula: AulaAbertaData) => void
  onAulaLocked?: (aula: AulaAbertaData, isAutomatic: boolean) => void
  onStatusChange?: (aula: AulaAbertaData, change: AulaStatusChange) => void
  onTimeWarning?: (aula: AulaAbertaData, minutesRemaining: number) => void
  onConnectionChange?: (status: 'connected' | 'disconnected' | 'error' | 'reconnecting') => void
  onError?: (error: Error, context?: string) => void
}

export interface AulaAbertaFilter {
  escola_id?: string
  professor_id?: string
  turma_id?: string
  status?: ('aberta' | 'fechada' | 'travada')[]
  today_only?: boolean
}

/**
 * Enhanced real-time listener for aulas_abertas with Brazilian compliance features
 */
export class AulasAbertasListener {
  private channel: RealtimeChannel | null = null
  private callbacks: AulaAbertaListenerCallbacks
  private filter: AulaAbertaFilter
  private connectionStatus: 'connected' | 'disconnected' | 'error' | 'reconnecting' = 'disconnected'
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectInterval = 1000
  private timeWarningTimer: NodeJS.Timeout | null = null
  private channelName: string

  constructor(
    filter: AulaAbertaFilter,
    callbacks: AulaAbertaListenerCallbacks
  ) {
    this.filter = filter
    this.callbacks = callbacks
    this.channelName = this.generateChannelName(filter)
    this.setupConnectionMonitoring()
  }

  /**
   * Start listening for aulas_abertas changes
   */
  start(): void {
    if (this.channel) {
      console.warn('AulasAbertasListener already started')
      return
    }

    this.createSubscription()
  }

  /**
   * Stop listening and cleanup resources
   */
  stop(): void {
    this.cleanup()
    this.connectionStatus = 'disconnected'
    this.callbacks.onConnectionChange?.('disconnected')
  }

  /**
   * Update filter and restart subscription
   */
  updateFilter(newFilter: AulaAbertaFilter): void {
    this.filter = newFilter
    this.channelName = this.generateChannelName(newFilter)

    // Restart with new filter
    this.stop()
    this.start()
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): 'connected' | 'disconnected' | 'error' | 'reconnecting' {
    return this.connectionStatus
  }

  /**
   * Force reconnection
   */
  async reconnect(): Promise<void> {
    this.connectionStatus = 'reconnecting'
    this.callbacks.onConnectionChange?.('reconnecting')

    this.cleanup()

    // Exponential backoff
    const delay = Math.min(this.reconnectInterval * Math.pow(2, this.reconnectAttempts), 30000)

    await new Promise(resolve => setTimeout(resolve, delay))

    this.reconnectAttempts++
    this.createSubscription()
  }

  // Private methods

  private createSubscription(): void {
    try {
      const filterString = this.buildFilterString()

      this.channel = supabase
        .channel(this.channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'aulas_abertas',
            filter: filterString
          },
          (payload: RealtimePostgresChangesPayload<AulaAbertaData>) => {
            this.handleAulaChange(payload)
          }
        )
        .subscribe((status) => {
          this.handleSubscriptionStatus(status)
        })

      console.log(`AulasAbertasListener subscription created: ${this.channelName}`)

    } catch (error) {
      console.error('Failed to create aulas_abertas subscription:', error)
      this.handleError(error as Error, 'subscription_creation')
    }
  }

  private handleSubscriptionStatus(status: string): void {
    switch (status) {
      case 'SUBSCRIBED':
        this.connectionStatus = 'connected'
        this.reconnectAttempts = 0
        this.reconnectInterval = 1000
        this.callbacks.onConnectionChange?.('connected')
        console.log(`AulasAbertasListener connected: ${this.channelName}`)
        break

      case 'CHANNEL_ERROR':
      case 'TIMED_OUT':
        this.connectionStatus = 'error'
        this.callbacks.onConnectionChange?.('error')
        console.error(`AulasAbertasListener error: ${status}`)

        // Attempt reconnection if within limits
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => this.reconnect(), this.reconnectInterval)
        }
        break

      case 'CLOSED':
        this.connectionStatus = 'disconnected'
        this.callbacks.onConnectionChange?.('disconnected')
        console.log('AulasAbertasListener closed')
        break
    }
  }

  private handleAulaChange(payload: RealtimePostgresChangesPayload<AulaAbertaData>): void {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload

      switch (eventType) {
        case 'INSERT':
          if (newRecord) {
            this.handleAulaInsert(newRecord)
          }
          break

        case 'UPDATE':
          if (newRecord && oldRecord) {
            this.handleAulaUpdate(newRecord, oldRecord)
          }
          break

        case 'DELETE':
          if (oldRecord) {
            this.handleAulaDelete(oldRecord)
          }
          break
      }
    } catch (error) {
      console.error('Error handling aula change:', error)
      this.handleError(error as Error, 'change_processing')
    }
  }

  private handleAulaInsert(aula: AulaAbertaData): void {
    // New aula opened
    if (aula.status === 'aberta') {
      this.callbacks.onAulaOpened?.(aula)
      this.startTimeWarningTimer(aula)
    }

    // Trigger general status change callback
    const change: AulaStatusChange = {
      previousStatus: null,
      newStatus: aula.status,
      changedBy: 'teacher', // Aulas are typically opened by teachers
      timestamp: aula.created_at,
      metadata: {
        tempo_limite_minutos: aula.tempo_limite_minutos,
        turma_id: aula.turma_id
      }
    }

    this.callbacks.onStatusChange?.(aula, change)
  }

  private handleAulaUpdate(newAula: AulaAbertaData, oldAula: AulaAbertaData): void {
    const statusChanged = newAula.status !== oldAula.status

    if (statusChanged) {
      const change: AulaStatusChange = {
        previousStatus: oldAula.status,
        newStatus: newAula.status,
        changedBy: this.determineChangeAgent(newAula, oldAula),
        timestamp: newAula.updated_at,
        metadata: {
          tempo_limite_minutos: newAula.tempo_limite_minutos,
          travada_automaticamente: newAula.travada_automaticamente
        }
      }

      this.callbacks.onStatusChange?.(newAula, change)

      // Handle specific status transitions
      switch (newAula.status) {
        case 'fechada':
          this.callbacks.onAulaClosed?.(newAula)
          this.stopTimeWarningTimer()
          break

        case 'travada':
          this.callbacks.onAulaLocked?.(newAula, newAula.travada_automaticamente)
          this.stopTimeWarningTimer()
          break

        case 'aberta':
          if (oldAula.status !== 'aberta') {
            this.callbacks.onAulaOpened?.(newAula)
            this.startTimeWarningTimer(newAula)
          }
          break
      }
    }

    // Handle time limit changes for open sessions
    if (newAula.status === 'aberta' && newAula.tempo_limite_minutos !== oldAula.tempo_limite_minutos) {
      this.stopTimeWarningTimer()
      this.startTimeWarningTimer(newAula)
    }
  }

  private handleAulaDelete(aula: AulaAbertaData): void {
    // Handle aula deletion (rare, but possible for administrative cleanup)
    this.stopTimeWarningTimer()

    const change: AulaStatusChange = {
      previousStatus: aula.status,
      newStatus: 'deleted',
      changedBy: 'admin',
      timestamp: new Date().toISOString(),
      metadata: {
        deleted_aula_id: aula.id
      }
    }

    this.callbacks.onStatusChange?.(aula, change)
  }

  private determineChangeAgent(newAula: AulaAbertaData, oldAula: AulaAbertaData): 'teacher' | 'system' | 'admin' {
    // Automatic locking detection
    if (newAula.status === 'travada' && newAula.travada_automaticamente) {
      return 'system'
    }

    // Status change with system timestamps (18:00 rule)
    if (newAula.status === 'travada' && newAula.travada_em) {
      const lockTime = new Date(newAula.travada_em)
      const hour = lockTime.getHours()

      // If locked exactly at 18:00, it's likely automatic
      if (hour === 18 && lockTime.getMinutes() === 0) {
        return 'system'
      }
    }

    // Manual teacher operations
    if (newAula.status === 'fechada' && oldAula.status === 'aberta') {
      return 'teacher'
    }

    // Administrative operations
    return 'admin'
  }

  private startTimeWarningTimer(aula: AulaAbertaData): void {
    if (aula.status !== 'aberta') return

    this.stopTimeWarningTimer()

    const checkTimeRemaining = () => {
      const startTime = new Date(aula.aberta_em)
      const limitMs = aula.tempo_limite_minutos * 60 * 1000
      const elapsedMs = Date.now() - startTime.getTime()
      const remainingMs = limitMs - elapsedMs
      const remainingMinutes = Math.floor(remainingMs / (60 * 1000))

      // Warning thresholds: 30, 15, 10, 5 minutes
      const warningThresholds = [30, 15, 10, 5]

      if (warningThresholds.includes(remainingMinutes)) {
        this.callbacks.onTimeWarning?.(aula, remainingMinutes)
      }

      // Check if session should be locked (Brazilian compliance: 18:00 rule)
      const now = new Date()
      const shouldLockAt18 = now.getHours() >= 18 && now.getMinutes() >= 0

      if (shouldLockAt18 || remainingMinutes <= 0) {
        this.stopTimeWarningTimer()
        // Note: Actual locking is handled by database triggers
        // This just stops the warning timer
      }
    }

    // Check immediately, then every minute
    checkTimeRemaining()
    this.timeWarningTimer = setInterval(checkTimeRemaining, 60000)
  }

  private stopTimeWarningTimer(): void {
    if (this.timeWarningTimer) {
      clearInterval(this.timeWarningTimer)
      this.timeWarningTimer = null
    }
  }

  private buildFilterString(): string {
    const conditions: string[] = []

    if (this.filter.escola_id) {
      conditions.push(`turma_id=in.(select id from turmas where escola_id=eq.${this.filter.escola_id})`)
    }

    if (this.filter.professor_id) {
      conditions.push(`professor_id=eq.${this.filter.professor_id}`)
    }

    if (this.filter.turma_id) {
      conditions.push(`turma_id=eq.${this.filter.turma_id}`)
    }

    if (this.filter.status && this.filter.status.length > 0) {
      conditions.push(`status=in.(${this.filter.status.join(',')})`)
    }

    if (this.filter.today_only) {
      const today = new Date().toISOString().split('T')[0]
      conditions.push(`aberta_em=gte.${today}T00:00:00`)
      conditions.push(`aberta_em=lt.${today}T23:59:59`)
    }

    return conditions.join(' and ')
  }

  private generateChannelName(filter: AulaAbertaFilter): string {
    const parts = ['aulas_abertas']

    if (filter.escola_id) parts.push(`escola_${filter.escola_id}`)
    if (filter.professor_id) parts.push(`prof_${filter.professor_id}`)
    if (filter.turma_id) parts.push(`turma_${filter.turma_id}`)
    if (filter.today_only) parts.push('today')

    return parts.join('_')
  }

  private setupConnectionMonitoring(): void {
    // Monitor global realtime connection
    supabase.realtime.onOpen(() => {
      if (this.connectionStatus === 'reconnecting') {
        this.connectionStatus = 'connected'
        this.callbacks.onConnectionChange?.('connected')
      }
    })

    supabase.realtime.onClose(() => {
      if (this.connectionStatus === 'connected') {
        this.connectionStatus = 'disconnected'
        this.callbacks.onConnectionChange?.('disconnected')

        // Attempt reconnection
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => this.reconnect(), this.reconnectInterval)
        }
      }
    })

    supabase.realtime.onError((error) => {
      console.error('Global realtime error:', error)
      this.handleError(new Error('Global realtime connection error'), 'global_connection')
    })
  }

  private handleError(error: Error, context?: string): void {
    console.error(`AulasAbertasListener error (${context}):`, error)
    this.callbacks.onError?.(error, context)

    this.connectionStatus = 'error'
    this.callbacks.onConnectionChange?.('error')
  }

  private cleanup(): void {
    if (this.channel) {
      supabase.removeChannel(this.channel)
      this.channel = null
    }

    this.stopTimeWarningTimer()
  }
}

// Factory functions for common use cases

/**
 * Create listener for teacher's aulas
 */
export function createTeacherAulasListener(
  professorId: string,
  callbacks: AulaAbertaListenerCallbacks
): AulasAbertasListener {
  return new AulasAbertasListener(
    {
      professor_id: professorId,
      today_only: true
    },
    callbacks
  )
}

/**
 * Create listener for school's aulas (admin/diretor view)
 */
export function createSchoolAulasListener(
  escolaId: string,
  callbacks: AulaAbertaListenerCallbacks
): AulasAbertasListener {
  return new AulasAbertasListener(
    {
      escola_id: escolaId,
      today_only: true
    },
    callbacks
  )
}

/**
 * Create listener for specific turma
 */
export function createTurmaAulasListener(
  turmaId: string,
  callbacks: AulaAbertaListenerCallbacks
): AulasAbertasListener {
  return new AulasAbertasListener(
    {
      turma_id: turmaId
    },
    callbacks
  )
}

/**
 * Create comprehensive listener for all aula changes (system monitoring)
 */
export function createSystemAulasListener(
  callbacks: AulaAbertaListenerCallbacks
): AulasAbertasListener {
  return new AulasAbertasListener(
    {
      // No filters - listen to all changes
    },
    callbacks
  )
}