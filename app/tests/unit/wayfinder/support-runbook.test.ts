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

  it('rejects correlation, surface and critical-reason breaks', () => {
    const correlationBroken = cloneRunbook()
    const incident = recordAt(correlationBroken.incident, '$.incident')
    recordAt(incident.correlation, '$.incident.correlation').key = 'SYN-CORR-002'

    expect(validateSupportRunbook(correlationBroken).issues).toContainEqual(expect.objectContaining({
      code: 'correlation_key_mismatch',
      path: 'incident.correlation.key',
    }))

    const classificationBroken = cloneRunbook()
    const classificationIncident = recordAt(classificationBroken.incident, '$.incident')
    classificationIncident.surfaces = []
    classificationIncident.severityReason = 'synthetic observation'

    expect(validateSupportRunbook(classificationBroken).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'incident_surface_missing', path: 'incident.surfaces' }),
      expect.objectContaining({ code: 'critical_reason_missing', path: 'incident.severityReason' }),
    ]))
  })

  it('rejects scope, escalation and rollback breaks', () => {
    const broken = cloneRunbook()
    const incident = recordAt(broken.incident, '$.incident')
    const scope = recordAt(incident.scope, '$.incident.scope')
    const escalation = recordAt(incident.escalation, '$.incident.escalation')
    const rollback = recordAt(incident.rollback, '$.incident.rollback')
    scope.confirmed = true
    scope.scopeReceiptReference = 'receipt-plain-scope-001'
    escalation.destination = 'a confirmar'
    escalation.actions = []
    escalation.notPromised = false
    rollback.available = false
    rollback.mode = 'remote fixture'
    rollback.deploymentUsed = true

    expect(validateSupportRunbook(broken).issues).toEqual([
      { code: 'scope_must_remain_unconfirmed', path: 'incident.scope.confirmed', detail: 'synthetic scope must remain unconfirmed' },
      { code: 'redacted_receipt_reference_required', path: 'incident.scope.scopeReceiptReference', detail: 'reference must use the redacted receipt namespace' },
      { code: 'escalation_binding_invalid', path: 'incident.escalation.destination', detail: 'escalation binding must remain a T12 placeholder' },
      { code: 'escalation_actions_required', path: 'incident.escalation.actions', detail: 'escalation actions are required' },
      { code: 'escalation_promise_forbidden', path: 'incident.escalation.notPromised', detail: 'escalation must not be a promise' },
      { code: 'rollback_required', path: 'incident.rollback.available', detail: 'rollback must be available for rehearsal' },
      { code: 'rollback_scope_invalid', path: 'incident.rollback.mode', detail: 'rollback must stay local to the fixture' },
      { code: 'rollback_external_action_forbidden', path: 'incident.rollback.deploymentUsed', detail: 'rollback cannot use deployment or real data' },
    ])
  })

  it('rejects closure state, checks and owner-confirmation breaks', () => {
    const broken = cloneRunbook()
    const closure = recordAt(recordAt(broken.incident, '$.incident').closure, '$.incident.closure')
    closure.state = 'closed in production'
    closure.productionState = 'completed'
    closure.checks = []
    closure.ownerConfirmation = 'confirmed'

    expect(validateSupportRunbook(broken).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'closure_state_invalid', path: 'incident.closure.state' }),
      expect.objectContaining({ code: 'production_closure_gate_missing', path: 'incident.closure.productionState' }),
      expect.objectContaining({ code: 'closure_check_missing', path: 'incident.closure.checks' }),
      expect.objectContaining({ code: 'closure_owner_gate_invalid', path: 'incident.closure.ownerConfirmation' }),
    ]))
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
