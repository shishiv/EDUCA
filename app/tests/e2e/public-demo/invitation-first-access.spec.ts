/**
 * J5 — Convite / primeiro acesso
 *
 * Requires: local Supabase stack with demo seed + service role key.
 * Mutations: YES — disposable local stack only.
 * Reuses patterns from pilot/invitation-first-access.spec.ts.
 */
import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const SCHOOL_A = '10000000-0000-0000-0000-000000000001'

const INVITE_EMAIL = 'journey.invite@synthetic.invalid'
const TEMP_PASSWORD = 'Temporary-Only-2026!'
const NEW_PASSWORD = 'First-Access-Journey-2026!'

test.describe('J5: invitation and first access', () => {
  test.skip(!SERVICE_ROLE_KEY, 'requires SUPABASE_SERVICE_ROLE_KEY')

  test('admin invites teacher, teacher completes first access', async ({ page }) => {
    // Step 1: Admin invites via API
    await page.goto('/dashboard')
    const inviteResponse = await page.evaluate(
      async ({ email, schoolId }) => {
        const res = await fetch('/api/pilot/invitations', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            email,
            name: 'Professora Journey Sintetica',
            role: 'professor',
            schoolId,
          }),
        })
        return { status: res.status, body: await res.json() }
      },
      { email: INVITE_EMAIL, schoolId: SCHOOL_A }
    )
    expect(inviteResponse.status).toBe(201)

    // Step 2: Service role sets temporary password
    const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
    const { data: users } = await service.auth.admin.listUsers()
    const invited = users.users.find((u) => u.email === INVITE_EMAIL)
    expect(invited).toBeTruthy()
    await service.auth.admin.updateUserById(invited!.id, {
      password: TEMP_PASSWORD,
      email_confirm: true,
    })

    // Step 3: Verify profile state
    const { data: profile } = await service
      .from('users')
      .select('primeiro_login, senha_padrao')
      .eq('id', invited!.id)
      .single()
    expect(profile).toMatchObject({ primeiro_login: true, senha_padrao: true })

    // Step 4: Teacher logs in and completes first access
    await page.context().clearCookies()
    await page.goto('/login')
    await page.getByLabel('E-mail', { exact: true }).fill(INVITE_EMAIL)
    await page.getByLabel('Senha', { exact: true }).fill(TEMP_PASSWORD)
    await page.getByRole('button', { name: /entrar/i }).click()
    await expect(page).toHaveURL(/dashboard/)

    const completion = await page.evaluate(async (password) => {
      const res = await fetch('/api/pilot/first-access', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      return { status: res.status, body: await res.json() }
    }, NEW_PASSWORD)
    expect(completion.status).toBe(200)
    expect(completion.body.completed).toBe(true)

    // Step 5: Verify profile updated
    const { data: updatedProfile } = await service
      .from('users')
      .select('primeiro_login, senha_padrao')
      .eq('id', invited!.id)
      .single()
    expect(updatedProfile).toMatchObject({ primeiro_login: false, senha_padrao: false })

    // Cleanup: remove test user
    await service.auth.admin.deleteUser(invited!.id)
  })
})
