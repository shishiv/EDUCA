import { expect, test } from '../support/diagnostics'
import { waitForPageLoad } from '../utils/test-helpers'

async function openUsers(page: import('@playwright/test').Page) {
  await page.goto('/dashboard/usuarios')
  await waitForPageLoad(page)
  await expect(page.getByRole('heading', { name: 'Usuários', exact: true })).toBeVisible()
}

async function selectRoleFilter(page: import('@playwright/test').Page, role: string) {
  await page.getByRole('combobox', { name: 'Tipo' }).click()
  await page.getByRole('option', { name: role, exact: true }).click()
}

async function expectOnlyRole(page: import('@playwright/test').Page, role: string) {
  const rows = page.getByRole('table').locator('tbody tr')
  await expect(rows).not.toHaveCount(0)
  const roleCells = await rows.evaluateAll(tableRows => tableRows.map(row => row.children[1]?.textContent?.trim()))
  expect(roleCells).toEqual(roleCells.map(() => role))
}

function permissionRow(page: import('@playwright/test').Page, module: string) {
  return page.getByRole('tabpanel').getByText(module, { exact: true }).locator('..').locator('..')
}

test.describe('Usuários - papéis e permissões', () => {
  test('mostra a coluna e os papéis dos usuários cadastrados', async ({ page }) => {
    await openUsers(page)

    const table = page.getByRole('table')
    await expect(table.getByRole('columnheader', { name: 'Tipo', exact: true })).toBeVisible()
    await expect(table.getByRole('row').filter({ hasText: 'admin@test.com' })).toContainText('Administrador')
    await expect(table.getByRole('row').filter({ hasText: 'diretor@test.com' })).toContainText('Diretor(a)')
    await expect(table.getByRole('row').filter({ hasText: 'secretario@test.com' })).toContainText('Secretário(a)')
    await expect(table.getByRole('row').filter({ hasText: 'professor@test.com' })).toContainText('Professor(a)')
  })

  test('oferece somente os papéis permitidos para convite', async ({ page }) => {
    await page.goto('/dashboard/usuarios/novo')
    await waitForPageLoad(page)

    await page.getByRole('combobox', { name: 'Tipo de Usuário *' }).click()
    const options = page.getByRole('option')
    await expect(options).toHaveCount(3)
    await expect(page.getByRole('option', { name: 'Diretor', exact: true })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Secretário', exact: true })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Professor', exact: true })).toBeVisible()
    await expect(page.getByRole('option', { name: /admin/i })).toHaveCount(0)
  })

  test('filtra a tabela por administrador e professor', async ({ page }) => {
    await openUsers(page)

    await selectRoleFilter(page, 'Administrador')
    await expectOnlyRole(page, 'Administrador')

    await selectRoleFilter(page, 'Professor')
    await expectOnlyRole(page, 'Professor(a)')
  })

  test('mantém papel e escola bloqueados na edição inline', async ({ page }) => {
    await openUsers(page)
    await page.getByRole('link', { name: 'Ver detalhes de Professor Teste' }).click()
    await page.getByRole('button', { name: 'Editar', exact: true }).click()

    await expect(page.getByRole('combobox', { name: 'Tipo de usuário' })).toBeDisabled()
    await expect(page.getByRole('combobox', { name: 'Escola' })).toBeDisabled()
  })

  test('deriva as permissões do professor da política de rotas', async ({ page }) => {
    await openUsers(page)
    await page.getByRole('link', { name: 'Ver detalhes de Professor Teste' }).click()
    await page.getByRole('tab', { name: 'Permissões', exact: true }).click()

    await expect(permissionRow(page, 'Dashboard')).toContainText('Permitido')
    await expect(permissionRow(page, 'Turmas')).toContainText('Permitido')
    await expect(permissionRow(page, 'Notas')).toContainText('Permitido')
    await expect(permissionRow(page, 'Alunos')).toContainText('Negado')
    await expect(permissionRow(page, 'Usuários')).toContainText('Negado')
    await expect(permissionRow(page, 'Matrículas')).toContainText('Negado')
    await expect(permissionRow(page, 'Relatórios')).toContainText('Negado')
    await expect(permissionRow(page, 'Configurações')).toContainText('Negado')
  })
})
