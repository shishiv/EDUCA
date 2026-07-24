import { Page, BrowserContext, expect } from '@playwright/test'

/**
 * E2E Test Utilities for EDUCA
 */

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'

/**
 * Inject a fresh Supabase session cookie into the browser context.
 * Called automatically by navigateToDashboard when the auth cookie was cleared.
 */
async function injectSessionCookie(
  context: BrowserContext,
  email = 'admin@test.com',
  password = 'test123456'
) {
  const res = await context.request.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
      data: { email, password },
    }
  )
  if (!res.ok()) throw new Error(`injectSessionCookie failed: ${res.status()}`)
  const data = await res.json()
  const sessionObj = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    expires_in: data.expires_in,
    token_type: data.token_type,
    user: data.user,
  }
  const b64 = Buffer.from(JSON.stringify(sessionObj)).toString('base64url')
  const host = new URL(SUPABASE_URL).hostname.split('.')[0]
  await context.addCookies([{
    name: `sb-${host}-auth-token`,
    value: `base64-${b64}`,
    domain: 'localhost',
    path: '/',
    httpOnly: false,
    sameSite: 'Lax',
  }])
}

/**
 * Navigate to the dashboard, re-injecting auth if the useAuth hook signed out.
 * Resilient: waits 5s for the stat cards, then re-injects the cookie and retries.
 */
export async function navigateToDashboard(
  page: Page,
  email = 'admin@test.com'
) {
  const dashboardReady = () => email.startsWith('professor@')
    ? page.getByText('Dashboard do Professor')
    : page.getByText('Total de Alunos')

  await page.goto('/dashboard')
  try {
    // Fast path: dashboard loads correctly
    await expect(dashboardReady()).toBeVisible({ timeout: 8000 })
  } catch {
    // Slow path: stop active requests, clear stale chunks, then inject a fresh
    // role session before retrying.
    await page.goto('about:blank')
    await page.context().clearCookies()
    await injectSessionCookie(page.context(), email)
    await page.goto('/dashboard')
    await expect(dashboardReady()).toBeVisible({ timeout: 20000 })
  }
}

/**
 * Wait for page to be fully loaded.
 * Uses 'load' (not 'networkidle') because Supabase Realtime keeps a
 * WebSocket open permanently, so networkidle never fires.
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('load')
}

/**
 * Login helper: injects a Supabase session cookie directly (bypasses the UI
 * form which is fragile due to service-worker / hydration timing).
 * Safe to call even when the browser already has a session (idempotent).
 */
export async function loginAs(
  page: Page,
  email: string,
  password: string = 'test123456'
) {
  // Stop the previous role's auth/realtime requests before replacing its
  // session cookie. Replacing a cookie while the cached client is active races
  // getUser() and causes intermittent network/profile failures.
  await page.goto('about:blank')
  await page.context().clearCookies()
  await injectSessionCookie(page.context(), email, password)

  await page.goto('/dashboard')
  await expect(page).toHaveURL(/dashboard|unauthorized/, { timeout: 20000 })
}

/**
 * Fill a select/combobox by label
 */
export async function selectOption(
  page: Page, 
  labelPattern: RegExp, 
  optionPattern?: RegExp
) {
  const select = page.getByLabel(labelPattern)
  await select.click()
  
  if (optionPattern) {
    await page.getByRole('option', { name: optionPattern }).click()
  } else {
    await page.getByRole('option').first().click()
  }
}

/**
 * Fill date field
 */
export async function fillDate(page: Page, labelPattern: RegExp, date: Date) {
  const dateStr = date.toISOString().split('T')[0]
  const field = page.getByLabel(labelPattern)
  await field.fill(dateStr)
}

/**
 * Generate valid Brazilian CPF for testing
 * This generates a mathematically valid CPF
 */
export function generateValidCPF(): string {
  const randomDigits = () => Math.floor(Math.random() * 9)
  
  const digits = Array.from({ length: 9 }, randomDigits)
  
  // Calculate first check digit
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * (10 - i)
  }
  let check1 = 11 - (sum % 11)
  if (check1 >= 10) check1 = 0
  digits.push(check1)
  
  // Calculate second check digit
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += digits[i] * (11 - i)
  }
  let check2 = 11 - (sum % 11)
  if (check2 >= 10) check2 = 0
  digits.push(check2)
  
  // Format as XXX.XXX.XXX-XX
  const cpf = digits.join('')
  return `${cpf.slice(0,3)}.${cpf.slice(3,6)}.${cpf.slice(6,9)}-${cpf.slice(9,11)}`
}

/**
 * Generate random email for testing
 */
export function generateTestEmail(prefix: string = 'test'): string {
  return `${prefix}${Date.now()}@teste.com`
}

/**
 * Wait for toast/notification message
 */
export async function expectToast(page: Page, messagePattern: RegExp) {
  await expect(page.getByText(messagePattern)).toBeVisible({ timeout: 10000 })
}

/**
 * Wait for form submission success
 */
export async function expectFormSuccess(page: Page) {
  await expect(
    page.getByText(/sucesso|salvo|criado|atualizado|cadastrado/i)
  ).toBeVisible({ timeout: 10000 })
}

/**
 * Wait for form validation error
 */
export async function expectFormError(page: Page, errorPattern?: RegExp) {
  const pattern = errorPattern || /erro|inválido|obrigatório|falha/i
  await expect(page.getByText(pattern).first()).toBeVisible()
}

/**
 * Navigate to a dashboard section
 */
export async function navigateTo(page: Page, section: string) {
  await page.goto(`/dashboard/${section}`)
  await waitForPageLoad(page)
}

/**
 * Check if user is on authenticated page
 */
export async function assertAuthenticated(page: Page) {
  // Should not be on login page
  await expect(page).not.toHaveURL(/login/)
}

/**
 * Verify navigation menu is visible
 */
export async function assertNavigationVisible(page: Page) {
  // Check for sidebar or nav
  const nav = page.getByRole('navigation')
  await expect(nav).toBeVisible()
}

/**
 * Get table row count
 */
export async function getTableRowCount(page: Page): Promise<number> {
  const rows = page.getByRole('row')
  return await rows.count() - 1 // Subtract header row
}

/**
 * Brazilian phone formatter
 */
export function formatBrazilianPhone(number: string): string {
  const clean = number.replace(/\D/g, '')
  if (clean.length === 11) {
    return `(${clean.slice(0,2)}) ${clean.slice(2,7)}-${clean.slice(7)}`
  }
  if (clean.length === 10) {
    return `(${clean.slice(0,2)}) ${clean.slice(2,6)}-${clean.slice(6)}`
  }
  return number
}
