/**
 * Lightweight Metrics Collector for Grafana Cloud
 * Free monitoring with enterprise-grade features
 */

interface Metric {
  name: string
  value: number
  labels?: Record<string, string>
  timestamp?: number
}

class MetricsCollector {
  private metrics: Metric[] = []
  private flushInterval = 60000 // 1 minute
  private maxBufferSize = 100
  private flushTimer: NodeJS.Timeout | null = null

  constructor() {
    // Only auto-flush on server-side
    if (typeof window === 'undefined' && process.env.GRAFANA_CLOUD_URL) {
      this.startAutoFlush()
    }
  }

  private startAutoFlush() {
    this.flushTimer = setInterval(() => {
      this.flush().catch(console.error)
    }, this.flushInterval)
  }

  /**
   * Record a metric value
   */
  record(name: string, value: number, labels?: Record<string, string>) {
    this.metrics.push({
      name,
      value,
      labels: {
        environment: process.env.NODE_ENV || 'development',
        app: 'gestao_fronteira',
        ...labels
      },
      timestamp: Date.now()
    })

    // Auto-flush if buffer is full
    if (this.metrics.length >= this.maxBufferSize) {
      this.flush().catch(console.error)
    }
  }

  /**
   * Increment a counter by 1
   */
  increment(name: string, labels?: Record<string, string>) {
    this.record(name, 1, labels)
  }

  /**
   * Decrement a counter by 1
   */
  decrement(name: string, labels?: Record<string, string>) {
    this.record(name, -1, labels)
  }

  /**
   * Record timing/duration in milliseconds
   */
  timing(name: string, durationMs: number, labels?: Record<string, string>) {
    this.record(`${name}_duration_ms`, durationMs, labels)
  }

  /**
   * Record a gauge value (current state)
   */
  gauge(name: string, value: number, labels?: Record<string, string>) {
    this.record(`${name}_gauge`, value, labels)
  }

  /**
   * Time a function execution
   */
  async timeAsync<T>(
    name: string,
    fn: () => Promise<T>,
    labels?: Record<string, string>
  ): Promise<T> {
    const start = Date.now()
    try {
      const result = await fn()
      this.timing(name, Date.now() - start, { ...labels, status: 'success' })
      return result
    } catch (error) {
      this.timing(name, Date.now() - start, { ...labels, status: 'error' })
      throw error
    }
  }

  /**
   * Flush metrics to Grafana Cloud
   * Falls back gracefully if Grafana is not configured
   */
  async flush(): Promise<void> {
    if (this.metrics.length === 0) return

    // Don't send metrics if Grafana is not configured
    if (!process.env.GRAFANA_CLOUD_URL || !process.env.GRAFANA_CLOUD_API_KEY) {
      // Clear buffer anyway to prevent memory leaks
      this.metrics = []
      return
    }

    const metricsToSend = [...this.metrics]
    this.metrics = []

    try {
      // Convert to Prometheus remote write format
      const prometheusData = this.convertToPrometheusFormat(metricsToSend)

      const response = await fetch(`${process.env.GRAFANA_CLOUD_URL}/api/prom/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-protobuf',
          'Authorization': `Bearer ${process.env.GRAFANA_CLOUD_API_KEY}`,
          'X-Prometheus-Remote-Write-Version': '0.1.0'
        },
        body: prometheusData
      })

      if (!response.ok) {
        console.error('Failed to send metrics to Grafana:', response.status)
      }
    } catch (error) {
      console.error('Metrics flush error:', error)
      // Don't throw - monitoring failures shouldn't break the app
    }
  }

  /**
   * Convert metrics to Prometheus remote write format
   */
  private convertToPrometheusFormat(metrics: Metric[]): string {
    // For simplicity, we'll use JSON format (Grafana Cloud accepts both)
    // In production, you'd use protobuf for efficiency

    const streams = metrics.map(metric => ({
      labels: {
        __name__: metric.name,
        ...metric.labels
      },
      samples: [{
        value: metric.value,
        timestamp: metric.timestamp || Date.now()
      }]
    }))

    return JSON.stringify({ streams })
  }

  /**
   * Cleanup on shutdown
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    await this.flush()
  }
}

// Singleton instance
const metricsCollector = new MetricsCollector()

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('beforeExit', () => {
    metricsCollector.shutdown().catch(console.error)
  })
}

// Export convenience functions
export const metrics = metricsCollector

export const recordMetric = (name: string, value: number, labels?: Record<string, string>) =>
  metrics.record(name, value, labels)

export const incrementCounter = (name: string, labels?: Record<string, string>) =>
  metrics.increment(name, labels)

export const decrementCounter = (name: string, labels?: Record<string, string>) =>
  metrics.decrement(name, labels)

export const recordTiming = (name: string, durationMs: number, labels?: Record<string, string>) =>
  metrics.timing(name, durationMs, labels)

export const recordGauge = (name: string, value: number, labels?: Record<string, string>) =>
  metrics.gauge(name, value, labels)

export const timeAsync = <T>(
  name: string,
  fn: () => Promise<T>,
  labels?: Record<string, string>
) => metrics.timeAsync(name, fn, labels)

/**
 * Higher-order function to automatically track API endpoint metrics
 */
export function withMetrics<T extends (...args: any[]) => Promise<any>>(
  endpoint: string,
  handler: T
): T {
  return (async (...args: any[]) => {
    const start = Date.now()
    const labels = { endpoint }

    try {
      incrementCounter('api_requests_total', labels)
      const result = await handler(...args)
      recordTiming('api_request', Date.now() - start, { ...labels, status: '2xx' })
      return result
    } catch (error) {
      recordTiming('api_request', Date.now() - start, { ...labels, status: 'error' })
      incrementCounter('api_errors_total', labels)
      throw error
    }
  }) as T
}
