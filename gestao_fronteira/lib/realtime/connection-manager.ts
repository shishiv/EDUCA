/**
 * Connection Manager for Real-time Features
 * Task 5.5: Handle connection states and error recovery gracefully
 * Brazilian Educational Compliance Implementation
 */

import { supabase } from '@/lib/supabase'

export type ConnectionState = 'connected' | 'disconnected' | 'reconnecting' | 'error' | 'degraded'

export interface ConnectionMetrics {
  connectionAttempts: number
  successfulConnections: number
  failedConnections: number
  averageLatency: number
  lastSuccessfulConnection: Date | null
  lastFailedConnection: Date | null
  totalUptime: number
  totalDowntime: number
}

export interface ConnectionManagerCallbacks {
  onStateChange?: (state: ConnectionState, metadata?: any) => void
  onMetricsUpdate?: (metrics: ConnectionMetrics) => void
  onError?: (error: Error, context: string) => void
  onRecovery?: (recoveryTime: number) => void
}

/**
 * Manages real-time connection state with Brazilian educational compliance requirements
 */
export class ConnectionManager {
  private state: ConnectionState = 'disconnected'
  private callbacks: ConnectionManagerCallbacks
  private metrics: ConnectionMetrics
  private reconnectTimer: NodeJS.Timeout | null = null
  private healthCheckTimer: NodeJS.Timeout | null = null
  private latencyCheckTimer: NodeJS.Timeout | null = null

  // Reconnection strategy
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private baseReconnectDelay = 1000 // 1 second
  private maxReconnectDelay = 30000 // 30 seconds
  private exponentialBackoff = true

  // Health monitoring
  private healthCheckInterval = 30000 // 30 seconds
  private latencyCheckInterval = 5000 // 5 seconds
  private maxAllowedLatency = 5000 // 5 seconds

  // Connection tracking
  private connectionStartTime: Date | null = null
  private disconnectionStartTime: Date | null = null
  private latencyMeasurements: number[] = []

  // Brazilian compliance requirements
  private complianceRequirements = {
    maxAllowedDowntime: 300000, // 5 minutes max downtime for educational records
    dataConsistencyTimeout: 60000, // 1 minute to ensure data consistency
    auditLogRequired: true // Must log all connection events for compliance
  }

  constructor(callbacks: ConnectionManagerCallbacks = {}) {
    this.callbacks = callbacks
    this.metrics = this.initializeMetrics()
    this.setupConnectionMonitoring()
    this.startHealthMonitoring()
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state
  }

  /**
   * Get connection metrics
   */
  getMetrics(): ConnectionMetrics {
    return { ...this.metrics }
  }

  /**
   * Check if connection is healthy for educational data operations
   */
  isHealthyForEducationalData(): boolean {
    return this.state === 'connected' &&
           this.metrics.averageLatency < this.maxAllowedLatency &&
           this.getDowntimeDuration() < this.complianceRequirements.maxAllowedDowntime
  }

  /**
   * Force connection check and recovery if needed
   */
  async checkAndRecover(): Promise<boolean> {
    try {
      const startTime = Date.now()

      // Test connection with a simple query
      const { error } = await supabase.from('_health_check').select('count').limit(1)

      const latency = Date.now() - startTime
      this.recordLatency(latency)

      if (error) {
        this.handleConnectionError(new Error('Health check failed'), 'health_check')
        return false
      }

      if (this.state !== 'connected') {
        this.handleConnectionRestored(latency)
      }

      return true
    } catch (error) {
      this.handleConnectionError(error as Error, 'connection_test')
      return false
    }
  }

  /**
   * Manually trigger reconnection
   */
  async reconnect(): Promise<void> {
    if (this.state === 'reconnecting') {
      return // Already reconnecting
    }

    this.setState('reconnecting')
    this.stopReconnectTimer()

    try {
      // Cancel any pending operations
      this.cancelPendingOperations()

      // Wait for a brief moment to avoid rapid reconnections
      await this.delay(500)

      // Test connection
      const isHealthy = await this.checkAndRecover()

      if (!isHealthy) {
        throw new Error('Connection test failed during manual reconnection')
      }

      this.logComplianceEvent('manual_reconnection_successful', {
        attempt: this.reconnectAttempts,
        downtime: this.getDowntimeDuration()
      })

    } catch (error) {
      this.handleReconnectionFailure(error as Error)
    }
  }

  /**
   * Gracefully shutdown connection manager
   */
  shutdown(): void {
    this.stopAllTimers()
    this.setState('disconnected')

    this.logComplianceEvent('connection_manager_shutdown', {
      totalUptime: this.metrics.totalUptime,
      totalDowntime: this.metrics.totalDowntime,
      successRate: this.getConnectionSuccessRate()
    })
  }

  // Private methods

  private initializeMetrics(): ConnectionMetrics {
    return {
      connectionAttempts: 0,
      successfulConnections: 0,
      failedConnections: 0,
      averageLatency: 0,
      lastSuccessfulConnection: null,
      lastFailedConnection: null,
      totalUptime: 0,
      totalDowntime: 0
    }
  }

  private setupConnectionMonitoring(): void {
    // Monitor Supabase realtime connection
    supabase.realtime.onOpen(() => {
      this.handleConnectionEstablished()
    })

    supabase.realtime.onClose((event) => {
      this.handleConnectionLost('realtime_close', { code: event.code, reason: event.reason })
    })

    supabase.realtime.onError((error) => {
      this.handleConnectionError(new Error('Realtime error'), 'realtime_error', { error })
    })

    // Monitor browser online/offline
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.handleBrowserOnline()
      })

      window.addEventListener('offline', () => {
        this.handleBrowserOffline()
      })
    }
  }

  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck()
    }, this.healthCheckInterval)

    this.latencyCheckTimer = setInterval(() => {
      this.performLatencyCheck()
    }, this.latencyCheckInterval)
  }

  private async performHealthCheck(): Promise<void> {
    if (this.state === 'reconnecting') {
      return // Skip during reconnection
    }

    try {
      const isHealthy = await this.checkAndRecover()

      if (!isHealthy && this.state === 'connected') {
        this.handleConnectionLost('health_check_failed')
      }
    } catch (error) {
      this.handleConnectionError(error as Error, 'health_check')
    }
  }

  private async performLatencyCheck(): Promise<void> {
    if (this.state !== 'connected') {
      return
    }

    try {
      const startTime = Date.now()
      await supabase.from('_ping').select('count').limit(1)
      const latency = Date.now() - startTime

      this.recordLatency(latency)

      // Check for degraded performance
      if (latency > this.maxAllowedLatency && this.state === 'connected') {
        this.setState('degraded', { latency, threshold: this.maxAllowedLatency })
      }
    } catch (error) {
      // Latency check failed, connection might be unstable
      this.handleConnectionError(error as Error, 'latency_check')
    }
  }

  private handleConnectionEstablished(): void {
    const now = new Date()
    const wasDisconnected = this.state !== 'connected'

    this.connectionStartTime = now
    this.reconnectAttempts = 0
    this.metrics.successfulConnections++
    this.metrics.lastSuccessfulConnection = now

    if (wasDisconnected && this.disconnectionStartTime) {
      const downtime = now.getTime() - this.disconnectionStartTime.getTime()
      this.metrics.totalDowntime += downtime
      this.callbacks.onRecovery?.(downtime)
    }

    this.setState('connected')
    this.stopReconnectTimer()

    this.logComplianceEvent('connection_established', {
      attempt: this.metrics.connectionAttempts,
      downtime: wasDisconnected ? this.getDowntimeDuration() : 0
    })
  }

  private handleConnectionLost(reason: string, metadata?: any): void {
    this.disconnectionStartTime = new Date()

    if (this.connectionStartTime) {
      const uptime = this.disconnectionStartTime.getTime() - this.connectionStartTime.getTime()
      this.metrics.totalUptime += uptime
    }

    this.setState('disconnected', { reason, ...metadata })
    this.startReconnection()

    this.logComplianceEvent('connection_lost', {
      reason,
      uptime: this.connectionStartTime ?
        this.disconnectionStartTime.getTime() - this.connectionStartTime.getTime() : 0,
      metadata
    })
  }

  private handleConnectionError(error: Error, context: string, metadata?: any): void {
    this.metrics.failedConnections++
    this.metrics.lastFailedConnection = new Date()

    if (this.state === 'connected') {
      this.handleConnectionLost('error', { error: error.message, context, ...metadata })
    }

    this.callbacks.onError?.(error, context)

    this.logComplianceEvent('connection_error', {
      error: error.message,
      context,
      state: this.state,
      metadata
    })
  }

  private handleConnectionRestored(latency: number): void {
    this.setState('connected', { latency })
    this.reconnectAttempts = 0

    this.logComplianceEvent('connection_restored', {
      latency,
      downtime: this.getDowntimeDuration(),
      recoveryTime: Date.now()
    })
  }

  private handleReconnectionFailure(error: Error): void {
    this.metrics.failedConnections++
    this.reconnectAttempts++

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setState('error', {
        error: error.message,
        maxAttemptsReached: true,
        totalDowntime: this.getDowntimeDuration()
      })

      this.logComplianceEvent('reconnection_abandoned', {
        attempts: this.reconnectAttempts,
        error: error.message,
        totalDowntime: this.getDowntimeDuration()
      })

      // Critical: Educational data integrity at risk
      this.callbacks.onError?.(
        new Error('Connection recovery failed: Educational data integrity may be compromised'),
        'critical_failure'
      )
    } else {
      this.setState('disconnected', { error: error.message })
      this.scheduleReconnection()
    }
  }

  private handleBrowserOnline(): void {
    if (this.state === 'disconnected' || this.state === 'error') {
      this.reconnect()
    }
  }

  private handleBrowserOffline(): void {
    this.handleConnectionLost('browser_offline')
  }

  private startReconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnection()
    }
  }

  private scheduleReconnection(): void {
    this.stopReconnectTimer()

    const delay = this.calculateReconnectDelay()

    this.reconnectTimer = setTimeout(() => {
      this.attemptReconnection()
    }, delay)

    this.setState('reconnecting', {
      nextAttemptIn: delay,
      attempt: this.reconnectAttempts + 1,
      maxAttempts: this.maxReconnectAttempts
    })
  }

  private async attemptReconnection(): Promise<void> {
    this.metrics.connectionAttempts++
    this.reconnectAttempts++

    try {
      this.setState('reconnecting', { attempt: this.reconnectAttempts })

      const isHealthy = await this.checkAndRecover()

      if (!isHealthy) {
        throw new Error('Connection health check failed')
      }

      // Connection successful - will be handled by handleConnectionEstablished
    } catch (error) {
      this.handleReconnectionFailure(error as Error)
    }
  }

  private calculateReconnectDelay(): number {
    if (!this.exponentialBackoff) {
      return this.baseReconnectDelay
    }

    const exponentialDelay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts)
    const jitter = Math.random() * 1000 // Add randomness to avoid thundering herd

    return Math.min(exponentialDelay + jitter, this.maxReconnectDelay)
  }

  private recordLatency(latency: number): void {
    this.latencyMeasurements.push(latency)

    // Keep only last 10 measurements for rolling average
    if (this.latencyMeasurements.length > 10) {
      this.latencyMeasurements.shift()
    }

    this.metrics.averageLatency =
      this.latencyMeasurements.reduce((sum, val) => sum + val, 0) /
      this.latencyMeasurements.length
  }

  private setState(newState: ConnectionState, metadata?: any): void {
    const previousState = this.state
    this.state = newState

    if (previousState !== newState) {
      this.callbacks.onStateChange?.(newState, {
        previousState,
        timestamp: new Date(),
        ...metadata
      })

      this.callbacks.onMetricsUpdate?.(this.getMetrics())
    }
  }

  private getDowntimeDuration(): number {
    if (!this.disconnectionStartTime) return 0
    return Date.now() - this.disconnectionStartTime.getTime()
  }

  private getConnectionSuccessRate(): number {
    const total = this.metrics.successfulConnections + this.metrics.failedConnections
    if (total === 0) return 100
    return (this.metrics.successfulConnections / total) * 100
  }

  private cancelPendingOperations(): void {
    // Cancel any pending database operations if possible
    // This is implementation-specific to your app's needs
  }

  private stopAllTimers(): void {
    this.stopReconnectTimer()

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
    }

    if (this.latencyCheckTimer) {
      clearInterval(this.latencyCheckTimer)
      this.latencyCheckTimer = null
    }
  }

  private stopReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private logComplianceEvent(event: string, data: any): void {
    if (this.complianceRequirements.auditLogRequired) {
      console.log(`[COMPLIANCE] Connection Event: ${event}`, {
        timestamp: new Date().toISOString(),
        event,
        data,
        state: this.state,
        metrics: this.getMetrics()
      })

      // In production, this should write to a persistent audit log
      // for Brazilian educational compliance requirements
    }
  }
}

// Global connection manager instance
let globalConnectionManager: ConnectionManager | null = null

/**
 * Get or create the global connection manager instance
 */
export function getConnectionManager(callbacks?: ConnectionManagerCallbacks): ConnectionManager {
  if (!globalConnectionManager) {
    globalConnectionManager = new ConnectionManager(callbacks)
  }
  return globalConnectionManager
}

/**
 * Create a new connection manager for specific use cases
 */
export function createConnectionManager(callbacks: ConnectionManagerCallbacks): ConnectionManager {
  return new ConnectionManager(callbacks)
}