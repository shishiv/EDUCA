import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'

const email = 'invited.teacher@synthetic.invalid'
const temporaryPassword = 'Temporary-Only-2026!'
const firstAccessPassword = 'First-Access-Only-2026!'
const schoolA = '10000000-0000-0000-0000-000000000001'

test('invites a teacher and completes first access', async ({ page }) => {
  await page.goto('/dashboard')
  const invitation = await page.evaluate(async ({ email, schoolA }) => {
    const response = await fetch('/api/pilot/invitations', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, name: 'Professora Convidada Sintetica', role: 'professor', schoolId: schoolA }),
    })
    return { status: response.status, body: await response.json() }
  }, { email, schoolA })
  expect(invitation.status).toBe(201)

  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const { data: users } = await service.auth.admin.listUsers()
  const invited = users.users.find(user => user.email === email)
  expect(invited).toBeTruthy()
  await service.auth.admin.updateUserById(invited!.id, { password: temporaryPassword, email_confirm: true })

  await page.context().clearCookies()
  await page.goto('/login')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(temporaryPassword)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL(/dashboard/)

  const completion = await page.evaluate(async password => {
    const response = await fetch('/api/pilot/first-access', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }),
    })
    return { status: response.status, body: await response.json() }
  }, firstAccessPassword)
  expect(completion).toEqual(expect.objectContaining({ status: 200, body: expect.objectContaining({ completed: true }) }))

  const { data: profile } = await service.from('users').select('primeiro_login').eq('id', invited!.id).single()
  expect(profile?.primeiro_login).toBe(false)
})

test('rejects parent invitations during the pilot', async ({ page }) => {
  await page.goto('/dashboard')
  const status = await page.evaluate(async schoolId => {
    const response = await fetch('/api/pilot/invitations', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'parent@synthetic.invalid', name: 'Parent Synthetic', role: 'responsavel', schoolId }),
    })
    return response.status
  }, schoolA)
  expect(status).toBe(400)
})

test('invites municipal secretariat and a school director', async ({ page }) => {
  await page.goto('/dashboard')
  for (const invitation of [
    { email: 'invited.secretariat@synthetic.invalid', name: 'Secretaria Convidada Sintetica', role: 'secretario', schoolId: null },
    { email: 'invited.director@synthetic.invalid', name: 'Diretora Convidada Sintetica', role: 'diretor', schoolId: schoolA },
  ]) {
    const status = await page.evaluate(async payload => (await fetch('/api/pilot/invitations', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
    })).status, invitation)
    expect(status).toBe(201)
  }
})
