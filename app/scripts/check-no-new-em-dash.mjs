import { execFileSync } from 'node:child_process'

const baseRef = process.env.EM_DASH_DIFF_BASE || 'main'
const mergeBase = execFileSync('git', ['merge-base', baseRef, 'HEAD'], { encoding: 'utf8' }).trim()
const diff = execFileSync('git', ['diff', '--unified=0', '--no-color', mergeBase, '--'], {
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
})

let currentFile = '(unknown)'
const violations = []

for (const line of diff.split('\n')) {
  if (line.startsWith('+++ b/')) currentFile = line.slice(6)
  if (line.startsWith('+') && !line.startsWith('+++') && line.includes('\u2014')) {
    violations.push(`${currentFile}: ${line.slice(1)}`)
  }
}

if (violations.length > 0) {
  console.error(`NEW_EM_DASH_REJECTED (${violations.length})`)
  for (const violation of violations) console.error(violation)
  process.exit(1)
}

console.info(`NO_NEW_EM_DASH: base=${baseRef} result=pass`)
