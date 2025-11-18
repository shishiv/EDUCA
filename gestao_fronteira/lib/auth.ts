'use client'

import { supabase, Tables } from './supabase'
import { User } from '@supabase/supabase-js'
import { logger } from './logger'
import { getClientIP } from './ip-tracking'

export interface AuthUser extends User {
  user_metadata?: {
    nome?: string
    tipo_usuario?: string
    escola_id?: string
  } & User['user_metadata']
}

export type UserProfile = Tables<'users'>

// Audit log types
export interface AuditLog {
  id?: string
  user_id: string
  action: 'login' | 'logout' | 'login_failed' | 'session_expired' | 'password_changed'
  details?: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at?: string
}

// Audit logging function with improved IP tracking
export const logAuthEvent = async (
  action: AuditLog['action'],
  userId?: string,
  details?: Record<string, any>,
  headers?: Headers
) => {
  try {
    // Get real IP address using improved IP tracking
    const ipAddress = await getClientIP(headers)
    const userAgent = headers?.get('user-agent') || (typeof window !== 'undefined' ? navigator.userAgent : 'server')

    const auditData: AuditLog = {
      user_id: userId || 'anonymous',
      action,
      details,
      ip_address: ipAddress,
      user_agent: userAgent,
    }

    // In a real implementation, this would save to an audit_logs table
    // For now, we'll log to console and local storage for development

    if (typeof window !== 'undefined') {
      const existingLogs = JSON.parse(localStorage.getItem('auth_audit_logs') || '[]')
      existingLogs.push({ ...auditData, created_at: new Date().toISOString() })
      // Keep only last 100 logs
      if (existingLogs.length > 100) {
        existingLogs.splice(0, existingLogs.length - 100)
      }
      localStorage.setItem('auth_audit_logs', JSON.stringify(existingLogs))
    }
  } catch (error) {
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
    await logAuthEvent('login_failed', undefined, { email, error: (error as Error).message })
    throw error
  }
}

export const signOut = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id

    const { error } = await supabase.auth.signOut()

    if (error) throw error

    if (userId) {
      await logAuthEvent('logout', userId)
    }
  } catch (error) {
    throw error
  }
}

export const getCurrentUser = async (): Promise<AuthUser | null> => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
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
  } catch (error) {
    logger.error('[AUTH] Error fetching user profile', error as Error)
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
    logger.error('[AUTH] Error creating user profile', error as Error)
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
  return roleHierarchy[userRole as keyof typeof roleHierarchy] > roleHierarchy[targetRole as keyof typeof roleHierarchy]
}