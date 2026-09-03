export const routeRoles = ['admin', 'diretor', 'secretario', 'professor', 'responsavel'] as const

export type RouteRole = typeof routeRoles[number]

export const dashboardRoles = ['admin', 'diretor', 'secretario', 'professor'] as const satisfies readonly RouteRole[]

type RouteMatcher = string | RegExp

interface RouteRule {
  matcher: RouteMatcher
  roles?: readonly RouteRole[]
  exact?: boolean
}

export interface RouteAccess {
  hasAccess: boolean
  redirectTo?: '/login' | '/unauthorized'
}

const publicRoutes: RouteRule[] = [
  { matcher: '/', exact: true },
  { matcher: '/login' },
  { matcher: '/primeiro-acesso' },
  { matcher: '/reset-password' },
  { matcher: '/politica-privacidade' },
  { matcher: '/demo' },
  { matcher: '/blog' },
  { matcher: '/offline' },
]

const protectedRoutes: RouteRule[] = [
  { matcher: '/dashboard/usuarios', roles: ['admin'] },
  { matcher: '/dashboard/escolas', roles: ['admin'] },
  { matcher: '/dashboard/flags', roles: ['admin'] },
  { matcher: '/dashboard/atribuicoes', roles: ['admin', 'diretor'] },
  { matcher: '/dashboard/configuracoes', roles: ['admin', 'diretor'] },
  { matcher: /^\/dashboard\/alunos\/[^/]+\/diario(?:\/.*)?$/, roles: dashboardRoles },
  { matcher: '/dashboard/alunos', roles: ['admin', 'diretor', 'secretario'] },
  { matcher: '/dashboard/turmas/nova', roles: ['admin', 'diretor', 'secretario'] },
  { matcher: /^\/dashboard\/turmas\/[^/]+\/editar$/, roles: ['admin', 'diretor', 'secretario'] },
  { matcher: '/dashboard/turmas', roles: dashboardRoles },
  { matcher: '/dashboard/matriculas', roles: ['admin', 'diretor', 'secretario'] },
  { matcher: '/dashboard/responsaveis', roles: ['admin', 'diretor', 'secretario'] },
  { matcher: '/dashboard/relatorios', roles: ['admin', 'diretor', 'secretario'] },
  { matcher: '/relatorios', roles: ['admin', 'diretor', 'secretario'] },
  { matcher: '/dashboard/notas', roles: dashboardRoles },
  { matcher: '/dashboard/diario', roles: dashboardRoles },
  { matcher: '/diario', roles: dashboardRoles },
  { matcher: '/dashboard/sessoes', roles: dashboardRoles },
  { matcher: '/dashboard/calendario', roles: dashboardRoles },
  { matcher: '/dashboard/perfil', roles: dashboardRoles },
  { matcher: '/dashboard', roles: dashboardRoles, exact: true },
]

const authenticatedRoutes: RouteRule[] = [{ matcher: '/unauthorized', exact: true }]

function matchesRoute(pathname: string, matcher: RouteMatcher, exact = false): boolean {
  if (matcher instanceof RegExp) return matcher.test(pathname)
  return exact ? pathname === matcher : pathname === matcher || pathname.startsWith(`${matcher}/`)
}

export function checkRouteAccess(pathname: string, userRole?: string | null): RouteAccess {
  if (publicRoutes.some(route => matchesRoute(pathname, route.matcher, route.exact))) return { hasAccess: true }
  if (!userRole) return { hasAccess: false, redirectTo: '/login' }

  const protectedRoute = protectedRoutes.find(route => matchesRoute(pathname, route.matcher, route.exact))
  if (protectedRoute) {
    return protectedRoute.roles?.includes(userRole as RouteRole)
      ? { hasAccess: true }
      : { hasAccess: false, redirectTo: '/unauthorized' }
  }

  if (authenticatedRoutes.some(route => matchesRoute(pathname, route.matcher, route.exact))) {
    return { hasAccess: true }
  }

  return { hasAccess: false, redirectTo: '/unauthorized' }
}

export function canAccessRoute(pathname: string, userRole?: string | null): boolean {
  return checkRouteAccess(pathname, userRole).hasAccess
}
