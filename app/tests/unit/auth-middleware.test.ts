import { describe, expect, it } from 'vitest'
import { checkRouteAccess } from '../../lib/middleware/auth-middleware'

describe('checkRouteAccess', () => {
  it('matches root exactly instead of making every slash-prefixed route public', () => {
    expect(checkRouteAccess('/').hasAccess).toBe(true)
    expect(checkRouteAccess('/dashboard')).toEqual({
      hasAccess: false,
      redirectTo: '/login',
    })
  })

  it.each(['/login', '/reset-password', '/politica-privacidade', '/offline'])(
    'keeps %s public',
    route => expect(checkRouteAccess(route).hasAccess).toBe(true)
  )

  it('limits global management routes to admin', () => {
    expect(checkRouteAccess('/dashboard/usuarios', 'admin').hasAccess).toBe(true)
    expect(checkRouteAccess('/dashboard/usuarios', 'diretor')).toEqual({
      hasAccess: false,
      redirectTo: '/unauthorized',
    })
  })

  it('allows director settings but denies secretary settings', () => {
    expect(checkRouteAccess('/dashboard/configuracoes', 'diretor').hasAccess).toBe(true)
    expect(checkRouteAccess('/dashboard/configuracoes', 'secretario')).toEqual({
      hasAccess: false,
      redirectTo: '/unauthorized',
    })
  })

  it('allows professor academic routes but denies cadastro management', () => {
    expect(checkRouteAccess('/diario/frequencia', 'professor').hasAccess).toBe(true)
    expect(checkRouteAccess('/dashboard/alunos/novo', 'professor')).toEqual({
      hasAccess: false,
      redirectTo: '/unauthorized',
    })
  })

  it('denies professor class creation and editing', () => {
    expect(checkRouteAccess('/dashboard/turmas/nova', 'professor').hasAccess).toBe(false)
    expect(checkRouteAccess('/dashboard/turmas/fixture/editar', 'professor').hasAccess).toBe(false)
    expect(checkRouteAccess('/dashboard/turmas/fixture', 'professor').hasAccess).toBe(true)
  })

  it('keeps responsavel outside school administration', () => {
    expect(checkRouteAccess('/dashboard/alunos', 'responsavel')).toEqual({
      hasAccess: false,
      redirectTo: '/unauthorized',
    })
  })
})
