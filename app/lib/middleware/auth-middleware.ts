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

function demoGuard(pathname: string): NextResponse | null {
  const demoSandboxBlockReason = getDemoSandboxBlockedReason(pathname)
  if (isDemoSandboxHardBlockedPath(pathname)) {
    return demoSandboxGuardResponse(demoSandboxBlockReason ?? 'external_effect')
  }
  return null
}

function pilotScopeGuard(request: NextRequest, pathname: string): NextResponse | null {
  const demoBlockReason = getDemoSandboxBlockedReason(pathname)
  const isDemoException = isDemoSandboxEnabled() && Boolean(demoBlockReason) && !pathname.startsWith('/api/')
  const isDisabled = isPilotModeEnabled() && isPilotDisabledPath(pathname)
  if (!isDisabled || isPilotDisabledPathAllowed(pathname, isDemoException)) return null
  return pilotDisabledResponse(request, pathname)
}

function isPilotDisabledPathAllowed(pathname: string, isDemoException: boolean): boolean {
  return isDemoSandboxPilotPathAllowed(pathname) || isDemoException
}

function invalidSessionResponse(request: NextRequest, pathname: string, response: NextResponse): NextResponse {
  if (pathname === '/login') {
    clearInvalidSupabaseCookies(request, response)
    return response
  }
  const redirect = loginRedirect(request, pathname, 'session_expired')
  clearInvalidSupabaseCookies(request, redirect)
  return redirect
}

function unavailableSessionResponse(request: NextRequest, pathname: string, response: NextResponse): NextResponse {
  const access = checkRouteAccess(pathname)
  if (access.hasAccess) return response
  return access.redirectTo === '/login'
    ? loginRedirect(request, pathname, 'session_unavailable')
    : NextResponse.redirect(new URL('/unauthorized', request.url))
}

type AuthMiddlewareRuntime = {
  initialize(request: NextRequest): Promise<{ response: NextResponse }>
  getServerUser(request: NextRequest): ReturnType<typeof getServerUser>
}

const productionAuthMiddlewareRuntime: AuthMiddlewareRuntime = {
  async initialize(request) {
    const { response } = await createSupabaseServerClient(request)
    return { response }
  },
  getServerUser,
}

/** Creates the request guard with an explicit runtime seam for deterministic security tests. */
export function createAuthMiddleware(runtime: AuthMiddlewareRuntime = productionAuthMiddlewareRuntime) {
  return async function runAuthMiddleware(request: NextRequest): Promise<NextResponse> {
    const { response } = await runtime.initialize(request)
    const pathname = request.nextUrl.pathname
    const responseFromDemo = demoGuard(pathname)
    if (responseFromDemo) return responseFromDemo
    const responseFromPilotScope = pilotScopeGuard(request, pathname)
    if (responseFromPilotScope) return responseFromPilotScope
    if (isStaticOrApiPath(pathname)) return response

    try {
      const serverUser = await runtime.getServerUser(request)
      if (serverUser.invalidSession) return invalidSessionResponse(request, pathname, response)
      const access = checkRouteAccess(pathname, serverUser.userProfile?.tipo_usuario)
      if (access.hasAccess || !access.redirectTo) return response
      return access.redirectTo === '/login'
        ? loginRedirect(request, pathname)
        : NextResponse.redirect(new URL(access.redirectTo, request.url))
    } catch {
      return unavailableSessionResponse(request, pathname, response)
    }
  }
}

export const authMiddleware = createAuthMiddleware()
