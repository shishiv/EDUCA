import { test as base, expect, type TestInfo } from '@playwright/test'
import { schoolSelectionStorageKey } from '@/contexts/escola-selection'
import { authenticatedUserId } from './authenticated-user'

interface BrowserIssue {
  kind: 'console' | 'pageerror' | 'requestfailed' | 'response'
  message: string
}

const ignoredUrl = (url: string) => url.includes('/_next/webpack-hmr')

function expectedStaleAlert(url: string, status: number, testInfo: TestInfo) {
  const request = new URL(url)
  return testInfo.title.startsWith('F09 exact metrics') && status === 409
    && request.pathname === '/api/dashboard/alerts'
    && request.searchParams.get('year') !== String(new Date().getFullYear())
}

const expectedResponse = (url: string, status: number, testInfo: TestInfo) => {
  if (expectedStaleAlert(url, status, testInfo)) return true
  // Invalid-credential coverage intentionally exercises Supabase's 400 response.
  if (
    status === 400 &&
    url.includes('/auth/v1/token') &&
    /invalid credentials/i.test(testInfo.title)
  ) return true

  if (
    (status === 400 || status === 406) &&
    url.includes('/rest/v1/alunos') &&
    /invalid student id/i.test(testInfo.title)
  ) return true

  const probes = [
    { title: 'F09 titular persists', status: 400, path: '/rest/v1/rpc/write_governed_turma' },
    { title: 'F09 cancellation persists', status: 400, path: '/rest/v1/rpc/update_governed_enrollment' },
    { title: 'F09 a failed dashboard query', status: 503, path: '/rest/v1/frequencia' },
  ]
  return probes.some(probe => testInfo.title.startsWith(probe.title)
    && status === probe.status && new URL(url).pathname === probe.path)
}

function expectedConsole(text: string, testInfo: TestInfo): boolean {
  if (/Download the React DevTools/i.test(text)) return true
  if (testInfo.project.name === 'chromium-unauth' && /AuthSessionMissingError|Auth session missing/i.test(text)) return true
  const expected = [
    { title: /invalid credentials/i, message: /invalid login credentials|failed to load resource: the server responded with a status of 400/i },
    { title: /invalid student id/i, message: /failed to load resource|error loading student/i },
    { title: /prevents a duplicate session/i, message: /erro_duplicacao|já existe uma sessão|ja existe uma sessao/i },
    // These errors are induced and asserted by the corresponding F09 negative probes.
    { title: /^F09 exact metrics/, message: /Failed to load resource: the server responded with a status of 409/ },
    { title: /^F09 titular persists/, message: /Failed to load resource: the server responded with a status of 400/ },
    { title: /^F09 cancellation persists/, message: /Failed to load resource: the server responded with a status of 400|Erro ao atualizar matrícula:.*PILOT_MANAGEMENT_STUDENT_DENIED/ },
    { title: /^F09 a failed dashboard query/, message: /Failed to load resource: the server responded with a status of 503|DASHBOARD_(STATS|DATA)_LOAD_FAILED/ },
  ]
  return expected.some(pattern => pattern.title.test(testInfo.title) && pattern.message.test(text))
}

/**
 * Auto fixture that converts browser diagnostics into deterministic failures.
 * Keep exceptions small and evidence-backed; add new benign noise only here.
 */
export const test = base.extend<{ browserDiagnostics: void }>({
  page: async ({ page }, applyPage) => {
    const selectedSchoolId = process.env.E2E_SELECTED_SCHOOL_ID
    if (selectedSchoolId) {
      const userId = authenticatedUserId(await page.context().cookies())
      if (userId) {
        await page.addInitScript(({ schoolId, storageKey }) => {
          if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') return
          // Seed only the initial selection. Reload must retain real user context changes.
          if (window.sessionStorage.getItem(storageKey) === null) {
            window.sessionStorage.setItem(storageKey, schoolId)
          }
        }, { schoolId: selectedSchoolId, storageKey: schoolSelectionStorageKey(userId) })
      }
    }
    await applyPage(page)
  },
  browserDiagnostics: [
    async ({ page }, use, testInfo) => {
      const issues: BrowserIssue[] = []

      page.on('console', message => {
        if (message.type() !== 'error') return
        const text = message.text()
        if (expectedConsole(text, testInfo)) return
        issues.push({ kind: 'console', message: text })
      })

      page.on('pageerror', error => {
        issues.push({ kind: 'pageerror', message: error.message })
      })

      page.on('requestfailed', request => {
        const url = request.url()
        const reason = request.failure()?.errorText || 'unknown failure'
        if (ignoredUrl(url) || reason.includes('net::ERR_ABORTED')) return
        issues.push({ kind: 'requestfailed', message: `${request.method()} ${url}: ${reason}` })
      })

      page.on('response', response => {
        const status = response.status()
        if (status < 400) return
        const url = response.url()
        if (ignoredUrl(url) || expectedResponse(url, status, testInfo)) return
        issues.push({
          kind: 'response',
          message: `${response.request().method()} ${url}: HTTP ${status}`,
        })
      })

      await use()

      if (issues.length === 0) return

      const report = issues
        .map(issue => `[${issue.kind}] ${issue.message}`)
        .join('\n')
      await testInfo.attach('browser-diagnostics.txt', {
        body: Buffer.from(report),
        contentType: 'text/plain',
      })

      // Preserve the original assertion failure when one already exists.
      if (testInfo.errors.length === 0) {
        throw new Error(`Browser diagnostics detected:\n${report}`)
      }
    },
    { auto: true },
  ],
})

export { expect }
