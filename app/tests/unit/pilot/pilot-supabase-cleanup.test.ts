import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const cleanupScript = path.join(process.cwd(), 'scripts/pilot-supabase-cleanup.sh')
let stubDir: string
let stubBin: string

beforeAll(() => {
  stubDir = mkdtempSync(path.join(tmpdir(), 'pilot-cleanup-test-'))
  stubBin = path.join(stubDir, 'bin')
  mkdirSync(stubBin, { recursive: true })
})

afterAll(() => {
  rmSync(stubDir, { recursive: true, force: true })
})

function writeStubs(opts: {
  supabaseStopExitCode?: number
  runningContainers?: string[]
  stoppedContainers?: string[]
  volumes?: string[]
  networks?: string[]
  stopFails?: boolean
  probeFails?: boolean
  neighborContainers?: string[]
  neighborProject?: string
}) {
  const {
    supabaseStopExitCode = 0,
    runningContainers = [],
    stoppedContainers = [],
    volumes = [],
    networks = [],
    stopFails = false,
    probeFails = false,
    neighborContainers = [],
    neighborProject = 'neighbor-project',
  } = opts

  const callLog = path.join(stubDir, 'calls.log')
  const stateFile = path.join(stubDir, 'stopped_called')
  writeFileSync(callLog, '')
  writeFileSync(stateFile, '0')

  writeFileSync(path.join(stubBin, 'pnpm'), [
    '#!/usr/bin/env bash',
    `echo "pnpm $*" >> "${callLog}"`,
    `exit ${supabaseStopExitCode}`,
  ].join('\n') + '\n', { mode: 0o755 })

  const allAfterStop = [...stoppedContainers, ...runningContainers]

  // Build the docker stub as an array to keep it readable
  const printRunning = runningContainers.map(c => `printf '%s\\n' '${c}'`).join('; ')
  const printStopped = stoppedContainers.map(c => `printf '%s\\n' '${c}'`).join('; ')
  const printAll = allAfterStop.map(c => `printf '%s\\n' '${c}'`).join('; ')
  const printVolumes = volumes.map(v => `printf '%s\\n' '${v}'`).join('; ')
  const printNetworks = networks.map(n => `printf '%s\\n' '${n}'`).join('; ')
  const printNeighbor = neighborContainers.map(c => `printf '%s\\n' '${c}'`).join('; ')

  const dockerStub = `#!/usr/bin/env bash
echo "docker $*" >> "${callLog}"

has_running_filter() {
  for a in "$@"; do [[ "$a" == "status=running" ]] && return 0; done
  return 1
}
get_project() {
  for a in "$@"; do
    case "$a" in com.supabase.cli.project=*) echo "\${a#*=}"; return ;; esac
  done
}
PROJ=$(get_project "$@")

case "$1" in
  ps)
    ${probeFails ? 'exit 1' : ':'}
    if [[ "$PROJ" == "${neighborProject}" ]]; then ${printNeighbor || ':'}; exit 0; fi
    if has_running_filter "$@"; then
      if [[ "$(cat "${stateFile}")" == "1" || "$(cat "${stateFile}")" == "2" ]]; then exit 0; fi
      ${printRunning || ':'}
    else
      if [[ "$(cat "${stateFile}")" == "2" ]]; then exit 0; fi
      if [[ "$(cat "${stateFile}")" == "1" ]]; then ${printAll || ':'}
      else ${printStopped || ':'}; fi
    fi
    ;;
  stop)
    ${stopFails ? 'exit 1' : `echo "1" > "${stateFile}"`}
    ;;
  rm)
    echo "2" > "${stateFile}"
    ;;
  volume)
    case "$2" in
      ls) if [[ "$PROJ" == "${neighborProject}" || "$(cat "${stateFile}")" == "2" ]]; then exit 0; fi; ${printVolumes || ':'} ;;
      rm) ;;
    esac
    ;;
  network)
    case "$2" in
      ls) if [[ "$PROJ" == "${neighborProject}" || "$(cat "${stateFile}")" == "2" ]]; then exit 0; fi; ${printNetworks || ':'} ;;
      rm) ;;
    esac
    ;;
esac
exit 0
`
  writeFileSync(path.join(stubBin, 'docker'), dockerStub, { mode: 0o755 })
}

function runCleanup(projectDir: string, projectId: string): { exitCode: number; output: string; callLog: string } {
  const callLog = path.join(stubDir, 'calls.log')
  const stderrFile = path.join(stubDir, 'stderr.log')
  writeFileSync(stderrFile, '')
  try {
    const stdout = execFileSync('bash', [
      '-c',
      `export PATH="${stubBin}:$PATH"; source "$1"; pilot_supabase_stop_project "$2" "$3" 2>"$4"`,
      '--',
      cleanupScript,
      projectDir,
      projectId,
      stderrFile,
    ], { encoding: 'utf8' })
    const stderr = readFileSync(stderrFile, 'utf8')
    return { exitCode: 0, output: stdout + stderr, callLog: readFileSync(callLog, 'utf8') }
  } catch (e: any) {
    let stderrContent = ''
    try { stderrContent = readFileSync(stderrFile, 'utf8') } catch { /* */ }
    return {
      exitCode: e.status ?? 1,
      output: (e.stdout ?? '') + stderrContent + (e.stderr ?? ''),
      callLog: readFileSync(callLog, 'utf8'),
    }
  }
}

describe('pilot-supabase-cleanup hermetic tests', () => {
  it('stops running containers before removing them when supabase stop returns 0 but resources remain', () => {
    writeStubs({
      supabaseStopExitCode: 0,
      runningContainers: ['abc123', 'def456', 'ghi789'],
      stoppedContainers: [],
      volumes: ['vol_data', 'vol_storage'],
      networks: ['net_default'],
    })

    const result = runCleanup('/tmp/fake-project', 'test-project-alpha')
    expect(result.exitCode).toBe(0)
    expect(result.output).toContain('PILOT_SUPABASE_CLEANUP_STOPPING: 3 running containers')
    expect(result.callLog).toContain('docker stop')
    expect(result.callLog).toContain('docker rm')
    expect(result.callLog).toContain('docker volume rm')
    expect(result.callLog).toContain('docker network rm')
    expect(result.output).toContain('FALLBACK_OK')
  })

  it('removes all stopped containers, volumes, and networks after graceful stop', () => {
    writeStubs({
      supabaseStopExitCode: 0,
      runningContainers: ['c1'],
      stoppedContainers: ['c2', 'c3'],
      volumes: ['v1'],
      networks: ['n1', 'n2'],
    })

    const result = runCleanup('/tmp/fake', 'proj-beta')
    expect(result.exitCode).toBe(0)
    expect(result.callLog).toContain('docker rm')
    expect(result.callLog).toContain('docker volume rm')
    expect(result.callLog).toContain('docker network rm')
  })

  it('does not touch neighbor project resources', () => {
    writeStubs({
      supabaseStopExitCode: 0,
      runningContainers: [],
      stoppedContainers: [],
      volumes: [],
      networks: [],
      neighborContainers: ['neighbor-c1', 'neighbor-c2'],
      neighborProject: 'other-project-id',
    })

    const result = runCleanup('/tmp/fake', 'my-project-id')
    expect(result.exitCode).toBe(0)
    expect(result.callLog).not.toContain('docker stop')
    expect(result.callLog).not.toMatch(/docker rm\b/)
    expect(result.output).toContain('CLEANUP_VERIFY: no resources remain')
  })

  it('fails gracefully when docker stop cannot stop a running container', () => {
    writeStubs({
      supabaseStopExitCode: 0,
      runningContainers: ['stuck-container'],
      stoppedContainers: [],
      volumes: [],
      networks: [],
      stopFails: true,
    })

    const result = runCleanup('/tmp/fake', 'proj-gamma')
    expect(result.exitCode).not.toBe(0)
    expect(result.output).toContain('PILOT_SUPABASE_CLEANUP_STOP_FAILED')
    expect(result.callLog).not.toContain('rm -f')
  })

  it('fails closed when Docker resource discovery fails', () => {
    writeStubs({ probeFails: true })

    const result = runCleanup('/tmp/fake', 'proj-probe-failure')
    expect(result.exitCode).not.toBe(0)
    expect(result.output).toContain('PILOT_SUPABASE_CLEANUP_RUNNING_PROBE_FAILED')
    expect(result.callLog).not.toContain('docker rm')
  })

  it('handles supabase stop returning nonzero and still cleans resources', () => {
    writeStubs({
      supabaseStopExitCode: 1,
      runningContainers: ['orphan1'],
      stoppedContainers: ['orphan2'],
      volumes: ['data_vol'],
      networks: [],
    })

    const result = runCleanup('/tmp/fake', 'proj-delta')
    expect(result.exitCode).toBe(0)
    expect(result.output).toContain('PILOT_SUPABASE_CLEANUP_FALLBACK: supabase stop returned 1')
    expect(result.callLog).toContain('docker stop')
    expect(result.callLog).toContain('docker rm')
    expect(result.output).toContain('FALLBACK_OK')
  })
})
