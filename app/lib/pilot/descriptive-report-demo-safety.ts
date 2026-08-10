import {
  assertSyntheticPilotSafety,
  type PilotSafetyEnvironment,
} from '@/lib/pilot/pilot-safety-gate'

/** Server environment key that enables the isolated descriptive-report PDF rehearsal. */
export const PILOT_DESCRIPTIVE_REPORT_DEMO_ENV_KEY = 'PILOT_DESCRIPTIVE_REPORT_DEMO'

/** Inputs required to prove the descriptive-report demo stays local and synthetic. */
export interface PilotDescriptiveReportDemoEnvironment extends PilotSafetyEnvironment {
  descriptiveReportDemo?: string
}

/**
 * Hard-fails descriptive-report emission unless the explicit local synthetic
 * rehearsal flag is present. This is separate from the public demo sandbox.
 */
export function assertPilotDescriptiveReportDemoSafety(
  environment: PilotDescriptiveReportDemoEnvironment = {
    pilotMode: process.env.PILOT_MODE,
    syntheticOnly: process.env.PILOT_SYNTHETIC_DATA_ONLY,
    externalDeployApproved: process.env.PILOT_EXTERNAL_DEPLOY_APPROVED,
    legalApprovalStatus: process.env.PILOT_LEGAL_APPROVAL_STATUS,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    descriptiveReportDemo: process.env[PILOT_DESCRIPTIVE_REPORT_DEMO_ENV_KEY],
  }
): void {
  assertSyntheticPilotSafety('seed', environment)

  if (environment.descriptiveReportDemo !== 'true') {
    throw new Error('PILOT_DESCRIPTIVE_REPORT_DEMO_DISABLED: explicit synthetic rehearsal is required')
  }
}

/** Returns whether an environment has passed the bounded descriptive-report demo gate. */
export function isPilotDescriptiveReportDemoEnabled(
  environment: PilotDescriptiveReportDemoEnvironment = {
    pilotMode: process.env.PILOT_MODE,
    syntheticOnly: process.env.PILOT_SYNTHETIC_DATA_ONLY,
    externalDeployApproved: process.env.PILOT_EXTERNAL_DEPLOY_APPROVED,
    legalApprovalStatus: process.env.PILOT_LEGAL_APPROVAL_STATUS,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    descriptiveReportDemo: process.env[PILOT_DESCRIPTIVE_REPORT_DEMO_ENV_KEY],
  }
): boolean {
  try {
    assertPilotDescriptiveReportDemoSafety(environment)
    return true
  } catch {
    return false
  }
}
