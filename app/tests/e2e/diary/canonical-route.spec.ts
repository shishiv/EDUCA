import { test, expect } from '../support/diagnostics'
import type { Page } from '@playwright/test'
import { waitForPageLoad } from '../utils/test-helpers'

const PROFESSOR_AUTH = 'playwright/.auth/professor.json'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const PROFESSOR_PASSWORD = 'test123456'

async function authenticateNamedHost(page: Page) {
  const response = await page.request.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: { apikey: SUPABASE_ANON_KEY, 'content-type': 'application/json' },
      data: { email: 'professor@test.com', password: PROFESSOR_PASSWORD },
    },
  )
  expect(response.ok()).toBe(true)
  const session = await response.json()
  const supabaseHost = new URL(SUPABASE_URL).hostname.split('.')[0]
  const appHost = new URL(process.env.PLAYWRIGHT_BASE_URL || 'http://localhost').hostname
  const sessionValue = Buffer.from(JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: session.token_type,
    user: session.user,
  })).toString('base64url')

  await page.context().addCookies([{
    name: `sb-${supabaseHost}-auth-token`,
    value: `base64-${sessionValue}`,
    domain: appHost,
    path: '/',
    httpOnly: false,
    sameSite: 'Lax',
  }])
}

/**
 * E2E contract for the canonical class diary route.
 *
 * The browser observes the real PostgREST requests. The legacy-source
 * assertion is intentional: changing the product read back to aulas_abertas
 * must make this test fail instead of allowing a self-consistent fake green.
 */
test.describe('Diário - canonical route and source', () => {
  test.use({ storageState: PROFESSOR_AUTH })

  test.beforeEach(async ({ page }) => {
    await authenticateNamedHost(page)
  })

  async function selectSeedClass(page: import('@playwright/test').Page) {
    const classSelector = page.getByLabel('Turma', { exact: true })
    await expect(classSelector).toBeVisible()
    await classSelector.click()
    await page.getByRole('option', { name: /1º Ano A E2E/ }).click()
  }

  test('redirects the dashboard alias and reads the canonical session source', async ({ page }) => {
    const canonicalRequests: string[] = []
    const legacyRequests: string[] = []

    page.on('request', request => {
      const url = request.url()
      if (!url.includes('/rest/v1/')) return
      if (url.includes('/sessoes_aula')) canonicalRequests.push(url)
      if (url.includes('/aulas_abertas')) legacyRequests.push(url)
    })

    await page.goto('/dashboard/diario')
    await waitForPageLoad(page)
    await expect(page).toHaveURL(/\/diario(?:\?|$)/)
    await expect.poll(() => canonicalRequests.length + legacyRequests.length).toBeGreaterThan(0)

    // Deliberate-break tripwire: changing the source back to aulas_abertas
    // makes this assertion fail before any UI oracle can hide the regression.
    expect(legacyRequests).toEqual([])
    await expect(page.getByRole('heading', { name: /diário de classe/i })).toBeVisible()

    await selectSeedClass(page)
    await expect(page.getByText('1º Ano A E2E', { exact: true }).first()).toBeVisible()
    await expect.poll(() => canonicalRequests.length).toBeGreaterThan(0)
  })

  test('serves the same canonical diary surface at /diario', async ({ page }) => {
    const legacyRequests: string[] = []
    page.on('request', request => {
      if (request.url().includes('/rest/v1/aulas_abertas')) legacyRequests.push(request.url())
    })

    await page.goto('/diario')
    await waitForPageLoad(page)
    await expect(page).toHaveURL(/\/diario$/)
    await selectSeedClass(page)
    await expect(page.getByText('1º Ano A E2E', { exact: true }).first()).toBeVisible()

    expect(legacyRequests).toEqual([])
  })
})
