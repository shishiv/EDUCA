import { describe, expect, it } from 'vitest'
import { checkRouteAccess } from '../../lib/middleware/auth-middleware'
import { routeRoles, type RouteRole } from '../../lib/route-policy'

const routePolicy: Array<{ pathname: string; roles: RouteRole[] }> = [
  { pathname: '/dashboard/usuarios/example', roles: ['admin'] },
  { pathname: '/dashboard/escolas/example', roles: ['admin'] },
  { pathname: '/dashboard/flags', roles: ['admin'] },
  { pathname: '/dashboard/atribuicoes', roles: ['admin', 'diretor'] },
  { pathname: '/dashboard/configuracoes', roles: ['admin', 'diretor'] },
  { pathname: '/dashboard/alunos/example/diario/novo', roles: ['admin', 'diretor', 'secretario', 'professor'] },
  { pathname: '/dashboard/alunos/example', roles: ['admin', 'diretor', 'secretario'] },
  { pathname: '/dashboard/turmas/nova', roles: ['admin', 'diretor', 'secretario'] },
  { pathname: '/dashboard/turmas/example/editar', roles: ['admin', 'diretor', 'secretario'] },
  { pathname: '/dashboard/turmas/example/chamada', roles: ['admin', 'diretor', 'secretario', 'professor'] },
  { pathname: '/dashboard/matriculas/example', roles: ['admin', 'diretor', 'secretario'] },
  { pathname: '/dashboard/responsaveis/example', roles: ['admin', 'diretor', 'secretario'] },
  { pathname: '/dashboard/relatorios', roles: ['admin', 'diretor', 'secretario'] },
  { pathname: '/relatorios/frequencia', roles: ['admin', 'diretor', 'secretario'] },
  { pathname: '/dashboard/notas', roles: ['admin', 'diretor', 'secretario', 'professor'] },
  { pathname: '/dashboard/diario', roles: ['admin', 'diretor', 'secretario', 'professor'] },
  { pathname: '/diario/relatorios/example', roles: ['admin', 'diretor', 'secretario', 'professor'] },
  { pathname: '/dashboard/sessoes', roles: ['admin', 'diretor', 'secretario', 'professor'] },
  { pathname: '/dashboard/calendario', roles: ['admin', 'diretor', 'secretario', 'professor'] },
  { pathname: '/dashboard/perfil', roles: ['admin', 'diretor', 'secretario', 'professor'] },
  { pathname: '/dashboard', roles: ['admin', 'diretor', 'secretario', 'professor'] },
]

describe('route policy', () => {
  it.each(['/', '/login', '/primeiro-acesso', '/reset-password', '/politica-privacidade', '/demo', '/blog', '/blog/lgpd-em-escola-municipal', '/offline'])(
    'keeps %s public',
    pathname => expect(checkRouteAccess(pathname)).toEqual({ hasAccess: true })
  )

  it.each(routePolicy)('allows only declared roles for $pathname', ({ pathname, roles }) => {
    for (const role of routeRoles) {
      expect(checkRouteAccess(pathname, role).hasAccess).toBe(roles.includes(role))
    }
    expect(checkRouteAccess(pathname)).toEqual({ hasAccess: false, redirectTo: '/login' })
    expect(checkRouteAccess(pathname, 'gestor_sme')).toEqual({ hasAccess: false, redirectTo: '/unauthorized' })
    expect(checkRouteAccess(pathname, 'unknown_role')).toEqual({ hasAccess: false, redirectTo: '/unauthorized' })
  })

  it('keeps authenticated common and unknown paths fail-closed', () => {
    expect(checkRouteAccess('/unauthorized', 'unknown_role')).toEqual({ hasAccess: true })
    expect(checkRouteAccess('/unauthorized')).toEqual({ hasAccess: false, redirectTo: '/login' })
    expect(checkRouteAccess('/dashboard/future', 'admin')).toEqual({ hasAccess: false, redirectTo: '/unauthorized' })
    expect(checkRouteAccess('/dashboard/future')).toEqual({ hasAccess: false, redirectTo: '/login' })
  })
})
