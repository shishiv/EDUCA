/**
 * Performance validation utilities for Brazilian educational management system
 * Monitors loading times, component performance, and user experience metrics
 */

import { z } from 'zod'

export type PerformanceThreshold = 'excellent' | 'good' | 'fair' | 'poor'
export type ComponentType = 'dashboard' | 'attendance' | 'student-form' | 'reports' | 'navigation'

/**
 * Performance thresholds for educational system components (in milliseconds)
 */
export const performanceThresholds = {
  dashboard: {
    excellent: 1500,
    good: 2500,
    fair: 4000,
    poor: 6000
  },
  attendance: {
    excellent: 500,  // Critical for classroom use
    good: 1000,
    fair: 2000,
    poor: 3000
  },
  'student-form': {
    excellent: 1000,
    good: 2000,
    fair: 3000,
    poor: 5000
  },
  reports: {
    excellent: 2000,
    good: 4000,
    fair: 6000,
    poor: 10000
  },
  navigation: {
    excellent: 200,
    good: 500,
    fair: 1000,
    poor: 2000
  }
} as const

/**
 * Evaluates component performance against thresholds
 * @param loadTime Loading time in milliseconds
 * @param componentType Type of component being tested
 * @returns Performance evaluation
 */
export function evaluatePerformance(
  loadTime: number,
  componentType: ComponentType
): {
  level: PerformanceThreshold
  acceptable: boolean
  recommendation: string
} {
  const thresholds = performanceThresholds[componentType]

  let level: PerformanceThreshold = 'poor'
  let recommendation = ''

  if (loadTime <= thresholds.excellent) {
    level = 'excellent'
    recommendation = 'Desempenho excelente. Continue monitorando.'
  } else if (loadTime <= thresholds.good) {
    level = 'good'
    recommendation = 'Bom desempenho. Considere otimizações menores.'
  } else if (loadTime <= thresholds.fair) {
    level = 'fair'
    recommendation = 'Desempenho aceitável. Otimizações recomendadas.'
  } else {
    level = 'poor'
    recommendation = 'Desempenho crítico. Otimização urgente necessária.'
  }

  // For classroom-critical components, be more strict
  const acceptable = componentType === 'attendance'
    ? level === 'excellent' || level === 'good'
    : level !== 'poor'

  return { level, acceptable, recommendation }
}

/**
 * Validates bundle size for optimal loading
 * @param bundleSize Bundle size in KB
 * @param bundleType Type of bundle
 * @returns Bundle size validation
 */
export function validateBundleSize(
  bundleSize: number,
  bundleType: 'main' | 'vendor' | 'chunk'
): {
  optimal: boolean
  level: 'optimal' | 'acceptable' | 'large' | 'critical'
  recommendation: string
} {
  const thresholds = {
    main: { optimal: 200, acceptable: 400, large: 800 },
    vendor: { optimal: 300, acceptable: 600, large: 1200 },
    chunk: { optimal: 100, acceptable: 200, large: 400 }
  }

  const threshold = thresholds[bundleType]
  let level: 'optimal' | 'acceptable' | 'large' | 'critical' = 'critical'
  let recommendation = ''

  if (bundleSize <= threshold.optimal) {
    level = 'optimal'
    recommendation = 'Tamanho do bundle otimizado.'
  } else if (bundleSize <= threshold.acceptable) {
    level = 'acceptable'
    recommendation = 'Tamanho aceitável. Monitore crescimento.'
  } else if (bundleSize <= threshold.large) {
    level = 'large'
    recommendation = 'Bundle grande. Considere code splitting.'
  } else {
    level = 'critical'
    recommendation = 'Bundle crítico. Code splitting urgente.'
  }

  return {
    optimal: level === 'optimal' || level === 'acceptable',
    level,
    recommendation
  }
}

/**
 * Validates memory usage for long classroom sessions
 * @param memoryUsage Memory usage in MB
 * @param sessionDuration Session duration in minutes
 * @returns Memory validation
 */
export function validateMemoryUsage(
  memoryUsage: number,
  sessionDuration: number
): {
  acceptable: boolean
  level: 'low' | 'normal' | 'high' | 'critical'
  memoryPerMinute: number
  recommendation: string
} {
  const memoryPerMinute = sessionDuration > 0 ? memoryUsage / sessionDuration : 0

  let level: 'low' | 'normal' | 'high' | 'critical' = 'critical'
  let recommendation = ''

  if (memoryUsage <= 50) {
    level = 'low'
    recommendation = 'Uso de memória otimizado.'
  } else if (memoryUsage <= 100) {
    level = 'normal'
    recommendation = 'Uso de memória normal.'
  } else if (memoryUsage <= 200) {
    level = 'high'
    recommendation = 'Uso de memória alto. Monitore vazamentos.'
  } else {
    level = 'critical'
    recommendation = 'Uso crítico de memória. Investigação necessária.'
  }

  // For classroom sessions longer than 4 hours, be more strict
  const longSession = sessionDuration > 240
  const acceptable = longSession
    ? level === 'low' || level === 'normal'
    : level !== 'critical'

  return {
    acceptable,
    level,
    memoryPerMinute,
    recommendation
  }
}

/**
 * Validates mobile performance for teacher tablets
 * @param metrics Mobile performance metrics
 * @returns Mobile performance validation
 */
export function validateMobilePerformance(metrics: {
  firstContentfulPaint: number
  largestContentfulPaint: number
  cumulativeLayoutShift: number
  firstInputDelay: number
  touchResponsiveness: number
}): {
  overall: PerformanceThreshold
  issues: string[]
  recommendations: string[]
  tabletOptimized: boolean
} {
  const issues: string[] = []
  const recommendations: string[] = []
  let score = 0

  // First Contentful Paint (should be < 2s for tablets)
  if (metrics.firstContentfulPaint <= 1500) {
    score += 25
  } else if (metrics.firstContentfulPaint <= 2500) {
    score += 15
  } else {
    issues.push('First Contentful Paint muito lento')
    recommendations.push('Otimize carregamento inicial e recursos críticos')
  }

  // Largest Contentful Paint (should be < 3s)
  if (metrics.largestContentfulPaint <= 2000) {
    score += 25
  } else if (metrics.largestContentfulPaint <= 3000) {
    score += 15
  } else {
    issues.push('Largest Contentful Paint muito lento')
    recommendations.push('Otimize imagens e recursos principais')
  }

  // Cumulative Layout Shift (should be < 0.1)
  if (metrics.cumulativeLayoutShift <= 0.05) {
    score += 25
  } else if (metrics.cumulativeLayoutShift <= 0.1) {
    score += 15
  } else {
    issues.push('Layout shift excessivo')
    recommendations.push('Reserve espaço para imagens e componentes dinâmicos')
  }

  // First Input Delay (should be < 100ms for classroom use)
  if (metrics.firstInputDelay <= 50) {
    score += 25
  } else if (metrics.firstInputDelay <= 100) {
    score += 15
  } else {
    issues.push('First Input Delay muito alto')
    recommendations.push('Otimize JavaScript e processamento principal')
  }

  let overall: PerformanceThreshold = 'poor'
  if (score >= 90) overall = 'excellent'
  else if (score >= 70) overall = 'good'
  else if (score >= 50) overall = 'fair'

  // Tablet optimization requires excellent or good performance
  const tabletOptimized = overall === 'excellent' || overall === 'good'

  return {
    overall,
    issues,
    recommendations,
    tabletOptimized
  }
}

/**
 * Validates API response times for real-time classroom features
 * @param apiEndpoint API endpoint being tested
 * @param responseTime Response time in milliseconds
 * @returns API performance validation
 */
export function validateAPIPerformance(
  apiEndpoint: string,
  responseTime: number
): {
  acceptable: boolean
  level: PerformanceThreshold
  critical: boolean
  recommendation: string
} {
  // Critical endpoints for classroom use
  const criticalEndpoints = [
    'attendance',
    'mark-attendance',
    'student-search',
    'class-session'
  ]

  const isCritical = criticalEndpoints.some(endpoint =>
    apiEndpoint.includes(endpoint)
  )

  const thresholds = isCritical
    ? { excellent: 200, good: 500, fair: 1000 }
    : { excellent: 500, good: 1000, fair: 2000 }

  let level: PerformanceThreshold = 'poor'
  let recommendation = ''

  if (responseTime <= thresholds.excellent) {
    level = 'excellent'
    recommendation = 'API respondendo otimamente.'
  } else if (responseTime <= thresholds.good) {
    level = 'good'
    recommendation = 'Boa performance da API.'
  } else if (responseTime <= thresholds.fair) {
    level = 'fair'
    recommendation = 'Performance aceitável. Considere otimizações.'
  } else {
    level = 'poor'
    recommendation = 'Performance crítica. Otimização urgente necessária.'
  }

  const acceptable = isCritical
    ? level === 'excellent' || level === 'good'
    : level !== 'poor'

  return {
    acceptable,
    level,
    critical: isCritical,
    recommendation
  }
}

/**
 * Generates performance report for educational components
 * @param measurements Performance measurements
 * @returns Comprehensive performance report
 */
export function generatePerformanceReport(measurements: {
  componentType: ComponentType
  loadTime: number
  memoryUsage: number
  sessionDuration: number
  apiCalls: Array<{ endpoint: string; responseTime: number }>
  bundleSize?: number
}): {
  overall: PerformanceThreshold
  classroomReady: boolean
  issues: string[]
  recommendations: string[]
  metrics: Record<string, any>
} {
  const componentPerf = evaluatePerformance(measurements.loadTime, measurements.componentType)
  const memoryPerf = validateMemoryUsage(measurements.memoryUsage, measurements.sessionDuration)

  const apiPerformances = measurements.apiCalls.map(call =>
    validateAPIPerformance(call.endpoint, call.responseTime)
  )

  const issues: string[] = []
  const recommendations: string[] = []

  // Collect component issues
  if (!componentPerf.acceptable) {
    issues.push(`Performance do componente ${measurements.componentType} inadequada`)
    recommendations.push(componentPerf.recommendation)
  }

  // Collect memory issues
  if (!memoryPerf.acceptable) {
    issues.push('Uso de memória excessivo')
    recommendations.push(memoryPerf.recommendation)
  }

  // Collect API issues
  apiPerformances.forEach((apiPerf, index) => {
    if (!apiPerf.acceptable) {
      const endpoint = measurements.apiCalls[index].endpoint
      issues.push(`API ${endpoint} com performance inadequada`)
      recommendations.push(apiPerf.recommendation)
    }
  })

  // Determine overall performance
  const scores = {
    excellent: 4,
    good: 3,
    fair: 2,
    poor: 1
  }

  const avgScore = [
    scores[componentPerf.level],
    scores[memoryPerf.level as keyof typeof scores] || 1,
    ...apiPerformances.map(p => scores[p.level])
  ].reduce((sum, score) => sum + score, 0) / (2 + apiPerformances.length)

  let overall: PerformanceThreshold = 'poor'
  if (avgScore >= 3.5) overall = 'excellent'
  else if (avgScore >= 2.5) overall = 'good'
  else if (avgScore >= 1.5) overall = 'fair'

  // Classroom readiness requires good or excellent overall performance
  const classroomReady = overall === 'excellent' || overall === 'good'

  return {
    overall,
    classroomReady,
    issues,
    recommendations,
    metrics: {
      componentPerformance: componentPerf,
      memoryUsage: memoryPerf,
      apiPerformances,
      averageScore: avgScore
    }
  }
}

// Zod schemas for performance validation

export const performanceMetricsSchema = z.object({
  componentType: z.enum(['dashboard', 'attendance', 'student-form', 'reports', 'navigation']),
  loadTime: z.number().min(0),
  memoryUsage: z.number().min(0),
  sessionDuration: z.number().min(0),
  timestamp: z.coerce.date().default(() => new Date())
})

export const apiPerformanceSchema = z.object({
  endpoint: z.string().min(1),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  responseTime: z.number().min(0),
  statusCode: z.number().min(100).max(599),
  payloadSize: z.number().min(0).optional(),
  timestamp: z.coerce.date().default(() => new Date())
})

export const bundleAnalysisSchema = z.object({
  type: z.enum(['main', 'vendor', 'chunk']),
  size: z.number().min(0),
  name: z.string(),
  compressed: z.boolean().default(false)
})

export type PerformanceMetrics = z.infer<typeof performanceMetricsSchema>
export type APIPerformanceMetrics = z.infer<typeof apiPerformanceSchema>
export type BundleAnalysis = z.infer<typeof bundleAnalysisSchema>