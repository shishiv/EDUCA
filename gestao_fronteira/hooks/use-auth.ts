'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getUserProfile, signIn as authSignIn, signOut as authSignOut, logAuthEvent, UserProfile } from '@/lib/auth'
import { logger } from '@/lib/logger'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get current user
    const getUser = async () => {
      try {
        // Get current authenticated user from Supabase
        const { data: { user }, error } = await supabase.auth.getUser()

        // Handle invalid refresh token error by clearing session gracefully
        if (error) {
          // Check if it's a refresh token or session error
          if (error.message?.includes('Refresh Token') ||
              error.message?.includes('refresh_token') ||
              error.message?.includes('session') ||
              error.name === 'AuthApiError') {
            logger.info('Invalid session detected, clearing tokens')
            // Sign out to clear invalid tokens from localStorage
            try {
              await supabase.auth.signOut()
            } catch {
              // Ignore signOut errors when clearing invalid session
            }
            setUser(null)
            setUserProfile(null)
            setLoading(false)
            return
          }
          throw error
        }

        setUser(user)

        if (user) {
          // Fetch real user profile
          const profile = await getUserProfile(user.id)
          setUserProfile(profile)
        }

        setLoading(false)
      } catch (error) {
        logger.error('Error getting user', { error })
        // On any auth error, clear state gracefully
        setUser(null)
        setUserProfile(null)
        setLoading(false)
      }
    }

    getUser()

    // Listen for auth changes
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
    const subscription = result.data.subscription

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