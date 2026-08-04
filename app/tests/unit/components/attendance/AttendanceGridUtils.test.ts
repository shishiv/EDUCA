import { afterEach, describe, expect, it, vi } from 'vitest'
import { format } from 'date-fns'
import { getTodaySaoPauloDate } from '@/lib/date-utils'

describe('attendance calendar date', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses the São Paulo calendar date before UTC midnight rolls over', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-04T00:30:00.000Z'))

    expect(format(getTodaySaoPauloDate(), 'yyyy-MM-dd')).toBe('2026-08-03')
  })
})
