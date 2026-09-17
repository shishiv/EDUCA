#!/usr/bin/env tsx
import { z } from 'zod'
import { assertSyntheticPilotSafety } from '../lib/pilot/pilot-safety-gate'

const operation = z.enum(['import', 'seed', 'restore', 'deploy']).parse(process.argv[2] || 'deploy')

if (process.env.PILOT_MODE === 'true') {
  assertSyntheticPilotSafety(operation)
}
