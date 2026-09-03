import { describe, expect, it } from 'vitest'
import { getActiveNavigationItemId, getNavigationForRole } from '../../components/layout/navigation'
import { canAccessRoute, routeRoles } from '../../lib/route-policy'

describe('authenticated navigation', () => {
  it('does not expose admin-only destinations to secretary', () => {
    const names = getNavigationForRole('secretario')
      .flatMap(group => group.items)
      .map(item => item.id)

    expect(names).not.toContain('users')
    expect(names).not.toContain('schools')
    expect(names).toContain('students')
  })

  it.each(routeRoles)('only exposes routes %s can open', role => {
    const items = getNavigationForRole(role).flatMap(group => group.items)

    for (const item of items) {
      expect(canAccessRoute(item.href, role)).toBe(true)
    }
  })

  it('keeps denied routes out of secretary and professor navigation', () => {
    const secretaryLinks = getNavigationForRole('secretario').flatMap(group => group.items).map(item => item.href)
    const professorLinks = getNavigationForRole('professor').flatMap(group => group.items).map(item => item.href)

    expect(secretaryLinks).not.toContain('/dashboard/usuarios')
    expect(secretaryLinks).not.toContain('/dashboard/escolas')
    expect(secretaryLinks).not.toContain('/dashboard/configuracoes')
    expect(professorLinks).not.toContain('/dashboard/alunos')
    expect(professorLinks).not.toContain('/dashboard/matriculas')
    expect(professorLinks).not.toContain('/dashboard/relatorios')
  })

  it('shows settings to both roles authorized for its route', () => {
    for (const role of ['admin', 'diretor']) {
      const links = getNavigationForRole(role).flatMap(group => group.items).map(item => item.href)
      expect(links).toContain('/dashboard/configuracoes')
    }
  })

  it('selects only one active item when classes and attendance share a route', () => {
    const groups = getNavigationForRole('diretor')
    expect(getActiveNavigationItemId('/dashboard/turmas', groups)).toBe('classes')
    expect(groups.flatMap(group => group.items).filter(item => item.id === getActiveNavigationItemId('/dashboard/turmas', groups))).toHaveLength(1)
  })
})
