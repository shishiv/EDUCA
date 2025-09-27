'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getUserProfile, signIn as authSignIn, signOut as authSignOut, logAuthEvent, UserProfile } from '@/lib/auth'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get current user
    const getUser = async () => {
      try {
        // Check for development bypass first
        if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
          const devBypass = localStorage.getItem('dev_auth_bypass')
          const devProfile = localStorage.getItem('dev_user_profile')

          // If we have development bypass enabled, use it exclusively
          if (devBypass === 'true') {
            if (devProfile) {
              const profile = JSON.parse(devProfile)
              const mockUser = {
                id: profile.id,
                email: profile.email,
                user_metadata: {},
                app_metadata: {},
                aud: 'authenticated',
                created_at: profile.created_at
              } as User

              setUser(mockUser)
              setUserProfile(profile)
              setLoading(false)
              return
            } else {
              // Development bypass is enabled but no profile, clear auth state
              setUser(null)
              setUserProfile(null)
              setLoading(false)
              return
            }
          }
        }

        // Only use Supabase if not in development bypass mode
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          // Fetch real user profile
          const profile = await getUserProfile(user.id)
          setUserProfile(profile)
        }

        setLoading(false)
      } catch (error) {
        console.error('Error getting user:', error)
        setLoading(false)
      }
    }

    getUser()

    // Listen for auth changes only if not in development bypass mode
    let subscription: any = null

    if (process.env.NODE_ENV !== 'development' ||
        (typeof window !== 'undefined' && localStorage.getItem('dev_auth_bypass') !== 'true')) {
      const result = supabase.auth.onAuthStateChange(
        async (event, session) => {
          setUser(session?.user ?? null)

          if (session?.user) {
            try {
              // Fetch real user profile
              const profile = await getUserProfile(session.user.id)
              setUserProfile(profile)
            } catch (error) {
              setUserProfile(null)
            }
          } else {
            setUserProfile(null)

            // Log session expired if event indicates it
            if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT') {
              await logAuthEvent('session_expired')
            }
          }

          setLoading(false)
        }
      )
      subscription = result.data.subscription
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    // Use enhanced signIn from auth.ts which includes audit logging
    return await authSignIn(email, password)
  }

  const signOut = async () => {
    // Use enhanced signOut from auth.ts which includes audit logging
    return await authSignOut()
  }

  return {
    user,
    userProfile,
    loading,
    signIn,
    signOut,
  }
}