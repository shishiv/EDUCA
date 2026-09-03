'use server'

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/types/database'
import { logger } from '@/lib/logger'
import { isPilotDisabledPath, isPilotModeEnabled } from '@/lib/pilot/pilot-scope'
import {
  demoSandboxGuardResponse,
  getDemoSandboxBlockedReason,
  isDemoSandboxHardBlockedPath,
  isDemoSandboxEnabled,
  isDemoSandboxPilotPathAllowed,
} from '@/lib/demo-sandbox/demo-sandbox'
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

// gestor_sme: deferred per pilot decision E1=B; add here when the pilot expands.
// The database keeps gestor_sme as a valid role, but this interface must not
// name a role it does not enforce, and must not map English names onto
// Portuguese tipo_usuario values. gestor_sme users are denied on protected
// routes until the deferral is lifted.
type UserRole = 'admin' | 'diretor' | 'secretario' | 'professor' | 'responsavel'

interface ProtectedRoute {
  prefix: string
  roles: UserRole[]
}

// Route protection configuration uses the real Portuguese application routes.
export const routeProtection = {
  public: ['/login', '/primeiro-acesso', '/reset-password', '/politica-privacidade', '/demo', '/blog', '/offline', '/'],
  protected: [
    // Admin-only system management
    { prefix: '/dashboard/usuarios', roles: ['admin'] },
    { prefix: '/dashboard/escolas', roles: ['admin'] },
    { prefix: '/dashboard/flags', roles: ['admin'] },

    // Municipal and school management
    { prefix: '/dashboard/atribuicoes', roles: ['admin', 'diretor'] },
    { prefix: '/dashboard/configuracoes', roles: ['admin', 'diretor'] },
    { prefix: '/dashboard/alunos', roles: ['admin', 'diretor', 'secretario'] },
    { prefix: '/dashboard/turmas/nova', roles: ['admin', 'diretor', 'secretario'] },
    { prefix: '/dashboard/turmas', roles: ['admin', 'diretor', 'secretario', 'professor'] },
    { prefix: '/dashboard/matriculas', roles: ['admin', 'diretor', 'secretario'] },
    { prefix: '/dashboard/responsaveis', roles: ['admin', 'diretor', 'secretario'] },
    { prefix: '/dashboard/relatorios', roles: ['admin', 'diretor', 'secretario'] },
    { prefix: '/relatorios', roles: ['admin', 'diretor', 'secretario'] },

    // Academic operations
    { prefix: '/dashboard/notas', roles: ['admin', 'diretor', 'secretario', 'professor'] },
    { prefix: '/dashboard/diario', roles: ['admin', 'diretor', 'secretario', 'professor'] },
    { prefix: '/diario', roles: ['admin', 'diretor', 'secretario', 'professor'] },
    { prefix: '/dashboard/sessoes', roles: ['admin', 'diretor', 'secretario', 'professor'] },
  ] satisfies ProtectedRoute[],
  authenticated: ['/dashboard'],
}

const matchesRoute = (pathname: string, route: string) =>
  route === '/' ? pathname === '/' : pathname === route || pathname.startsWith(`${route}/`)

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

export function checkRouteAccess(
  pathname: string,
  userRole?: string
): { hasAccess: boolean; redirectTo?: string } {
  if (routeProtection.public.some(route => matchesRoute(pathname, route))) {
    return { hasAccess: true }
  }

  if (!userRole) {
    return { hasAccess: false, redirectTo: '/login' }
  }

  const classEditRoute: ProtectedRoute | undefined =
    /^\/dashboard\/turmas\/[^/]+\/editar$/.test(pathname)
      ? { prefix: pathname, roles: ['admin', 'diretor', 'secretario'] }
      : undefined
  const protectedRoute = classEditRoute || routeProtection.protected.find(route =>
    matchesRoute(pathname, route.prefix)
  )
  if (protectedRoute && !(protectedRoute.roles as UserRole[]).includes(userRole as UserRole)) {
    return { hasAccess: false, redirectTo: '/unauthorized' }
  }

  if (routeProtection.authenticated.some(route => matchesRoute(pathname, route))) {
    return { hasAccess: true }
  }

  // Authenticated users may access public-adjacent routes unless explicitly restricted.
  return { hasAccess: true }
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
