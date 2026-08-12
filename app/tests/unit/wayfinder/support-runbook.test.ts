// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  SUPPORT_RUNBOOK_HUMAN_GATE,
  SUPPORT_RUNBOOK_REQUIRED_SURFACES,
  validateSupportRunbook,
} from '@/lib/wayfinder/support-runbook'

const runbook = JSON.parse(
  readFileSync(new URL('../../../../data/wayfinder/educa/support-runbook/runbook.json', import.meta.url), 'utf8'),
) as unknown

function cloneRunbook(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(runbook)) as Record<string, unknown>
}

function recordAt(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${path} must be an object`)
  }
  return value as Record<string, unknown>
}

describe('synthetic support runbook contract', () => {
  it('accepts the local redacted fixture and exposes the rehearsal receipt counts', () => {
    const report = validateSupportRunbook(runbook)

    expect(report).toMatchObject({
      valid: true,
      issueCount: 0,
      supportScopeCount: SUPPORT_RUNBOOK_REQUIRED_SURFACES.length,
      exclusionCount: 5,
      incidentCount: 1,
      criticalIncidentCount: 1,
      ownerPlaceholderCount: 6,
      receiptCount: 5,
      closureCheckCount: 5,
      syntheticOnly: true,
      externalActions: false,
      promisesDetected: false,
    })
  })

  it('rejects a deliberate break that removes the T12 owner placeholder', () => {
    const broken = cloneRunbook()
    const binding = recordAt(broken.humanBinding, '$.humanBinding')
    delete binding.owner

    const report = validateSupportRunbook(broken)

    expect(report.valid).toBe(false)
    expect(report.issues).toContainEqual(expect.objectContaining({
      code: 'placeholder_required',
      path: 'humanBinding.owner',
    }))
  })

  it('rejects a deliberate break that removes incident severity', () => {
    const broken = cloneRunbook()
    const incident = recordAt(broken.incident, '$.incident')
    delete incident.severity

    const report = validateSupportRunbook(broken)

    expect(report.valid).toBe(false)
    expect(report.issues).toContainEqual(expect.objectContaining({
      path: 'incident.severity',
    }))
  })

  it('rejects a deliberate break that adds a raw-content field', () => {
    const broken = cloneRunbook()
    const incident = recordAt(broken.incident, '$.incident')
    incident.rawContent = '[REDACTED]'

    const report = validateSupportRunbook(broken)

    expect(report.valid).toBe(false)
    expect(report.issues).toContainEqual(expect.objectContaining({
      code: 'forbidden_field_rejected',
      path: '$.incident.rawContent',
    }))
  })

  it('keeps classification, T12 binding, redaction and local-only rehearsal explicit', () => {
    const serialized = JSON.stringify(runbook).toLowerCase()

    expect(serialized).toContain('blocked chamada')
    expect(serialized).toContain('possible cross-school access')
    expect(serialized).toContain('loss or alteration of attendance')
    expect(serialized).toContain('data containment')
    expect(serialized).toContain('questions')
    expect(serialized).toContain('visual improvements')
    expect(serialized).toContain('feature requests')
    expect(serialized).toContain(SUPPORT_RUNBOOK_HUMAN_GATE.toLowerCase())
    expect(serialized).toContain('local redacted')
    expect(serialized).not.toMatch(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i)
    expect(serialized).not.toMatch(/\b\d{11}\b/)
  })
})
