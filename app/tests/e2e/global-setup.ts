import { seedE2E } from '../../scripts/seed-e2e'

export default async function globalSetup() {
  // Pilot mode seeds its own deterministic stack via run-pilot-e2e.sh
  // (db reset + pilot module gate + seed-pilot-synthetic). Do not double-seed.
  if (process.env.PILOT_MODE === 'true') return
  const { selectedSchoolId } = await seedE2E()
  process.env.E2E_SELECTED_SCHOOL_ID = selectedSchoolId
}
