import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const testDirectory = dirname(fileURLToPath(import.meta.url))
const appDirectory = resolve(testDirectory, '..', '..', '..', '..')
const oxlint = resolve(appDirectory, 'node_modules', 'oxlint', 'bin', 'oxlint')
const configuration = resolve(testDirectory, 'oxlintrc.json')

function lintFixture(name) {
  const result = spawnSync(
    process.execPath,
    [oxlint, '--config', configuration, '--format', 'json', resolve(testDirectory, 'fixtures', name)],
    { encoding: 'utf8' },
  )

  assert.equal(result.error, undefined)
  assert.equal(result.status, 1, result.stderr)
  return JSON.parse(result.stdout).diagnostics
}

function reportedNames(diagnostics) {
  return diagnostics.map((diagnostic) => diagnostic.message.match(/"([^"]+)"/)?.[1])
}

test('reports each forbidden local import binding once while ignoring exported import names', () => {
  const diagnostics = lintFixture('import-specifiers.ts')

  assert.deepEqual(reportedNames(diagnostics), ['Shapes', 'ShapeIcon'])
})

test('continues to report forbidden local symbols', () => {
  const diagnostics = lintFixture('local-symbol.ts')

  assert.deepEqual(reportedNames(diagnostics), ['shapeModel'])
})
