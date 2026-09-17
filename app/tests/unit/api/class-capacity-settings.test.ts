import { describe, expect, it } from 'vitest'
import { resolveClassDefaultCapacity } from '@/lib/api/class-capacity-settings'

describe('class capacity settings', () => {
  it('prefers an active school override over the municipal default', () => {
    expect(resolveClassDefaultCapacity(
      { escola_id: '00000000-0000-0000-0000-000000000001', valor: '18' },
      { escola_id: null, valor: '25' },
    )).toBe(18)
  })

  it('falls back to the persisted municipal default', () => {
    expect(resolveClassDefaultCapacity(null, { escola_id: null, valor: '25' })).toBe(25)
  })

  it('rejects a missing or out-of-range persisted value', () => {
    expect(() => resolveClassDefaultCapacity(null, null)).toThrow('CLASS_CAPACITY_CONFIG_INVALID')
    expect(() => resolveClassDefaultCapacity(null, { escola_id: null, valor: '51' }))
      .toThrow('CLASS_CAPACITY_CONFIG_INVALID')
  })
})
