/**
 * Users API Service - user management, statistics, and role queries.
 *
 * ## Authentication & RLS
 *
 * Uses the browser Supabase client.  The `users` table RLS policies enforce
 * school-scoped visibility: directors see their school's users, secretariat
 * users (admin, escola_id IS NULL) see all.
 *
 * ## Roles
 *
 * | Role | Access |
 * |------|--------|
 * | admin | Reads users across all schools; mutations use governed routes |
 * | diretor | Reads users within the assigned escola |
 * | secretario | Reads users within the assigned escola |
 * | professor | Read own profile only |
 *
 * ## Mode availability
 *
 * All modes.  Demo sandbox blocks destructive status changes via the
 * demo guard but allows reads.
 *
 * @module api/users
 */
'use client'

import { supabase, User } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type { QueryData } from '@supabase/supabase-js'
import { z } from 'zod'

interface UsersWithSchoolOptions {
  filter?: Record<string, string | number | boolean | null | undefined>
  searchTerm?: string
  roles?: string[]
  schools?: string[]
  activeOnly?: boolean
  limit?: number
  offset?: number
}

const userStatusResponseSchema = z.object({
  user: z.object({ id: z.string(), ativo: z.boolean() }),
})
const managedTeacherResponseSchema = z.object({
  user: z.object({
    ativo: z.boolean().nullable(),
    created_at: z.string().nullable(),
    email: z.string().nullable(),
    escola_id: z.string().nullable(),
    id: z.string(),
    nome: z.string(),
    tipo_usuario: z.string(),
  }),
})
const mutationErrorResponseSchema = z.object({
  error: z.string().optional(),
  issues: z.array(z.object({ message: z.string() })).optional(),
})

function createUsersWithSchoolQuery(client: typeof supabase) {
  return client
    .from('users')
    .select(`
      *,
      escola:escolas!fk_users_escola(*)
    `)
}

type UsersWithSchoolQuery = ReturnType<typeof createUsersWithSchoolQuery>
export type UserWithSchool = QueryData<UsersWithSchoolQuery>[number]

function applyValueFilters(query: UsersWithSchoolQuery, options?: UsersWithSchoolOptions) {
  let filteredQuery = query
  if (options?.activeOnly !== false) filteredQuery = filteredQuery.eq('ativo', true)
  if (!options?.filter) return filteredQuery

  for (const [key, value] of Object.entries(options.filter)) {
    if (value !== undefined && value !== null) filteredQuery = filteredQuery.eq(key, value)
  }
  return filteredQuery
}

function applyListFilters(query: UsersWithSchoolQuery, options?: UsersWithSchoolOptions) {
  let filteredQuery = query
  if (options?.roles?.length) filteredQuery = filteredQuery.in('tipo_usuario', options.roles)
  if (options?.schools?.length) filteredQuery = filteredQuery.in('escola_id', options.schools)
  if (options?.searchTerm) {
    filteredQuery = filteredQuery.or(`nome.ilike.%${options.searchTerm}%,email.ilike.%${options.searchTerm}%`)
  }
  return filteredQuery
}

function applyPagination(query: UsersWithSchoolQuery, options?: UsersWithSchoolOptions) {
  if (!options?.limit) return query
  const from = options.offset ?? 0
  return query.range(from, from + options.limit - 1)
}

export class UsersApiService {
  constructor(private readonly client: typeof supabase = supabase) {}

  // Get users with school information
  async getUsersWithSchool(options?: UsersWithSchoolOptions): Promise<UserWithSchool[]> {
    const valueFilteredQuery = applyValueFilters(createUsersWithSchoolQuery(this.client), options)
    const listFilteredQuery = applyListFilters(valueFilteredQuery, options)
    const query = applyPagination(listFilteredQuery, options).order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) throw error
    return data
  }

  async getUserWithSchool(id: string): Promise<UserWithSchool | null> {
    const [user] = await this.getUsersWithSchool({ filter: { id }, activeOnly: false, limit: 1 })
    return user ?? null
  }

  // Update user status
  async updateUserStatus(id: string, ativo: boolean, _reason?: string) {
    const response = await fetch(`/api/users/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ativo }),
    })
    const payload = await response.json()
    if (!response.ok) {
      const result = mutationErrorResponseSchema.safeParse(payload)
      throw new Error(result.success ? result.data.error ?? 'USER_STATUS_UPDATE_FAILED' : 'USER_STATUS_UPDATE_FAILED')
    }

    return userStatusResponseSchema.parse(payload).user
  }

  async updateManagedTeacher(id: string, values: Pick<User, 'nome' | 'email' | 'tipo_usuario' | 'escola_id'>) {
    const response = await fetch(`/api/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    })
    const payload = await response.json()
    if (!response.ok) {
      const result = mutationErrorResponseSchema.safeParse(payload)
      const message = result.success
        ? result.data.issues?.[0]?.message ?? result.data.error ?? 'TEACHER_UPDATE_FAILED'
        : 'TEACHER_UPDATE_FAILED'
      throw new Error(message)
    }
    return managedTeacherResponseSchema.parse(payload).user
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
      const { count: total } = await this.client
        .from('users')
        .select('*', { count: 'exact', head: true })

      // Active users
      const { count: active } = await this.client
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('ativo', true)

      // By role
      const { data: roleData } = await this.client
        .from('users')
        .select('tipo_usuario')
        .eq('ativo', true)

      const byRole = roleData?.reduce((acc: Record<string, number>, user) => {
        acc[user.tipo_usuario] = (acc[user.tipo_usuario] || 0) + 1
        return acc
      }, {}) || {}

      // By school
      const { data: schoolData } = await this.client
        .from('users')
        .select('escola_id, escolas!fk_users_escola(nome)')
        .eq('ativo', true)
        .not('escola_id', 'is', null)

      const bySchool = schoolData?.reduce((acc: Record<string, number>, user) => {
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
    } catch {
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
      const { data: { user } } = await this.client.auth.getUser()
      if (!user) return null

      // Use tipo_usuario instead of role (correct column name)
      const { data: profile, error } = await this.client
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
      const parsedError = z.instanceof(Error).safeParse(error)
      logger.error('Error in getCurrentUserRole', parsedError.success ? parsedError.data : new Error('Unexpected role lookup failure'), {
        feature: 'users',
        action: 'get_current_user_role'
      })
      return null
    }
  }
}

export const usersApi = new UsersApiService()
