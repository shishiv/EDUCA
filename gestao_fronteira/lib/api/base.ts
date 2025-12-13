/**
 * Base API Service
 * Provides common functionality for all API services
 */

import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

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
        .from(this.tableName)
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        logger.error(`Error fetching all from ${this.tableName}:`, error)
        throw error
      }

      return (data || []) as T[]
    } catch (error) {
      logger.error(`Error in getAll for ${this.tableName}:`, error)
      throw error
    }
  }

  /**
   * Get a single record by ID
   */
  async getById<T>(id: string): Promise<T | null> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        logger.error(`Error fetching ${this.tableName} by id ${id}:`, error)
        throw error
      }

      return data as T
    } catch (error) {
      logger.error(`Error in getById for ${this.tableName}:`, error)
      throw error
    }
  }

  /**
   * Create a new record
   */
  async create<T>(data: Partial<T>): Promise<T> {
    try {
      const { data: created, error } = await supabase
        .from(this.tableName)
        .insert(data)
        .select()
        .single()

      if (error) {
        logger.error(`Error creating ${this.tableName}:`, error)
        throw error
      }

      return created as T
    } catch (error) {
      logger.error(`Error in create for ${this.tableName}:`, error)
      throw error
    }
  }

  /**
   * Update a record by ID
   */
  async update<T>(id: string, data: Partial<T>): Promise<T> {
    try {
      const { data: updated, error } = await supabase
        .from(this.tableName)
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        logger.error(`Error updating ${this.tableName} id ${id}:`, error)
        throw error
      }

      return updated as T
    } catch (error) {
      logger.error(`Error in update for ${this.tableName}:`, error)
      throw error
    }
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', id)

      if (error) {
        logger.error(`Error deleting ${this.tableName} id ${id}:`, error)
        throw error
      }
    } catch (error) {
      logger.error(`Error in delete for ${this.tableName}:`, error)
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
        .from(this.tableName)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(start, end)

      if (error) {
        logger.error(`Error fetching paginated from ${this.tableName}:`, error)
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
      logger.error(`Error in getPaginated for ${this.tableName}:`, error)
      throw error
    }
  }

  /**
   * Count records with optional filter
   */
  async count(filter?: Record<string, any>): Promise<number> {
    try {
      let query = supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })

      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          query = query.eq(key, value)
        })
      }

      const { count, error } = await query

      if (error) {
        logger.error(`Error counting ${this.tableName}:`, error)
        throw error
      }

      return count || 0
    } catch (error) {
      logger.error(`Error in count for ${this.tableName}:`, error)
      throw error
    }
  }
}
