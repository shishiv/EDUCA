import { expect, test } from '@playwright/test'

test.describe('synthetic municipal pilot core scope', () => {
  test('shows only confirmed pilot modules', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByText('Escolas', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Usuários', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Alunos', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Turmas', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Matrículas', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Responsáveis', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Atribuicoes', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Frequência', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Notas', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Diário de Classe', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Relatórios', { exact: true })).toHaveCount(0)
  })

  test('loads core school and attendance flows', async ({ page }) => {
    await page.goto('/dashboard/escolas')
    await expect(page.getByRole('heading', { name: /escolas/i }).first()).toBeVisible()
    await page.goto('/dashboard/alunos')
    await expect(page.getByRole('heading', { name: /alunos/i }).first()).toBeVisible()
    await page.goto('/dashboard/turmas')
    await expect(page.getByRole('heading', { name: /turmas/i }).first()).toBeVisible()
    await page.goto('/dashboard/turmas')
    await expect(page.getByRole('heading', { name: /turmas/i }).first()).toBeVisible()
  })

  test('redirects disabled pilot modules', async ({ page }) => {
    await page.goto('/dashboard/notas')
    await expect(page).toHaveURL(/\/dashboard\?pilotScope=disabled/)
    await page.goto('/dashboard/diario')
    await expect(page).toHaveURL(/\/dashboard\?pilotScope=disabled/)
    await page.goto('/dashboard/calendario')
    await expect(page).toHaveURL(/\/dashboard\?pilotScope=disabled/)
    await page.goto('/dashboard/configuracoes')
    await expect(page).toHaveURL(/\/dashboard\?pilotScope=disabled/)
  })

  test('keeps offline service worker and IndexedDB disabled', async ({ page }) => {
    await page.goto('/dashboard')
    await expect.poll(async () => page.evaluate(async () => {
      const registrations = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistrations() : []
      const databases = 'databases' in indexedDB ? await indexedDB.databases() : []
      return {
        registrations: registrations.length,
        offlineDatabase: databases.some(database => database.name === 'GestaoEducacional'),
      }
    })).toEqual({ registrations: 0, offlineDatabase: false })
  })
})
