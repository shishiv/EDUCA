import { execFileSync, spawn } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

/** One disposable profile. All interactions use AXI and run serially. */
export async function startRecoveryBrowser(project: string, name: string, origin: string) {
  const home = path.join(project, `browser-${name}`)
  mkdirSync(home)
  const profile = path.join(home, 'profile')
  const child = spawn('/usr/bin/chromium', ['--headless', '--no-sandbox', '--disable-dev-shm-usage', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
  const env = { ...process.env, HOME: home, TMPDIR: home, CHROME_DEVTOOLS_AXI_SESSION: name, CHROME_DEVTOOLS_AXI_AUTO_CONNECT: '0', CHROME_DEVTOOLS_AXI_BROWSER_URL: '' }

  function command(args: string[], input?: string) {
    try {
      return execFileSync('chrome-devtools-axi', args, { env, input, encoding: 'utf8', timeout: 90_000, stdio: ['pipe', 'pipe', 'pipe'] }).trim()
    } catch {
      // Tool errors may echo scripts, passwords and recovery URLs. No raw
      // output, trace, snapshot, HAR or storageState is retained in receipts.
      throw new Error(`F03_AXI_FAILED: ${args[0]}`)
    }
  }

  async function stop() {
    try { command(['stop']) } finally {
      child.kill('SIGTERM')
      for (let attempt = 0; attempt < 30 && child.exitCode === null && child.signalCode === null; attempt++) await delay(100)
      if (child.exitCode === null && child.signalCode === null) {
        child.kill('SIGKILL')
        await new Promise(resolve => child.once('exit', resolve))
      }
    }
  }

  try {
    for (let attempt = 0; attempt < 50; attempt++) {
      const port = readDebugPort(profile)
      if (port) {
        env.CHROME_DEVTOOLS_AXI_BROWSER_URL = `http://127.0.0.1:${port}`
        break
      }
      await delay(100)
    }
    if (!env.CHROME_DEVTOOLS_AXI_BROWSER_URL) throw new Error('F03_BROWSER_START_FAILED')
    command(['open', `${origin}/login`])
  } catch (error) {
    await stop()
    throw error
  }

  const run = (source: string) => command(['run'], source)
  return {
    run,
    open: (url: string) => { run(`await page.open(${JSON.stringify(url)});`) },
    fill(selector: string, value: string) {
      run(`await page.eval(() => document.querySelector(${JSON.stringify(selector)}).focus()); await page.press('Control+A'); await page.type(${JSON.stringify(value)});`)
    },
    click(selector: string) {
      run(`await page.eval(() => document.querySelector(${JSON.stringify(selector)}).click());`)
    },
    async assert(label: string, expression: string) {
      const result = run(`console.log(await page.eval(async () => {
        for (let attempt = 0; attempt < 100; attempt++) {
          if (${expression}) return true;
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        return false;
      }));`)
      if (result !== 'true') throw new Error(`F03_ASSERTION_FAILED: ${label}`)
      console.info(`PASS ${label}`)
    },
    screenshot(file: string) { command(['screenshot', file]) },
    resize(width: number, height: number) { command(['resize', String(width), String(height)]) },
    stop,
  }
}

function readDebugPort(profile: string): number | null {
  try {
    const port = Number(readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0])
    return Number.isInteger(port) && port > 0 ? port : null
  } catch {
    return null
  }
}

export type RecoveryBrowser = Awaited<ReturnType<typeof startRecoveryBrowser>>
