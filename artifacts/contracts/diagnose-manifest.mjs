import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { writeFileSync } from 'node:fs'
const cwd = resolve('app')
const require = createRequire(resolve(cwd, 'package.json'))
const cli = require.resolve('@playwright/test/cli')
const args = ['test', '--config', 'playwright.config.ts', '--list', '--reporter=line', '--workers=1']
const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'synthetic-list-only', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-list-only', PILOT_MODE: 'false' }
const records = []
for (const [name, command, parameters] of [
  ['pnpm9-exec', process.execPath, ['/root/.cache/node/corepack/v1/pnpm/9.15.4/bin/pnpm.cjs', 'exec', 'playwright', ...args]],
  ['locked-cli-direct', process.execPath, [cli, ...args]],
  ['system-node-direct', '/usr/bin/node', [cli, ...args]],
]) {
  const start = performance.now()
  const result = spawnSync(command, parameters, { cwd, env, encoding: 'utf8' })
  const lines = result.stdout.split('\n').filter(line => line.includes(' › '))
  records.push({ name, milliseconds: Math.round(performance.now() - start), exitCode: result.status, cases: lines.length, error: result.stderr })
  writeFileSync(`artifacts/contracts/checks/manifest-${name}.txt`, lines.join('\n') + '\n')
}
console.log(JSON.stringify({ node: process.version, cli, records }, null, 2))
