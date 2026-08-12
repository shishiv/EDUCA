#!/usr/bin/env tsx
/**
 * Validates the local, redacted support runbook without contacting anyone or loading a database.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateSupportRunbook } from '../lib/wayfinder/support-runbook'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const runbookPath = path.join(repositoryRoot, 'data', 'wayfinder', 'educa', 'support-runbook', 'runbook.json')
const runbook = JSON.parse(readFileSync(runbookPath, 'utf8')) as unknown
const deliberateBreak = process.env.SUPPORT_RUNBOOK_DELIBERATE_BREAK

function recordAt(value: unknown, pathName: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`SUPPORT_RUNBOOK_DELIBERATE_BREAK_INVALID: ${pathName} is not an object`)
  }
  return value as Record<string, unknown>
}

function applyDeliberateBreak(value: unknown, target: string): unknown {
  const copy = JSON.parse(JSON.stringify(value)) as unknown
  const runbookRecord = recordAt(copy, '$')
  if (target === 'owner') {
    const binding = recordAt(runbookRecord.humanBinding, '$.humanBinding')
    delete binding.owner
    return copy
  }
  if (target === 'severity') {
    const incident = recordAt(runbookRecord.incident, '$.incident')
    delete incident.severity
    return copy
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
