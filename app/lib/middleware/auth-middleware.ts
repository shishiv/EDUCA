'use server'

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/types/database'
import { checkRouteAccess } from '@/lib/route-policy'
import { isPilotDisabledPath, isPilotModeEnabled } from '@/lib/pilot/pilot-scope'
import {
  demoSandboxGuardResponse,
  getDemoSandboxBlockedReason,
  isDemoSandboxHardBlockedPath,
  isDemoSandboxEnabled,
  isDemoSandboxPilotPathAllowed,
} from '@/lib/demo-sandbox/demo-sandbox'
import { isInvalidRefreshTokenError, isSupabaseAuthCookieName } from '@/lib/auth-session-recovery'

export { checkRouteAccess } from '@/lib/route-policy'

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
    // Validate the asymmetric JWT locally (JWKS is cached) instead of making
    // an Auth server round trip on every route transition.
    const { data, error } = await supabase.auth.getClaims()
    const userId = data?.claims?.sub

    if (error || !userId) {
      return { user: null, userProfile: null, invalidSession: isInvalidRefreshTokenError(error) }
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .eq('ativo', true)
      .single()

    return {
      user: { id: userId },
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

const isStaticOrApiPath = (pathname: string) =>
  pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.') || pathname.startsWith('/favicon.ico')

function pilotDisabledResponse(request: NextRequest, pathname: string) {
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'PILOT_SCOPE_DISABLED' }, { status: 404 })
  }
  const redirectUrl = request.nextUrl.clone()
  redirectUrl.pathname = '/dashboard'
  redirectUrl.searchParams.set('pilotScope', 'disabled')
  return NextResponse.redirect(redirectUrl)
}

function loginRedirect(request: NextRequest, pathname: string, reason?: string) {
  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = '/login'
  if (reason) loginUrl.searchParams.set('reason', reason)
  loginUrl.searchParams.set('returnUrl', pathname)
  return NextResponse.redirect(loginUrl)
}

export async function authMiddleware(request: NextRequest) {
  const { supabase, response } = await createSupabaseServerClient(request)
  const pathname = request.nextUrl.pathname

  const demoSandboxBlockReason = getDemoSandboxBlockedReason(pathname)
  if (isDemoSandboxHardBlockedPath(pathname)) {
    return demoSandboxGuardResponse(demoSandboxBlockReason ?? 'external_effect') ?? response
  }

  // The synthetic demo may expose a named product capability that the
  // narrower pilot hides. The allowlist is path-scoped: it never skips auth,
  // role checks, school isolation, RLS or audit in the route itself.
  if (
    isPilotModeEnabled() &&
    isPilotDisabledPath(pathname) &&
    !isDemoSandboxPilotPathAllowed(pathname) &&
    !(isDemoSandboxEnabled() && demoSandboxBlockReason && !pathname.startsWith('/api/'))
  ) {
    return pilotDisabledResponse(request, pathname)
  }

  // Skip middleware for static files and API routes
  if (isStaticOrApiPath(pathname)) {
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
      const invalidSessionRedirect = loginRedirect(request, pathname, 'session_expired')
      clearInvalidSupabaseCookies(request, invalidSessionRedirect)
      return invalidSessionRedirect
    }
    const userRole = serverUser?.userProfile?.tipo_usuario

    const { hasAccess, redirectTo } = checkRouteAccess(pathname, userRole)

    if (!hasAccess && redirectTo) {
      return redirectTo === '/login'
        ? loginRedirect(request, pathname)
        : NextResponse.redirect(new URL(redirectTo, request.url))
    }

    return response
  } catch (error) {
    // logger.error('Auth middleware error:', { error: error })
    return response
  }
}
