import { describe, expect, it } from 'vitest'
import { PILOT_RECOVERY_TARGETS, PILOT_SUCCESS_TARGETS, PILOT_SUPPORT_TARGETS } from '@/lib/pilot/pilot-operations-config'

describe('pilot operations configuration', () => {
  it('matches confirmed support and success targets', () => {
    expect(PILOT_SUPPORT_TARGETS.critical.firstResponseBusinessHours).toBe(4)
    expect(PILOT_SUPPORT_TARGETS.normal.firstResponseBusinessDays).toBe(1)
    expect(PILOT_SUCCESS_TARGETS).toMatchObject({ weeklyActiveSchoolsPercent: 80, attendanceCapturePercent: 90, maximumCriticalDataOrAccessIncidents: 0, minimumSatisfactionScore: 4 })
    expect(PILOT_RECOVERY_TARGETS).toEqual({ rpoHours: 24, rtoHours: 4, cadence: 'daily' })
  })
})
