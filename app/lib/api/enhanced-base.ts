/**
 * Enhanced Base API Service
 * Provides common functionality for API services with enhanced logging
 */

import { logger } from '@/lib/logger'

/**
 * Base class for enhanced API services
 * Provides common error handling and logging
 */
export class BaseApiService {
  protected tableName: string

  constructor(tableName: string) {
    this.tableName = tableName
  }

  /**
   * Log an API operation
   */
  protected log(action: string, data?: Record<string, unknown>): void {
    logger.info(`${this.tableName}:${action}`, {
      feature: this.tableName,
      action,
      metadata: data,
    })
  }

  /**
   * Log an error
   */
  protected logError(action: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`${this.tableName}:${action}`, errorMessage, {
      feature: this.tableName,
      action,
    })
  }
}
