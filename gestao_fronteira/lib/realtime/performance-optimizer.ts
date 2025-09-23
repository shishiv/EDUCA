/**
 * Real-time Performance Optimizer and Memory Manager
 * Task 5.7: Optimize subscription performance and memory cleanup
 * Brazilian Educational Compliance Implementation
 */

import { AulasAbertasListener } from './aulas-abertas-listener'
import { SessionRealtimeManager } from './session-realtime'

export interface PerformanceMetrics {
  subscriptionCount: number
  memoryUsage: number
  messageProcessingTime: number
  queuedMessages: number
  droppedMessages: number
  lastCleanup: Date | null
  avgLatency: number
}

export interface OptimizationSettings {
  maxSubscriptions: number
  maxQueueSize: number
  messageThrottleMs: number
  memoryThresholdMB: number
  cleanupIntervalMs: number
  enableBatching: boolean
  batchSize: number
  batchTimeoutMs: number
}

/**
 * Optimizes real-time subscription performance and manages memory cleanup
 */
export class RealtimePerformanceOptimizer {
  private metrics: PerformanceMetrics
  private settings: OptimizationSettings
  private subscriptions = new Map<string, any>()
  private messageQueue: any[] = []
  private processingBatch: any[] = []
  private cleanupTimer: NodeJS.Timeout | null = null
  private batchTimer: NodeJS.Timeout | null = null
  private throttleTimers = new Map<string, NodeJS.Timeout>()

  // Performance monitoring
  private performanceObserver: PerformanceObserver | null = null
  private memoryMonitorTimer: NodeJS.Timeout | null = null

  private readonly defaultSettings: OptimizationSettings = {
    maxSubscriptions: 50,
    maxQueueSize: 1000,
    messageThrottleMs: 100,
    memoryThresholdMB: 50,
    cleanupIntervalMs: 30000, // 30 seconds
    enableBatching: true,
    batchSize: 10,
    batchTimeoutMs: 500
  }

  constructor(settings: Partial<OptimizationSettings> = {}) {
    this.settings = { ...this.defaultSettings, ...settings }
    this.metrics = this.initializeMetrics()
    this.startPerformanceMonitoring()
    this.scheduleCleanup()
  }

  /**
   * Register a new subscription for monitoring
   */
  registerSubscription(id: string, subscription: any): void {
    if (this.subscriptions.size >= this.settings.maxSubscriptions) {
      this.performSubscriptionCleanup()
    }

    this.subscriptions.set(id, {
      subscription,
      createdAt: new Date(),
      lastActivity: new Date(),
      messageCount: 0,
      processingTime: 0
    })

    this.metrics.subscriptionCount = this.subscriptions.size
  }

  /**
   * Unregister subscription and cleanup resources
   */
  unregisterSubscription(id: string): void {
    const sub = this.subscriptions.get(id)
    if (sub) {
      // Cleanup subscription resources
      if (sub.subscription?.unsubscribe) {
        sub.subscription.unsubscribe()
      }

      this.subscriptions.delete(id)
      this.metrics.subscriptionCount = this.subscriptions.size
    }

    // Cancel any pending throttle timers
    const throttleTimer = this.throttleTimers.get(id)
    if (throttleTimer) {
      clearTimeout(throttleTimer)
      this.throttleTimers.delete(id)
    }
  }

  /**
   * Process incoming real-time message with optimization
   */
  processMessage(subscriptionId: string, message: any): void {
    const startTime = performance.now()

    // Update subscription activity
    const subscription = this.subscriptions.get(subscriptionId)
    if (subscription) {
      subscription.lastActivity = new Date()
      subscription.messageCount++
    }

    // Check memory usage before processing
    if (this.isMemoryThresholdExceeded()) {
      this.performEmergencyCleanup()
    }

    // Apply throttling if needed
    if (this.settings.messageThrottleMs > 0) {
      this.throttleMessage(subscriptionId, message)
      return
    }

    // Queue message for batch processing
    if (this.settings.enableBatching) {
      this.queueMessageForBatch(message)
    } else {
      this.processMessageImmediate(message)
    }

    // Update performance metrics
    const processingTime = performance.now() - startTime
    this.updateProcessingMetrics(processingTime)
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * Force memory cleanup
   */
  forceCleanup(): void {
    this.performMemoryCleanup()
    this.performSubscriptionCleanup()
    this.cleanMessageQueue()
  }

  /**
   * Optimize settings based on current performance
   */
  autoOptimize(): void {
    const metrics = this.getMetrics()

    // Adjust throttling based on processing time
    if (metrics.messageProcessingTime > 50) {
      this.settings.messageThrottleMs = Math.min(
        this.settings.messageThrottleMs + 50,
        1000
      )
    } else if (metrics.messageProcessingTime < 10) {
      this.settings.messageThrottleMs = Math.max(
        this.settings.messageThrottleMs - 25,
        0
      )
    }

    // Adjust batch size based on queue size
    if (metrics.queuedMessages > this.settings.maxQueueSize * 0.8) {
      this.settings.batchSize = Math.min(
        this.settings.batchSize + 5,
        50
      )
    } else if (metrics.queuedMessages < this.settings.maxQueueSize * 0.2) {
      this.settings.batchSize = Math.max(
        this.settings.batchSize - 2,
        5
      )
    }

    // Adjust cleanup frequency based on memory usage
    if (metrics.memoryUsage > this.settings.memoryThresholdMB * 0.8) {
      this.settings.cleanupIntervalMs = Math.max(
        this.settings.cleanupIntervalMs - 5000,
        10000
      )
      this.scheduleCleanup()
    }
  }

  /**
   * Shutdown optimizer and cleanup all resources
   */
  shutdown(): void {
    // Stop all timers
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer)
    }
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
    }
    if (this.memoryMonitorTimer) {
      clearInterval(this.memoryMonitorTimer)
    }

    // Clear throttle timers
    this.throttleTimers.forEach(timer => clearTimeout(timer))
    this.throttleTimers.clear()

    // Cleanup subscriptions
    this.subscriptions.forEach((_, id) => this.unregisterSubscription(id))

    // Stop performance monitoring
    if (this.performanceObserver) {
      this.performanceObserver.disconnect()
    }

    // Clear message queue
    this.messageQueue = []
    this.processingBatch = []
  }

  // Private methods

  private initializeMetrics(): PerformanceMetrics {
    return {
      subscriptionCount: 0,
      memoryUsage: 0,
      messageProcessingTime: 0,
      queuedMessages: 0,
      droppedMessages: 0,
      lastCleanup: null,
      avgLatency: 0
    }
  }

  private startPerformanceMonitoring(): void {
    // Monitor memory usage
    this.memoryMonitorTimer = setInterval(() => {
      this.updateMemoryMetrics()
    }, 5000)

    // Setup performance observer for measuring processing times
    if (typeof PerformanceObserver !== 'undefined') {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach(entry => {
          if (entry.name.includes('realtime-message')) {
            this.metrics.avgLatency = (this.metrics.avgLatency + entry.duration) / 2
          }
        })
      })

      this.performanceObserver.observe({ entryTypes: ['measure'] })
    }
  }

  private updateMemoryMetrics(): void {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory
      this.metrics.memoryUsage = memory.usedJSHeapSize / (1024 * 1024) // MB
    }
  }

  private isMemoryThresholdExceeded(): boolean {
    return this.metrics.memoryUsage > this.settings.memoryThresholdMB
  }

  private throttleMessage(subscriptionId: string, message: any): void {
    // Cancel existing throttle timer for this subscription
    const existingTimer = this.throttleTimers.get(subscriptionId)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Set new throttle timer
    const timer = setTimeout(() => {
      this.processMessage(subscriptionId, message)
      this.throttleTimers.delete(subscriptionId)
    }, this.settings.messageThrottleMs)

    this.throttleTimers.set(subscriptionId, timer)
  }

  private queueMessageForBatch(message: any): void {
    // Check queue size limit
    if (this.messageQueue.length >= this.settings.maxQueueSize) {
      // Drop oldest message to prevent memory overflow
      this.messageQueue.shift()
      this.metrics.droppedMessages++
    }

    this.messageQueue.push({
      ...message,
      queuedAt: Date.now()
    })

    this.metrics.queuedMessages = this.messageQueue.length

    // Start batch timer if not already running
    if (!this.batchTimer && this.messageQueue.length > 0) {
      this.scheduleBatchProcessing()
    }

    // Process immediately if batch is full
    if (this.messageQueue.length >= this.settings.batchSize) {
      this.processBatch()
    }
  }

  private scheduleBatchProcessing(): void {
    this.batchTimer = setTimeout(() => {
      this.processBatch()
    }, this.settings.batchTimeoutMs)
  }

  private processBatch(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }

    if (this.messageQueue.length === 0) {
      return
    }

    // Move messages to processing batch
    this.processingBatch = this.messageQueue.splice(0, this.settings.batchSize)
    this.metrics.queuedMessages = this.messageQueue.length

    const startTime = performance.now()

    // Process batch
    try {
      this.processingBatch.forEach(message => {
        this.processMessageImmediate(message)
      })
    } catch (error) {
      console.error('Batch processing error:', error)
    }

    // Update metrics
    const processingTime = performance.now() - startTime
    this.updateProcessingMetrics(processingTime)

    // Clear processing batch
    this.processingBatch = []

    // Schedule next batch if queue is not empty
    if (this.messageQueue.length > 0) {
      this.scheduleBatchProcessing()
    }
  }

  private processMessageImmediate(message: any): void {
    // Mark start of processing for performance measurement
    performance.mark('realtime-message-start')

    try {
      // Process the actual message
      if (message.handler && typeof message.handler === 'function') {
        message.handler(message.data)
      }

      // Trigger any registered callbacks
      if (message.callbacks) {
        message.callbacks.forEach((callback: Function) => {
          try {
            callback(message.data)
          } catch (error) {
            console.error('Message callback error:', error)
          }
        })
      }
    } catch (error) {
      console.error('Message processing error:', error)
    } finally {
      // Mark end and measure
      performance.mark('realtime-message-end')
      performance.measure(
        'realtime-message-processing',
        'realtime-message-start',
        'realtime-message-end'
      )
    }
  }

  private updateProcessingMetrics(processingTime: number): void {
    this.metrics.messageProcessingTime =
      (this.metrics.messageProcessingTime + processingTime) / 2
  }

  private scheduleCleanup(): void {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer)
    }

    this.cleanupTimer = setTimeout(() => {
      this.performMemoryCleanup()
      this.performSubscriptionCleanup()
      this.scheduleCleanup() // Schedule next cleanup
    }, this.settings.cleanupIntervalMs)
  }

  private performMemoryCleanup(): void {
    // Clear processed messages from queue
    this.cleanMessageQueue()

    // Clear old performance marks
    if (typeof performance !== 'undefined' && performance.clearMarks) {
      performance.clearMarks('realtime-message-start')
      performance.clearMarks('realtime-message-end')
      performance.clearMeasures('realtime-message-processing')
    }

    // Force garbage collection if available (dev/test environments)
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc()
    }

    this.metrics.lastCleanup = new Date()
  }

  private performSubscriptionCleanup(): void {
    const now = new Date()
    const cutoffTime = now.getTime() - (5 * 60 * 1000) // 5 minutes

    // Remove inactive subscriptions
    this.subscriptions.forEach((subscription, id) => {
      if (subscription.lastActivity.getTime() < cutoffTime) {
        console.log(`Cleaning up inactive subscription: ${id}`)
        this.unregisterSubscription(id)
      }
    })
  }

  private cleanMessageQueue(): void {
    const now = Date.now()
    const cutoffTime = now - (2 * 60 * 1000) // 2 minutes

    // Remove old messages from queue
    const oldLength = this.messageQueue.length
    this.messageQueue = this.messageQueue.filter(
      message => message.queuedAt > cutoffTime
    )

    const cleaned = oldLength - this.messageQueue.length
    if (cleaned > 0) {
      console.log(`Cleaned ${cleaned} old messages from queue`)
    }

    this.metrics.queuedMessages = this.messageQueue.length
  }

  private performEmergencyCleanup(): void {
    console.warn('Memory threshold exceeded, performing emergency cleanup')

    // Aggressive cleanup
    this.messageQueue = this.messageQueue.slice(-10) // Keep only last 10 messages
    this.processingBatch = []

    // Clear all throttle timers
    this.throttleTimers.forEach(timer => clearTimeout(timer))
    this.throttleTimers.clear()

    // Update metrics
    this.metrics.queuedMessages = this.messageQueue.length
    this.metrics.droppedMessages += 100 // Estimate

    // Force immediate cleanup
    this.performMemoryCleanup()
  }
}

// Global optimizer instance
let globalOptimizer: RealtimePerformanceOptimizer | null = null

/**
 * Get or create the global performance optimizer
 */
export function getPerformanceOptimizer(
  settings?: Partial<OptimizationSettings>
): RealtimePerformanceOptimizer {
  if (!globalOptimizer) {
    globalOptimizer = new RealtimePerformanceOptimizer(settings)
  }
  return globalOptimizer
}

/**
 * Optimize all active real-time components
 */
export function optimizeRealtimePerformance(): void {
  const optimizer = getPerformanceOptimizer()
  optimizer.autoOptimize()
  optimizer.forceCleanup()
}

/**
 * Memory-efficient subscription wrapper
 */
export function createOptimizedSubscription<T>(
  subscriptionFactory: () => T,
  subscriptionId: string,
  cleanup?: (subscription: T) => void
): T {
  const optimizer = getPerformanceOptimizer()
  const subscription = subscriptionFactory()

  optimizer.registerSubscription(subscriptionId, subscription)

  // Wrap cleanup to include optimizer cleanup
  const originalCleanup = cleanup
  const wrappedCleanup = () => {
    if (originalCleanup) {
      originalCleanup(subscription)
    }
    optimizer.unregisterSubscription(subscriptionId)
  }

  // Attach cleanup to subscription if possible
  if (typeof subscription === 'object' && subscription !== null) {
    (subscription as any)._optimizerCleanup = wrappedCleanup
  }

  return subscription
}