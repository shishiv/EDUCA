/** Schema identifier for the internal synthetic-only support runbook. */
export const SUPPORT_RUNBOOK_SCHEMA = 'educa.support-runbook/v1'
/** Placeholder used when a human support binding is not known. */
export const SUPPORT_RUNBOOK_UNKNOWN = 'a confirmar'
/** Human binding gate for owner, substitute, channel and calendar. */
export const SUPPORT_RUNBOOK_HUMAN_GATE = 'T12'
/** Critical severity for blocked access or attendance and containment risk. */
export const SUPPORT_RUNBOOK_CRITICAL_SEVERITY = 'critical'
/** Ordinary severity for questions, visual improvements and feature requests. */
export const SUPPORT_RUNBOOK_ORDINARY_SEVERITY = 'ordinary'

/** Support surfaces that the synthetic incident contract must cover. */
export const SUPPORT_RUNBOOK_REQUIRED_SURFACES = [
  'access',
  'roles',
  'chamada',
  'diario',
  'observed_inconsistency',
  'data_incident',
  'rollback',
] as const

const REQUIRED_CRITICAL_CRITERIA = [
  'blocked_chamada',
  'possible_cross_school_access',
  'attendance_loss_or_alteration',
  'data_containment',
] as const

const REQUIRED_ORDINARY_CRITERIA = [
  'questions',
  'visual_improvements',
  'feature_requests',
] as const

const REQUIRED_RECEIPTS = [
  'receipt-redacted-correlation-001',
  'receipt-redacted-scope-001',
  'receipt-redacted-incident-001',
  'receipt-redacted-rollback-001',
  'receipt-redacted-closure-001',
] as const

const REQUIRED_CLOSURE_CHECKS = [
  'correlation_recorded',
  'severity_recorded',
  'scope_contained',
  'rollback_rehearsed',
  't12_binding_pending',
] as const

const REQUIRED_EXCLUSION_TERMS = [
  'student name',
  'cpf',
  'nis',
  'phone',
  'email',
  'raw content',
  'real institution',
  'contact',
  'deployment',
  'telemetry',
  'crm',
  'sla',
  'rollout',
] as const

const FORBIDDEN_KEYS = new Set([
  'studentName',
  'student_name',
  'cpf',
  'nis',
  'phone',
  'phoneNumber',
  'phone_number',
  'email',
  'emailAddress',
  'email_address',
  'rawContent',
  'raw_content',
  'rawText',
  'raw_text',
  'realInstitution',
  'real_institution',
  'realInstitutionName',
  'institutionName',
  'institution_name',
])

interface SupportRunbookRecord {
  [key: string]: unknown
}

export interface SupportRunbookValidationIssue {
  code: string
  path: string
  detail: string
}

export interface SupportRunbookValidationReport {
  valid: boolean
  issueCount: number
  issues: SupportRunbookValidationIssue[]
  supportScopeCount: number
  exclusionCount: number
  incidentCount: number
  criticalIncidentCount: number
  ownerPlaceholderCount: number
  receiptCount: number
  closureCheckCount: number
  syntheticOnly: boolean
  externalActions: boolean
  promisesDetected: boolean
}

function isRecord(value: unknown): value is SupportRunbookRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function addIssue(
  issues: SupportRunbookValidationIssue[],
  code: string,
  path: string,
  detail: string,
): void {
  issues.push({ code, path, detail })
}

function requireRecord(
  value: unknown,
  path: string,
  issues: SupportRunbookValidationIssue[],
): SupportRunbookRecord | undefined {
  if (!isRecord(value)) {
    addIssue(issues, 'record_required', path, 'record is required')
    return undefined
  }
  return value
}

function requireString(
  record: SupportRunbookRecord,
  key: string,
  path: string,
  issues: SupportRunbookValidationIssue[],
): string | undefined {
  const value = record[key]
  if (typeof value !== 'string' || value.trim() === '') {
    addIssue(issues, 'string_required', `${path}.${key}`, 'non-empty string is required')
    return undefined
  }
  return value
}

function requireBoolean(
  record: SupportRunbookRecord,
  key: string,
  path: string,
  issues: SupportRunbookValidationIssue[],
): boolean | undefined {
  const value = record[key]
  if (typeof value !== 'boolean') {
    addIssue(issues, 'boolean_required', `${path}.${key}`, 'boolean is required')
    return undefined
  }
  return value
}

function readRecords(
  value: unknown,
  path: string,
  issues: SupportRunbookValidationIssue[],
): SupportRunbookRecord[] {
  if (!Array.isArray(value)) {
    addIssue(issues, 'array_required', path, 'array is required')
    return []
  }

  return value.flatMap((item, index) => {
    const record = requireRecord(item, `${path}[${index}]`, issues)
    return record ? [record] : []
  })
}

function readStrings(
  value: unknown,
  path: string,
  issues: SupportRunbookValidationIssue[],
): string[] {
  if (!Array.isArray(value)) {
    addIssue(issues, 'string_array_required', path, 'array of strings is required')
    return []
  }

  return value.flatMap((item, index) => {
    if (typeof item !== 'string' || item.trim() === '') {
      addIssue(issues, 'string_required', `${path}[${index}]`, 'non-empty string is required')
      return []
    }
    return [item]
  })
}

function requirePlaceholder(
  record: SupportRunbookRecord,
  key: string,
  path: string,
  issues: SupportRunbookValidationIssue[],
): boolean {
  if (record[key] !== SUPPORT_RUNBOOK_UNKNOWN) {
    addIssue(
      issues,
      'placeholder_required',
      `${path}.${key}`,
      `value must be ${SUPPORT_RUNBOOK_UNKNOWN}`,
    )
    return false
  }
  return true
}

function requireRedactedString(
  record: SupportRunbookRecord,
  key: string,
  path: string,
  issues: SupportRunbookValidationIssue[],
): void {
  const value = requireString(record, key, path, issues)
  if (value && !value.toLowerCase().includes('redacted')) {
    addIssue(issues, 'redaction_required', `${path}.${key}`, 'value must remain redacted')
  }
}

function requireReceiptReference(
  value: unknown,
  path: string,
  issues: SupportRunbookValidationIssue[],
): string | undefined {
  if (typeof value !== 'string' || !value.startsWith('receipt-redacted-')) {
    addIssue(issues, 'redacted_receipt_reference_required', path, 'reference must use the redacted receipt namespace')
    return undefined
  }
  return value
}

function checkSupportScope(
  value: unknown,
  issues: SupportRunbookValidationIssue[],
): SupportRunbookRecord[] {
  const entries = readRecords(value, 'supportScope', issues)
  const ids = new Set<string>()

  entries.forEach((entry, index) => {
    const path = `supportScope[${index}]`
    const id = requireString(entry, 'id', path, issues)
    requireString(entry, 'label', path, issues)
    requireString(entry, 'purpose', path, issues)
    if (id) {
      if (ids.has(id)) {
        addIssue(issues, 'duplicate_support_surface', `${path}.id`, `duplicate surface ${id}`)
      }
      ids.add(id)
    }
  })

  for (const id of SUPPORT_RUNBOOK_REQUIRED_SURFACES) {
    if (!ids.has(id)) {
      addIssue(issues, 'required_support_surface_missing', 'supportScope', `missing required surface ${id}`)
    }
  }

  return entries
}

function checkExclusions(
  value: unknown,
  issues: SupportRunbookValidationIssue[],
): string[] {
  const exclusions = readStrings(value, 'exclusions', issues)
  if (exclusions.length === 0) {
    addIssue(issues, 'support_exclusions_required', 'exclusions', 'at least one exclusion is required')
  }

  const serialized = exclusions.join(' ').toLowerCase()
  for (const term of REQUIRED_EXCLUSION_TERMS) {
    if (!serialized.includes(term)) {
      addIssue(issues, 'support_exclusion_missing', 'exclusions', `missing exclusion ${term}`)
    }
  }

  return exclusions
}

function checkCriteria(
  value: unknown,
  path: string,
  requiredIds: readonly string[],
  issues: SupportRunbookValidationIssue[],
): void {
  const criteria = readRecords(value, path, issues)
  const ids = new Set<string>()
  criteria.forEach((criterion, index) => {
    const criterionPath = `${path}[${index}]`
    const id = requireString(criterion, 'id', criterionPath, issues)
    requireString(criterion, 'definition', criterionPath, issues)
    if (id) ids.add(id)
  })

  for (const id of requiredIds) {
    if (!ids.has(id)) {
      addIssue(issues, 'classification_criterion_missing', path, `missing criterion ${id}`)
    }
  }
}

function checkClassificationRules(
  value: unknown,
  issues: SupportRunbookValidationIssue[],
): void {
  const rules = requireRecord(value, 'classificationRules', issues)
  if (!rules) return

  if (rules.criticalSeverity !== SUPPORT_RUNBOOK_CRITICAL_SEVERITY) {
    addIssue(issues, 'critical_severity_invalid', 'classificationRules.criticalSeverity', 'critical severity is required')
  }
  checkCriteria(rules.criticalCriteria, 'classificationRules.criticalCriteria', REQUIRED_CRITICAL_CRITERIA, issues)

  if (rules.ordinarySeverity !== SUPPORT_RUNBOOK_ORDINARY_SEVERITY) {
    addIssue(issues, 'ordinary_severity_invalid', 'classificationRules.ordinarySeverity', 'ordinary severity is required')
  }
  checkCriteria(rules.ordinaryCriteria, 'classificationRules.ordinaryCriteria', REQUIRED_ORDINARY_CRITERIA, issues)
  requireString(rules, 'classificationRule', 'classificationRules', issues)
}

function checkHumanBinding(
  value: unknown,
  issues: SupportRunbookValidationIssue[],
): { placeholderCount: number; promisesDetected: boolean } {
  const binding = requireRecord(value, 'humanBinding', issues)
  if (!binding) return { placeholderCount: 0, promisesDetected: false }

  if (binding.gate !== SUPPORT_RUNBOOK_HUMAN_GATE) {
    addIssue(issues, 'human_gate_invalid', 'humanBinding.gate', 'human binding gate must be T12')
  }
  requireString(binding, 'status', 'humanBinding', issues)

  const placeholderFields = ['owner', 'substitute', 'channel', 'calendar']
  let placeholderCount = 0
  for (const key of placeholderFields) {
    if (requirePlaceholder(binding, key, 'humanBinding', issues)) placeholderCount += 1
  }

  if (binding.known !== false) {
    addIssue(issues, 'human_binding_must_be_unknown', 'humanBinding.known', 'human binding must remain unknown')
  }
  if (binding.requiresHumanConfirmation !== true) {
    addIssue(issues, 'human_confirmation_required', 'humanBinding.requiresHumanConfirmation', 'human confirmation is required')
  }

  const technicalTargets = requireRecord(binding.existingTechnicalTargets, 'humanBinding.existingTechnicalTargets', issues)
  let promisesDetected = false
  if (technicalTargets) {
    requireString(technicalTargets, 'status', 'humanBinding.existingTechnicalTargets', issues)
    if (requireBoolean(technicalTargets, 'arePromises', 'humanBinding.existingTechnicalTargets', issues) !== false) {
      promisesDetected = true
      addIssue(issues, 'technical_targets_are_promises', 'humanBinding.existingTechnicalTargets.arePromises', 'technical targets cannot be promises')
    }
    requireString(technicalTargets, 'statement', 'humanBinding.existingTechnicalTargets', issues)
  }

  if (requireBoolean(binding, 'noSlaPromise', 'humanBinding', issues) !== true) {
    promisesDetected = true
    addIssue(issues, 'sla_promise_forbidden', 'humanBinding.noSlaPromise', 'SLA promises are forbidden')
  }
  if (requireBoolean(binding, 'noRolloutPromise', 'humanBinding', issues) !== true) {
    promisesDetected = true
    addIssue(issues, 'rollout_promise_forbidden', 'humanBinding.noRolloutPromise', 'rollout promises are forbidden')
  }
  const statement = requireString(binding, 't12Statement', 'humanBinding', issues)
  if (statement && !statement.includes(SUPPORT_RUNBOOK_HUMAN_GATE)) {
    addIssue(issues, 'human_gate_not_named', 'humanBinding.t12Statement', 'T12 must be named as the human binding gate')
  }

  return { placeholderCount, promisesDetected }
}

function checkRehearsal(
  value: unknown,
  issues: SupportRunbookValidationIssue[],
): { externalActions: boolean } {
  const rehearsal = requireRecord(value, 'rehearsal', issues)
  if (!rehearsal) return { externalActions: false }

  if (rehearsal.mode !== 'local synthetic fixture') {
    addIssue(issues, 'rehearsal_mode_invalid', 'rehearsal.mode', 'rehearsal must use a local synthetic fixture')
  }
  if (rehearsal.fixture !== 'local redacted') {
    addIssue(issues, 'fixture_redaction_invalid', 'rehearsal.fixture', 'fixture must be local redacted')
  }
  requireString(rehearsal, 'source', 'rehearsal', issues)
  if (requireBoolean(rehearsal, 'rawContentIncluded', 'rehearsal', issues) !== false) {
    addIssue(issues, 'raw_content_forbidden', 'rehearsal.rawContentIncluded', 'raw content cannot be included')
  }

  const externalActionFields = ['contactsUsed', 'deploymentUsed', 'telemetryUsed', 'crmUsed']
  let externalActions = false
  for (const key of externalActionFields) {
    if (requireBoolean(rehearsal, key, 'rehearsal', issues) !== false) {
      externalActions = true
      addIssue(issues, 'external_action_forbidden', `rehearsal.${key}`, 'external actions are forbidden')
    }
  }

  const rehearsalProofFields = [
    'rehearsableWithoutContact',
    'rehearsableWithoutDeployment',
    'rehearsableWithoutTelemetry',
    'rehearsableWithoutCrm',
  ]
  for (const key of rehearsalProofFields) {
    if (requireBoolean(rehearsal, key, 'rehearsal', issues) !== true) {
      addIssue(issues, 'rehearsal_without_dependency_required', `rehearsal.${key}`, 'rehearsal must not require this dependency')
    }
  }

  return { externalActions }
}

interface IncidentCheckResult {
  incidentCount: number
  criticalIncidentCount: number
  ownerPlaceholderCount: number
  receiptReferences: string[]
  closureCheckCount: number
}

function checkIncidentCorrelation(
  incident: SupportRunbookRecord,
  issues: SupportRunbookValidationIssue[],
): void {
  const correlationId = requireString(incident, 'correlationId', 'incident', issues)
  const correlation = requireRecord(incident.correlation, 'incident.correlation', issues)
  if (!correlation) return

  const key = requireString(correlation, 'key', 'incident.correlation', issues)
  if (correlationId && key && correlationId !== key) {
    addIssue(issues, 'correlation_key_mismatch', 'incident.correlation.key', 'correlation key must match correlationId')
  }
  readStrings(correlation.sources, 'incident.correlation.sources', issues)
  requireRedactedString(correlation, 'reporter', 'incident.correlation', issues)
  requireRedactedString(correlation, 'observedAt', 'incident.correlation', issues)
}

function checkIncidentClassification(
  incident: SupportRunbookRecord,
  issues: SupportRunbookValidationIssue[],
): string | undefined {
  requireRedactedString(incident, 'reportedBy', 'incident', issues)
  requireRedactedString(incident, 'reportedAt', 'incident', issues)
  if (incident.category !== 'data incident') {
    addIssue(issues, 'incident_category_invalid', 'incident.category', 'incident category must be data incident')
  }

  const surfaces = readStrings(incident.surfaces, 'incident.surfaces', issues)
  for (const surface of SUPPORT_RUNBOOK_REQUIRED_SURFACES) {
    if (!surfaces.includes(surface)) {
      addIssue(issues, 'incident_surface_missing', 'incident.surfaces', `incident must cover ${surface}`)
    }
  }

  requireRedactedString(incident, 'observedInconsistency', 'incident', issues)
  const severity = requireString(incident, 'severity', 'incident', issues)
  if (severity !== SUPPORT_RUNBOOK_CRITICAL_SEVERITY && severity !== SUPPORT_RUNBOOK_ORDINARY_SEVERITY) {
    addIssue(issues, 'incident_severity_invalid', 'incident.severity', 'incident severity must be critical or ordinary')
  }
  const severityReason = requireString(incident, 'severityReason', 'incident', issues)
  if (severity === SUPPORT_RUNBOOK_CRITICAL_SEVERITY && severityReason) {
    const normalizedReason = severityReason.toLowerCase()
    if (!normalizedReason.includes('cross-school') && !normalizedReason.includes('containment')) {
      addIssue(issues, 'critical_reason_missing', 'incident.severityReason', 'critical incident must cite access or containment risk')
    }
  }
  return severity
}

function checkIncidentScope(
  incident: SupportRunbookRecord,
  receiptReferences: string[],
  issues: SupportRunbookValidationIssue[],
): void {
  const scope = requireRecord(incident.scope, 'incident.scope', issues)
  if (!scope) return

  requireRedactedString(scope, 'boundary', 'incident.scope', issues)
  requireRedactedString(scope, 'roles', 'incident.scope', issues)
  requireRedactedString(scope, 'records', 'incident.scope', issues)
  readStrings(scope.surfaces, 'incident.scope.surfaces', issues)
  if (scope.confirmed !== false) {
    addIssue(issues, 'scope_must_remain_unconfirmed', 'incident.scope.confirmed', 'synthetic scope must remain unconfirmed')
  }
  const scopeReceipt = requireReceiptReference(scope.scopeReceiptReference, 'incident.scope.scopeReceiptReference', issues)
  if (scopeReceipt) receiptReferences.push(scopeReceipt)
}

function checkIncidentEscalation(
  incident: SupportRunbookRecord,
  issues: SupportRunbookValidationIssue[],
): void {
  const escalation = requireRecord(incident.escalation, 'incident.escalation', issues)
  if (!escalation) return

  requireString(escalation, 'trigger', 'incident.escalation', issues)
  for (const key of ['destination', 'substitute', 'channel', 'calendar']) {
    const value = requireString(escalation, key, 'incident.escalation', issues)
    if (value && (!value.includes(SUPPORT_RUNBOOK_HUMAN_GATE) || !value.includes(SUPPORT_RUNBOOK_UNKNOWN))) {
      addIssue(issues, 'escalation_binding_invalid', `incident.escalation.${key}`, 'escalation binding must remain a T12 placeholder')
    }
  }
  const actions = readStrings(escalation.actions, 'incident.escalation.actions', issues)
  if (actions.length === 0) {
    addIssue(issues, 'escalation_actions_required', 'incident.escalation.actions', 'escalation actions are required')
  }
  if (escalation.notPromised !== true) {
    addIssue(issues, 'escalation_promise_forbidden', 'incident.escalation.notPromised', 'escalation must not be a promise')
  }
}

function checkIncidentRollback(
  incident: SupportRunbookRecord,
  receiptReferences: string[],
  issues: SupportRunbookValidationIssue[],
): void {
  const rollback = requireRecord(incident.rollback, 'incident.rollback', issues)
  if (!rollback) return

  if (rollback.available !== true) {
    addIssue(issues, 'rollback_required', 'incident.rollback.available', 'rollback must be available for rehearsal')
  }
  if (rollback.mode !== 'local fixture only') {
    addIssue(issues, 'rollback_scope_invalid', 'incident.rollback.mode', 'rollback must stay local to the fixture')
  }
  requireString(rollback, 'trigger', 'incident.rollback', issues)
  requireString(rollback, 'action', 'incident.rollback', issues)
  for (const key of ['deploymentUsed', 'realDataUsed']) {
    if (requireBoolean(rollback, key, 'incident.rollback', issues) !== false) {
      addIssue(issues, 'rollback_external_action_forbidden', `incident.rollback.${key}`, 'rollback cannot use deployment or real data')
    }
  }
  const rollbackReceipt = requireReceiptReference(rollback.receiptReference, 'incident.rollback.receiptReference', issues)
  if (rollbackReceipt) receiptReferences.push(rollbackReceipt)
}

function checkIncidentClosure(
  incident: SupportRunbookRecord,
  receiptReferences: string[],
  issues: SupportRunbookValidationIssue[],
): { closureCheckCount: number; ownerPlaceholderCount: number } {
  const closure = requireRecord(incident.closure, 'incident.closure', issues)
  if (!closure) return { closureCheckCount: 0, ownerPlaceholderCount: 0 }

  if (closure.state !== 'closed in synthetic rehearsal') {
    addIssue(issues, 'closure_state_invalid', 'incident.closure.state', 'closure must be limited to the synthetic rehearsal')
  }
  const productionState = requireString(closure, 'productionState', 'incident.closure', issues)
  if (productionState && !productionState.includes(SUPPORT_RUNBOOK_HUMAN_GATE)) {
    addIssue(issues, 'production_closure_gate_missing', 'incident.closure.productionState', 'production closure must remain blocked pending T12')
  }

  const checks = readRecords(closure.checks, 'incident.closure.checks', issues)
  const checkIds = new Set<string>()
  checks.forEach((check, index) => {
    const path = `incident.closure.checks[${index}]`
    const id = requireString(check, 'id', path, issues)
    requireString(check, 'result', path, issues)
    if (id) checkIds.add(id)
  })
  for (const checkId of REQUIRED_CLOSURE_CHECKS) {
    if (!checkIds.has(checkId)) {
      addIssue(issues, 'closure_check_missing', 'incident.closure.checks', `missing closure check ${checkId}`)
    }
  }

  const ownerConfirmation = requireString(closure, 'ownerConfirmation', 'incident.closure', issues)
  if (ownerConfirmation && (!ownerConfirmation.includes(SUPPORT_RUNBOOK_UNKNOWN) || !ownerConfirmation.includes(SUPPORT_RUNBOOK_HUMAN_GATE))) {
    addIssue(issues, 'closure_owner_gate_invalid', 'incident.closure.ownerConfirmation', 'closure owner confirmation must remain a T12 placeholder')
  }
  const ownerPlaceholderCount = requirePlaceholder(closure, 'closedBy', 'incident.closure', issues) ? 1 : 0
  const closureReceipt = requireReceiptReference(closure.receiptReference, 'incident.closure.receiptReference', issues)
  if (closureReceipt) receiptReferences.push(closureReceipt)
  requireString(closure, 'closureRule', 'incident.closure', issues)
  return { closureCheckCount: checks.length, ownerPlaceholderCount }
}

function checkIncident(
  value: unknown,
  issues: SupportRunbookValidationIssue[],
): IncidentCheckResult {
  const incident = requireRecord(value, 'incident', issues)
  if (!incident) {
    return {
      incidentCount: 0,
      criticalIncidentCount: 0,
      ownerPlaceholderCount: 0,
      receiptReferences: [],
      closureCheckCount: 0,
    }
  }

  requireString(incident, 'id', 'incident', issues)
  const receiptReferences: string[] = []
  checkIncidentCorrelation(incident, issues)
  const severity = checkIncidentClassification(incident, issues)
  checkIncidentScope(incident, receiptReferences, issues)

  const ownerPlaceholderCount = requirePlaceholder(incident, 'owner', 'incident', issues) ? 1 : 0
  if (incident.ownerBinding !== SUPPORT_RUNBOOK_HUMAN_GATE) {
    addIssue(issues, 'incident_owner_gate_invalid', 'incident.ownerBinding', 'incident owner must bind through T12')
  }

  const firstResponse = readStrings(incident.firstResponse, 'incident.firstResponse', issues)
  if (firstResponse.length === 0) {
    addIssue(issues, 'first_response_required', 'incident.firstResponse', 'first response steps are required')
  }

  checkIncidentEscalation(incident, issues)

  const incidentReceipt = requireReceiptReference(incident.receiptReference, 'incident.receiptReference', issues)
  if (incidentReceipt) receiptReferences.push(incidentReceipt)

  checkIncidentRollback(incident, receiptReferences, issues)
  const closure = checkIncidentClosure(incident, receiptReferences, issues)

  const criticalIncidentCount = severity === SUPPORT_RUNBOOK_CRITICAL_SEVERITY ? 1 : 0
  return {
    incidentCount: 1,
    criticalIncidentCount,
    ownerPlaceholderCount: ownerPlaceholderCount + closure.ownerPlaceholderCount,
    receiptReferences,
    closureCheckCount: closure.closureCheckCount,
  }
}

function checkReceipts(
  value: unknown,
  requiredReferences: string[],
  issues: SupportRunbookValidationIssue[],
): number {
  const receipts = readRecords(value, 'receipts', issues)
  const ids = new Set<string>()

  receipts.forEach((receipt, index) => {
    const path = `receipts[${index}]`
    const id = requireString(receipt, 'id', path, issues)
    requireString(receipt, 'kind', path, issues)
    requireString(receipt, 'status', path, issues)
    if (receipt.redacted !== true) {
      addIssue(issues, 'receipt_must_be_redacted', `${path}.redacted`, 'receipt must be redacted')
    }
    requireString(receipt, 'source', path, issues)
    if (receipt.content !== '[REDACTED]') {
      addIssue(issues, 'receipt_content_must_be_redacted', `${path}.content`, 'receipt content must be [REDACTED]')
    }
    if (id) {
      if (ids.has(id)) addIssue(issues, 'duplicate_receipt', `${path}.id`, `duplicate receipt ${id}`)
      ids.add(id)
    }
  })

  for (const reference of REQUIRED_RECEIPTS) {
    if (!ids.has(reference)) {
      addIssue(issues, 'required_receipt_missing', 'receipts', `missing required receipt ${reference}`)
    }
  }
  for (const reference of requiredReferences) {
    if (!ids.has(reference)) {
      addIssue(issues, 'receipt_reference_missing', 'receipts', `incident references unknown receipt ${reference}`)
    }
  }

  return receipts.length
}

function checkServicePromises(
  value: unknown,
  issues: SupportRunbookValidationIssue[],
): boolean {
  const promises = requireRecord(value, 'servicePromises', issues)
  if (!promises) return false

  let promisesDetected = false
  for (const key of ['sla', 'rollout', 'deployment', 'technicalTargets']) {
    if (requireBoolean(promises, key, 'servicePromises', issues) !== false) {
      promisesDetected = true
      addIssue(issues, 'service_promise_forbidden', `servicePromises.${key}`, 'service promises must remain false')
    }
  }
  requireString(promises, 'statement', 'servicePromises', issues)
  return promisesDetected
}

function scanSyntheticOnlyBoundary(
  value: unknown,
  path: string,
  issues: SupportRunbookValidationIssue[],
): void {
  if (typeof value === 'string') {
    const emailPattern = /\b[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})\b/gi
    if (emailPattern.test(value)) {
      addIssue(issues, 'email_rejected', path, 'email values are not allowed in the support fixture')
    }
    if (/\b\d{3}[.\s-]\d{3}[.\s-]\d{3}[.\s-]\d{2}\b/.test(value)) {
      addIssue(issues, 'cpf_rejected', path, 'CPF-like values are not allowed in the support fixture')
    }
    if (/\b\d{11}\b/.test(value) || /(?:\+?55[\s-]*)?\b\d{10}\b/.test(value)) {
      addIssue(issues, 'phone_or_nis_rejected', path, 'phone or NIS-like values are not allowed in the support fixture')
    }
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanSyntheticOnlyBoundary(item, `${path}[${index}]`, issues))
    return
  }
  if (isRecord(value)) {
    Object.entries(value).forEach(([key, item]) => {
      if (FORBIDDEN_KEYS.has(key)) {
        addIssue(issues, 'forbidden_field_rejected', `${path}.${key}`, 'PII or raw content fields are not allowed')
      }
      scanSyntheticOnlyBoundary(item, `${path}.${key}`, issues)
    })
  }
}

function emptyReport(issues: SupportRunbookValidationIssue[]): SupportRunbookValidationReport {
  return {
    valid: false,
    issueCount: issues.length,
    issues,
    supportScopeCount: 0,
    exclusionCount: 0,
    incidentCount: 0,
    criticalIncidentCount: 0,
    ownerPlaceholderCount: 0,
    receiptCount: 0,
    closureCheckCount: 0,
    syntheticOnly: false,
    externalActions: false,
    promisesDetected: false,
  }
}

/** Validates the local, redacted support runbook and its synthetic incident lifecycle. */
export function validateSupportRunbook(candidate: unknown): SupportRunbookValidationReport {
  const issues: SupportRunbookValidationIssue[] = []
  const runbook = requireRecord(candidate, '$', issues)
  if (!runbook) return emptyReport(issues)

  if (runbook.schema !== SUPPORT_RUNBOOK_SCHEMA || runbook.version !== 1) {
    addIssue(issues, 'schema_version_mismatch', '$.schema', `schema must be ${SUPPORT_RUNBOOK_SCHEMA} version 1`)
  }
  if (runbook.classification !== 'internal synthetic-only support runbook') {
    addIssue(issues, 'classification_mismatch', '$.classification', 'runbook must remain internal synthetic-only')
  }
  requireString(runbook, 'title', '$', issues)
  requireString(runbook, 'status', '$', issues)
  requireString(runbook, 'source', '$', issues)
  requireString(runbook, 'sourceDate', '$', issues)
  if (runbook.syntheticOnly !== true) {
    addIssue(issues, 'synthetic_only_required', '$.syntheticOnly', 'runbook must be synthetic-only')
  }
  if (runbook.externalActions !== false) {
    addIssue(issues, 'external_actions_forbidden', '$.externalActions', 'external actions must be false')
  }

  const supportScope = checkSupportScope(runbook.supportScope, issues)
  const exclusions = checkExclusions(runbook.exclusions, issues)
  checkClassificationRules(runbook.classificationRules, issues)
  const binding = checkHumanBinding(runbook.humanBinding, issues)
  const rehearsal = checkRehearsal(runbook.rehearsal, issues)
  const incident = checkIncident(runbook.incident, issues)
  const receiptCount = checkReceipts(runbook.receipts, incident.receiptReferences, issues)
  const servicePromisesDetected = checkServicePromises(runbook.servicePromises, issues)

  scanSyntheticOnlyBoundary(runbook, '$', issues)

  const externalActions = runbook.externalActions === true || rehearsal.externalActions
  const promisesDetected = binding.promisesDetected || servicePromisesDetected
  return {
    valid: issues.length === 0,
    issueCount: issues.length,
    issues,
    supportScopeCount: supportScope.length,
    exclusionCount: exclusions.length,
    incidentCount: incident.incidentCount,
    criticalIncidentCount: incident.criticalIncidentCount,
    ownerPlaceholderCount: binding.placeholderCount + incident.ownerPlaceholderCount,
    receiptCount,
    closureCheckCount: incident.closureCheckCount,
    syntheticOnly: runbook.syntheticOnly === true && !issues.some(issue => issue.code.endsWith('_rejected')),
    externalActions,
    promisesDetected,
  }
}
