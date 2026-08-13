#!/usr/bin/env tsx
import {
  PILOT_PROOF_TARGET_IDENTITY,
  assertSyntheticPilotSafety,
} from '../lib/pilot/pilot-safety-gate'
import {
  assertGovernedPilotProofSafety,
  readGovernedPilotProofEnvironment,
} from '../lib/pilot/governed-import-safety'

const environment = readGovernedPilotProofEnvironment()

assertSyntheticPilotSafety('restore', {
  pilotMode: environment.pilotMode,
  syntheticOnly: environment.syntheticOnly,
  externalDeployApproved: process.env.PILOT_EXTERNAL_DEPLOY_APPROVED,
  legalApprovalStatus: process.env.PILOT_LEGAL_APPROVAL_STATUS,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
})

if (environment.target !== PILOT_PROOF_TARGET_IDENTITY.target) {
  throw new Error('PILOT_RESTORE_TARGET_IDENTITY_REQUIRED: isolated synthetic proof target is required')
}
if (environment.dataMode !== PILOT_PROOF_TARGET_IDENTITY.dataMode) {
  throw new Error('PILOT_RESTORE_DATA_MODE_REQUIRED: synthetic restore data mode is required')
}
if (environment.syntheticOnly !== 'true') {
  throw new Error('PILOT_RESTORE_SYNTHETIC_ONLY_REQUIRED: synthetic-only restore is required')
}
if (environment.syntheticMarker !== PILOT_PROOF_TARGET_IDENTITY.syntheticMarker) {
  throw new Error('PILOT_RESTORE_SYNTHETIC_MARKER_REQUIRED: synthetic restore marker is required')
}

const safetyReceipt = environment.proofDatabaseUrl
  ? assertGovernedPilotProofSafety(environment, 'restore')
  : null

process.stdout.write(
  `PILOT_RESTORE_TARGET_RECEIPT: target=${PILOT_PROOF_TARGET_IDENTITY.target} ` +
    `database_target=${PILOT_PROOF_TARGET_IDENTITY.databaseTarget} ` +
    `data_mode=${PILOT_PROOF_TARGET_IDENTITY.dataMode} ` +
    `synthetic_marker=${PILOT_PROOF_TARGET_IDENTITY.syntheticMarker} ` +
    `database_guard=${safetyReceipt ? 'accepted' : 'pending'}\n`
)
