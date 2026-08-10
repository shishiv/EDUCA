import { validatePilotImportEncryptionKey } from './pilot-import-crypto'

const LOCAL_PROOF_HOSTS = new Set(['127.0.0.1', 'localhost', '::1'])
const PROOF_DATABASE_NAME = /^educa_pilot_proof_[A-Za-z0-9_-]+$/

export interface GovernedImportProofEnvironment {
  pilotMode?: string
  target?: string
  proofDatabaseUrl?: string
  demoSandbox?: string
  dataMode?: string
  syntheticOnly?: string
  realDataConfirmation?: string
  encryptionKey?: string
}

/** Hard-fails governed imports outside a local proof database, never the demo. */
export function assertGovernedPilotProofSafety(
  environment: GovernedImportProofEnvironment = {
    pilotMode: process.env.PILOT_MODE,
    target: process.env.PILOT_IMPORT_TARGET,
    proofDatabaseUrl: process.env.PILOT_IMPORT_PROOF_DATABASE_URL,
    demoSandbox: process.env.NEXT_PUBLIC_DEMO_SANDBOX || process.env.DEMO_SANDBOX,
    dataMode: process.env.PILOT_IMPORT_DATA_MODE || 'synthetic',
    syntheticOnly: process.env.PILOT_SYNTHETIC_DATA_ONLY,
    realDataConfirmation: process.env.PILOT_IMPORT_REAL_DATA_CONFIRMATION,
    encryptionKey: process.env.PILOT_IMPORT_ENCRYPTION_KEY,
  }
): void {
  if (environment.pilotMode !== 'true') throw new Error('PILOT_IMPORT_PROOF_PILOT_MODE_REQUIRED: pilot mode is required')
  if (environment.target !== 'isolated-proof') {
    throw new Error('PILOT_IMPORT_PROOF_TARGET_REQUIRED: isolated-proof target is required')
  }
  if (environment.demoSandbox === 'true') {
    throw new Error('PILOT_IMPORT_PROOF_DEMO_DENIED: public demo is never an import target')
  }
  if (!environment.proofDatabaseUrl) {
    throw new Error('PILOT_IMPORT_PROOF_DATABASE_REQUIRED: proof database URL is required')
  }

  let databaseUrl: URL
  try {
    databaseUrl = new URL(environment.proofDatabaseUrl)
  } catch {
    throw new Error('PILOT_IMPORT_PROOF_DATABASE_INVALID: proof database URL is invalid')
  }
  if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
    throw new Error('PILOT_IMPORT_PROOF_DATABASE_PROTOCOL_INVALID: PostgreSQL proof database is required')
  }
  if (!LOCAL_PROOF_HOSTS.has(databaseUrl.hostname)) {
    throw new Error('PILOT_IMPORT_PROOF_DATABASE_LOCAL_ONLY: proof database must be local')
  }
  const databaseName = databaseUrl.pathname.replace(/^\//, '')
  if (!PROOF_DATABASE_NAME.test(databaseName)) {
    throw new Error('PILOT_IMPORT_PROOF_DATABASE_NAME_REQUIRED: database name must start with educa_pilot_proof_')
  }
  if (!environment.encryptionKey) throw new Error('PILOT_IMPORT_KEY_MISSING: encryption key is required')
  validatePilotImportEncryptionKey(environment.encryptionKey)

  if (!['synthetic', 'real'].includes(environment.dataMode || '')) {
    throw new Error('PILOT_IMPORT_PROOF_DATA_MODE_INVALID: data mode must be synthetic or real')
  }
  if (environment.dataMode === 'real' && environment.syntheticOnly === 'true') {
    throw new Error('PILOT_IMPORT_PROOF_SYNTHETIC_ONLY: synthetic-only mode rejects real data')
  }
  if (environment.dataMode === 'real' && environment.realDataConfirmation !== 'isolated-proof-only') {
    throw new Error('PILOT_IMPORT_PROOF_REAL_DATA_CONFIRMATION_REQUIRED: real data is limited to isolated proof')
  }
}

/** Returns the database name for a validated proof connection. */
export function getGovernedProofDatabaseName(databaseUrl: string): string {
  assertGovernedPilotProofSafety({
    pilotMode: 'true',
    target: 'isolated-proof',
    proofDatabaseUrl: databaseUrl,
    demoSandbox: 'false',
    dataMode: 'synthetic',
    syntheticOnly: 'true',
    encryptionKey: Buffer.alloc(32, 1).toString('base64'),
  })
  return new URL(databaseUrl).pathname.replace(/^\//, '')
}
