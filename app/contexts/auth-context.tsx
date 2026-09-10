'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import {
  getUserProfile,
  signIn as authSignIn,
  signOut as authSignOut,
  logAuthEvent,
  type UserProfile,
} from '@/lib/auth'
import { isInvalidRefreshTokenError } from '@/lib/auth-session-recovery'
import { logger } from '@/lib/logger'
import { z } from 'zod'

type ProfileDisplayUpdate = Pick<UserProfile, 'id' | 'nome' | 'email' | 'tipo_usuario' | 'escola_id' | 'ativo'>

interface AuthContextValue {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => ReturnType<typeof authSignIn>
  signOut: () => ReturnType<typeof authSignOut>
  applyProfileUpdate: (profile: ProfileDisplayUpdate) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function loadProfile(userId: string) {
  let profile = await getUserProfile(userId)
  for (let attempt = 1; !profile && attempt < 3; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, attempt * 250))
    profile = await getUserProfile(userId)
  }
  return profile
}

async function readInitialAuthState() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const nextUser = data.session?.user ?? null
  return { nextUser, profile: nextUser ? await loadProfile(nextUser.id) : null }
}

async function clearInvalidLocalSession() {
  logger.info('Invalid session detected, clearing tokens')
  try {
    await supabase.auth.signOut({ scope: 'local' })
  } catch {
    // Local cleanup is best-effort; middleware also expires auth cookies.
  }
  if (window.location.pathname !== '/login') window.location.replace('/login?reason=session_expired')
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    let authVersion = 0
    const pendingChanges = new Set<ReturnType<typeof setTimeout>>()

    const synchronizeAuthChange = async (event: AuthChangeEvent, session: Session | null, version: number) => {
      const nextUser = session?.user ?? null
      const profile = nextUser ? await loadProfile(nextUser.id) : null
      if (!active || version !== authVersion) return
      setUser(nextUser)
      setUserProfile(profile)
      setLoading(false)

      if (!nextUser && (event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT')) {
        await logAuthEvent('session_expired')
      }
    }

    const hydrate = async () => {
      try {
        // Hydration is a client display concern, not an authorization check.
        // Read the locally stored session to avoid a network getUser() race on
        // every page; middleware and server actions still verify the user.
        const { nextUser, profile } = await readInitialAuthState()
        if (!active) return
        setUser(nextUser)
        setUserProfile(profile)
      } catch (error) {
        // A navigation can abort the in-flight auth request after this
        // provider unmounts. Do not report that expected teardown as an app
        // error or update state after the page is gone.
        if (!active) return
        if (isInvalidRefreshTokenError(error)) {
          await clearInvalidLocalSession()
          setUser(null)
          setUserProfile(null)
          return
        }
        const parsedError = z.instanceof(Error).safeParse(error)
        logger.error('Error hydrating auth session', parsedError.success ? parsedError.data : new Error('Unexpected auth hydration failure'))
        setUser(null)
        setUserProfile(null)
      } finally {
        if (active) setLoading(false)
      }
    }

    let subscription: { unsubscribe: () => void } | null = null
    const initialize = async () => {
      await hydrate()
      if (!active) return
      subscription = supabase.auth.onAuthStateChange((event, session) => {
        // hydrate() already handled the initial cookie state.
        if (event === 'INITIAL_SESSION') return
        const version = ++authVersion
        // Auth holds its session lock while notifying subscribers. Profile
        // queries must start after this callback returns to avoid waiting on
        // the same lock during updateUser or token refresh.
        const timer = setTimeout(() => {
          pendingChanges.delete(timer)
          void synchronizeAuthChange(event, session, version).catch(error => {
            if (!active || version !== authVersion) return
            logger.error('Error synchronizing auth session', error instanceof Error ? error : new Error('Unexpected auth synchronization failure'))
          })
        }, 0)
        pendingChanges.add(timer)
      }).data.subscription
    }

    void initialize()

    return () => {
      active = false
      subscription?.unsubscribe()
      for (const timer of pendingChanges) clearTimeout(timer)
      pendingChanges.clear()
    }
  }, [])

  const signIn = useCallback((email: string, password: string) => authSignIn(email, password), [])
  const signOut = useCallback(() => authSignOut(), [])
  const applyProfileUpdate = useCallback((profile: ProfileDisplayUpdate) => {
    setUserProfile(current => current?.id === profile.id ? { ...current, ...profile } : current)
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    userProfile,
    loading,
    signIn,
    signOut,
    applyProfileUpdate,
  }), [user, userProfile, loading, signIn, signOut, applyProfileUpdate])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
