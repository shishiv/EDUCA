'use server'

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/types/database'
import { logger } from '@/lib/logger'

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
      return null
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
    }
  } catch (error) {
    // logger.error('Error getting server user:', { error: error })
    return null
  }
}

type UserRole = 'admin' | 'diretor' | 'secretario' | 'professor' | 'responsavel'

interface ProtectedRoute {
  prefix: string
  roles: UserRole[]
}

// Route protection configuration uses the real Portuguese application routes.
export const routeProtection = {
  public: ['/login', '/reset-password', '/politica-privacidade', '/offline', '/'],
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
  ] satisfies ProtectedRoute[],
  authenticated: ['/dashboard'],
}

const matchesRoute = (pathname: string, route: string) =>
  route === '/' ? pathname === '/' : pathname === route || pathname.startsWith(`${route}/`)

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