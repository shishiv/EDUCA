// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  assertPilotDescriptiveReportDemoSafety,
  isPilotDescriptiveReportDemoEnabled,
} from '@/lib/pilot/descriptive-report-demo-safety'

const safeEnvironment = {
  pilotMode: 'true',
  syntheticOnly: 'true',
  externalDeployApproved: 'false',
  legalApprovalStatus: 'not_approved',
  supabaseUrl: 'http://127.0.0.1:54321',
  descriptiveReportDemo: 'true',
} as const

describe('bounded descriptive-report demo safety', () => {
  it('accepts only an explicit local synthetic rehearsal', () => {
    expect(() => assertPilotDescriptiveReportDemoSafety(safeEnvironment)).not.toThrow()
    expect(isPilotDescriptiveReportDemoEnabled(safeEnvironment)).toBe(true)
  })

  it('rejects a missing descriptive-report rehearsal flag', () => {
    const disabled = { ...safeEnvironment, descriptiveReportDemo: 'false' }
    expect(() => assertPilotDescriptiveReportDemoSafety(disabled)).toThrow(
      /PILOT_DESCRIPTIVE_REPORT_DEMO_DISABLED/
    )
    expect(isPilotDescriptiveReportDemoEnabled(disabled)).toBe(false)
  })

  it('keeps the descriptive-report rehearsal local even when explicitly enabled', () => {
    const external = { ...safeEnvironment, supabaseUrl: 'https://example.supabase.co' }
    expect(() => assertPilotDescriptiveReportDemoSafety(external)).toThrow(/only local/)
    expect(isPilotDescriptiveReportDemoEnabled(external)).toBe(false)
  })
})
