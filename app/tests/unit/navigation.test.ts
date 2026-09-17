import { describe, expect, it } from 'vitest'
import { getActiveNavigationItemId, getMobileNavigationForRole, getNavigationForRole, isNavigationItemActive } from '../../components/layout/navigation'
import { canAccessRoute, routeRoles } from '../../lib/route-policy'

describe('authenticated navigation', () => {
  it.each(routeRoles)('derives mobile destinations and icons from the authorized navigation for %s', role => {
    const available = getNavigationForRole(role).flatMap(group => group.items)
    const mobile = getMobileNavigationForRole(role)
    for (const item of mobile) {
      const canonical = available.find(candidate => candidate.id === item.id)
      expect(canonical).toBeDefined()
      expect(item.href).toBe(canonical?.href)
      expect(item.icon).toBe(canonical?.icon)
    }
  })

  it('preserves mobile order and hides ungranted report and student routes', () => {
    expect(getMobileNavigationForRole('admin').map(item => item.id))
      .toEqual(['dashboard', 'students', 'attendance', 'classDiary', 'reports'])
    expect(getMobileNavigationForRole('professor').map(item => item.id))
      .toEqual(['dashboard', 'attendance', 'classDiary'])
    expect(getMobileNavigationForRole('unrecognized')).toEqual([])
  })

  it('matches mobile nested routes without matching another route prefix', () => {
    const items = getMobileNavigationForRole('admin')
    expect(items.filter(item => isNavigationItemActive('/dashboard/turmas/turma-a/chamada', item)).map(item => item.id))
      .toEqual(['attendance'])
    expect(items.filter(item => isNavigationItemActive('/dashboard/alunos-arquivados', item)))
      .toEqual([])
  })

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
    expect(secretaryLinks).toContain('/dashboard/configuracoes')
    expect(professorLinks).not.toContain('/dashboard/alunos')
    expect(professorLinks).not.toContain('/dashboard/matriculas')
    expect(professorLinks).not.toContain('/dashboard/relatorios')
  })

  it.each(routeRoles)('keeps dormant calendar and feature-flag routes out of %s navigation', role => {
    const links = getNavigationForRole(role).flatMap(group => group.items).map(item => item.href)

    expect(links).not.toContain('/dashboard/calendario')
    expect(links).not.toContain('/dashboard/flags')
    expect(canAccessRoute('/dashboard/calendario', role)).toBe(false)
    expect(canAccessRoute('/dashboard/flags', role)).toBe(false)
  })

  it('shows settings to every role authorized for its route', () => {
    for (const role of ['admin', 'secretario', 'diretor']) {
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
