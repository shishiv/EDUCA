import { createClient, type Session } from '@supabase/supabase-js'
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const targetPassword = 'T07-Browser-Only-2026!'
const schoolId = '10000000-0000-0000-0000-000000000001'

type RevocationTarget = {
  email: string
  userId: string
}

function requireBrowserConfiguration(baseURL: string | undefined): string {
  if (!baseURL || !anonKey || !serviceRoleKey) {
    throw new Error('T07 browser test requires base URL and local Supabase credentials')
  }
  return baseURL
}

function serviceClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
}

async function createRevocationTarget(email: string): Promise<RevocationTarget> {
  const service = serviceClient()
  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email,
    password: targetPassword,
    email_confirm: true,
    user_metadata: { synthetic: true, pilot_role: 'diretor' },
  })
  if (authError || !authData.user) throw authError || new Error('T07 browser Auth fixture was not created')

  const { error: profileError } = await service.from('users').insert({
    id: authData.user.id,
    email,
    nome: 'T07 Browser Sintetico',
    tipo_usuario: 'diretor',
    escola_id: schoolId,
    ativo: true,
    primeiro_login: false,
    senha_padrao: false,
  })
  if (profileError) throw profileError

  return { email, userId: authData.user.id }
}

async function deleteRevocationTarget(userId: string): Promise<void> {
  const service = serviceClient()
  await service.from('users').delete().eq('id', userId)
  await service.auth.admin.deleteUser(userId)
}

async function signedInContext(
  browser: Browser,
  baseURL: string,
  email: string,
  password: string,
): Promise<BrowserContext> {
  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.session) throw error || new Error('T07 browser session was not created')

  const context = await browser.newContext({ baseURL })
  await setSessionCookie(context, baseURL, data.session)
  return context
}

async function setSessionCookie(context: BrowserContext, baseURL: string, session: Session): Promise<void> {
  const cookieHost = new URL(supabaseUrl).hostname.split('.')[0]
  await context.addCookies([{
    name: `sb-${cookieHost}-auth-token`,
    value: `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`,
    url: baseURL,
    httpOnly: false,
    secure: baseURL.startsWith('https://'),
    sameSite: 'Lax',
  }])
}

async function revokeTarget(actorPage: Page, userId: string) {
  return actorPage.evaluate(async targetUserId => {
    const response = await fetch(`/api/pilot/users/${targetUserId}/revoke`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ release: 't07-local', reason: 'synthetic-boundary-test' }),
    })
    return { status: response.status, body: await response.json() }
  }, userId)
}

async function assertRevokedSessionIsDenied(page: Page): Promise<void> {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login/)
  const staleApiStatus = await page.evaluate(async () => {
    const response = await fetch('/api/pilot/metrics')
    return response.status
  })
  expect([401, 403]).toContain(staleApiStatus)
}

test('redirects an already-issued session after synthetic revocation', async ({ browser, baseURL }) => {
  const appUrl = requireBrowserConfiguration(baseURL)
  const suffix = `${process.pid}-${Date.now()}`
  const target = await createRevocationTarget(`t07-browser-${suffix}@synthetic.invalid`)

  try {
    const targetContext = await signedInContext(browser, appUrl, target.email, targetPassword)
    try {
      const targetPage = await targetContext.newPage()
      await targetPage.goto('/dashboard')
      await expect(targetPage).toHaveURL(/\/dashboard/)

      const actorContext = await signedInContext(
        browser,
        appUrl,
        'secretaria@synthetic.invalid',
        'Synthetic-Only-2026!',
      )
      try {
        const response = await revokeTarget(await actorContext.newPage(), target.userId)
        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          revoked: true,
          receipt: {
            identity: expect.stringMatching(/^synthetic-[a-f0-9]+$/),
            role: 'diretor',
            school: schoolId,
            release: 't07-local',
            reason: 'synthetic-boundary-test',
            timestamp: expect.any(String),
          },
        })
        expect(JSON.stringify(response.body)).not.toMatch(/@|password|senha|token|jwt|phone|telefone|header/i)
      } finally {
        await actorContext.close()
      }

      await assertRevokedSessionIsDenied(targetPage)
    } finally {
      await targetContext.close()
    }
  } finally {
    await deleteRevocationTarget(target.userId)
  }
})
