'use server'

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/types/database'
import { logger } from '@/lib/logger'
import { isPilotDisabledPath, isPilotModeEnabled } from '@/lib/pilot/pilot-scope'
import { isDemoSandboxBlockedApiPath, demoSandboxGuardResponse } from '@/lib/demo-sandbox/demo-sandbox'
import { isInvalidRefreshTokenError, isSupabaseAuthCookieName } from '@/lib/auth-session-recovery'

export async function createSupabaseServerClient(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
      auth: {
        // CRITICAL: Disable auto-refresh in Edge Runtime to prevent fetch errors
        autoRefreshToken: false,
        persistSession: true,
        detectSessionInUrl: false,
      },
    }
  )

  return { supabase, response }
}

export async function getServerUser(request: NextRequest) {
  const { supabase } = await createSupabaseServerClient(request)

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return { user: null, userProfile: null, invalidSession: isInvalidRefreshTokenError(error) }
    }

    // Try to get user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .eq('ativo', true)
      .single()

    return {
      user,
      userProfile: userProfile || null,
      invalidSession: false,
    }
  } catch (error) {
    return { user: null, userProfile: null, invalidSession: isInvalidRefreshTokenError(error) }
  }
}

function clearInvalidSupabaseCookies(request: NextRequest, response: NextResponse) {
  for (const cookie of request.cookies.getAll()) {
    if (isSupabaseAuthCookieName(cookie.name)) {
      response.cookies.set(cookie.name, '', { path: '/', maxAge: 0, expires: new Date(0) })
    }
  }
}

// Route protection configuration
export const routeProtection = {
  // Public routes (no authentication required)
  public: ['/login', '/primeiro-acesso', '/'],

  // Role-based protected routes
  protected: {
    // Admin only routes
    admin: [
      '/admin',
      '/admin/users',
      '/admin/schools',
      '/admin/system',
    ],

    // Director and admin routes
    director: [
      '/dashboard/school-management',
      '/dashboard/teachers',
      '/dashboard/reports/school',
    ],

    // Secretary, director and admin routes
    secretary: [
      '/dashboard/students',
      '/dashboard/enrollment',
      '/dashboard/reports/student',
    ],

    // Teacher routes (includes professor access)
    teacher: [
      '/dashboard/classes',
      '/dashboard/attendance',
      '/dashboard/grades',
      '/dashboard/diary',
    ],

    // Parent/Guardian routes
    parent: [
      '/dashboard/children',
      '/dashboard/attendance/view',
      '/dashboard/grades/view',
    ],
  },

  // General authenticated routes (any logged in user)
  authenticated: [
    '/dashboard',
    '/profile',
    '/settings',
  ],
}

export function checkRouteAccess(
  pathname: string,
  userRole?: string
): { hasAccess: boolean; redirectTo?: string } {
  // Public routes are always accessible
  if (routeProtection.public.some(route => route === '/' ? pathname === '/' : pathname.startsWith(route))) {
    return { hasAccess: true }
  }

  // If no user role, redirect to login
  if (!userRole) {
    return { hasAccess: false, redirectTo: '/login' }
  }

  // Check role-based access
  for (const [role, routes] of Object.entries(routeProtection.protected)) {
    if (routes.some(route => pathname.startsWith(route))) {
      // Check if user has required role or higher privilege
      const hasRequiredRole = checkRoleHierarchy(userRole, role)

      if (!hasRequiredRole) {
        return { hasAccess: false, redirectTo: '/unauthorized' }
      }
    }
  }

  // Check general authenticated routes
  if (routeProtection.authenticated.some(route => pathname.startsWith(route))) {
    return { hasAccess: true }
  }

  // Default: allow access for logged in users
  return { hasAccess: true }
}

// Role hierarchy check - higher roles can access lower role routes
function checkRoleHierarchy(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = {
    responsavel: 1,
    professor: 2,
    secretario: 3,
    diretor: 4,
    admin: 5,
  }

  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0

  return userLevel >= requiredLevel
}

export async function authMiddleware(request: NextRequest) {
  const { supabase, response } = await createSupabaseServerClient(request)
  const pathname = request.nextUrl.pathname

  if (isPilotModeEnabled() && isPilotDisabledPath(pathname)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'PILOT_SCOPE_DISABLED' }, { status: 404 })
    }
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    redirectUrl.searchParams.set('pilotScope', 'disabled')
    return NextResponse.redirect(redirectUrl)
  }

  // Public demo sandbox: block admin data-management APIs wholesale so no
  // visitor can import data, invite users, or approve imports (issue #23).
  // Core demo flows remain available; the weekly reset restores the dataset.
  if (pathname.startsWith('/api') && isDemoSandboxBlockedApiPath(pathname)) {
    return demoSandboxGuardResponse() ?? response
  }

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return response
  }

  try {
    // NOTE: Session validation is done via cookies, not network calls
    // The client-side code (hooks/use-auth.ts) handles token refresh
    // Middleware only validates existing session from cookies
    const serverUser = await getServerUser(request)
    if (serverUser.invalidSession) {
      if (pathname === '/login') {
        clearInvalidSupabaseCookies(request, response)
        return response
      }
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('reason', 'session_expired')
      loginUrl.searchParams.set('returnUrl', pathname)
      const invalidSessionRedirect = NextResponse.redirect(loginUrl)
      clearInvalidSupabaseCookies(request, invalidSessionRedirect)
      return invalidSessionRedirect
    }
    const userRole = serverUser?.userProfile?.tipo_usuario

    const { hasAccess, redirectTo } = checkRouteAccess(pathname, userRole)

    if (!hasAccess && redirectTo) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = redirectTo

      // Add return URL for login redirect
      if (redirectTo === '/login') {
        redirectUrl.searchParams.set('returnUrl', pathname)
      }

      return NextResponse.redirect(redirectUrl)
    }

    return response
  } catch (error) {
    // logger.error('Auth middleware error:', { error: error })
    return response
  }
}
