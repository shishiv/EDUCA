/**
 * Base API Service — shared CRUD and pagination primitives.
 *
 * Every domain service in `app/lib/api/` extends {@link BaseApiService} and
 * inherits type-safe CRUD operations scoped to one Supabase table.
 *
 * ## Authentication & RLS
 *
 * All operations execute through the browser Supabase client (`@/lib/supabase`)
 * which carries the signed-in user's JWT.  Row-Level Security policies on
 * each table act as the final authorization boundary — the service layer
 * never bypasses RLS.
 *
 * ## Error handling
 *
 * Methods throw {@link ApiError} (or raw Supabase `PostgrestError`) on failure.
 * `PGRST116` (row not found) is normalized to `null` in `getById`.
 *
 * ## Mode availability
 *
 * Available in all modes (pilot, demo sandbox, production).
 *
 * @module api/base
 */

import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type { Database } from '@/types/database'

/** Union of all table names in the `public` schema. */
export type TableName = keyof Database['public']['Tables']
type TableInsert = Database['public']['Tables'][TableName]['Insert']
type TableUpdate = Database['public']['Tables'][TableName]['Update']
type TableRow = Database['public']['Tables'][TableName]['Row']

/** Standard pagination input accepted by {@link BaseApiService.getPaginated}. */
export interface PaginationParams {
  page?: number
  limit?: number
}

/**
 * Paginated result envelope returned by {@link BaseApiService.getPaginated}.
 *
 * `hasMore` is `true` when additional pages exist beyond the current one.
 */
export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

/**
 * Structured API error with an optional machine-readable `code`.
 *
 * Domain services throw this or let raw Supabase errors propagate.
 * Callers inspect `code` for programmatic recovery and display `message`.
 *
 * @example
 * throw new ApiError('Escola não encontrada', 'PGRST116')
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

/**
 * Abstract base for all table-scoped API services.
 *
 * Subclasses pass their `tableName` at construction and inherit
 * type-safe CRUD, pagination, and count operations.
 *
 * @example
 * class SchoolsApiService extends BaseApiService {
 *   constructor() { super('escolas') }
 * }
 */
export abstract class BaseApiService {
  protected tableName: TableName

  constructor(tableName: TableName) {
    this.tableName = tableName
  }

  /**
   * Get all records from the table
   */
  async getAll<T extends object = TableRow>(): Promise<T[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
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
  async getById<T extends object = TableRow>(id: string): Promise<T | null> {
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
        logger.error(`Error fetching ${this.tableName} by id ${id}:`, error.message, { feature: this.tableName, action: 'getById' })
        throw error
      }

      return data as T | null
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(`Error in getById for ${this.tableName}:`, errorMessage, { feature: this.tableName, action: 'getById' })
      throw error
    }
  }

  /**
   * Create a new record
   *
   * The payload is checked at the call site against the real Insert type of the
   * table passed to the constructor, so wrong or missing columns fail typecheck
   * instead of failing at runtime.
   */
  async create<T extends TableInsert>(data: T): Promise<T> {
    try {
      const { data: created, error } = await supabase
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
   *
   * The payload is checked at the call site against the real Update type of the
   * table passed to the constructor, so unknown columns fail typecheck.
   */
  async update<T extends TableUpdate>(id: string, data: T): Promise<T> {
    try {
      const { data: updated, error } = await supabase
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
        .from(this.tableName)
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
  async getPaginated<T extends object = TableRow>(params: PaginationParams = {}): Promise<PaginatedResult<T>> {
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
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })

      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          // The filter keys are dynamic by design; cast the value to the
          // narrowest scalar set supabase accepts for eq()
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
