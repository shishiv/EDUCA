import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPilotLocalProject } from '@/scripts/pilot-local-project'

const helper = path.join(process.cwd(), 'scripts/pilot-local-runtime.sh')
let scratch: string

beforeEach(() => { scratch = mkdtempSync(path.join(tmpdir(), 'educa-runtime-test-')) })
afterEach(() => { rmSync(scratch, { recursive: true, force: true }) })

function sourceFixture() {
  const repo = path.join(scratch, 'repo')
  mkdirSync(path.join(repo, 'supabase/migrations'), { recursive: true })
  writeFileSync(path.join(repo, 'supabase/migrations/001.sql'), 'SELECT 1;')
  const canonical = readFileSync(path.join(process.cwd(), '../supabase/config.toml'), 'utf8')
  writeFileSync(path.join(repo, 'supabase/config.toml'), canonical)
  return repo
}

function runRuntime(command: string, ...args: string[]) {
  return spawnSync('bash', ['-c', 'source "$1"; shift; ' + command, 'runtime', helper, ...args], {
    encoding: 'utf8', timeout: 15000,
  })
}

describe('isolated pilot runtime', () => {
  it('freezes migrations and remaps every active port, including the shadow database', () => {
    const repo = sourceFixture()
    const project = path.join(scratch, 'isolated')
    createPilotLocalProject(repo, project, 56000, 'http://127.0.0.1:56009')
    const config = readFileSync(path.join(project, 'supabase/config.toml'), 'utf8')
    expect(config).toContain('shadow_port = 56004')
    expect(config).toContain('vector_port = 56007')
    expect(config).toContain('site_url = "http://127.0.0.1:56009"')
    expect(config).toContain('additional_redirect_urls = ["http://127.0.0.1:56009"]')
    expect(config).not.toMatch(/^(?:port|shadow_port|vector_port) = 543\d+/m)
    writeFileSync(path.join(repo, 'supabase/migrations/001.sql'), 'SELECT 2;')
    expect(readFileSync(path.join(project, 'supabase/migrations/001.sql'), 'utf8')).toBe('SELECT 1;')
    expect(readFileSync(path.join(repo, 'supabase/config.toml'), 'utf8')).toContain('port = 54321')
  })

  it.each(['https://external.invalid', 'http://127.0.0.1:55009/path', 'http://user:pass@localhost'])('rejects an unsafe origin %s', origin => {
    const repo = sourceFixture()
    expect(() => createPilotLocalProject(repo, path.join(scratch, 'isolated'), 56000, origin)).toThrow('ORIGIN_INVALID')
  })

  it('rejects source-directory reuse and an overflowing range', () => {
    const repo = sourceFixture()
    expect(() => createPilotLocalProject(repo, repo, 56000)).toThrow('MUST_BE_ISOLATED')
    expect(() => createPilotLocalProject(repo, path.join(scratch, 'isolated'), 65530)).toThrow('PORT_INVALID')
  })

  it('removes credentials before exporting failure diagnostics', () => {
    const source = path.join(scratch, 'raw.log')
    const target = path.join(scratch, 'receipt.log')
    writeFileSync(source, 'sb_secret_fixture eyJfixture.token postgresql://test:fixture@localhost:55001/db')
    const result = runRuntime('redact_file "$1" "$2"', source, target)
    expect(result.status).toBe(0)
    expect(readFileSync(target, 'utf8')).toBe('[REDACTED_SUPABASE_KEY] [REDACTED_TOKEN] postgresql://test:[REDACTED]@localhost:55001/db')
  })

  it('terminates the app process group before reporting cleanup success', () => {
    const result = runRuntime(`
      setsid sleep 30 & runtime_pid=$!
      trap 'kill -KILL -- "-$runtime_pid" 2>/dev/null || true' EXIT
      for ((attempt = 0; attempt < 50; attempt++)); do
        if process_ids=$(pilot_app_live_pids "$runtime_pid") && [[ -n "$process_ids" ]]; then break; fi
        sleep 0.02
      done
      pilot_stop_app_process_group "$runtime_pid"; stopped=$?
      ! kill -0 "$runtime_pid" 2>/dev/null && exit "$stopped"
    `)
    expect(result.error).toBeUndefined()
    expect(result.status).toBe(0)
  })

  it('bounds cleanup when the app and its child ignore TERM, preserving other sessions', () => {
    const ready = path.join(scratch, 'ready')
    const result = runRuntime(`
      setsid sleep 30 & other_pid=$!
      setsid bash -c 'trap "" TERM; touch "$1"; sleep 30 & wait' runtime "$1" & runtime_pid=$!
      trap 'kill -KILL -- "-$runtime_pid" "-$other_pid" 2>/dev/null || true; wait 2>/dev/null || true' EXIT
      for ((attempt = 0; attempt < 50; attempt++)); do
        [[ ! -e "$1" ]] || break
        sleep 0.02
      done
      [[ -e "$1" ]] || exit 2
      pilot_stop_app_process_group "$runtime_pid" 1 || exit 3
      [[ -z "$(pilot_app_live_pids "$runtime_pid")" ]] || exit 4
      kill -0 "$other_pid"
    `, ready)
    expect(result.error).toBeUndefined()
    expect(result.status).toBe(0)
  })

  it('does not report a removed route when the route probe fails', () => {
    const result = runRuntime('portless() { return 42; }; pilot_verify_app_route_removed portless educa-fixture')
    expect(result.status).toBe(1)
  })

  it('waits for the named route to disappear without matching an unrelated route', () => {
    const result = runRuntime(`
      portless() { printf '%s' 'https://another-fixture.localhost'; }
      pilot_verify_app_route_removed portless educa-fixture
    `)
    expect(result.status).toBe(0)
  })

  it('does not treat a process probe failure as successful cleanup', () => {
    const result = runRuntime('ps() { return 42; }; pilot_stop_app_process_group 123456')
    expect(result.status).toBe(1)
  })


  it('refuses to signal or wait for a matching PID outside the app session', () => {
    const result = runRuntime(`
      sleep 30 & unrelated_pid=$!
      trap 'kill -TERM "$unrelated_pid" 2>/dev/null || true; wait "$unrelated_pid" 2>/dev/null || true' EXIT
      if pilot_stop_app_process_group "$unrelated_pid"; then exit 2; fi
      kill -0 "$unrelated_pid"
    `)
    expect(result.error).toBeUndefined()
    expect(result.status).toBe(0)
  })

})
