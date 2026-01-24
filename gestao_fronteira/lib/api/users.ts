'use client'

import { BaseApiService } from './base'
import { supabase, User, Tables } from '@/lib/supabase'
import { logAuthEvent } from '@/lib/auth'
import { logUserEvent, logAuditEvent } from '@/lib/audit'
import { logger } from '@/lib/logger'

export type UserWithSchool = User & {
  escola?: Tables<'escolas'>
}

export class UsersApiService extends BaseApiService {
  constructor() {
    super('users')
  }

  // Get users with school information
  async getUsersWithSchool(options?: {
    filter?: Record<string, any>
    searchTerm?: string
    roles?: string[]
    schools?: string[]
    activeOnly?: boolean
    limit?: number
    offset?: number
  }): Promise<UserWithSchool[]> {
    try {
      let query = supabase
        .from('users')
        .select(`
          *,
          escola:escolas(
            id,
            nome,
            codigo,
            tipo
          )
        `)

      // Apply filters
      if (options?.activeOnly !== false) {
        query = query.eq('ativo', true)
      }

      if (options?.filter) {
        Object.entries(options.filter).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value)
          }
        })
      }

      // Role filter
      if (options?.roles && options.roles.length > 0) {
        query = query.in('tipo_usuario', options.roles)
      }

      // School filter
      if (options?.schools && options.schools.length > 0) {
        query = query.in('escola_id', options.schools)
      }

      // Search filter
      if (options?.searchTerm) {
        query = query.or(`nome.ilike.%${options.searchTerm}%,email.ilike.%${options.searchTerm}%`)
      }

      // Apply pagination
      if (options?.limit) {
        const from = options.offset || 0
        const to = from + options.limit - 1
        query = query.range(from, to)
      }

      // Order by creation date
      query = query.order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) throw error
      return data as UserWithSchool[]
    } catch (error) {
      throw error
    }
  }

  // Create user with proper logging
  async createUser(userData: {
    id: string
    email: string
    nome: string
    tipo_usuario: 'admin' | 'diretor' | 'secretario' | 'professor' | 'responsavel'
    escola_id?: string
  }) {
    try {
      const result = await this.create({
        ...userData,
        ativo: true,
        created_at: new Date().toISOString()
      })

      // Log user creation
      await logAuthEvent('login', userData.id, {
        action: 'user_created',
        created_by: 'admin',
        user_type: userData.tipo_usuario
      })

      return result
    } catch (error) {
      throw error
    }
  }

  // Update user status
  async updateUserStatus(id: string, ativo: boolean, reason?: string) {
    try {
      const result = await this.update(id, { ativo })

      // Log status change
      await logAuthEvent('session_expired', id, {
        action: ativo ? 'user_activated' : 'user_deactivated',
        reason
      })

      return result
    } catch (error) {
      throw error
    }
  }

  // Bulk operations
  async bulkUpdateStatus(userIds: string[], ativo: boolean, reason?: string) {
    try {
      const results = []
      for (const id of userIds) {
        const result = await this.update(id, { ativo })
        results.push(result)
      }

      // Log bulk status change
      for (const id of userIds) {
        await logAuthEvent('session_expired', id, {
          action: ativo ? 'bulk_user_activated' : 'bulk_user_deactivated',
          reason,
          bulk_count: userIds.length
        })
      }

      return results
    } catch (error) {
      throw error
    }
  }

  async bulkAssignSchool(userIds: string[], escolaId: string) {
    try {
      const results = []
      for (const id of userIds) {
        const result = await this.update(id, { escola_id: escolaId })
        results.push(result)
      }

      // Log bulk school assignment
      for (const id of userIds) {
        await logAuthEvent('login', id, {
          action: 'bulk_school_assigned',
          escola_id: escolaId,
          bulk_count: userIds.length
        })
      }

      return results
    } catch (error) {
      throw error
    }
  }

  // Get user statistics
  async getUserStats(): Promise<{
    total: number
    active: number
    byRole: Record<string, number>
    bySchool: Record<string, number>
  }> {
    try {
      // Total users
      const { count: total } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      // Active users
      const { count: active } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('ativo', true)

      // By role
      const { data: roleData } = await supabase
        .from('users')
        .select('tipo_usuario')
        .eq('ativo', true)

      const byRole = roleData?.reduce((acc: Record<string, number>, user) => {
        acc[user.tipo_usuario] = (acc[user.tipo_usuario] || 0) + 1
        return acc
      }, {}) || {}

      // By school
      const { data: schoolData } = await supabase
        .from('users')
        .select('escola_id, escolas(nome)')
        .eq('ativo', true)
        .not('escola_id', 'is', null)

      const bySchool = schoolData?.reduce((acc: Record<string, number>, user: any) => {
        const schoolName = user.escolas?.nome || 'Escola não encontrada'
        acc[schoolName] = (acc[schoolName] || 0) + 1
        return acc
      }, {}) || {}

      return {
        total: total || 0,
        active: active || 0,
        byRole,
        bySchool
      }
    } catch (error) {
      return {
        total: 0,
        active: 0,
        byRole: {},
        bySchool: {}
      }
    }
  }

  /**
   * Get current authenticated user's role
   * Used by chamada page for BF visibility
   */
  async getCurrentUserRole(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      // Use tipo_usuario instead of role (correct column name)
      const { data: profile, error } = await supabase
        .from('users')
        .select('tipo_usuario')
        .eq('id', user.id)
        .single()

      if (error) {
        logger.error('Error fetching current user role', error, {
          feature: 'users',
          action: 'get_current_user_role',
          userId: user.id
        })
        return null
      }

      return profile?.tipo_usuario || null
    } catch (error) {
      logger.error('Error in getCurrentUserRole', error as Error, {
        feature: 'users',
        action: 'get_current_user_role'
      })
      return null
    }
  }
}

export const usersApi = new UsersApiService()