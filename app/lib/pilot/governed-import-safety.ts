import {
  PILOT_PROOF_DATA_MODE,
  PILOT_PROOF_SYNTHETIC_MARKER,
  PILOT_PROOF_TARGET,
  PILOT_PROOF_TARGET_IDENTITY,
} from './pilot-safety-gate'
import { validatePilotImportEncryptionKey } from './pilot-import-crypto'

export {
  PILOT_PROOF_DATA_MODE,
  PILOT_PROOF_SYNTHETIC_MARKER,
  PILOT_PROOF_TARGET,
  PILOT_PROOF_TARGET_IDENTITY,
  type PilotProofTargetIdentity,
} from './pilot-safety-gate'

const LOCAL_PROOF_HOSTS = new Set(['127.0.0.1', 'localhost', '::1'])
const PROOF_DATABASE_NAME = /^educa_pilot_proof_[A-Za-z0-9_-]+$/
const REAL_DATA_PROOF_CONFIRMATION = 'isolated-proof-only'

/** Operations that must carry the isolated synthetic proof target identity. */
export type GovernedPilotProofOperation = 'import' | 'rollback' | 'cleanup'

export interface GovernedImportProofEnvironment {
  pilotMode?: string
  target?: string
  proofDatabaseUrl?: string
  demoSandbox?: string
  supabaseDemoReferences?: readonly string[]
  dataMode?: string
  syntheticOnly?: string
  syntheticMarker?: string
  realDataConfirmation?: string
  encryptionKey?: string
}

/** Redacted result emitted for both accepted and rejected proof safety checks. */
export interface GovernedPilotProofSafetyReceipt {
  operation: GovernedPilotProofOperation
  allowed: boolean
  attemptedTarget: string | null
  target: typeof PILOT_PROOF_TARGET | null
  reason: string
  dataMode: string | null
  syntheticOnly: boolean
  syntheticMarkerPresent: boolean
}

/** Read only the explicit PILOT_* proof configuration and demo references. */
export function readGovernedPilotProofEnvironment(
  environment: Record<string, string | undefined> = process.env
): GovernedImportProofEnvironment {
  const supabaseDemoReferences = Object.entries(environment)
    .filter(([name, value]) => name.startsWith('SUPABASE_DEMO_') && Boolean(value))
    .map(([, value]) => value as string)

  return {
    pilotMode: environment.PILOT_MODE,
    target: environment.PILOT_IMPORT_TARGET,
    proofDatabaseUrl: environment.PILOT_IMPORT_PROOF_DATABASE_URL,
    demoSandbox:
      environment.NEXT_PUBLIC_DEMO_SANDBOX === 'true' || environment.DEMO_SANDBOX === 'true'
        ? 'true'
        : 'false',
    supabaseDemoReferences,
    dataMode: environment.PILOT_IMPORT_DATA_MODE,
    syntheticOnly: environment.PILOT_SYNTHETIC_DATA_ONLY,
    syntheticMarker: environment.PILOT_IMPORT_SYNTHETIC_MARKER,
    realDataConfirmation: environment.PILOT_IMPORT_REAL_DATA_CONFIRMATION,
    encryptionKey: environment.PILOT_IMPORT_ENCRYPTION_KEY,
  }
}

function redactAttemptedTarget(target: string | undefined): string | null {
  if (!target) return null
  return /^[A-Za-z0-9_-]{1,64}$/.test(target) ? target : '[redacted]'
}

function redactDataMode(dataMode: string | undefined): string | null {
  if (!dataMode) return null
  return dataMode === 'synthetic' || dataMode === 'real' ? dataMode : '[redacted]'
}

function createSafetyReceipt(
  environment: GovernedImportProofEnvironment,
  operation: GovernedPilotProofOperation,
  allowed: boolean,
  reason: string
): GovernedPilotProofSafetyReceipt {
  return {
    operation,
    allowed,
    attemptedTarget: redactAttemptedTarget(environment.target),
    target: allowed ? PILOT_PROOF_TARGET_IDENTITY.target : null,
    reason,
    dataMode: redactDataMode(environment.dataMode),
    syntheticOnly: environment.syntheticOnly === 'true',
    syntheticMarkerPresent: environment.syntheticMarker === PILOT_PROOF_SYNTHETIC_MARKER,
  }
}

function rejectProofSafety(
  environment: GovernedImportProofEnvironment,
  operation: GovernedPilotProofOperation,
  reason: string
): never {
  const receipt = createSafetyReceipt(environment, operation, false, reason)
  throw new Error(
    `${reason}: governed proof safety rejected\n` +
    `PILOT_IMPORT_PROOF_SAFETY_RECEIPT: ${JSON.stringify(receipt)}`
  )
}

/** Hard-fails governed proof operations outside one local synthetic target. */
export function assertGovernedPilotProofSafety(
  environment: GovernedImportProofEnvironment = readGovernedPilotProofEnvironment(),
  operation: GovernedPilotProofOperation = 'import'
): GovernedPilotProofSafetyReceipt {
  if (environment.pilotMode !== 'true') {
    return rejectProofSafety(environment, operation, 'PILOT_IMPORT_PROOF_PILOT_MODE_REQUIRED')
  }
  if (environment.target !== PILOT_PROOF_TARGET) {
    const reason = environment.target
      ? 'PILOT_IMPORT_PROOF_TARGET_MISMATCH'
      : 'PILOT_IMPORT_PROOF_TARGET_REQUIRED'
    return rejectProofSafety(environment, operation, reason)
  }
  if (environment.demoSandbox === 'true') {
    return rejectProofSafety(environment, operation, 'PILOT_IMPORT_PROOF_DEMO_DENIED')
  }
  if (environment.supabaseDemoReferences?.some(reference => Boolean(reference))) {
    return rejectProofSafety(environment, operation, 'PILOT_IMPORT_PROOF_DEMO_REFERENCE_DENIED')
  }
  if (environment.dataMode === 'real') {
    if (environment.realDataConfirmation !== REAL_DATA_PROOF_CONFIRMATION) {
      return rejectProofSafety(environment, operation, 'PILOT_IMPORT_PROOF_REAL_DATA_CONFIRMATION_REQUIRED')
    }
    return rejectProofSafety(environment, operation, 'PILOT_IMPORT_PROOF_REAL_DATA_DENIED')
  }
  if (!environment.dataMode) {
    return rejectProofSafety(environment, operation, 'PILOT_IMPORT_PROOF_DATA_MODE_REQUIRED')
  }
  if (environment.dataMode !== PILOT_PROOF_DATA_MODE) {
    return rejectProofSafety(environment, operation, 'PILOT_IMPORT_PROOF_DATA_MODE_INVALID')
  }
  if (environment.syntheticOnly !== 'true') {
    return rejectProofSafety(environment, operation, 'PILOT_IMPORT_PROOF_SYNTHETIC_ONLY_REQUIRED')
  }
  if (!environment.syntheticMarker) {
    return rejectProofSafety(environment, operation, 'PILOT_IMPORT_PROOF_SYNTHETIC_MARKER_REQUIRED')
  }
  if (environment.syntheticMarker !== PILOT_PROOF_SYNTHETIC_MARKER) {
    return rejectProofSafety(environment, operation, 'PILOT_IMPORT_PROOF_SYNTHETIC_MARKER_INVALID')
  }
  if (!environment.proofDatabaseUrl) {
    return rejectProofSafety(environment, operation, 'PILOT_IMPORT_PROOF_DATABASE_REQUIRED')
  }

  let databaseUrl: URL
  try {
    databaseUrl = new URL(environment.proofDatabaseUrl)
  } catch {
    return rejectProofSafety(environment, operation, 'PILOT_IMPORT_PROOF_DATABASE_INVALID')
  }
  if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
    return rejectProofSafety(environment, operation, 'PILOT_IMPORT_PROOF_DATABASE_PROTOCOL_INVALID')
  }
  if (!LOCAL_PROOF_HOSTS.has(databaseUrl.hostname)) {
    return rejectProofSafety(environment, operation, 'PILOT_IMPORT_PROOF_DATABASE_LOCAL_ONLY')
  }
  const databaseName = databaseUrl.pathname.replace(/^\//, '')
  if (!PROOF_DATABASE_NAME.test(databaseName)) {
    return rejectProofSafety(environment, operation, 'PILOT_IMPORT_PROOF_DATABASE_NAME_REQUIRED')
  }
  if (!environment.encryptionKey) {
    return rejectProofSafety(environment, operation, 'PILOT_IMPORT_KEY_MISSING')
  }
  try {
    validatePilotImportEncryptionKey(environment.encryptionKey)
  } catch {
    return rejectProofSafety(environment, operation, 'PILOT_IMPORT_KEY_INVALID')
  }

  return createSafetyReceipt(environment, operation, true, 'PILOT_IMPORT_PROOF_SAFETY_ACCEPTED')
}

/** Returns the database name for a validated proof connection. */
export function getGovernedProofDatabaseName(databaseUrl: string): string {
  assertGovernedPilotProofSafety({
    pilotMode: 'true',
    target: PILOT_PROOF_TARGET,
    proofDatabaseUrl: databaseUrl,
    demoSandbox: 'false',
    supabaseDemoReferences: [],
    dataMode: PILOT_PROOF_DATA_MODE,
    syntheticOnly: 'true',
    syntheticMarker: PILOT_PROOF_SYNTHETIC_MARKER,
    encryptionKey: Buffer.alloc(32, 1).toString('base64'),
  })
  return new URL(databaseUrl).pathname.replace(/^\//, '')
}
