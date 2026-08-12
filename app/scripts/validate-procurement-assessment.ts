#!/usr/bin/env tsx
/**
 * Validates the private procurement assessment without contacting anyone or loading a database.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateProcurementAssessment } from '../lib/wayfinder/procurement-assessment'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const assessmentPath = path.join(repositoryRoot, 'data', 'wayfinder', 'educa', 'procurement-assessment', 'assessment.json')

const assessment = JSON.parse(readFileSync(assessmentPath, 'utf8')) as unknown
const report = validateProcurementAssessment(assessment)

console.info(`PROCUREMENT_ASSESSMENT_VALIDATION_RECEIPT: ${JSON.stringify(report)}`)

if (!report.valid) {
  console.error(`PROCUREMENT_ASSESSMENT_VALIDATION_FAILED: ${report.issueCount} issue(s)`)
  process.exit(1)
}

console.info(`PROCUREMENT_ASSESSMENT_VALIDATION_OK: ${report.discoveryFieldCount} fields, ${report.questionCount} questions, ${report.missingReceiptCount} missing G0 receipts`)
