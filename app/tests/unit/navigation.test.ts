import { describe, expect, it } from 'vitest'
import { getActiveNavigationItemId, getNavigationForRole } from '../../components/layout/navigation'

describe('authenticated navigation', () => {
  it('does not expose admin-only destinations to secretary', () => {
    const names = getNavigationForRole('secretario')
      .flatMap(group => group.items)
      .map(item => item.id)

    expect(names).not.toContain('users')
    expect(names).not.toContain('schools')
    expect(names).toContain('students')
  })

  it('selects only one active item when classes and attendance share a route', () => {
    const groups = getNavigationForRole('diretor')
    expect(getActiveNavigationItemId('/dashboard/turmas', groups)).toBe('classes')
    expect(groups.flatMap(group => group.items).filter(item => item.id === getActiveNavigationItemId('/dashboard/turmas', groups))).toHaveLength(1)
  })
})
