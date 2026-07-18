/**
 * Supabase Server Client for Next.js 15 App Router
 *
 * Creates server-side Supabase client using cookies for authentication.
 * Used in Server Actions, Route Handlers, and Server Components.
 *
 * Pattern: Uses @supabase/ssr with Next.js cookies() API
 * Security: Service role key for elevated permissions when needed
 */

import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

/**
 * Create Supabase client for Server Components and Server Actions
 *
 * Uses Next.js cookies() API for SSR authentication.
 * Automatically handles cookie-based session management.
 *
 * @returns Supabase client with authenticated user context
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            // Handle cookie setting errors in middleware/edge runtime
            // Cookies may not be settable in some contexts
          }
        },
      },
    }
  )
}

/**
 * Create Supabase admin client with service role key
 *
 * Use ONLY for operations requiring elevated permissions:
 * - User management (create, update, delete users)
 * - Bypassing RLS policies for admin operations
 * - System-level database operations
 *
 * WARNING: Service role bypasses ALL RLS policies.
 * Use with extreme caution and proper authorization checks.
 *
 * @returns Supabase client with admin privileges
 */
export async function createAdminClient() {
  const cookieStore = await cookies()

  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            // Ignore cookie errors in edge runtime
          }
        },
      },
    }
  )
}

/**
 * Get current authenticated user from server context
 *
 * Convenience function for Server Components and Server Actions.
 * Returns null if no user is authenticated.
 *
 * @returns User object or null
 */
export async function getCurrentUser() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

/**
 * Verify user has required role
 *
 * Used for authorization checks in Server Actions.
 * Queries users table to get tipo_usuario field.
 *
 * @param allowedRoles - Array of allowed user types
 * @returns boolean indicating if user has permission
 */
export async function verifyUserRole(
  allowedRoles: ('admin' | 'diretor' | 'secretario' | 'professor' | 'responsavel')[]
) {
  const user = await getCurrentUser()

  if (!user) {
    return false
  }

  const supabase = await createClient()

  const { data: userData, error } = await supabase
    .from('users')
    .select('tipo_usuario')
    .eq('id', user.id)
    .single()

  if (error || !userData) {
    return false
  }

  return allowedRoles.includes(userData.tipo_usuario as any)
}

// Type exports for convenience
export type { Database } from '@/types/database'
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']