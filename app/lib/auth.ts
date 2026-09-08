'use client'

import { supabase, Tables } from './supabase'
import { User } from '@supabase/supabase-js'
import { logger } from './logger'

// AuthUser extends Supabase User with additional typed metadata
export interface AuthUser extends Omit<User, 'user_metadata'> {
  user_metadata: {
    nome?: string
    tipo_usuario?: string
    escola_id?: string
  } & User['user_metadata']
}

export type UserProfile = Tables<'users'>
type AuditDetail = string | number | boolean | null | undefined | AuditDetail[] | { [key: string]: AuditDetail }

// Audit log types
export interface AuditLog {
  id?: string
  user_id: string
  action: 'login' | 'logout' | 'login_failed' | 'session_expired' | 'password_changed'
  details?: Record<string, AuditDetail>
  ip_address?: string
  user_agent?: string
  created_at?: string
}

// Audit logging function with improved IP tracking
export const logAuthEvent = async (
  action: AuditLog['action'],
  userId?: string,
  _details?: Record<string, AuditDetail>,
  _headers?: Headers
) => {
  if (!userId || typeof window === 'undefined') return
  try {
    const response = await fetch('/api/pilot/audit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ eventType: action, entityType: 'auth_session', entityId: userId, metadata: {} }),
    })
    if (!response.ok) logger.error('PILOT_AUDIT_WRITE_FAILED', new Error(`status ${response.status}`), { feature: 'auth', action })
  } catch (error) {
    logger.error('PILOT_AUDIT_WRITE_FAILED', toError(error), { feature: 'auth', action })
  }
}

export const signIn = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      await logAuthEvent('login_failed', undefined, { email, error: error.message })
      throw error
    }

    if (data.user) {
      await logAuthEvent('login', data.user.id, { email })
    }

    return data
  } catch (error) {
    await logAuthEvent('login_failed', undefined, { email, error: toError(error).message })
    throw error
  }
}

export const signOut = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id

    // Clear escola selection on logout
    if (typeof window !== 'undefined') {
      for (let index = sessionStorage.length - 1; index >= 0; index--) {
        const key = sessionStorage.key(index)
        if (key?.startsWith('educa-selected-escola:')) sessionStorage.removeItem(key)
      }
    }

    if (userId) {
      await logAuthEvent('logout', userId)
    }

    const { error } = await supabase.auth.signOut()

    if (error) throw error
  } catch (error) {
    throw error
  }
}

export const getCurrentUser = async (): Promise<AuthUser | null> => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  // SAFETY: AuthUser only narrows optional metadata used for display; Supabase
  // authenticated the User and no authorization decision reads this cast.
  return user as AuthUser
}

// Alias for API routes compatibility
export const getUser = getCurrentUser

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .eq('ativo', true)
      .single()

    if (error) {
      // SECURITY: Never return mock profile - this prevents privilege escalation
      logger.error('[AUTH] Failed to fetch user profile from database', error, {
        metadata: {
          userId,
          errorCode: error.code
        }
      })
      return null
    }

    return data
  } catch (error: unknown) {
    // Ignore AbortError - this is expected during auth state transitions
    if (isAbortError(error)) {
      logger.info('[AUTH] Profile fetch aborted (expected during auth transitions)')
      return null
    }
    logger.error('[AUTH] Error fetching user profile', toError(error))
    return null
  }
}

export const createUserProfile = async (userData: {
  id: string
  email: string
  nome: string
  tipo_usuario: 'admin' | 'diretor' | 'secretario' | 'professor' | 'responsavel'
  escola_id?: string
}): Promise<UserProfile> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userData.id,
        email: userData.email,
        nome: userData.nome,
        tipo_usuario: userData.tipo_usuario,
        escola_id: userData.escola_id || null,
        ativo: true,
      })
      .select()
      .single()

    if (error) {
      // SECURITY: Never return mock data - throw error instead
      logger.error('[AUTH] Failed to create user profile in database', error, {
        metadata: {
          userId: userData.id,
          errorCode: error.code
        }
      })
      throw new Error(`Failed to create user profile: ${error.message}`)
    }

    return data
  } catch (error) {
    logger.error('[AUTH] Error creating user profile', toError(error))
    throw error
  }
}

// Role-based access control
export const hasPermission = (userRole: UserProfile['tipo_usuario'], requiredRoles: UserProfile['tipo_usuario'][]) => {
  return requiredRoles.includes(userRole)
}

// Check if user can access school data
export const canAccessSchool = (userProfile: UserProfile, schoolId: string): boolean => {
  // Admin can access all schools
  if (userProfile.tipo_usuario === 'admin') return true

  // Other users can only access their assigned school
  return userProfile.escola_id === schoolId
}

// Role hierarchy for permissions (higher number = more permissions)
export const roleHierarchy = {
  responsavel: 1,
  professor: 2,
  secretario: 3,
  diretor: 4,
  admin: 5,
} as const

export const hasHigherRole = (userRole: UserProfile['tipo_usuario'], targetRole: UserProfile['tipo_usuario']): boolean => {
  return roleRank(userRole) > roleRank(targetRole)
}

/**
 * Check if user can record attendance
 * Only professors and diretores can record attendance
 * Admin, secretario, gestor_sme are view-only (can see but not modify)
 *
 * @param tipoUsuario - User's role type from profile
 * @returns boolean - true if user can record attendance
 */
export const canRecordAttendance = (tipoUsuario: UserProfile['tipo_usuario'] | null): boolean => {
  if (!tipoUsuario) return false

  // Professors can always record for their assigned turmas
  if (tipoUsuario === 'professor') return true

  // Diretores can record for any turma in their escola (supervisor fallback)
  if (tipoUsuario === 'diretor') return true

  // All other roles (admin, secretario, gestor_sme, coordenador) are view-only
  return false
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value))
}

function isAbortError(value: unknown): boolean {
  const error = toError(value)
  return error.name === 'AbortError' || error.message.includes('abort')
}

function roleRank(role: UserProfile['tipo_usuario']): number {
  if (role === 'responsavel') return roleHierarchy.responsavel
  if (role === 'professor') return roleHierarchy.professor
  if (role === 'secretario') return roleHierarchy.secretario
  if (role === 'diretor') return roleHierarchy.diretor
  if (role === 'admin') return roleHierarchy.admin
  return 0
}
