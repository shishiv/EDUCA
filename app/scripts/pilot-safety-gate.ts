#!/usr/bin/env tsx
import { assertSyntheticPilotSafety } from '../lib/pilot/pilot-safety-gate'

const operation = (process.argv[2] || 'deploy') as 'import' | 'seed' | 'restore' | 'deploy'

if (process.env.PILOT_MODE === 'true') {
  assertSyntheticPilotSafety(operation)
}
