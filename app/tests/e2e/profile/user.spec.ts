import { createClient } from '@supabase/supabase-js'
import type { Locator, Page, Response } from '@playwright/test'
import { z } from 'zod'
import type { Database } from '@/types/database'
import { test, expect } from '../support/diagnostics'
import { authenticatedUserId } from '../support/authenticated-user'
import { loginAs } from '../utils/test-helpers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const receiptSchema = z.object({ receipt: z.string().uuid() })

function serviceClient() {
  if (!['localhost', '127.0.0.1'].includes(new URL(supabaseUrl).hostname)) {
    throw new Error('Profile fixtures require local Supabase')
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!serviceKey.startsWith('sb_secret_')) throw new Error('Profile fixtures require the local service key')
  return createClient<Database>(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function openProfile(page: Page) {
  await page.goto('/dashboard/perfil')
  await expect(page.getByRole('heading', { name: 'Meu Perfil', exact: true })).toBeVisible()
  await expect(page.getByLabel('Nome Completo', { exact: true })).toHaveValue(/\S/)
}

async function currentActor(page: Page) {
  const userId = authenticatedUserId(await page.context().cookies())
  if (!userId) throw new Error('Profile contract requires an authenticated fixture')
  const service = serviceClient()
  const { data: profile, error } = await service.from('users')
    .select('id, nome, email, tipo_usuario, escola_id, ativo').eq('id', userId).single()
  if (error) throw error
  expect(profile).toMatchObject({ email: 'admin@test.com', tipo_usuario: 'admin', escola_id: null, ativo: true })
  const { data, error: authError } = await service.auth.admin.getUserById(userId)
  if (authError) throw authError
  return { profile, lastSignInAt: data.user.last_sign_in_at }
}

async function expectLastAccess(time: Locator, expected: string | undefined) {
  if (!expected) throw new Error('The authenticated account has no persisted sign-in timestamp')
  await expect(time).toHaveAttribute('datetime', /\S/)
  const displayed = await time.getAttribute('datetime')
  if (!displayed) throw new Error('Last access has no machine-readable timestamp')
  // GoTrue's session and admin endpoints retain different submillisecond
  // precision. Both values must represent the same JavaScript timestamp.
  expect(new Date(displayed).getTime()).toBe(new Date(expected).getTime())
  await expect(time).toContainText('Último acesso:')
}

test('profile displays the persisted identity and actual last sign-in', async ({ page }) => {
  await openProfile(page)
  const { profile, lastSignInAt } = await currentActor(page)
  await expect(page.getByLabel('Nome Completo', { exact: true })).toHaveValue(profile.nome)
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue(profile.email || '')
  await expect(page.getByLabel('Email', { exact: true })).toBeDisabled()
  await expectLastAccess(page.getByRole('main').locator('time'), lastSignInAt)
  await page.getByRole('tab', { name: 'Segurança', exact: true }).click()
  await expectLastAccess(page.getByRole('tabpanel').locator('time'), lastSignInAt)
})

test('profile saves its own name with an audit receipt and survives reload', async ({ page }) => {
  await openProfile(page)
  const { profile } = await currentActor(page)
  const name = 'Admin Perfil E2E ' + Date.now()
  let saveResponse: Promise<Response> | undefined
  try {
    await page.getByLabel('Nome Completo', { exact: true }).fill(name)
    saveResponse = page.waitForResponse(response =>
      response.request().method() === 'PATCH' && response.url().endsWith('/api/users/me'),
    )
    await page.getByRole('button', { name: 'Salvar Alterações', exact: true }).click()
    const response = await saveResponse
    expect(response.status()).toBe(200)
    expect(response.request().postDataJSON()).toEqual({ nome: name })
    const { receipt } = receiptSchema.parse(await response.json())
    await expect(page.getByText('Perfil atualizado com sucesso!', { exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByLabel('Nome Completo', { exact: true })).toHaveValue(name)
    const { profile: saved } = await currentActor(page)
    expect(saved).toEqual({ ...profile, nome: name })
    const { data: audit, error } = await serviceClient().from('pilot_audit_log')
      .select('actor_user_id, entity_id, event_type').eq('id', receipt).single()
    if (error) throw error
    expect(audit).toEqual({ actor_user_id: profile.id, entity_id: profile.id, event_type: 'profile_updated' })
  } finally {
    await saveResponse?.catch(() => undefined)
    const restored = await page.request.patch('/api/users/me', { data: { nome: profile.nome } })
    expect(restored.status()).toBe(200)
    expect((await currentActor(page)).profile).toEqual(profile)
  }
})

for (const scenario of [
  { name: 'mismatched confirmation', current: 'test123456', password: 'Updated-Synthetic-123!', confirmation: 'Different-Synthetic-123!', message: 'As senhas não coincidem' },
  { name: 'short password', current: 'test123456', password: '123', confirmation: '123', message: 'A senha deve ter pelo menos 6 caracteres' },
  { name: 'missing current password', current: '', password: 'Updated-Synthetic-123!', confirmation: 'Updated-Synthetic-123!', message: 'Erro ao alterar senha' },
]) {
  test('profile rejects ' + scenario.name + ' before contacting authentication', async ({ page }) => {
    await openProfile(page)
    await page.getByRole('tab', { name: 'Senha', exact: true }).click()
    const authWrites: string[] = []
    page.on('request', request => {
      if (request.url().includes('/auth/v1/') && ['POST', 'PUT', 'PATCH'].includes(request.method())) {
        authWrites.push(request.url())
      }
    })
    await page.getByLabel('Senha Atual', { exact: true }).fill(scenario.current)
    await page.getByLabel('Nova Senha', { exact: true }).fill(scenario.password)
    await page.getByLabel('Confirmar Nova Senha', { exact: true }).fill(scenario.confirmation)
    await page.getByRole('button', { name: 'Alterar Senha', exact: true }).click()
    await expect(page.getByText(scenario.message, { exact: true })).toBeVisible()
    expect(authWrites).toEqual([])
  })
}

test('profile changes the password of an isolated synthetic account', async ({ page, request }) => {
  const service = serviceClient()
  const email = 'profile-password-' + Date.now() + '@synthetic.invalid'
  const password = 'Original-Synthetic-123!'
  const nextPassword = 'Changed-Synthetic-123!'
  const { data: school, error: schoolError } = await service.from('escolas')
    .select('id').eq('ativo', true).eq('nome', 'CEMEI Pequenos Passos').single()
  if (schoolError) throw schoolError
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw error
  const userId = data.user.id
  let passwordResponse: Promise<Response> | undefined
  try {
    const { error: profileError } = await service.from('users').upsert({
      id: userId, nome: 'Professor Senha Sintética', email,
      tipo_usuario: 'professor', escola_id: school.id, ativo: true,
    })
    if (profileError) throw profileError
    await loginAs(page, email, password)
    await openProfile(page)
    await page.getByRole('tab', { name: 'Senha', exact: true }).click()
    await page.getByLabel('Senha Atual', { exact: true }).fill(password)
    await page.getByLabel('Nova Senha', { exact: true }).fill(nextPassword)
    await page.getByLabel('Confirmar Nova Senha', { exact: true }).fill(nextPassword)
    passwordResponse = page.waitForResponse(response =>
      response.request().method() === 'PUT' && new URL(response.url()).pathname === '/auth/v1/user',
    )
    await page.getByRole('button', { name: 'Alterar Senha', exact: true }).click()
    expect((await passwordResponse).status()).toBe(200)
    await expect(page.getByText('Senha alterada com sucesso!', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Senha Atual', { exact: true })).toHaveValue('')
    const headers = { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' }
    const oldLogin = await request.post(supabaseUrl + '/auth/v1/token?grant_type=password', {
      headers, data: { email, password },
    })
    expect(oldLogin.status()).toBe(400)
    const newLogin = await request.post(supabaseUrl + '/auth/v1/token?grant_type=password', {
      headers, data: { email, password: nextPassword },
    })
    expect(newLogin.status()).toBe(200)
  } finally {
    await passwordResponse?.catch(() => undefined)
    await page.goto('/politica-privacidade')
    await expect(page.getByRole('heading', { name: 'Política de Privacidade', level: 1, exact: true })).toBeVisible()
    // Login leaves immutable audit history referencing this account. Retire
    // the exact fixture here; the disposable database lifecycle removes it.
    const { error: profileError } = await service.from('users').update({ ativo: false }).eq('id', userId)
    if (profileError) throw profileError
    const { error: authError } = await service.auth.admin.updateUserById(userId, { ban_duration: '24h' })
    if (authError) throw authError
    const { data: retired, error: retiredError } = await service.from('users').select('ativo').eq('id', userId).single()
    if (retiredError) throw retiredError
    expect(retired.ativo).toBe(false)
  }
})

test('profile controls remain usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openProfile(page)
  await expect(page.getByRole('button', { name: 'Salvar Alterações', exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'Senha', exact: true }).click()
  await expect(page.getByLabel('Senha Atual', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false)
})
