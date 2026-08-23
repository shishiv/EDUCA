import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const helper = path.join(process.cwd(), 'scripts/pilot-app-server.sh')

function run(command: string): string {
  return execFileSync('bash', ['-c', `source "$1"; ${command}`, 'pilot-app-server', helper], {
    encoding: 'utf8',
  }).trim()
}

describe('pilot direct app server contract', () => {
  it('reserves the tenth leased slot and loopback origin in direct mode', () => {
    expect(run('pilot_app_server_mode')).toBe('portless')
    expect(run('pilot_app_server_port 55000 direct')).toBe('55009')
    expect(run('pilot_app_server_origin app direct 55009')).toBe('http://127.0.0.1:55009')
    expect(run('pilot_app_server_origin app portless')).toBe('https://app.localhost')
  })

  it('accepts direct loopback and rejects a public or mismatched origin', () => {
    expect(run('pilot_app_server_validate_origin http://127.0.0.1:55009 direct 55009')).toContain('VALID')
    expect(() => run('pilot_app_server_validate_origin https://app.localhost direct 55009')).toThrow()
    expect(() => run('pilot_app_server_validate_origin http://127.0.0.1:55008 direct 55009')).toThrow()
  })
})
