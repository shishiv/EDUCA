import { createClient } from '@supabase/supabase-js'
import { expect, test } from '../support/diagnostics'
import { waitForPageLoad } from '../utils/test-helpers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const seededProfessor = {
  name: 'Professor Teste',
  email: 'professor@test.com',
}

function serviceClient() {
  expect(serviceRoleKey, 'SUPABASE_SERVICE_ROLE_KEY is required for exact E2E cleanup').not.toBe('')
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function removeInvitedUser(email: string) {
  const service = serviceClient()
  const { data: authData, error: authError } = await service.auth.admin.listUsers()
  if (authError) throw authError
  const authUserIds = authData.users.filter(user => user.email === email).map(user => user.id)

  const { error: invitationError } = await service.from('pilot_user_invitations').delete().eq('email', email)
  if (invitationError) throw invitationError
  const { error: profileError } = await service.from('users').delete().eq('email', email)
  if (profileError) throw profileError
  for (const userId of authUserIds) {
    const { error } = await service.auth.admin.deleteUser(userId)
    if (error) throw error
  }

  const { data: remainingProfile, error: remainingProfileError } = await service
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()
  if (remainingProfileError) throw remainingProfileError
  expect(remainingProfile, 'temporary user profile cleanup must be exact').toBeNull()
}

async function restoreSeededProfessor(id: string) {
  const { error } = await serviceClient()
    .from('users')
    .update({ nome: seededProfessor.name, email: seededProfessor.email })
    .eq('id', id)
  if (error) throw error
}

async function openUsers(page: import('@playwright/test').Page) {
  await page.goto('/dashboard/usuarios')
  await waitForPageLoad(page)
  await expect(page.getByRole('heading', { name: 'Usuários', exact: true })).toBeVisible()
}

test.describe('Usuários - contrato atual', () => {
  test('mostra a tabela e ações de linha com nomes acessíveis', async ({ page }) => {
    await openUsers(page)

    const table = page.getByRole('table')
    await expect(table).toBeVisible()
    await expect(table.getByRole('columnheader')).toHaveText([
      'Usuário',
      'Tipo',
      'Escola',
      'Último Acesso',
      'Status',
      'Ações',
    ])
    await expect(page.getByRole('link', { name: 'Ver detalhes de Professor Teste' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Desativar Professor Teste' })).toBeVisible()
  })

  test('pesquisa por usuário, mostra vazio e restaura a lista ao limpar', async ({ page }) => {
    await openUsers(page)
    const search = page.getByPlaceholder('Buscar por nome ou email...')

    await search.fill('professor@test.com')
    const rows = page.getByRole('table').locator('tbody tr')
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toContainText('Professor Teste')

    await search.fill('usuario-inexistente@synthetic.invalid')
    await expect(page.getByText('Nenhum usuário encontrado', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click()
    await expect(page.getByRole('row').filter({ hasText: seededProfessor.email })).toBeVisible()
  })

  test('abre os detalhes pela ação nomeada e persiste edição de nome e e-mail', async ({ page }) => {
    const editedName = 'Professor Teste Editado'
    const editedEmail = 'professor.editado@synthetic.invalid'
    let professorId = ''

    await openUsers(page)
    const detailLink = page.getByRole('link', { name: 'Ver detalhes de Professor Teste' })
    professorId = new URL(await detailLink.getAttribute('href') || '', 'http://localhost').pathname.split('/').pop() || ''
    expect(professorId).not.toBe('')

    try {
      await detailLink.click()
      await expect(page.getByText(seededProfessor.email, { exact: true }).first()).toBeVisible()
      await page.getByRole('button', { name: 'Editar', exact: true }).click()

      await expect(page.getByRole('combobox', { name: 'Tipo de usuário' })).toBeDisabled()
      await expect(page.getByRole('combobox', { name: 'Escola' })).toBeDisabled()
      await page.getByLabel('Nome completo', { exact: true }).fill(editedName)
      await page.getByLabel('E-mail', { exact: true }).fill(editedEmail)
      const updateResponse = page.waitForResponse(response =>
        response.request().method() === 'PATCH' && response.url().endsWith(`/api/users/${professorId}`),
      )
      await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click()
      expect((await updateResponse).status()).toBe(200)
      await expect(page.getByText('Professor atualizado com sucesso', { exact: true })).toBeVisible()

      await page.reload()
      await expect(page.getByText(editedName, { exact: true }).first()).toBeVisible()
      await expect(page.getByText(editedEmail, { exact: true }).first()).toBeVisible()
    } finally {
      if (professorId) await restoreSeededProfessor(professorId)
    }
  })

  test('convida secretário sintético e alterna seu status pela rota governada', async ({ page }) => {
    const suffix = `${Date.now()}-${test.info().workerIndex}`
    const name = `Secretário Contrato ${suffix}`
    const email = `secretario.contrato.${suffix}@synthetic.invalid`
    await removeInvitedUser(email)

    try {
      await page.goto('/dashboard/usuarios/novo')
      await waitForPageLoad(page)
      await page.getByLabel('Nome Completo *', { exact: true }).fill(name)
      await page.getByLabel('Email *', { exact: true }).fill(email)
      await page.getByRole('combobox', { name: 'Tipo de Usuário *' }).click()
      await page.getByRole('option', { name: 'Secretário', exact: true }).click()
      await expect(page.getByRole('combobox', { name: 'Escola' })).toBeDisabled()

      const invitationResponse = page.waitForResponse(response =>
        response.request().method() === 'POST' && response.url().includes('/api/pilot/invitations'),
      )
      await page.getByRole('button', { name: 'Criar usuário', exact: true }).click()
      expect((await invitationResponse).status()).toBe(201)
      await expect(page).toHaveURL(/\/dashboard\/usuarios$/)
      await expect(page.getByText('Convite enviado com sucesso!', { exact: true })).toBeVisible()

      const row = page.getByRole('row').filter({ hasText: email })
      await expect(row).toContainText(name)
      await expect(row).toContainText('Secretário(a)')
      await expect(row).toContainText('Todas as escolas')
      await expect(row).toContainText('Ativo')

      const disableResponse = page.waitForResponse(response =>
        response.request().method() === 'PATCH' && response.url().includes('/status'),
      )
      await row.getByRole('button', { name: `Desativar ${name}` }).click()
      expect((await disableResponse).status()).toBe(200)
      await expect(row).toContainText('Inativo')

      const enableResponse = page.waitForResponse(response =>
        response.request().method() === 'PATCH' && response.url().includes('/status'),
      )
      await row.getByRole('button', { name: `Ativar ${name}` }).click()
      expect((await enableResponse).status()).toBe(200)
      await expect(row).toContainText('Ativo')
    } finally {
      await removeInvitedUser(email)
    }
  })
})
