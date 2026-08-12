import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const targetPassword = 'T07-Browser-Only-2026!'
const schoolId = '10000000-0000-0000-0000-000000000001'

function serviceClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
}

test('redirects an already-issued session after synthetic revocation', async ({ browser, baseURL }) => {
  const service = serviceClient()
  const suffix = `${process.pid}-${Date.now()}`
  const email = `t07-browser-${suffix}@synthetic.invalid`
  let userId = ''

  try {
    const { data: authData, error: authError } = await service.auth.admin.createUser({
      email,
      password: targetPassword,
      email_confirm: true,
      user_metadata: { synthetic: true, pilot_role: 'diretor' },
    })
    if (authError || !authData.user) throw authError || new Error('T07 browser Auth fixture was not created')
    userId = authData.user.id

    const { error: profileError } = await service.from('users').insert({
      id: userId,
      email,
      nome: 'T07 Browser Sintetico',
      tipo_usuario: 'diretor',
      escola_id: schoolId,
      ativo: true,
      primeiro_login: false,
      senha_padrao: false,
    })
    if (profileError) throw profileError

    const targetClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    })
    const { error: signInError } = await targetClient.auth.signInWithPassword({ email, password: targetPassword })
    if (signInError) throw signInError
    const { data: sessionData, error: sessionError } = await targetClient.auth.getSession()
    if (sessionError || !sessionData.session) throw sessionError || new Error('T07 browser session was not created')

    const context = await browser.newContext({ baseURL: baseURL! })
    try {
      const cookieHost = new URL(supabaseUrl).hostname.split('.')[0]
      const cookieValue = `base64-${Buffer.from(JSON.stringify(sessionData.session)).toString('base64url')}`
      await context.addCookies([{
        name: `sb-${cookieHost}-auth-token`,
        value: cookieValue,
        url: baseURL!,
        httpOnly: false,
        secure: baseURL!.startsWith('https://'),
        sameSite: 'Lax',
      }])
      const page = await context.newPage()
      await page.goto('/dashboard')
      await expect(page).toHaveURL(/\/dashboard/)

      const actorClient = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      })
      const { error: actorSignInError } = await actorClient.auth.signInWithPassword({
        email: 'secretaria@synthetic.invalid',
        password: 'Synthetic-Only-2026!',
      })
      if (actorSignInError) throw actorSignInError
      const { data: actorSessionData, error: actorSessionError } = await actorClient.auth.getSession()
      if (actorSessionError || !actorSessionData.session) throw actorSessionError || new Error('T07 actor session was not created')

      const actorContext = await browser.newContext({ baseURL: baseURL! })
      try {
        const cookieHost = new URL(supabaseUrl).hostname.split('.')[0]
        await actorContext.addCookies([{
          name: `sb-${cookieHost}-auth-token`,
          value: `base64-${Buffer.from(JSON.stringify(actorSessionData.session)).toString('base64url')}`,
          url: baseURL!,
          httpOnly: false,
          secure: baseURL!.startsWith('https://'),
          sameSite: 'Lax',
        }])
        const actorPage = await actorContext.newPage()
        await actorPage.goto('/dashboard')
        const revocationResponse = await actorPage.evaluate(async targetUserId => {
          const response = await fetch(`/api/pilot/users/${targetUserId}/revoke`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ release: 't07-local', reason: 'synthetic-boundary-test' }),
          })
          return { status: response.status, body: await response.json() }
        }, userId)
        expect(revocationResponse.status).toBe(200)
        expect(revocationResponse.body).toMatchObject({
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
        expect(JSON.stringify(revocationResponse.body)).not.toMatch(/@|password|senha|token|jwt|phone|telefone|header/i)
      } finally {
        await actorContext.close()
      }

      await page.goto('/dashboard')
      await expect(page).toHaveURL(/\/login/)
      const staleApiStatus = await page.evaluate(async () => {
        const response = await fetch('/api/pilot/metrics')
        return response.status
      })
      expect([401, 403]).toContain(staleApiStatus)
    } finally {
      await context.close()
    }
  } finally {
    if (userId) {
      await service.from('users').delete().eq('id', userId)
      await service.auth.admin.deleteUser(userId)
    }
  }
})
