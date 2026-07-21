import { test as base, expect, type TestInfo } from '@playwright/test'

interface BrowserIssue {
  kind: 'console' | 'pageerror' | 'requestfailed' | 'response'
  message: string
}

const ignoredUrl = (url: string) =>
  url.includes('/_next/webpack-hmr') || url.endsWith('/favicon.ico')

const expectedResponse = (url: string, status: number, testInfo: TestInfo) => {
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

  return false
}

/**
 * Auto fixture that converts browser diagnostics into deterministic failures.
 * Keep exceptions small and evidence-backed; add new benign noise only here.
 */
export const test = base.extend<{ browserDiagnostics: void }>({
  browserDiagnostics: [
    async ({ page }, use, testInfo) => {
      const issues: BrowserIssue[] = []

      page.on('console', message => {
        if (message.type() !== 'error') return
        const text = message.text()
        if (/Download the React DevTools/i.test(text)) return
        if (
          /invalid credentials/i.test(testInfo.title) &&
          /invalid login credentials/i.test(text)
        ) return
        if (
          /invalid student id/i.test(testInfo.title) &&
          /failed to load resource|error loading student/i.test(text)
        ) return
        if (
          /prevents a duplicate session/i.test(testInfo.title) &&
          /erro_duplicacao|já existe uma sessão|ja existe uma sessao/i.test(text)
        ) return
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
