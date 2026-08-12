const LOCAL_SUPABASE_HOSTS = new Set(['127.0.0.1', 'localhost'])

/** Identity used by the isolated synthetic pilot proof, never by the public demo. */
export const PILOT_PROOF_TARGET = 'isolated-proof' as const

/** Database value used for rows created by the isolated synthetic pilot proof. */
export const PILOT_PROOF_DATABASE_TARGET = 'isolated_proof' as const

/** CSV marker required by the isolated synthetic pilot proof. */
export const PILOT_PROOF_SYNTHETIC_MARKER = 'SYNTHETIC-EDUCA-PILOT' as const

/** Data mode authorized by the isolated synthetic pilot proof. */
export const PILOT_PROOF_DATA_MODE = 'synthetic' as const

export interface PilotProofTargetIdentity {
  target: typeof PILOT_PROOF_TARGET
  databaseTarget: typeof PILOT_PROOF_DATABASE_TARGET
  dataMode: typeof PILOT_PROOF_DATA_MODE
  syntheticOnly: true
  syntheticMarker: typeof PILOT_PROOF_SYNTHETIC_MARKER
}

/** Explicit target identity shared by pilot proof operations and their receipts. */
export const PILOT_PROOF_TARGET_IDENTITY: Readonly<PilotProofTargetIdentity> = Object.freeze({
  target: PILOT_PROOF_TARGET,
  databaseTarget: PILOT_PROOF_DATABASE_TARGET,
  dataMode: PILOT_PROOF_DATA_MODE,
  syntheticOnly: true,
  syntheticMarker: PILOT_PROOF_SYNTHETIC_MARKER,
})

export interface PilotSafetyEnvironment {
  pilotMode?: string
  syntheticOnly?: string
  externalDeployApproved?: string
  legalApprovalStatus?: string
  supabaseUrl?: string
}

/** Hard-fails real data, legal-approval claims, and external deploys in foundation mode. */
export function assertSyntheticPilotSafety(
  operation: 'import' | 'seed' | 'restore' | 'deploy',
  environment: PilotSafetyEnvironment = {
    pilotMode: process.env.PILOT_MODE,
    syntheticOnly: process.env.PILOT_SYNTHETIC_DATA_ONLY,
    externalDeployApproved: process.env.PILOT_EXTERNAL_DEPLOY_APPROVED,
    legalApprovalStatus: process.env.PILOT_LEGAL_APPROVAL_STATUS,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  }
): void {
  if (environment.pilotMode !== 'true' || environment.syntheticOnly !== 'true') {
    throw new Error('PILOT_SAFETY_GATE: synthetic-only pilot mode is required')
  }
  if (environment.legalApprovalStatus && environment.legalApprovalStatus !== 'not_approved') {
    throw new Error('PILOT_SAFETY_GATE: unsupported legal approval claim rejected')
  }
  if (operation === 'deploy' || environment.externalDeployApproved === 'true') {
    throw new Error('PILOT_SAFETY_GATE: external deployment is not authorized')
  }
  if (!environment.supabaseUrl) {
    throw new Error('PILOT_SAFETY_GATE: Supabase URL is required')
  }
  const host = new URL(environment.supabaseUrl).hostname
  if (!LOCAL_SUPABASE_HOSTS.has(host)) {
    throw new Error('PILOT_SAFETY_GATE: only local synthetic Supabase is authorized')
  }
}
