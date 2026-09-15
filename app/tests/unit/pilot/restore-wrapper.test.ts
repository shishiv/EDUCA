import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

let directory: string

function fixture(name: string) {
  return readFileSync(path.join(process.cwd(), 'tests/unit/pilot/fixtures', `restore-status-${name}.txt`), 'utf8')
}

function execute(status: string, environment: NodeJS.ProcessEnv = {}) {
  writeFileSync(path.join(directory, 'status.txt'), status)
  return spawnSync('bash', [path.join(directory, 'app/scripts/run-pilot-restore-test.sh')], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH, HOME: directory, FIXTURE_ROOT: directory, ...environment },
  })
}

beforeEach(() => {
  directory = mkdtempSync(path.join(process.cwd(), '.restore-wrapper-'))
  mkdirSync(path.join(directory, 'app/scripts'), { recursive: true })
  mkdirSync(path.join(directory, 'app/node_modules/.bin'), { recursive: true })
  mkdirSync(path.join(directory, 'supabase/tests/pilot'), { recursive: true })
  copyFileSync(path.join(process.cwd(), 'scripts/run-pilot-restore-test.sh'), path.join(directory, 'app/scripts/run-pilot-restore-test.sh'))
  writeFileSync(path.join(directory, 'app/node_modules/.bin/supabase'), '#!/usr/bin/env bash\ncat "$FIXTURE_ROOT/status.txt"\n', { mode: 0o755 })
  writeFileSync(path.join(directory, 'supabase/tests/pilot/run-backup-restore.sh'), `#!/usr/bin/env bash
printf '%s|%s|%s\\n' "$SUPABASE_SERVICE_ROLE_KEY" "$PILOT_IMPORT_TARGET" "$PILOT_IMPORT_DATA_MODE"
`, { mode: 0o755 })
})

afterEach(() => rmSync(directory, { recursive: true, force: true }))

describe('local restore CLI credentials (fixtures only, not Auth proof)', () => {
  it.each([
    ['current', 'sb_secret_synthetic_fixture'],
    ['legacy', 'synthetic-service-role-legacy-fixture'],
  ])('accepts %s keys without any inherited credentials', (name, expected) => {
    const result = execute(fixture(name))
    expect(result.status).toBe(0)
    expect(result.stdout.trim()).toBe(`${expected}|isolated-proof|synthetic`)
  })

  it('prefers the current secret when both aliases exist', () => {
    const result = execute(`${fixture('current')}SERVICE_ROLE_KEY="synthetic-old-key"\n`)
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('sb_secret_synthetic_fixture|')
  })

  it('does not use inherited secrets when local status has no credential', () => {
    const status = fixture('current').replace(/^SECRET_KEY=.*\n/m, '')
    const result = execute(status, { SECRET_KEY: 'inherited', SERVICE_ROLE_KEY: 'inherited' })
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('Supabase status is missing SERVICE_ROLE_KEY')
    expect(result.stdout).toBe('')
  })

  it.each([
    { PILOT_MODE: 'false' },
    { PILOT_IMPORT_TARGET: 'public-demo' },
    { PILOT_IMPORT_DATA_MODE: 'real' },
    { NEXT_PUBLIC_DEMO_SANDBOX: 'true' },
  ])('retains contradictory caller safety rejection: %j', (environment) => {
    const result = execute(fixture('current'), environment)
    expect(result.status).not.toBe(0)
    expect(result.stdout).toBe('')
  })
})
