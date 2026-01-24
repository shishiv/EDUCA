/**
 * Base API Service
 * Provides common functionality for all API services
 */

import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type { Database } from '@/types/database'

// Type helper for table names
type TableName = keyof Database['public']['Tables']

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

/**
 * Custom API error class for better error handling
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export abstract class BaseApiService {
  protected tableName: string

  constructor(tableName: string) {
    this.tableName = tableName
  }

  /**
   * Get all records from the table
   */
  async getAll<T>(): Promise<T[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName as TableName)
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        logger.error(`Error fetching all from ${this.tableName}:`, error.message, { feature: this.tableName, action: 'getAll' })
        throw error
      }

      return (data || []) as T[]
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(`Error in getAll for ${this.tableName}:`, errorMessage, { feature: this.tableName, action: 'getAll' })
      throw error
    }
  }

  /**
   * Get a single record by ID
   */
  async getById<T>(id: string): Promise<T | null> {
    try {
      const { data, error } = await supabase
        .from(this.tableName as TableName)
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        logger.error(`Error fetching ${this.tableName} by id ${id}:`, error.message, { feature: this.tableName, action: 'getById' })
        throw error
      }

      return data as T
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(`Error in getById for ${this.tableName}:`, errorMessage, { feature: this.tableName, action: 'getById' })
      throw error
    }
  }

  /**
   * Create a new record
   */
  async create<T>(data: Partial<T>): Promise<T> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any
      const { data: created, error } = await client
        .from(this.tableName)
        .insert(data)
        .select()
        .single()

      if (error) {
        logger.error(`Error creating ${this.tableName}:`, error.message, { feature: this.tableName, action: 'create' })
        throw error
      }

      return created as T
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(`Error in create for ${this.tableName}:`, errorMessage, { feature: this.tableName, action: 'create' })
      throw error
    }
  }

  /**
   * Update a record by ID
   */
  async update<T>(id: string, data: Partial<T>): Promise<T> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any
      const { data: updated, error } = await client
        .from(this.tableName)
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        logger.error(`Error updating ${this.tableName} id ${id}:`, error.message, { feature: this.tableName, action: 'update' })
        throw error
      }

      return updated as T
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(`Error in update for ${this.tableName}:`, errorMessage, { feature: this.tableName, action: 'update' })
      throw error
    }
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.tableName as TableName)
        .delete()
        .eq('id', id)

      if (error) {
        logger.error(`Error deleting ${this.tableName} id ${id}:`, error.message, { feature: this.tableName, action: 'delete' })
        throw error
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(`Error in delete for ${this.tableName}:`, errorMessage, { feature: this.tableName, action: 'delete' })
      throw error
    }
  }

  /**
   * Get paginated records
   */
  async getPaginated<T>(params: PaginationParams = {}): Promise<PaginatedResult<T>> {
    const { page = 1, limit = 20 } = params
    const start = (page - 1) * limit
    const end = start + limit - 1

    try {
      const { data, error, count } = await supabase
        .from(this.tableName as TableName)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(start, end)

      if (error) {
        logger.error(`Error fetching paginated from ${this.tableName}:`, error.message, { feature: this.tableName, action: 'getPaginated' })
        throw error
      }

      return {
        data: (data || []) as T[],
        total: count || 0,
        page,
        limit,
        hasMore: (count || 0) > end + 1
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(`Error in getPaginated for ${this.tableName}:`, errorMessage, { feature: this.tableName, action: 'getPaginated' })
      throw error
    }
  }

  /**
   * Count records with optional filter
   */
  async count(filter?: Record<string, unknown>): Promise<number> {
    try {
      let query = supabase
        .from(this.tableName as TableName)
        .select('*', { count: 'exact', head: true })

      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          // Type assertion for filter values
          query = query.eq(key, value as string | number | boolean)
        })
      }

      const { count, error } = await query

      if (error) {
        logger.error(`Error counting ${this.tableName}:`, error.message, { feature: this.tableName, action: 'count' })
        throw error
      }

      return count || 0
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(`Error in count for ${this.tableName}:`, errorMessage, { feature: this.tableName, action: 'count' })
      throw error
    }
  }
}
