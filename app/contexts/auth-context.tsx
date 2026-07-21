'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import {
  getUserProfile,
  signIn as authSignIn,
  signOut as authSignOut,
  logAuthEvent,
  type UserProfile,
} from '@/lib/auth'
import { logger } from '@/lib/logger'

interface AuthContextValue {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => ReturnType<typeof authSignIn>
  signOut: () => ReturnType<typeof authSignOut>
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const hydrate = async () => {
      try {
        let result = await supabase.auth.getUser()
        for (let attempt = 1; result.error && attempt < 3; attempt += 1) {
          if (!/failed to fetch|network/i.test(result.error.message || '')) break
          await new Promise(resolve => setTimeout(resolve, attempt * 250))
          result = await supabase.auth.getUser()
        }
        if (result.error) throw result.error
        const nextUser = result.data.user
        const profile = nextUser ? await loadProfile(nextUser.id) : null
        if (!active) return
        setUser(nextUser)
        setUserProfile(profile)
      } catch (error) {
        logger.error('Error hydrating auth session', error instanceof Error ? error : new Error(String(error)))
        if (!active) return
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
      subscription = supabase.auth.onAuthStateChange(async (event, session) => {
        // hydrate() already handled the initial cookie state.
        if (event === 'INITIAL_SESSION') return
        const nextUser = session?.user ?? null
        const profile = nextUser ? await loadProfile(nextUser.id) : null
        if (!active) return
        setUser(nextUser)
        setUserProfile(profile)
        setLoading(false)

        if (!nextUser && (event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT')) {
          await logAuthEvent('session_expired')
        }
      }).data.subscription
    }

    void initialize()

    return () => {
      active = false
      subscription?.unsubscribe()
    }
  }, [])

  const signIn = useCallback((email: string, password: string) => authSignIn(email, password), [])
  const signOut = useCallback(() => authSignOut(), [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    userProfile,
    loading,
    signIn,
    signOut,
  }), [user, userProfile, loading, signIn, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
