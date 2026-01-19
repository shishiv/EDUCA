/**
 * Rate Limiting and Error Handling for Enhanced Session Management API
 * Implements Brazilian educational compliance and performance requirements
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

// Rate limiting configuration
interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  keyGenerator?: (request: NextRequest) => string
  onLimitReached?: (request: NextRequest) => NextResponse
}

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { requests: number; resetTime: number }>()

// Default rate limiting configurations for different endpoints
const rateLimitConfigs: Record<string, RateLimitConfig> = {
  // Session creation - moderate limits
  'sessoes-aula-create': {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    keyGenerator: (req) => getClientKey(req, 'create')
  },

  // Status updates - more permissive
  'sessoes-aula-status': {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
    keyGenerator: (req) => getClientKey(req, 'status')
  },

  // Batch attendance - strict limits for performance
  'sessoes-aula-batch': {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
    keyGenerator: (req) => getClientKey(req, 'batch')
  },

  // General API calls
  'sessoes-aula-general': {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    keyGenerator: (req) => getClientKey(req, 'general')
  }
}

// Generate client key for rate limiting
function getClientKey(request: NextRequest, endpoint: string): string {
  // Try to get user ID from authorization header or session
  const authHeader = request.headers.get('authorization')
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const ip = getClientIP(request)

  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Use user-based rate limiting for authenticated requests
    const token = authHeader.slice(7)
    return `user:${token.slice(-10)}:${endpoint}`
  }

  // Fall back to IP-based rate limiting
  return `ip:${ip}:${endpoint}`
}

// Get client IP address with proper header checking
function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')

  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP
  if (forwardedFor) return forwardedFor.split(',')[0].trim()

  return 'unknown'
}

// Rate limiting middleware
export function rateLimit(configKey: string) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const config = rateLimitConfigs[configKey]
    if (!config) {
      console.warn(`Rate limit configuration not found: ${configKey}`)
      return null
    }

    const key = config.keyGenerator ? config.keyGenerator(request) : getClientKey(request, configKey)
    const now = Date.now()
    const windowStart = now - config.windowMs

    // Clean up old entries
    cleanupExpiredEntries(windowStart)

    // Get current rate limit data
    const current = rateLimitStore.get(key) || { requests: 0, resetTime: now + config.windowMs }

    // Reset window if expired
    if (now >= current.resetTime) {
      current.requests = 0
      current.resetTime = now + config.windowMs
    }

    // Check if limit exceeded
    if (current.requests >= config.maxRequests) {
      const resetIn = Math.ceil((current.resetTime - now) / 1000)

      // Log rate limit violation
      console.warn(`Rate limit exceeded for key: ${key}`)

      return config.onLimitReached ?
        config.onLimitReached(request) :
        NextResponse.json({
          error: 'Muitas solicitações. Tente novamente em alguns minutos.',
          code: 'RATE_LIMIT_EXCEEDED',
          details: {
            limit: config.maxRequests,
            window_seconds: config.windowMs / 1000,
            reset_in_seconds: resetIn
          }
        }, {
          status: 429,
          headers: {
            'Retry-After': resetIn.toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': current.resetTime.toString()
          }
        })
    }

    // Increment counter
    current.requests++
    rateLimitStore.set(key, current)

    return null // Allow request to proceed
  }
}

// Clean up expired entries from rate limit store
function cleanupExpiredEntries(windowStart: number) {
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.resetTime < windowStart) {
      rateLimitStore.delete(key)
    }
  }
}

// Error handling middleware for API endpoints
export interface APIError extends Error {
  statusCode?: number
  code?: string
  details?: any
}

export function handleAPIError(error: unknown): NextResponse {
  logger.error('API Error', error as Error, {
    feature: 'rate-limiting',
    action: 'handle_api_error'
  })

  // Handle custom API errors
  if (error instanceof Error && 'statusCode' in error) {
    const apiError = error as APIError
    return NextResponse.json({
      error: apiError.message,
      code: apiError.code || 'API_ERROR',
      details: apiError.details
    }, { status: apiError.statusCode || 500 })
  }

  // Handle validation errors (Zod)
  if (error && typeof error === 'object' && 'issues' in error) {
    return NextResponse.json({
      error: 'Dados de entrada inválidos',
      code: 'VALIDATION_ERROR',
      details: (error as any).issues
    }, { status: 400 })
  }

  // Handle database errors
  if (error && typeof error === 'object' && 'code' in error) {
    const dbError = error as any
    return handleDatabaseError(dbError)
  }

  // Handle standard errors
  if (error instanceof Error) {
    return NextResponse.json({
      error: error.message,
      code: 'UNKNOWN_ERROR'
    }, { status: 500 })
  }

  // Handle unknown errors
  return NextResponse.json({
    error: 'Erro interno do servidor',
    code: 'INTERNAL_ERROR'
  }, { status: 500 })
}

// Handle specific database errors with Brazilian context
function handleDatabaseError(error: any): NextResponse {
  const errorMap: Record<string, { status: number; message: string; code: string }> = {
    '23505': { // Unique constraint violation
      status: 409,
      message: 'Registro duplicado. Este item já existe.',
      code: 'DUPLICATE_RECORD'
    },
    '23503': { // Foreign key violation
      status: 400,
      message: 'Referência inválida. Verifique se todos os dados relacionados existem.',
      code: 'INVALID_REFERENCE'
    },
    '23502': { // Not null violation
      status: 400,
      message: 'Campo obrigatório em branco.',
      code: 'REQUIRED_FIELD_MISSING'
    },
    '42P01': { // Undefined table
      status: 500,
      message: 'Erro de configuração do banco de dados.',
      code: 'DATABASE_CONFIGURATION_ERROR'
    },
    '42703': { // Undefined column
      status: 500,
      message: 'Erro de esquema do banco de dados.',
      code: 'DATABASE_SCHEMA_ERROR'
    }
  }

  const mapped = errorMap[error.code]
  if (mapped) {
    return NextResponse.json({
      error: mapped.message,
      code: mapped.code,
      details: {
        database_code: error.code,
        table: error.table_name,
        column: error.column_name
      }
    }, { status: mapped.status })
  }

  // Generic database error
  return NextResponse.json({
    error: 'Erro no banco de dados',
    code: 'DATABASE_ERROR',
    details: {
      database_code: error.code
    }
  }, { status: 500 })
}

// Performance monitoring middleware
export interface PerformanceMetrics {
  endpoint: string
  executionTime: number
  requestSize: number
  responseSize: number
  userAgent: string
  ipAddress: string
}

export function measurePerformance(endpoint: string) {
  return async (request: NextRequest, response: NextResponse): Promise<PerformanceMetrics> => {
    const startTime = performance.now()
    const requestSize = parseInt(request.headers.get('content-length') || '0')

    // This would be called after the response is generated
    const endTime = performance.now()
    const executionTime = endTime - startTime

    const metrics: PerformanceMetrics = {
      endpoint,
      executionTime,
      requestSize,
      responseSize: 0, // Would be filled by the actual response
      userAgent: request.headers.get('user-agent') || 'unknown',
      ipAddress: getClientIP(request)
    }

    // Log performance metrics (in production, send to monitoring service)
    if (executionTime > 1000) { // Log slow requests
      console.warn(`Slow API request detected: ${endpoint} took ${executionTime.toFixed(2)}ms`)
    }

    return metrics
  }
}

// Brazilian educational compliance logging
export function logEducationalCompliance(action: string, sessionId: string, userId: string, details: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action,
    session_id: sessionId,
    user_id: userId,
    details,
    compliance_context: 'brazilian_education',
    timezone: 'America/Sao_Paulo'
  }

  // In production, send to compliance logging service
  console.log('Educational Compliance Log:', JSON.stringify(logEntry))
}