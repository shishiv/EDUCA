import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const toolDirectory = dirname(fileURLToPath(import.meta.url))
const appDirectory = resolve(toolDirectory, '..', '..')
const repositoryDirectory = resolve(appDirectory, '..')
const sourceDirectories = ['app', 'supabase', 'data'].filter((sourceDirectory) =>
  existsSync(resolve(repositoryDirectory, sourceDirectory)),
)
const oxlint = resolve(appDirectory, 'node_modules', 'oxlint', 'bin', 'oxlint')
const result = spawnSync(
  process.execPath,
  [
    oxlint,
    '--config',
    resolve(appDirectory, '.oxlintrc.json'),
    '--threads',
    '1',
    ...process.argv.slice(2),
    ...sourceDirectories,
  ],
  {
    cwd: repositoryDirectory,
    stdio: 'inherit',
  },
)

if (result.error) throw result.error
process.exitCode = result.status ?? 1
