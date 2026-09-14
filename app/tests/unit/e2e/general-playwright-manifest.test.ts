import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const appDirectory = process.cwd()
// Execute the locked local CLI, without a package-manager startup per manifest.
const playwrightCli = createRequire(import.meta.url).resolve('@playwright/test/cli')

function listManifest(config: string, environment: Record<string, string | undefined> = {}): string {
  const result = spawnSync(
    process.execPath,
    [playwrightCli, 'test', '--config', config, '--list', '--reporter=line', '--workers=1'],
    {
      cwd: appDirectory,
      encoding: 'utf8',
      env: {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'synthetic-list-only',
        SUPABASE_SERVICE_ROLE_KEY: 'synthetic-list-only',
        PILOT_MODE: 'false',
        ...environment,
      },
    },
  )

  expect(result.status, result.stderr).toBe(0)
  return `${result.stdout}\n${result.stderr}`
}

describe('general Playwright manifest', () => {
  it.each(['false', 'true'])('keeps specialized tests out of the general runner (pilot=%s)', pilotMode => {
      const manifest = listManifest('playwright.config.ts', { PILOT_MODE: pilotMode })

      expect(manifest).toContain('[setup] › auth.setup.ts')
      expect(manifest).not.toContain('pilot/canonical-auth.setup.ts')
      expect(manifest).not.toContain('pilot/capacity-auth.setup.ts')
      expect(manifest).not.toContain('pilot-descriptive/descriptive-auth.setup.ts')
      expect(manifest).not.toContain('pilot-descriptive/descriptive-emission.spec.ts')
      expect(manifest).not.toContain('public-demo/public-visitor.spec.ts')
      expect(manifest).not.toContain('attendance/reopen.spec.ts')
      expect(manifest).not.toContain('diary/canonical-lesson.spec.ts')
      expect(manifest).not.toContain('pilot/attendance-reopen.spec.ts')
      expect(manifest).not.toContain('pilot/canonical-lesson.spec.ts')
      expect(manifest).toContain('[chromium] › users/roles.spec.ts')
      expect(manifest).toContain('[chromium] › flows/permissions.spec.ts')
      expect(manifest).toContain('[chromium] › grades/access-boundary.spec.ts')
      expect(manifest).not.toContain('grades/entry.spec.ts')
      expect(manifest).not.toContain('grades/report-card.spec.ts')
      expect(manifest).not.toContain('[diretor]')
      expect(manifest).not.toContain('[professor]')
  })

  it('preserves the positive grades contracts on an explicit, separate manifest', () => {
    const manifest = listManifest('playwright.grades-positive.config.ts')
    expect(manifest).toContain('[setup] › auth.setup.ts')
    expect(manifest).toContain('[chromium-grades-positive] › grades/entry.spec.ts')
    expect(manifest).toContain('[chromium-grades-positive] › grades/report-card.spec.ts')
    expect(manifest).not.toContain('grades/access-boundary.spec.ts')
    expect(manifest).not.toContain('pilot/')
  })

  it('keeps the legacy pilot on its specialized manifest', () => {
    const legacy = listManifest('playwright.pilot-legacy.config.ts', {
      PILOT_MODE: 'true',
      PILOT_LEGACY_SERVER_MANAGED: 'true',
    })
    expect(legacy).toContain('pilot/attendance-reopen.spec.ts')
    expect(legacy).toContain('pilot/canonical-lesson.spec.ts')
  })

  it('keeps capacity on its specialized manifest', () => {
    const capacity = listManifest('playwright.pilot-capacity.config.ts', {
      PILOT_CAPACITY_SERVER_MANAGED: 'true',
    })
    expect(capacity).toContain('capacity-auth.setup.ts')
    expect(capacity).toContain('capacity-contract.spec.ts')
    expect(capacity).not.toContain('descriptive-emission.spec.ts')
  })

  it('keeps descriptive reports on their specialized manifest', () => {
    const descriptive = listManifest('playwright.pilot-descriptive.config.ts', {
      PILOT_DESCRIPTIVE_SERVER_MANAGED: 'true',
    })
    expect(descriptive).toContain('descriptive-auth.setup.ts')
    expect(descriptive).toContain('descriptive-emission.spec.ts')
    expect(descriptive).not.toContain('capacity-contract.spec.ts')
  })

  it('keeps canonical attendance on its specialized manifest', () => {
    const canonical = listManifest('playwright.pilot-canonical.config.ts', {
      PILOT_CANONICAL_SERVER_MANAGED: 'true',
    })
    expect(canonical).toContain('canonical-auth.setup.ts')
    expect(canonical).toContain('canonical-pilot.spec.ts')
    expect(canonical).not.toContain('capacity-contract.spec.ts')
  })

  it('keeps public entry on its specialized manifest', () => {
    const publicEntry = listManifest('playwright.public-entry.config.ts')
    expect(publicEntry).toContain('public-visitor.spec.ts')
    expect(publicEntry).not.toContain('auth.setup.ts')
  })
})
