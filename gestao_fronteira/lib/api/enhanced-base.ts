/**
 * Base API Service
 * Provides common functionality for API services
 */

import { logger } from '@/lib/logger'

/**
 * Base class for API services
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
      ...data,
    })
  }

  /**
   * Log an error
   */
  protected logError(action: string, error: unknown): void {
    logger.error(`${this.tableName}:${action}`, {
      feature: this.tableName,
      action,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
