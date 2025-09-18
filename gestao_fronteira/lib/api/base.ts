'use client'

import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'

// Base API service with common patterns
export class BaseApiService {
  protected tableName: keyof Database['public']['Tables']

  constructor(tableName: keyof Database['public']['Tables']) {
    this.tableName = tableName
  }

  // Generic CRUD operations
  async getAll(options?: {
    columns?: string
    filter?: Record<string, any>
    order?: { column: string; ascending?: boolean }
    limit?: number
    offset?: number
  }) {
    try {
      let query = supabase.from(this.tableName).select(options?.columns || '*')

      // Apply filters
      if (options?.filter) {
        Object.entries(options.filter).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value)
          }
        })
      }

      // Apply ordering
      if (options?.order) {
        query = query.order(options.order.column, { ascending: options.order.ascending !== false })
      }

      // Apply pagination
      if (options?.limit) {
        const from = options.offset || 0
        const to = from + options.limit - 1
        query = query.range(from, to)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    } catch (error) {
      // console.error(`Error fetching ${this.tableName}:`, error)
      throw error
    }
  }

  async getById(id: string, columns?: string) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select(columns || '*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      // console.error(`Error fetching ${this.tableName} by id ${id}:`, error)
      throw error
    }
  }

  async create(data: any) {
    try {
      const { data: result, error } = await supabase
        .from(this.tableName)
        .insert(data)
        .select()
        .single()

      if (error) throw error
      return result
    } catch (error) {
      // console.error(`Error creating ${this.tableName}:`, error)
      throw error
    }
  }

  async update(id: string, data: any) {
    try {
      const { data: result, error } = await supabase
        .from(this.tableName)
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return result
    } catch (error) {
      // console.error(`Error updating ${this.tableName} with id ${id}:`, error)
      throw error
    }
  }

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      // console.error(`Error deleting ${this.tableName} with id ${id}:`, error)
      throw error
    }
  }

  async bulkCreate(dataArray: any[]) {
    try {
      const { data: result, error } = await supabase
        .from(this.tableName)
        .insert(dataArray)
        .select()

      if (error) throw error
      return result
    } catch (error) {
      // console.error(`Error bulk creating ${this.tableName}:`, error)
      throw error
    }
  }

  async bulkUpdate(updates: { id: string; data: any }[]) {
    try {
      const results = await Promise.all(
        updates.map(({ id, data }) => this.update(id, data))
      )
      return results
    } catch (error) {
      // console.error(`Error bulk updating ${this.tableName}:`, error)
      throw error
    }
  }

  async bulkDelete(ids: string[]) {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .in('id', ids)

      if (error) throw error
      return true
    } catch (error) {
      // console.error(`Error bulk deleting ${this.tableName}:`, error)
      throw error
    }
  }

  // Real-time subscription
  subscribe(callback: (payload: any) => void, options?: {
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
    filter?: string
  }) {
    const channel = supabase
      .channel(`${this.tableName}_changes`)
      .on(
        'postgres_changes',
        {
          event: options?.event || '*',
          schema: 'public',
          table: this.tableName as string,
          filter: options?.filter
        },
        callback
      )
      .subscribe()

    return {
      unsubscribe: () => {
        supabase.removeChannel(channel)
      }
    }
  }
}