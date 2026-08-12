export const PROCUREMENT_ASSESSMENT_SCHEMA = 'educa.procurement-assessment/v1'
export const PROCUREMENT_ASSESSMENT_UNKNOWN = 'a confirmar'
export const PROCUREMENT_ASSESSMENT_GATE = 'G0'

/** Required discovery fields for the private procurement assessment. */
export const PROCUREMENT_ASSESSMENT_REQUIRED_FIELDS = [
  'attendance_problem',
  'current_process',
  'existing_system',
  'candidate_school',
  'school_responsible',
  'secretariat_responsible',
  'institutional_actors',
  'opportunity_owner',
  'procurement_owner',
  'budget',
  'fiscal_calendar',
  'procurement_instrument',
  'terms_of_reference',
  'hosting',
  'security',
  'data_scope',
  'legal_basis',
  'retention',
  'exit',
  'acceptance',
  'payment',
  'price',
  'sla',
  'contract',
  'renewal',
  'expansion',
  'support',
] as const

/** Required institutional roles for the private procurement assessment. */
export const PROCUREMENT_ASSESSMENT_REQUIRED_ACTORS = [
  'secretariat',
  'school_direction',
  'school_contact',
  'teacher',
  'opportunity_owner',
  'procurement',
  'budget',
  'it_security',
  'data_protection',
  'operations',
] as const

/** Required missing receipts before the G0 discovery gate can advance. */
export const PROCUREMENT_ASSESSMENT_REQUIRED_RECEIPTS = [
  'g0-recipient-authorization',
  'g0-attendance-and-school',
  'g0-actor-map',
  'g0-procurement',
  'g0-security-and-data',
  'g0-commercial-terms',
  'g0-human-review',
] as const

interface ProcurementAssessmentRecord {
  [key: string]: unknown
}

/** A precise validation issue for a procurement assessment receipt. */
export interface ProcurementAssessmentValidationIssue {
  code: string
  path: string
  detail: string
}

/** A bounded validation receipt that never echoes assessment contents. */
export interface ProcurementAssessmentValidationReport {
  valid: boolean
  issueCount: number
  issues: ProcurementAssessmentValidationIssue[]
  factCount: number
  discoveryFieldCount: number
  unknownFieldCount: number
  actorCount: number
  questionCount: number
  missingReceiptCount: number
  syntheticIdentityCount: number
  syntheticOnly: boolean
  externalActions: boolean
}

function isRecord(value: unknown): value is ProcurementAssessmentRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function addIssue(
  issues: ProcurementAssessmentValidationIssue[],
  code: string,
  path: string,
  detail: string,
): void {
  issues.push({ code, path, detail })
}

function requireRecord(
  value: unknown,
  path: string,
  issues: ProcurementAssessmentValidationIssue[],
): ProcurementAssessmentRecord | undefined {
  if (!isRecord(value)) {
    addIssue(issues, 'record_required', path, 'record is required')
    return undefined
  }
  return value
}

function requireString(
  record: ProcurementAssessmentRecord,
  key: string,
  path: string,
  issues: ProcurementAssessmentValidationIssue[],
): string | undefined {
  const value = record[key]
  if (typeof value !== 'string' || value.trim() === '') {
    addIssue(issues, 'string_required', `${path}.${key}`, 'non-empty string is required')
    return undefined
  }
  return value
}

function readRecords(
  value: unknown,
  path: string,
  issues: ProcurementAssessmentValidationIssue[],
): ProcurementAssessmentRecord[] {
  if (!Array.isArray(value)) {
    addIssue(issues, 'array_required', path, 'array is required')
    return []
  }

  return value.flatMap((item, index) => {
    const record = requireRecord(item, `${path}[${index}]`, issues)
    return record ? [record] : []
  })
}

function checkUnknownFieldMetadata(
  field: ProcurementAssessmentRecord,
  path: string,
  issues: ProcurementAssessmentValidationIssue[],
): void {
  if (field.state !== 'unknown') {
    addIssue(issues, 'discovery_field_must_be_unknown', `${path}.state`, 'discovery fields must start as unknown')
  }

  for (const key of ['value', 'evidence', 'source', 'sourceDate', 'uncertainty', 'confirmingActor']) {
    if (field[key] !== PROCUREMENT_ASSESSMENT_UNKNOWN) {
      addIssue(
        issues,
        'discovery_unknown_value_required',
        `${path}.${key}`,
        `unknown discovery values must be exactly ${PROCUREMENT_ASSESSMENT_UNKNOWN}`,
      )
    }
  }

  if (field.nextGate !== PROCUREMENT_ASSESSMENT_GATE) {
    addIssue(issues, 'discovery_next_gate_required', `${path}.nextGate`, `next gate must be ${PROCUREMENT_ASSESSMENT_GATE}`)
  }
}

function checkFactReceipts(
  facts: ProcurementAssessmentRecord[],
  issues: ProcurementAssessmentValidationIssue[],
): void {
  if (facts.length === 0) {
    addIssue(issues, 'facts_required', 'facts', 'at least one scoped fact is required')
  }

  facts.forEach((fact, index) => {
    const path = `facts[${index}]`
    for (const key of ['id', 'statement', 'source', 'sourceDate', 'uncertainty', 'nextGate']) {
      requireString(fact, key, path, issues)
    }
  })
}

function checkDiscoveryFields(
  fields: ProcurementAssessmentRecord[],
  issues: ProcurementAssessmentValidationIssue[],
): Map<string, ProcurementAssessmentRecord> {
  const byId = new Map<string, ProcurementAssessmentRecord>()

  fields.forEach((field, index) => {
    const path = `discoveryFields[${index}]`
    const id = requireString(field, 'id', path, issues)
    requireString(field, 'label', path, issues)
    requireString(field, 'questionId', path, issues)
    if (!id) return
    if (byId.has(id)) {
      addIssue(issues, 'duplicate_discovery_field', `${path}.id`, `duplicate field ${id}`)
      return
    }
    byId.set(id, field)
    checkUnknownFieldMetadata(field, path, issues)
  })

  for (const id of PROCUREMENT_ASSESSMENT_REQUIRED_FIELDS) {
    if (!byId.has(id)) {
      addIssue(issues, 'required_discovery_field_missing', 'discoveryFields', `missing mandatory field ${id}`)
    }
  }

  return byId
}

function isSyntheticIdentity(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9.-]+@synthetic\.invalid$/i.test(value)
}

function checkActors(
  actors: ProcurementAssessmentRecord[],
  issues: ProcurementAssessmentValidationIssue[],
): Map<string, ProcurementAssessmentRecord> {
  const byId = new Map<string, ProcurementAssessmentRecord>()

  actors.forEach((actor, index) => {
    const path = `actors[${index}]`
    const id = requireString(actor, 'id', path, issues)
    requireString(actor, 'role', path, issues)
    requireString(actor, 'identity', path, issues)
    const syntheticIdentity = requireString(actor, 'syntheticIdentity', path, issues)
    requireString(actor, 'responsibility', path, issues)
    requireString(actor, 'source', path, issues)
    requireString(actor, 'sourceDate', path, issues)
    requireString(actor, 'uncertainty', path, issues)

    if (id) {
      if (byId.has(id)) {
        addIssue(issues, 'duplicate_actor', `${path}.id`, `duplicate actor ${id}`)
      } else {
        byId.set(id, actor)
      }
    }
    if (actor.identity !== PROCUREMENT_ASSESSMENT_UNKNOWN) {
      addIssue(issues, 'actor_identity_must_be_placeholder', `${path}.identity`, `identity must be ${PROCUREMENT_ASSESSMENT_UNKNOWN}`)
    }
    if (!isSyntheticIdentity(syntheticIdentity)) {
      addIssue(issues, 'synthetic_actor_identity_invalid', `${path}.syntheticIdentity`, 'synthetic actor identity must use @synthetic.invalid')
    }
    if (actor.nextGate !== PROCUREMENT_ASSESSMENT_GATE) {
      addIssue(issues, 'actor_next_gate_required', `${path}.nextGate`, `next gate must be ${PROCUREMENT_ASSESSMENT_GATE}`)
    }
  })

  for (const id of PROCUREMENT_ASSESSMENT_REQUIRED_ACTORS) {
    if (!byId.has(id)) {
      addIssue(issues, 'required_actor_missing', 'actors', `missing mandatory actor ${id}`)
    }
  }

  return byId
}

function checkQuestions(
  questions: ProcurementAssessmentRecord[],
  fields: Map<string, ProcurementAssessmentRecord>,
  actors: Map<string, ProcurementAssessmentRecord>,
  issues: ProcurementAssessmentValidationIssue[],
): void {
  const questionByField = new Map<string, ProcurementAssessmentRecord>()

  questions.forEach((question, index) => {
    const path = `questions[${index}]`
    const fieldId = requireString(question, 'fieldId', path, issues)
    const questionId = requireString(question, 'id', path, issues)
    const actorId = requireString(question, 'actorId', path, issues)
    requireString(question, 'prompt', path, issues)

    for (const key of ['answer', 'answerEvidence', 'answerSource', 'answerDate', 'uncertainty']) {
      if (question[key] !== PROCUREMENT_ASSESSMENT_UNKNOWN) {
        addIssue(
          issues,
          'question_unknown_value_required',
          `${path}.${key}`,
          `unknown question values must be exactly ${PROCUREMENT_ASSESSMENT_UNKNOWN}`,
        )
      }
    }

    if (fieldId) {
      if (questionByField.has(fieldId)) {
        addIssue(issues, 'duplicate_discovery_question', `${path}.fieldId`, `duplicate question for ${fieldId}`)
      } else {
        questionByField.set(fieldId, question)
      }
      const field = fields.get(fieldId)
      if (!field) {
        addIssue(issues, 'question_field_unknown', `${path}.fieldId`, `question references unknown field ${fieldId}`)
      } else if (field.questionId !== questionId) {
        addIssue(issues, 'question_id_mismatch', `${path}.id`, `question id does not match field ${fieldId}`)
      }
    }
    if (actorId && !actors.has(actorId)) {
      addIssue(issues, 'question_actor_unknown', `${path}.actorId`, `question references unknown actor ${actorId}`)
    }
    if (question.nextGate !== PROCUREMENT_ASSESSMENT_GATE) {
      addIssue(issues, 'question_next_gate_required', `${path}.nextGate`, `next gate must be ${PROCUREMENT_ASSESSMENT_GATE}`)
    }
  })

  for (const id of PROCUREMENT_ASSESSMENT_REQUIRED_FIELDS) {
    if (!questionByField.has(id)) {
      addIssue(issues, 'required_discovery_question_missing', 'questions', `missing mandatory question for ${id}`)
    }
  }
}

function checkEvidence(
  evidence: ProcurementAssessmentRecord[],
  issues: ProcurementAssessmentValidationIssue[],
): Map<string, ProcurementAssessmentRecord> {
  const byId = new Map<string, ProcurementAssessmentRecord>()

  evidence.forEach((receipt, index) => {
    const path = `evidence[${index}]`
    const id = requireString(receipt, 'id', path, issues)
    requireString(receipt, 'description', path, issues)
    requireString(receipt, 'status', path, issues)
    if (id) {
      if (byId.has(id)) {
        addIssue(issues, 'duplicate_receipt', `${path}.id`, `duplicate receipt ${id}`)
      } else {
        byId.set(id, receipt)
      }
    }
    if (receipt.status !== 'missing') {
      addIssue(issues, 'receipt_must_be_missing', `${path}.status`, 'G0 receipts must remain missing until confirmed')
    }
    for (const key of ['value', 'source', 'sourceDate', 'uncertainty']) {
      if (receipt[key] !== PROCUREMENT_ASSESSMENT_UNKNOWN) {
        addIssue(issues, 'receipt_unknown_value_required', `${path}.${key}`, `missing receipt values must be exactly ${PROCUREMENT_ASSESSMENT_UNKNOWN}`)
      }
    }
    if (receipt.nextGate !== PROCUREMENT_ASSESSMENT_GATE) {
      addIssue(issues, 'receipt_next_gate_required', `${path}.nextGate`, `next gate must be ${PROCUREMENT_ASSESSMENT_GATE}`)
    }
  })

  for (const id of PROCUREMENT_ASSESSMENT_REQUIRED_RECEIPTS) {
    if (!byId.has(id)) {
      addIssue(issues, 'required_receipt_missing', 'evidence', `missing G0 receipt ${id}`)
    }
  }

  return byId
}

function checkNextGate(
  nextGateValue: unknown,
  evidence: Map<string, ProcurementAssessmentRecord>,
  issues: ProcurementAssessmentValidationIssue[],
): void {
  const nextGate = requireRecord(nextGateValue, 'nextGate', issues)
  if (!nextGate) return

  if (nextGate.id !== PROCUREMENT_ASSESSMENT_GATE) {
    addIssue(issues, 'next_gate_mismatch', 'nextGate.id', `next gate must be ${PROCUREMENT_ASSESSMENT_GATE}`)
  }
  requireString(nextGate, 'name', 'nextGate', issues)
  requireString(nextGate, 'state', 'nextGate', issues)
  requireString(nextGate, 'entryRequirement', 'nextGate', issues)
  requireString(nextGate, 'source', 'nextGate', issues)
  requireString(nextGate, 'sourceDate', 'nextGate', issues)
  requireString(nextGate, 'uncertainty', 'nextGate', issues)
  if (nextGate.outcome !== PROCUREMENT_ASSESSMENT_UNKNOWN) {
    addIssue(issues, 'next_gate_outcome_must_be_unknown', 'nextGate.outcome', `next gate outcome must be ${PROCUREMENT_ASSESSMENT_UNKNOWN}`)
  }

  if (!Array.isArray(nextGate.missingEvidenceIds)) {
    addIssue(issues, 'next_gate_receipts_required', 'nextGate.missingEvidenceIds', 'missing receipt ids are required')
    return
  }
  const missingEvidenceIds = new Set(nextGate.missingEvidenceIds.filter((id): id is string => typeof id === 'string'))
  for (const id of PROCUREMENT_ASSESSMENT_REQUIRED_RECEIPTS) {
    if (!missingEvidenceIds.has(id) || !evidence.has(id)) {
      addIssue(issues, 'next_gate_receipt_link_missing', 'nextGate.missingEvidenceIds', `next gate must link missing receipt ${id}`)
    }
  }
}

function checkBoundary(
  boundaryValue: unknown,
  issues: ProcurementAssessmentValidationIssue[],
): void {
  const boundary = requireRecord(boundaryValue, 'boundary', issues)
  if (!boundary) return
  const assessment = requireRecord(boundary.assessment, 'boundary.assessment', issues)
  const rehearsal = requireRecord(boundary.syntheticRehearsal, 'boundary.syntheticRehearsal', issues)
  const municipalDeployment = requireRecord(boundary.municipalDeployment, 'boundary.municipalDeployment', issues)

  if (assessment) {
    if (assessment.label !== 'procurement assessment') {
      addIssue(issues, 'assessment_label_invalid', 'boundary.assessment.label', 'assessment must keep the procurement assessment label')
    }
    requireString(assessment, 'purpose', 'boundary.assessment', issues)
    if (!Array.isArray(assessment.allowed) || assessment.allowed.length === 0) {
      addIssue(issues, 'assessment_allowed_scope_required', 'boundary.assessment.allowed', 'allowed assessment scope is required')
    }
    if (!Array.isArray(assessment.mustNotDo) || assessment.mustNotDo.length === 0) {
      addIssue(issues, 'assessment_exclusions_required', 'boundary.assessment.mustNotDo', 'assessment exclusions are required')
    } else {
      const exclusions = assessment.mustNotDo.filter((item): item is string => typeof item === 'string').join(' ').toLowerCase()
      for (const term of ['crm', 'webhook', 'waitlist']) {
        if (!exclusions.includes(term)) {
          addIssue(issues, 'assessment_exclusion_missing', 'boundary.assessment.mustNotDo', `missing exclusion ${term}`)
        }
      }
    }
  }

  if (rehearsal) {
    if (rehearsal.label !== 'rehearsal sintético') {
      addIssue(issues, 'rehearsal_label_invalid', 'boundary.syntheticRehearsal.label', 'synthetic rehearsal label is required')
    }
    requireString(rehearsal, 'purpose', 'boundary.syntheticRehearsal', issues)
    requireString(rehearsal, 'data', 'boundary.syntheticRehearsal', issues)
    requireString(rehearsal, 'source', 'boundary.syntheticRehearsal', issues)
    requireString(rehearsal, 'sourceDate', 'boundary.syntheticRehearsal', issues)
    requireString(rehearsal, 'uncertainty', 'boundary.syntheticRehearsal', issues)
    requireString(rehearsal, 'notEquivalentTo', 'boundary.syntheticRehearsal', issues)
    if (!Array.isArray(rehearsal.identities) || rehearsal.identities.length === 0) {
      addIssue(issues, 'synthetic_rehearsal_identities_required', 'boundary.syntheticRehearsal.identities', 'synthetic identities are required')
    } else {
      rehearsal.identities.forEach((identity, index) => {
        if (!isSyntheticIdentity(identity)) {
          addIssue(issues, 'synthetic_rehearsal_identity_invalid', `boundary.syntheticRehearsal.identities[${index}]`, 'identity must use @synthetic.invalid')
        }
      })
    }
  }

  if (municipalDeployment) {
    if (municipalDeployment.status !== 'não autorizado') {
      addIssue(issues, 'municipal_deployment_must_be_denied', 'boundary.municipalDeployment.status', 'municipal deployment must remain unauthorized')
    }
    requireString(municipalDeployment, 'requires', 'boundary.municipalDeployment', issues)
    requireString(municipalDeployment, 'data', 'boundary.municipalDeployment', issues)
    requireString(municipalDeployment, 'source', 'boundary.municipalDeployment', issues)
    requireString(municipalDeployment, 'sourceDate', 'boundary.municipalDeployment', issues)
    requireString(municipalDeployment, 'uncertainty', 'boundary.municipalDeployment', issues)
  }
}

function scanSyntheticOnlyStrings(
  value: unknown,
  path: string,
  issues: ProcurementAssessmentValidationIssue[],
): void {
  if (typeof value === 'string') {
    const emailPattern = /\b[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})\b/gi
    for (const match of value.matchAll(emailPattern)) {
      const domain = match[1].toLowerCase()
      if (!domain.endsWith('.invalid')) {
        addIssue(issues, 'real_identity_rejected', path, 'email identities must use a placeholder or .invalid domain')
      }
    }
    if (/\b\d{3}[.\s-]\d{3}[.\s-]\d{3}[.\s-]\d{2}\b/.test(value) || /(?:\+?55[\s-]*)?\b\d{10,11}\b/.test(value)) {
      addIssue(issues, 'pii_rejected', path, 'CPF or phone-like values are not allowed')
    }
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanSyntheticOnlyStrings(item, `${path}[${index}]`, issues))
    return
  }
  if (isRecord(value)) {
    Object.entries(value).forEach(([key, item]) => scanSyntheticOnlyStrings(item, `${path}.${key}`, issues))
  }
}

/** Validates the private procurement assessment and its synthetic-only boundary. */
export function validateProcurementAssessment(candidate: unknown): ProcurementAssessmentValidationReport {
  const issues: ProcurementAssessmentValidationIssue[] = []
  const assessment = requireRecord(candidate, '$', issues)
  if (!assessment) {
    return {
      valid: false,
      issueCount: issues.length,
      issues,
      factCount: 0,
      discoveryFieldCount: 0,
      unknownFieldCount: 0,
      actorCount: 0,
      questionCount: 0,
      missingReceiptCount: 0,
      syntheticIdentityCount: 0,
      syntheticOnly: false,
      externalActions: false,
    }
  }

  if (assessment.schema !== PROCUREMENT_ASSESSMENT_SCHEMA || assessment.version !== 1) {
    addIssue(issues, 'schema_version_mismatch', '$.schema', `schema must be ${PROCUREMENT_ASSESSMENT_SCHEMA} version 1`)
  }
  if (assessment.classification !== 'internal synthetic-only assessment') {
    addIssue(issues, 'classification_mismatch', '$.classification', 'assessment must remain internal synthetic-only')
  }
  if (assessment.owner !== PROCUREMENT_ASSESSMENT_UNKNOWN) {
    addIssue(issues, 'owner_must_be_unknown', '$.owner', `owner must be ${PROCUREMENT_ASSESSMENT_UNKNOWN}`)
  }
  if (assessment.recipient !== PROCUREMENT_ASSESSMENT_UNKNOWN) {
    addIssue(issues, 'recipient_must_be_unknown', '$.recipient', `recipient must be ${PROCUREMENT_ASSESSMENT_UNKNOWN}`)
  }

  const facts = readRecords(assessment.facts, 'facts', issues)
  const fields = readRecords(assessment.discoveryFields, 'discoveryFields', issues)
  const actors = readRecords(assessment.actors, 'actors', issues)
  const questions = readRecords(assessment.questions, 'questions', issues)
  const evidence = readRecords(assessment.evidence, 'evidence', issues)

  checkFactReceipts(facts, issues)
  const fieldById = checkDiscoveryFields(fields, issues)
  const actorById = checkActors(actors, issues)
  checkQuestions(questions, fieldById, actorById, issues)
  const evidenceById = checkEvidence(evidence, issues)
  checkNextGate(assessment.nextGate, evidenceById, issues)
  checkBoundary(assessment.boundary, issues)

  const serializedAssessment = JSON.stringify(assessment).toLowerCase()
  if (/\b(?:pilot|piloto)\b/.test(serializedAssessment)) {
    addIssue(issues, 'assessment_named_pilot', '$', 'assessment must not be named as a pilot')
  }
  scanSyntheticOnlyStrings(assessment, '$', issues)

  const unknownFieldCount = fields.filter(
    field => field.state === 'unknown' && field.value === PROCUREMENT_ASSESSMENT_UNKNOWN,
  ).length
  const syntheticIdentityCount = actors.filter(actor => isSyntheticIdentity(actor.syntheticIdentity)).length

  return {
    valid: issues.length === 0,
    issueCount: issues.length,
    issues,
    factCount: facts.length,
    discoveryFieldCount: fields.length,
    unknownFieldCount,
    actorCount: actors.length,
    questionCount: questions.length,
    missingReceiptCount: evidence.filter(receipt => receipt.status === 'missing').length,
    syntheticIdentityCount,
    syntheticOnly: issues.every(issue => !['real_identity_rejected', 'pii_rejected'].includes(issue.code)),
    externalActions: false,
  }
}
