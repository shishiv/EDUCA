import { type JsonRecord, type JsonValue } from '@/lib/validation/external-values'
// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  validateProcurementAssessment,
} from '@/lib/wayfinder/procurement-assessment'

// SAFETY: the fixture is parsed at this I/O boundary and its shape is validated by the called contract.
const assessment = JSON.parse(
  readFileSync(new URL('../../../../data/wayfinder/educa/procurement-assessment/assessment.json', import.meta.url), 'utf8'),
) as JsonValue

function cloneAssessment(): JsonRecord {
  return JSON.parse(JSON.stringify(assessment))
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
    // SAFETY: the fixture contract defines discoveryFields as mutable records for this deliberate break.
    const fields = broken.discoveryFields as Array<JsonRecord>
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
    // SAFETY: the fixture contract defines actors as mutable records for this deliberate break.
    const actors = broken.actors as Array<JsonRecord>
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
