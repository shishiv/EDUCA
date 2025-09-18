/**
 * Enhanced Base API Service with Educational Error Handling
 *
 * Features:
 * - Centralized error handling with educational context
 * - Automatic retry logic for transient failures
 * - Performance monitoring for educational workflows
 * - User-friendly error messages
 * - Comprehensive logging
 */

import { PostgrestError, PostgrestResponse } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { logger, LogContext } from '@/lib/logger'
import {
  errorHandler,
  EducationalErrorType,
  createEducationalError,
  withErrorHandling
} from '@/lib/error-handling'

export interface ApiOptions {
  retryCount?: number
  timeout?: number
  context?: LogContext
  feature?: string
  skipErrorHandling?: boolean
}

export interface ApiResponse<T> {
  data: T | null
  error: Error | null
  success: boolean
  metadata?: {
    executionTime: number
    retries: number
    fromCache?: boolean
  }
}

export class EnhancedBaseApiService {
  protected tableName: string
  private defaultRetries = 2
  private defaultTimeout = 10000

  constructor(tableName: string) {
    this.tableName = tableName
  }

  /**
   * Enhanced query execution with error handling and monitoring
   */
  protected async executeQuery<T>(
    queryFn: () => Promise<PostgrestResponse<T>>,
    operation: string,
    options: ApiOptions = {}
  ): Promise<ApiResponse<T>> {
    const startTime = performance.now()
    const context: LogContext = {
      ...options.context,
      feature: options.feature || this.tableName,
      action: operation
    }

    let retries = 0
    const maxRetries = options.retryCount ?? this.defaultRetries

    logger.debug(`API Operation Started: ${operation}`, context)

    while (retries <= maxRetries) {
      try {
        // Add timeout handling
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Operation timeout after ${options.timeout || this.defaultTimeout}ms`))
          }, options.timeout || this.defaultTimeout)
        })

        const result = await Promise.race([
          queryFn(),
          timeoutPromise
        ])

        const executionTime = performance.now() - startTime

        // Log successful operation
        logger.info(`API Operation Successful: ${operation}`, {
          ...context,
          metadata: {
            executionTime: Math.round(executionTime),
            retries,
            recordCount: Array.isArray(result.data) ? result.data.length : result.data ? 1 : 0
          }
        })

        // Handle Supabase errors
        if (result.error) {
          throw this.createApiError(result.error, operation)
        }

        return {
          data: result.data,
          error: null,
          success: true,
          metadata: {
            executionTime: Math.round(executionTime),
            retries
          }
        }

      } catch (error) {
        retries++
        const executionTime = performance.now() - startTime

        // Check if we should retry
        if (retries <= maxRetries && this.shouldRetry(error)) {
          logger.warn(`API Operation Retry: ${operation} (attempt ${retries})`, {
            ...context,
            metadata: { error: error instanceof Error ? error.message : String(error) }
          })

          // Exponential backoff
          await this.delay(Math.pow(2, retries) * 1000)
          continue
        }

        // Final failure - handle the error
        const educationalError = options.skipErrorHandling
          ? error
          : this.handleApiError(error, operation, context)

        logger.error(`API Operation Failed: ${operation}`, educationalError, {
          ...context,
          metadata: {
            executionTime: Math.round(executionTime),
            retries,
            finalAttempt: true
          }
        })

        return {
          data: null,
          error: educationalError instanceof Error ? educationalError : new Error(String(educationalError)),
          success: false,
          metadata: {
            executionTime: Math.round(executionTime),
            retries
          }
        }
      }
    }

    // This should never be reached, but TypeScript requires it
    return {
      data: null,
      error: new Error('Unexpected error in executeQuery'),
      success: false,
      metadata: { executionTime: 0, retries }
    }
  }

  /**
   * Create educational-specific error from Supabase error
   */
  private createApiError(postgrestError: PostgrestError, operation: string): Error {
    const { code, message, details } = postgrestError

    // Map Supabase error codes to educational error types
    let errorType: EducationalErrorType

    switch (code) {
      case 'PGRST116': // Not found
        if (this.tableName === 'alunos') {
          errorType = EducationalErrorType.STUDENT_NOT_FOUND
        } else if (this.tableName === 'turmas') {
          errorType = EducationalErrorType.CLASS_NOT_FOUND
        } else {
          errorType = EducationalErrorType.UNKNOWN_ERROR
        }
        break

      case '23505': // Unique violation
        if (message.includes('cpf')) {
          errorType = EducationalErrorType.INVALID_CPF
        } else {
          errorType = EducationalErrorType.DUPLICATE_RECORD
        }
        break

      case '23502': // Not null violation
        errorType = EducationalErrorType.REQUIRED_FIELD_MISSING
        break

      case '23514': // Check constraint violation
        errorType = EducationalErrorType.VALIDATION_ERROR
        break

      case 'PGRST301': // Permission denied
        errorType = EducationalErrorType.INSUFFICIENT_PERMISSIONS
        break

      default:
        errorType = EducationalErrorType.DATABASE_ERROR
    }

    const educationalError = createEducationalError(
      errorType,
      `Database ${operation} failed: ${message}`,
      {
        feature: this.tableName,
        action: operation,
        metadata: {
          supabaseCode: code,
          supabaseMessage: message,
          supabaseDetails: details
        }
      }
    )

    return new Error(educationalError.userMessage)
  }

  /**
   * Handle API errors with educational context
   */
  private handleApiError(error: unknown, operation: string, context: LogContext): Error {
    if (error instanceof Error) {
      // Network or timeout errors
      if (error.message.includes('timeout') || error.message.includes('fetch')) {
        const networkError = createEducationalError(
          EducationalErrorType.NETWORK_ERROR,
          `Network error during ${operation}: ${error.message}`,
          context
        )
        return new Error(networkError.userMessage)
      }

      // Authentication errors
      if (error.message.includes('auth') || error.message.includes('token')) {
        const authError = createEducationalError(
          EducationalErrorType.AUTHENTICATION_FAILED,
          `Authentication error during ${operation}: ${error.message}`,
          context
        )
        return new Error(authError.userMessage)
      }
    }

    // Generic error
    const genericError = createEducationalError(
      EducationalErrorType.UNKNOWN_ERROR,
      `Unknown error during ${operation}: ${String(error)}`,
      context
    )

    return new Error(genericError.userMessage)
  }

  /**
   * Determine if an error should trigger a retry
   */
  private shouldRetry(error: unknown): boolean {
    if (!(error instanceof Error)) return false

    const message = error.message.toLowerCase()

    // Retry on network errors
    if (message.includes('network') ||
        message.includes('timeout') ||
        message.includes('fetch') ||
        message.includes('connection')) {
      return true
    }

    // Retry on temporary server errors
    if (message.includes('503') ||
        message.includes('502') ||
        message.includes('500')) {
      return true
    }

    // Don't retry on authentication or validation errors
    return false
  }

  /**
   * Delay utility for retry backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Enhanced CRUD operations with error handling

  /**
   * Get all records with enhanced error handling
   */
  async getAll<T>(options: ApiOptions = {}): Promise<ApiResponse<T[]>> {
    return this.executeQuery(
      () => supabase.from(this.tableName).select('*'),
      'getAll',
      options
    )
  }

  /**
   * Get record by ID with enhanced error handling
   */
  async getById<T>(id: string, options: ApiOptions = {}): Promise<ApiResponse<T>> {
    return this.executeQuery(
      () => supabase.from(this.tableName).select('*').eq('id', id).single(),
      'getById',
      { ...options, context: { ...options.context, metadata: { recordId: id } } }
    )
  }

  /**
   * Create record with enhanced error handling
   */
  async create<T>(data: Partial<T>, options: ApiOptions = {}): Promise<ApiResponse<T>> {
    return this.executeQuery(
      () => supabase.from(this.tableName).insert(data).select().single(),
      'create',
      options
    )
  }

  /**
   * Update record with enhanced error handling
   */
  async update<T>(id: string, data: Partial<T>, options: ApiOptions = {}): Promise<ApiResponse<T>> {
    return this.executeQuery(
      () => supabase.from(this.tableName).update(data).eq('id', id).select().single(),
      'update',
      { ...options, context: { ...options.context, metadata: { recordId: id } } }
    )
  }

  /**
   * Delete record with enhanced error handling
   */
  async delete(id: string, options: ApiOptions = {}): Promise<ApiResponse<null>> {
    return this.executeQuery(
      () => supabase.from(this.tableName).delete().eq('id', id),
      'delete',
      { ...options, context: { ...options.context, metadata: { recordId: id } } }
    )
  }

  /**
   * Search records with enhanced error handling
   */
  async search<T>(
    column: string,
    value: string,
    options: ApiOptions = {}
  ): Promise<ApiResponse<T[]>> {
    return this.executeQuery(
      () => supabase.from(this.tableName).select('*').ilike(column, `%${value}%`),
      'search',
      { ...options, context: { ...options.context, metadata: { searchColumn: column, searchValue: value } } }
    )
  }

  /**
   * Count records with enhanced error handling
   */
  async count(filters?: Record<string, any>, options: ApiOptions = {}): Promise<ApiResponse<number>> {
    return this.executeQuery(
      () => {
        let query = supabase.from(this.tableName).select('*', { count: 'exact', head: true })

        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value)
          })
        }

        return query
      },
      'count',
      options
    )
  }

  /**
   * Batch operations with enhanced error handling
   */
  async batchCreate<T>(records: Partial<T>[], options: ApiOptions = {}): Promise<ApiResponse<T[]>> {
    return this.executeQuery(
      () => supabase.from(this.tableName).insert(records).select(),
      'batchCreate',
      { ...options, context: { ...options.context, metadata: { batchSize: records.length } } }
    )
  }

  /**
   * Execute custom query with enhanced error handling
   */
  async executeCustomQuery<T>(
    queryFn: () => Promise<PostgrestResponse<T>>,
    operationName: string,
    options: ApiOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.executeQuery(queryFn, operationName, options)
  }
}

export default EnhancedBaseApiService