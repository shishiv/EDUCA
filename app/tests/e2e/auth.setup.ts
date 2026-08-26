import { test as setup, expect } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

// Paths relative to app/ root (where playwright.config.ts lives)
const AUTH_DIR = path.join(__dirname, '../../playwright/.auth')

const isPilotMode =
  process.env.PILOT_MODE === 'true' || !!process.env.PILOT_AUTH_STATE_PATH

/**
 * Pilot flow: UI login with the deterministic synthetic pilot identity.
 * The pilot runner (`scripts/run-pilot-e2e.sh`) provisions the pilot module
 * gate and seeds `secretaria@synthetic.invalid`, then points the chromium
 * project's storageState at `PILOT_AUTH_STATE_PATH`.
 */
if (isPilotMode) {
  const pilotAuthFile =
    process.env.PILOT_AUTH_STATE_PATH ||
    path.join(process.cwd(), 'playwright/.auth/user.json')

  setup('authenticate', async ({ page }) => {
    // Navigate to login
    await page.goto('/login')

    // Fill login form with the synthetic pilot secretariat credentials
    const emailInput = page.getByLabel('E-mail', { exact: true })
    await expect(emailInput).toBeVisible({ timeout: 15_000 })
    await emailInput.fill('secretaria@synthetic.invalid')
    await page.getByLabel('Senha', { exact: true }).fill('Synthetic-Only-2026!')

    // Submit login
    await page.getByRole('button', { name: /entrar/i }).click()

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/dashboard/, { timeout: 30000 })

    // Verify we're logged in
    await expect(page.getByRole('button', { name: 'Abrir menu do usuário' })).toBeVisible()

    // Save authentication state
    mkdirSync(path.dirname(pilotAuthFile), { recursive: true })
    await page.context().storageState({ path: pilotAuthFile })

    const browserReceiptPath = process.env.PILOT_LEGACY_BROWSER_RECEIPT_PATH
    if (browserReceiptPath) {
      mkdirSync(path.dirname(browserReceiptPath), { recursive: true })
      writeFileSync(browserReceiptPath, `${JSON.stringify({
        result: 'pass',
        boundary: 'real-playwright-browser',
        identity: 'secretaria@synthetic.invalid',
        role: 'secretario',
        schoolScope: 'municipal',
        domain: 'synthetic.invalid',
        landingRoute: new URL(page.url()).pathname,
      }, null, 2)}\n`, 'utf8')
    }
    console.info('PILOT_LEGACY_BROWSER_RECEIPT: result=pass identity=secretaria@synthetic.invalid role=secretario route=/dashboard')
  })
} else {
  /**
   * Standard flow: fetch a Supabase session via the REST API and encode it as
   * a cookie value that @supabase/ssr createBrowserClient expects
   * (base64-<base64url(sessionJson)>).
   */
  async function getSupabaseSessionCookie(email: string, password: string) {
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: {
          apikey: ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      }
    )
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Auth failed ${res.status}: ${body}`)
    }
    const data = await res.json()
    // Build the session object that @supabase/ssr stores
    const sessionObj = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      expires_in: data.expires_in,
      token_type: data.token_type,
      user: data.user,
    }
    // @supabase/ssr v0.7 stores as: base64-<base64url(JSON)>
    const jsonStr = JSON.stringify(sessionObj)
    const b64 = Buffer.from(jsonStr).toString('base64url')
    return {
      cookieValue: `base64-${b64}`,
      accessToken: data.access_token as string,
    }
  }

  /** Cookie name: sb-<host>-auth-token  where host = '127' for 127.0.0.1:54321 */
  function cookieName() {
    const url = new URL(SUPABASE_URL)
    return `sb-${url.hostname.split('.')[0]}-auth-token`
  }

  const authFile = path.join(AUTH_DIR, 'user.json')

  setup('authenticate as admin', async ({ browser }) => {
    const { cookieValue } = await getSupabaseSessionCookie('admin@test.com', 'test123456')
    const name = cookieName()

    const context = await browser.newContext()
    await context.addCookies([
      {
        name,
        value: cookieValue,
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        sameSite: 'Lax',
      },
    ])

    await context.storageState({ path: authFile })
    await context.close()
  })

  /**
   * Per-role auth files used by role-specific tests.
   * Creates separate auth state for diretor, professor, secretario, responsavel.
   */
  async function setupRoleAuth(
    browser: import('@playwright/test').Browser,
    email: string,
    outFile: string
  ) {
    const { cookieValue } = await getSupabaseSessionCookie(email, 'test123456')
    const name = cookieName()
    const context = await browser.newContext()
    await context.addCookies([
      {
        name,
        value: cookieValue,
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        sameSite: 'Lax',
      },
    ])
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/login`)
    await context.storageState({ path: outFile })
    await context.close()
  }

  setup('authenticate all roles', async ({ browser }) => {
    const base = AUTH_DIR
    await setupRoleAuth(browser, 'diretor@test.com', path.join(base, 'diretor.json'))
    await setupRoleAuth(browser, 'professor@test.com', path.join(base, 'professor.json'))
    await setupRoleAuth(browser, 'secretario@test.com', path.join(base, 'secretario.json'))
    await setupRoleAuth(browser, 'responsavel@test.com', path.join(base, 'responsavel.json'))
  })
}
