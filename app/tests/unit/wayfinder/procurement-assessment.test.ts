// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  validateProcurementAssessment,
} from '@/lib/wayfinder/procurement-assessment'

const assessment = JSON.parse(
  readFileSync(new URL('../../../../data/wayfinder/educa/procurement-assessment/assessment.json', import.meta.url), 'utf8'),
) as unknown

function cloneAssessment(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(assessment)) as Record<string, unknown>
}

describe('private procurement assessment contract', () => {
  it('accepts the synthetic fixture and exposes the G0 receipt counts', () => {
    const report = validateProcurementAssessment(assessment)

    expect(report).toMatchObject({
      valid: true,
      issueCount: 0,
      factCount: 4,
      discoveryFieldCount: 27,
      unknownFieldCount: 27,
      actorCount: 10,
      questionCount: 27,
      missingReceiptCount: 7,
      syntheticIdentityCount: 10,
      syntheticOnly: true,
      externalActions: false,
    })
  })

  it('rejects a deliberate break that removes mandatory source metadata', () => {
    const broken = cloneAssessment()
    const fields = broken.discoveryFields as Array<Record<string, unknown>>
    delete fields[0].source

    const report = validateProcurementAssessment(broken)

    expect(report.valid).toBe(false)
    expect(report.issues).toContainEqual(expect.objectContaining({
      code: 'discovery_unknown_value_required',
      path: 'discoveryFields[0].source',
    }))
  })

  it('rejects a deliberate break with an identity outside the synthetic boundary', () => {
    const broken = cloneAssessment()
    const actors = broken.actors as Array<Record<string, unknown>>
    actors[0] = { ...actors[0], identity: 'secretaria@not-allowed.example' }

    const report = validateProcurementAssessment(broken)

    expect(report.valid).toBe(false)
    expect(report.issues).toContainEqual(expect.objectContaining({
      code: 'real_identity_rejected',
      path: '$.actors[0].identity',
    }))
  })

  it('keeps assessment, synthetic rehearsal and municipal deployment distinct', () => {
    const serialized = JSON.stringify(assessment).toLowerCase()

    expect(serialized).not.toMatch(/\b(?:pilot|piloto)\b/)
    expect(serialized).toContain('procurement assessment')
    expect(serialized).toContain('rehearsal sintético')
    expect(serialized).toContain('não autorizado')
  })
})
