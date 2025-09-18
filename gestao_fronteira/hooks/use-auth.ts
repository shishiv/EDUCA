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
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          // Fetch real user profile
          // console.log('Fetching profile for user:', user.id)
          const profile = await getUserProfile(user.id)
          // console.log('Profile loaded:', profile)
          setUserProfile(profile)
        } else {
          // console.log('No authenticated user found')
        }

        setLoading(false)
        // console.log('Auth loading complete')
      } catch (error) {
        // console.error('Error getting user:', error)
        setLoading(false)
      }
    }

    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)

        if (session?.user) {
          try {
            // Fetch real user profile
            const profile = await getUserProfile(session.user.id)
            setUserProfile(profile)
          } catch (error) {
            // console.error('Error fetching user profile:', error)
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

    return () => subscription.unsubscribe()
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