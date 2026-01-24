/**
 * Centralized Logging Service for Educational Management System
 *
 * Features:
 * - Structured logging with educational context
 * - Different log levels (debug, info, warn, error, critical)
 * - Performance tracking for educational workflows
 * - User action tracking for compliance
 * - Error aggregation and reporting
 * - Development vs Production behavior
 * - PostHog integration for analytics and error tracking
 */

import posthog from 'posthog-js';
import type { Metadata } from 'next';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical'

export interface LogContext {
  userId?: string
  schoolId?: string
  userRole?: string
  sessionId?: string
  feature?: string
  action?: string
  metadata?: Record<string, any>
}

export interface PerformanceMetrics {
  startTime: number
  endTime?: number
  duration?: number
  memoryUsage?: number
  apiCalls?: number
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  error?: Error | string
  performance?: PerformanceMetrics
  userAgent?: string
  url?: string
  stack?: string
}

class EducationalLogger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private isClient = typeof window !== 'undefined'
  private sessionId: string
  private logBuffer: LogEntry[] = []
  private maxBufferSize = 100

  constructor() {
    this.sessionId = this.generateSessionId()

    // Set up periodic log flushing in production
    if (!this.isDevelopment && this.isClient) {
      setInterval(() => this.flushLogs(), 30000) // Flush every 30 seconds
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error | string,
    performance?: PerformanceMetrics
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        ...context,
        sessionId: this.sessionId
      }
    }

    if (error) {
      entry.error = error instanceof Error ? error.message : error
      if (error instanceof Error) {
        entry.stack = error.stack
      }
    }

    if (performance) {
      entry.performance = performance
    }

    if (this.isClient) {
      entry.userAgent = navigator.userAgent
      entry.url = window.location.href
    }

    return entry
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) return true

    // In production, only log warnings and above
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'critical']
    const currentIndex = levels.indexOf(level)
    const minIndex = levels.indexOf('warn')

    return currentIndex >= minIndex
  }

  private logToConsole(entry: LogEntry): void {
    if (!this.isDevelopment) return

    const prefix = `🎓 [${entry.level.toUpperCase()}]`
    const timestamp = new Date(entry.timestamp).toLocaleTimeString('pt-BR')

    const contextStr = entry.context ?
      `\n📍 Context: ${JSON.stringify(entry.context, null, 2)}` : ''

    const performanceStr = entry.performance ?
      `\n⚡ Performance: ${entry.performance.duration}ms` : ''

    const errorStr = entry.error ?
      `\n❌ Error: ${entry.error}${entry.stack ? `\n${entry.stack}` : ''}` : ''

    const logMessage = `${prefix} [${timestamp}] ${entry.message}${contextStr}${performanceStr}${errorStr}`

    switch (entry.level) {
      case 'debug':
        console.debug(logMessage)
        break
      case 'info':
        console.info(logMessage)
        break
      case 'warn':
        console.warn(logMessage)
        break
      case 'error':
      case 'critical':
        console.error(logMessage)
        break
    }
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry)

    // Keep buffer size manageable
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer = this.logBuffer.slice(-this.maxBufferSize)
    }

    // Auto-flush critical errors
    if (entry.level === 'critical') {
      this.flushLogs()
    }
  }

  private async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) return

    try {
      // Send logs to your monitoring service
      // For now, we'll store them locally and could send to an API endpoint

      if (this.isClient) {
        const logsToSend = [...this.logBuffer]
        this.logBuffer = []

        // Store in localStorage for debugging (development only)
        if (this.isDevelopment) {
          const existingLogs = localStorage.getItem('educational_logs')
          const logs = existingLogs ? JSON.parse(existingLogs) : []
          logs.push(...logsToSend)

          // Keep only last 1000 logs
          const recentLogs = logs.slice(-1000)
          localStorage.setItem('educational_logs', JSON.stringify(recentLogs))
        }

        // In production, send to monitoring service
        if (!this.isDevelopment) {
          await this.sendToMonitoringService(logsToSend)
        }
      }
    } catch (error) {
      // Logging failed - this is critical but shouldn't crash the app
      if (this.isDevelopment) {
        console.error('Failed to flush logs:', error)
      }
    }
  }

  private async sendToMonitoringService(logs: LogEntry[]): Promise<void> {
    if (!this.isClient) return;

    // Send error and critical logs to PostHog
    for (const log of logs) {
      if (log.level === 'error' || log.level === 'critical') {
        posthog.capture('application_error', {
          message: log.message,
          level: log.level,
          feature: log.context?.feature,
          action: log.context?.action,
          context: log.context,
          error: log.error,
          url: log.url,
          userAgent: log.userAgent,
          stack: log.stack,
          timestamp: log.timestamp,
        });
      }
    }
  }

  // Public logging methods
  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog('debug')) return

    const entry = this.createLogEntry('debug', message, context)
    this.logToConsole(entry)
    this.addToBuffer(entry)
  }

  info(message: string, context?: LogContext): void {
    if (!this.shouldLog('info')) return

    const entry = this.createLogEntry('info', message, context)
    this.logToConsole(entry)
    this.addToBuffer(entry)
  }

  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog('warn')) return

    const entry = this.createLogEntry('warn', message, context)
    this.logToConsole(entry)
    this.addToBuffer(entry)
  }

  error(message: string, error?: Error | string, context?: LogContext): void {
    if (!this.shouldLog('error')) return

    const entry = this.createLogEntry('error', message, context, error)
    this.logToConsole(entry)
    this.addToBuffer(entry)
  }

  critical(message: string, error?: Error | string, context?: LogContext): void {
    const entry = this.createLogEntry('critical', message, context, error)
    this.logToConsole(entry)
    this.addToBuffer(entry)

    // Critical errors should be reported immediately
    this.flushLogs()
  }

  // Educational-specific logging methods
  logUserAction(action: string, context?: Omit<LogContext, 'action'>): void {
    this.info(`User action: ${action}`, { ...context, action })
  }

  logAttendanceAction(action: string, studentCount: number, context?: LogContext): void {
    this.info(`Attendance action: ${action}`, {
      ...context,
      action,
      metadata: { studentCount }
    })
  }

  logDataAccess(resource: string, operation: string, context?: LogContext): void {
    this.info(`Data access: ${operation} on ${resource}`, {
      ...context,
      action: `${operation}_${resource}`,
      metadata: { resource, operation }
    })
  }

  // Performance tracking
  startPerformanceTracking(label: string): PerformanceMetrics {
    const metrics: PerformanceMetrics = {
      startTime: performance.now()
    }

    this.debug(`Performance tracking started: ${label}`, {
      feature: label,
      action: 'performance_start'
    })

    return metrics
  }

  endPerformanceTracking(
    label: string,
    metrics: PerformanceMetrics,
    context?: LogContext
  ): void {
    metrics.endTime = performance.now()
    metrics.duration = Math.round(metrics.endTime - metrics.startTime)

    if (this.isClient && (performance as any).memory) {
      metrics.memoryUsage = (performance as any).memory.usedJSHeapSize
    }

    const level = metrics.duration > 3000 ? 'warn' : 'info'
    const message = `Performance: ${label} completed in ${metrics.duration}ms`

    if (level === 'warn') {
      this.warn(message, { ...context, feature: label, action: 'performance_slow', metadata: { ...metrics } })
    } else {
      this.info(message, { ...context, feature: label, action: 'performance_complete' })
    }
  }

  // Utility methods
  getLogs(): LogEntry[] {
    return [...this.logBuffer]
  }

  clearLogs(): void {
    this.logBuffer = []
    if (this.isClient && this.isDevelopment) {
      localStorage.removeItem('educational_logs')
    }
  }

  exportLogs(): string {
    const allLogs = this.getLogs()
    return JSON.stringify(allLogs, null, 2)
  }

  // Educational compliance logging
  logComplianceEvent(event: string, studentId?: string, context?: LogContext): void {
    this.info(`Compliance event: ${event}`, {
      ...context,
      action: 'compliance_event',
      metadata: { event, studentId }
    })
  }

  logSecurityEvent(event: string, context?: LogContext): void {
    this.warn(`Security event: ${event}`, {
      ...context,
      action: 'security_event',
      metadata: { event }
    })
  }
}

// Create singleton instance
export const logger = new EducationalLogger()

// Convenience functions for common patterns
export const logError = (message: string, error?: Error, context?: LogContext) => {
  logger.error(message, error, context)
}

export const logUserAction = (action: string, context?: LogContext) => {
  logger.logUserAction(action, context)
}

export const logPerformance = <T>(
  label: string,
  fn: () => Promise<T>,
  context?: LogContext
): Promise<T> => {
  const metrics = logger.startPerformanceTracking(label)

  return fn().finally(() => {
    logger.endPerformanceTracking(label, metrics, context)
  })
}

// Error boundary logging helper
export const logErrorBoundary = (error: Error, errorInfo: any, context?: LogContext) => {
  logger.critical('React Error Boundary triggered', error, {
    ...context,
    action: 'error_boundary',
    metadata: {
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    }
  })
}

export default logger