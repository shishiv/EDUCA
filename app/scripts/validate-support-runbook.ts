#!/usr/bin/env tsx
/**
 * Validates the local, redacted support runbook without contacting anyone or loading a database.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateSupportRunbook } from '../lib/wayfinder/support-runbook'
import { parseJsonRecord, type JsonRecord, type JsonValue } from '../lib/validation/external-values'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const runbookPath = path.join(repositoryRoot, 'data', 'wayfinder', 'educa', 'support-runbook', 'runbook.json')
// SAFETY: the adjacent fixture/parser boundary establishes the asserted contract.
const runbook = JSON.parse(readFileSync(runbookPath, 'utf8')) as JsonValue
const deliberateBreak = process.env.SUPPORT_RUNBOOK_DELIBERATE_BREAK

function recordAt(value: JsonValue, pathName: string): JsonRecord {
  const record = parseJsonRecord(value)
  if (!record) {
    throw new Error(`SUPPORT_RUNBOOK_DELIBERATE_BREAK_INVALID: ${pathName} is not an object`)
  }
  return record
}

function applyDeliberateBreak(value: JsonValue, target: string): JsonValue {
  // SAFETY: the adjacent fixture/parser boundary establishes the asserted contract.
  const copy = JSON.parse(JSON.stringify(value)) as JsonValue
  const runbookRecord = recordAt(copy, '$')
  if (target === 'owner') {
    const binding = recordAt(runbookRecord.humanBinding, '$.humanBinding')
    delete binding.owner
    runbookRecord.humanBinding = binding
    return runbookRecord
  }
  if (target === 'severity') {
    const incident = recordAt(runbookRecord.incident, '$.incident')
    delete incident.severity
    runbookRecord.incident = incident
    return runbookRecord
  }
  throw new Error(`SUPPORT_RUNBOOK_DELIBERATE_BREAK_INVALID: use owner or severity, received ${target}`)
}

const candidate = deliberateBreak ? applyDeliberateBreak(runbook, deliberateBreak) : runbook
const report = validateSupportRunbook(candidate)

console.info(`SUPPORT_RUNBOOK_VALIDATION_RECEIPT: ${JSON.stringify({
  ...report,
  deliberateBreak: deliberateBreak ?? null,
})}`)

if (deliberateBreak) {
  if (report.valid) {
    console.error(`SUPPORT_RUNBOOK_DELIBERATE_BREAK_FAILED: ${deliberateBreak} remained valid`)
    process.exit(1)
  }
  console.error(`SUPPORT_RUNBOOK_DELIBERATE_BREAK_RED: target=${deliberateBreak}`)
  process.exit(1)
}

if (!report.valid) {
  console.error(`SUPPORT_RUNBOOK_VALIDATION_FAILED: ${report.issueCount} issue(s)`)
  process.exit(1)
}

console.info(`SUPPORT_RUNBOOK_VALIDATION_OK: ${report.supportScopeCount} surfaces, ${report.incidentCount} incident, ${report.receiptCount} redacted receipts`)
