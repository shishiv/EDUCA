// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  GOVERNED_PILOT_STUDENT_CSV_HEADERS,
  PILOT_GOVERNANCE_UNCONFIRMED,
  PILOT_TREATMENT_AGREEMENT_CONFIRMED,
  SYNTHETIC_PILOT_GOVERNANCE_MANIFEST_VERSION,
  countCanonicalPilotRows,
  fingerprintCanonicalPilotRows,
  fingerprintPilotImportGovernance,
  transformGovernedPilotCsvToCanonicalRows,
  assertPilotImportOwnerMatchesActor,
  assertPilotImportTreatmentAgreementConfirmed,
  validatePilotImportGovernanceInput,
  validateGovernedPilotImportManifest,
  validateGovernedPilotStudentCsv,
} from '@/lib/pilot/governed-csv-import'
import {
  assertGovernedPilotProofSafety,
  PILOT_PROOF_TARGET_IDENTITY,
} from '@/lib/pilot/governed-import-safety'
import { SYNTHETIC_CSV_MARKER } from '@/lib/pilot/synthetic-csv-import'

const csv = [
  GOVERNED_PILOT_STUDENT_CSV_HEADERS.join(','),
  `${SYNTHETIC_CSV_MARKER},synthetic-student-1,00000001,CLASS-A,Aluno Sintetico,2018-05-20,M,Responsavel Sintetico,11999990000,mae`,
].join('\n')

const realCsv = csv.replace(`${SYNTHETIC_CSV_MARKER},`, ',')
const key = Buffer.alloc(32, 7).toString('base64')

function futureIso(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

function approvalManifest() {
  const recordedAt = new Date(Date.now() - 60 * 1000).toISOString()
  return {
    version: SYNTHETIC_PILOT_GOVERNANCE_MANIFEST_VERSION,
    owner: { name: 'Owner Sintetico', email: 'owner@synthetic.invalid' },
    controller: {
      name: 'Controlador Sintetico', email: 'controller@synthetic.invalid', status: PILOT_GOVERNANCE_UNCONFIRMED,
    },
    processor: {
      name: 'Processador Sintetico', email: 'processor@synthetic.invalid', status: PILOT_GOVERNANCE_UNCONFIRMED,
    },
    purpose: 'preparacao tecnica do piloto sintetico',
    legalBasis: PILOT_GOVERNANCE_UNCONFIRMED,
    processingAgreement: {
      reference: 'DPA-SYN-001',
      version: 'v1',
      status: PILOT_TREATMENT_AGREEMENT_CONFIRMED,
      confirmed: true,
      recordedAt,
      recordedBy: { name: 'Secretaria Sintetica', email: 'secretaria@synthetic.invalid' },
    },
    approval: {
      submittedBy: { name: 'Secretaria Sintetica', email: 'secretaria@synthetic.invalid' },
      approvedBy: { name: 'Diretora Sintetica', email: 'diretora@synthetic.invalid' },
      approvedAt: recordedAt,
    },
    subprocessors: [{
      name: 'Armazenamento Sintetico',
      email: 'storage@synthetic.invalid',
      status: PILOT_GOVERNANCE_UNCONFIRMED,
      service: 'armazenamento cifrado de prova',
      processingLocation: 'isolated-proof-local',
    }],
    location: { primary: 'isolated-proof-local', transfer: PILOT_GOVERNANCE_UNCONFIRMED },
    encryption: {
      algorithm: 'aes-256-gcm',
      keyReference: 'proof-local-v1',
      inTransit: PILOT_GOVERNANCE_UNCONFIRMED,
      plaintextStored: false,
    },
    retention: {
      policy: 'proof-only-30d',
      rawPayloadExpiresAt: futureIso(1),
      canonicalDataExpiresAt: futureIso(30),
      rollbackUntil: futureIso(7),
    },
    exit: {
      trigger: 'fim da prova tecnica',
      dataDisposition: PILOT_GOVERNANCE_UNCONFIRMED,
      accessRevocation: PILOT_GOVERNANCE_UNCONFIRMED,
      evidence: PILOT_GOVERNANCE_UNCONFIRMED,
    },
    incident: {
      contact: { name: 'Contato Incidente Sintetico', email: 'incidente@synthetic.invalid' },
      notification: PILOT_GOVERNANCE_UNCONFIRMED,
      response: PILOT_GOVERNANCE_UNCONFIRMED,
    },
  }
}

describe('governed pilot CSV contract', () => {
  it('accepts the exact synthetic CSV schema and maps canonical rows', () => {
    const result = validateGovernedPilotStudentCsv(csv, 'synthetic')
    expect(result.report).toMatchObject({ valid: true, schemaVersion: 'educa-pilot-students-v1', totalRows: 1, validRows: 1 })

    const canonical = transformGovernedPilotCsvToCanonicalRows(result.rows)
    expect(canonical).toEqual([expect.objectContaining({
      sourceId: 'synthetic-student-1',
      schoolCode: '00000001',
      classCode: 'CLASS-A',
      guardianSourceId: 'guardian:synthetic-student-1',
    })])
    expect(countCanonicalPilotRows(canonical)).toEqual({ sourceRows: 1, students: 1, guardians: 1, relationships: 1, enrollments: 1 })
    expect(fingerprintCanonicalPilotRows(canonical)).toBe('c09ca1adcfbfb029bab1f23dacdf8bbb98b50db3a2d2541d906a109aa8a7a496')
  })

  it('requires a synthetic marker in synthetic mode and a blank marker in real proof mode', () => {
    expect(validateGovernedPilotStudentCsv(realCsv, 'synthetic').report.issues).toContainEqual(
      expect.objectContaining({ field: 'synthetic_marker', code: 'synthetic_marker_required' })
    )
    expect(validateGovernedPilotStudentCsv(realCsv, 'real').report.valid).toBe(true)
    expect(validateGovernedPilotStudentCsv(csv, 'real').report.issues).toContainEqual(
      expect.objectContaining({ field: 'synthetic_marker', code: 'real_mode_marker_must_be_empty' })
    )
  })

  it('rejects schema drift, spreadsheet formulas, and cross-school batches', () => {
    expect(validateGovernedPilotStudentCsv(csv.replace('guardian_phone', 'cpf,guardian_phone'), 'synthetic').report.issues).toContainEqual(
      expect.objectContaining({ code: 'schema_mismatch' })
    )
    expect(validateGovernedPilotStudentCsv(csv.replace('Aluno Sintetico', '=HYPERLINK("https://invalid")'), 'synthetic').report.issues).toContainEqual(
      expect.objectContaining({ code: 'spreadsheet_formula_rejected' })
    )
    const crossSchool = `${csv}\n${SYNTHETIC_CSV_MARKER},synthetic-student-2,00000002,CLASS-B,Outra Pessoa,2018-06-20,F,Outro Responsavel,11999990001,pai`
    expect(validateGovernedPilotStudentCsv(crossSchool, 'synthetic').report.issues).toContainEqual(
      expect.objectContaining({ code: 'one_school_per_batch_required' })
    )
  })

  it('accepts the versioned synthetic governance manifest and normalizes it', () => {
    const manifest = approvalManifest()
    const validated = validateGovernedPilotImportManifest(manifest)
    expect(validated.owner).toEqual(manifest.owner)
    expect(validated.version).toBe(SYNTHETIC_PILOT_GOVERNANCE_MANIFEST_VERSION)
    expect(validated.legalBasis).toBe(PILOT_GOVERNANCE_UNCONFIRMED)
    expect(fingerprintPilotImportGovernance(validated)).toMatch(/^[a-f0-9]{64}$/)
    expect(validateGovernedPilotImportManifest({
      ...manifest,
      owner: { ...manifest.owner, name: '  Owner Sintetico  ', email: 'OWNER@SYNTHETIC.INVALID' },
    }).owner).toEqual({ name: 'Owner Sintetico', email: 'owner@synthetic.invalid' })

    const agreementInput = {
      reference: manifest.processingAgreement.reference,
      version: manifest.processingAgreement.version,
      status: manifest.processingAgreement.status,
      confirmed: manifest.processingAgreement.confirmed,
    }
    expect(validatePilotImportGovernanceInput({
      version: manifest.version,
      owner: manifest.owner,
      controller: manifest.controller,
      processor: manifest.processor,
      purpose: manifest.purpose,
      legalBasis: manifest.legalBasis,
      subprocessors: manifest.subprocessors,
      location: manifest.location,
      encryption: manifest.encryption,
      retention: manifest.retention,
      exit: manifest.exit,
      incident: manifest.incident,
      processingAgreement: agreementInput,
    }).processingAgreement).toEqual(agreementInput)
  })

  it('requires explicit treatment agreement confirmation before import', () => {
    const manifest = approvalManifest()
    expect(() => assertPilotImportTreatmentAgreementConfirmed({
      ...manifest.processingAgreement,
      confirmed: false,
    })).toThrow(/TREATMENT_AGREEMENT_REQUIRED/)
    expect(() => validateGovernedPilotImportManifest({
      ...manifest,
      processingAgreement: { ...manifest.processingAgreement, status: PILOT_GOVERNANCE_UNCONFIRMED, confirmed: false },
    })).toThrow(/TREATMENT_AGREEMENT_REQUIRED/)
  })

  it('requires the named owner to match the authenticated secretary', () => {
    const manifest = approvalManifest()
    expect(() => validateGovernedPilotImportManifest({
      ...manifest,
      owner: { name: 'Outra Pessoa', email: 'outra@synthetic.invalid' },
    })).not.toThrow()
    expect(() => assertPilotImportOwnerMatchesActor(manifest.owner, {
      name: 'Secretaria Sintetica',
      email: 'secretaria@synthetic.invalid',
      role: 'secretario',
      schoolId: null,
    })).toThrow(/OWNER_DENIED/)
  })

  it('rejects incomplete governance, equal maker-checker actors, bad retention order, and real identities', () => {
    const manifest = approvalManifest()
    expect(() => validateGovernedPilotImportManifest({ ...manifest, owner: undefined })).toThrow(/GOVERNANCE_INVALID/)
    expect(() => validateGovernedPilotImportManifest({ ...manifest, processingAgreement: undefined })).toThrow(/GOVERNANCE_INVALID/)
    expect(() => validateGovernedPilotImportManifest({ ...manifest, retention: undefined })).toThrow(/GOVERNANCE_INVALID/)
    expect(() => validateGovernedPilotImportManifest({
      ...manifest,
      approval: { ...manifest.approval, approvedBy: manifest.approval.submittedBy },
    })).toThrow(/MAKER_CHECKER_REQUIRED/)
    expect(() => validateGovernedPilotImportManifest({
      ...manifest,
      retention: { ...manifest.retention, rollbackUntil: futureIso(0.5) },
    })).toThrow(/ROLLBACK_WINDOW_INVALID/)
    expect(() => validateGovernedPilotImportManifest({
      ...manifest,
      controller: { ...manifest.controller, email: 'controller@non-synthetic.example' },
    })).toThrow(/SYNTHETIC_IDENTITY_REQUIRED/)
  })

  it('changes the governance fingerprint when any governance field changes', () => {
    const manifest = approvalManifest()
    const original = fingerprintPilotImportGovernance(validateGovernedPilotImportManifest(manifest))
    const changedPurpose = fingerprintPilotImportGovernance(validateGovernedPilotImportManifest({
      ...manifest,
      purpose: 'preparacao tecnica de rollback sintetico',
    }))
    const changedProcessor = fingerprintPilotImportGovernance(validateGovernedPilotImportManifest({
      ...manifest,
      processor: { ...manifest.processor, email: 'processor-2@synthetic.invalid' },
    }))
    expect(changedPurpose).not.toBe(original)
    expect(changedProcessor).not.toBe(original)

    const secondSubprocessor = {
      name: 'Backup Sintetico',
      email: 'backup@synthetic.invalid',
      status: PILOT_GOVERNANCE_UNCONFIRMED,
      service: 'backup cifrado de prova',
      processingLocation: 'isolated-proof-local',
    }
    const withTwoSubprocessors = validateGovernedPilotImportManifest({
      ...manifest,
      subprocessors: [...manifest.subprocessors, secondSubprocessor],
    })
    const reversedSubprocessors = validateGovernedPilotImportManifest({
      ...manifest,
      subprocessors: [secondSubprocessor, ...manifest.subprocessors],
    })
    expect(fingerprintPilotImportGovernance(withTwoSubprocessors)).toBe(fingerprintPilotImportGovernance(reversedSubprocessors))
  })

  it('keeps the deliberate legal-basis break red', () => {
    const manifest = approvalManifest()
    expect(() => validateGovernedPilotImportManifest({
      ...manifest,
      legalBasis: 'confirmed',
    })).toThrow(/GOVERNANCE_INVALID/)
  })

  it('accepts only the explicit local synthetic proof target', () => {
    const receipt = assertGovernedPilotProofSafety({
      pilotMode: 'true',
      target: 'isolated-proof',
      proofDatabaseUrl: 'postgresql://postgres@127.0.0.1/educa_pilot_proof_test',
      demoSandbox: 'false',
      supabaseDemoReferences: [],
      dataMode: 'synthetic',
      syntheticOnly: 'true',
      syntheticMarker: SYNTHETIC_CSV_MARKER,
      encryptionKey: key,
    }, 'import')

    expect(receipt).toMatchObject({
      operation: 'import',
      allowed: true,
      attemptedTarget: 'isolated-proof',
      target: PILOT_PROOF_TARGET_IDENTITY.target,
      reason: 'PILOT_IMPORT_PROOF_SAFETY_ACCEPTED',
      dataMode: 'synthetic',
      syntheticOnly: true,
      syntheticMarkerPresent: true,
    })

    const restoreReceipt = assertGovernedPilotProofSafety({
      pilotMode: 'true',
      target: 'isolated-proof',
      proofDatabaseUrl: 'postgresql://postgres@127.0.0.1/educa_pilot_proof_restore_test',
      demoSandbox: 'false',
      supabaseDemoReferences: [],
      dataMode: 'synthetic',
      syntheticOnly: 'true',
      syntheticMarker: SYNTHETIC_CSV_MARKER,
      encryptionKey: key,
    }, 'restore')

    expect(restoreReceipt.operation).toBe('restore')
    expect(restoreReceipt.target).toBe(PILOT_PROOF_TARGET_IDENTITY.target)
  })

  it('rejects unsafe targets before proof access and emits a redacted receipt', () => {
    const safe = {
      pilotMode: 'true',
      target: 'isolated-proof',
      proofDatabaseUrl: 'postgresql://postgres@127.0.0.1/educa_pilot_proof_test',
      demoSandbox: 'false',
      supabaseDemoReferences: [],
      dataMode: 'synthetic',
      syntheticOnly: 'true',
      syntheticMarker: SYNTHETIC_CSV_MARKER,
      encryptionKey: key,
    }

    expect(() => assertGovernedPilotProofSafety({ ...safe, target: 'municipal-pilot' })).toThrow(/TARGET_MISMATCH/)
    expect(() => assertGovernedPilotProofSafety({ ...safe, proofDatabaseUrl: 'postgresql://db.example/educa_pilot_proof_test' })).toThrow(/LOCAL_ONLY/)
    expect(() => assertGovernedPilotProofSafety({ ...safe, demoSandbox: 'true' })).toThrow(/DEMO_DENIED/)
    expect(() => assertGovernedPilotProofSafety({ ...safe, supabaseDemoReferences: ['https://demo.example'] })).toThrow(/DEMO_REFERENCE_DENIED/)
    expect(() => assertGovernedPilotProofSafety({ ...safe, dataMode: 'real', syntheticOnly: 'false' })).toThrow(/CONFIRMATION_REQUIRED/)
    expect(() => assertGovernedPilotProofSafety({ ...safe, dataMode: 'real', syntheticOnly: 'false', realDataConfirmation: 'isolated-proof-only' })).toThrow(/REAL_DATA_DENIED/)
    expect(() => assertGovernedPilotProofSafety({ ...safe, syntheticMarker: undefined })).toThrow(/SYNTHETIC_MARKER_REQUIRED/)
    expect(() => assertGovernedPilotProofSafety({ ...safe, dataMode: undefined })).toThrow(/DATA_MODE_REQUIRED/)

    let safetyError: unknown
    try {
      assertGovernedPilotProofSafety({
        ...safe,
        target: 'municipal-pilot',
        proofDatabaseUrl: 'postgresql://secret:password@db.example/educa_pilot_proof_test',
      }, 'cleanup')
    } catch (error) {
      safetyError = error
    }
    expect(safetyError).toBeInstanceOf(Error)
    const message = safetyError instanceof Error ? safetyError.message : String(safetyError)
    expect(message).toContain('PILOT_IMPORT_PROOF_SAFETY_RECEIPT')
    expect(message).toContain('"operation":"cleanup"')
    expect(message).toContain('"attemptedTarget":"municipal-pilot"')
    expect(message).toContain('"reason":"PILOT_IMPORT_PROOF_TARGET_MISMATCH"')
    expect(message).not.toContain('password')
    expect(message).not.toContain('db.example')
  })
})
