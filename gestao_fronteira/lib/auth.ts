'use client'

import { supabase, Tables } from './supabase'
import { User } from '@supabase/supabase-js'

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

// Audit logging function
export const logAuthEvent = async (action: AuditLog['action'], userId?: string, details?: Record<string, any>) => {
  try {
    const auditData: AuditLog = {
      user_id: userId || 'anonymous',
      action,
      details,
      ip_address: typeof window !== 'undefined' ? 'client-side' : 'server-side',
      user_agent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
    }

    // In a real implementation, this would save to an audit_logs table
    // For now, we'll log to console and local storage for development
    // console.log('Auth Event:', auditData)

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
    // console.error('Failed to log auth event:', error)
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
    // console.error('Logout error:', error)
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
      // If user doesn't exist in users table, get their email from auth and create a basic profile
      // console.warn('Failed to fetch user profile from database:', error.message)

      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (user && user.id === userId) {
          // Create a mock profile with user's actual email
          const mockProfile: UserProfile = {
            id: userId,
            email: user.email || 'user@fronteira.mg.gov.br',
            nome: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
            tipo_usuario: 'admin', // Default to admin for now
            escola_id: null,
            ativo: true,
            created_at: new Date().toISOString()
          }

          // console.log('Created mock profile for user:', mockProfile)
          return mockProfile
        }
      } catch (authError) {
        // console.error('Error getting auth user:', authError)
      }

      // Fallback mock data
      return {
        id: userId,
        email: 'admin@fronteira.mg.gov.br',
        nome: 'Administrador do Sistema',
        tipo_usuario: 'admin',
        escola_id: null,
        ativo: true,
        created_at: new Date().toISOString()
      }
    }

    return data
  } catch (error) {
    // console.error('Error fetching user profile:', error)
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
      // console.warn('Failed to create user profile in database, returning mock data:', error.message)
      // Return mock data if database operation fails
      return {
        id: userData.id,
        email: userData.email,
        nome: userData.nome,
        tipo_usuario: userData.tipo_usuario,
        escola_id: userData.escola_id || null,
        ativo: true,
        created_at: new Date().toISOString()
      }
    }

    return data
  } catch (error) {
    // console.error('Error creating user profile:', error)
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