/**
 * Base API Service - shared CRUD and pagination primitives.
 *
 * Every domain service in `app/lib/api/` extends {@link BaseApiService} and
 * inherits type-safe CRUD operations scoped to one Supabase table.
 *
 * ## Authentication & RLS
 *
 * All operations execute through the browser Supabase client (`@/lib/supabase`)
 * which carries the signed-in user's JWT.  Row-Level Security policies on
 * each table act as the final authorization boundary - the service layer
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
import type { PostgrestError } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/** Union of all table names in the `public` schema. */
export type TableName = keyof Database['public']['Tables']
type PublicTables = Database['public']['Tables']
export type TableInsert<Name extends TableName> = PublicTables[Name]['Insert']
export type TableUpdate<Name extends TableName> = PublicTables[Name]['Update']
export type TableRow<Name extends TableName> = PublicTables[Name]['Row']

export type ApiErrorDetails = PostgrestError['details']

type FilterScalar = string | number | boolean
type FilterableColumn<Row> = {
  [Column in keyof Row]-?: Exclude<Row[Column], null> extends FilterScalar ? Column : never
}[keyof Row]

export type CountFilter<Name extends TableName> = Readonly<
  Partial<Pick<TableRow<Name>, FilterableColumn<TableRow<Name>>>>
>

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
    public details?: ApiErrorDetails
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
export abstract class BaseApiService<Name extends TableName = TableName> {
  protected tableName: Name

  constructor(tableName: Name) {
    this.tableName = tableName
  }

  /**
   * Get all records from the table
   */
  async getAll<_Projection extends Partial<TableRow<Name>> = TableRow<Name>>(): Promise<TableRow<Name>[]> {
    try {
      const tableName: TableName = this.tableName
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      // SAFETY: tableName is widened only to satisfy supabase-js dynamic-table
      // overloads; the constructor binds it to Name for this service instance.
      return (data ?? []) as TableRow<Name>[]
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(`Error in getAll for ${this.tableName}:`, errorMessage, { feature: this.tableName, action: 'getAll' })
      throw error
    }
  }

  /**
   * Get a single record by ID
   */
  async getById<_Projection extends Partial<TableRow<Name>> = TableRow<Name>>(
    id: string,
  ): Promise<TableRow<Name> | null> {
    try {
      const tableName: TableName = this.tableName
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .filter('id', 'eq', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        throw error
      }

      // SAFETY: tableName is widened only to satisfy supabase-js dynamic-table
      // overloads; the constructor binds it to Name for this service instance.
      return data as TableRow<Name>
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
  async create(data: TableInsert<Name>): Promise<TableRow<Name>> {
    try {
      const tableName: TableName = this.tableName
      const { data: created, error } = await supabase
        .from(tableName)
        .insert(data)
        .select()
        .single()

      if (error) {
        throw error
      }

      // SAFETY: tableName and data share Name; the selected row is therefore
      // the generated Row contract for that same table.
      return created as TableRow<Name>
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
  async update(id: string, data: TableUpdate<Name>): Promise<TableRow<Name>> {
    try {
      const tableName: TableName = this.tableName
      const { data: updated, error } = await supabase
        .from(tableName)
        .update(data)
        .filter('id', 'eq', id)
        .select()
        .single()

      if (error) {
        throw error
      }

      // SAFETY: tableName and data share Name; the selected row is therefore
      // the generated Row contract for that same table.
      return updated as TableRow<Name>
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
      const tableName: TableName = this.tableName
      const { error } = await supabase
        .from(tableName)
        .delete()
        .filter('id', 'eq', id)

      if (error) {
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
  async getPaginated(params: PaginationParams = {}): Promise<PaginatedResult<TableRow<Name>>> {
    const { page = 1, limit = 20 } = params
    const start = (page - 1) * limit
    const end = start + limit - 1

    try {
      const tableName: TableName = this.tableName
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(start, end)

      if (error) {
        throw error
      }

      return {
        // SAFETY: tableName is widened only to satisfy supabase-js dynamic-table
        // overloads; the constructor binds it to Name for this service instance.
        data: (data ?? []) as TableRow<Name>[],
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
  async count(filter?: CountFilter<Name>): Promise<number> {
    try {
      const tableName: TableName = this.tableName
      let query = supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })

      if (filter) {
        query = query.match(filter)
      }

      const { count, error } = await query

      if (error) {
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
