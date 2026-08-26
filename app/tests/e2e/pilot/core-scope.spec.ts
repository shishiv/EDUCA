import { expect, test } from '@playwright/test'

test.describe('synthetic municipal pilot core scope', () => {
  test('shows only confirmed pilot modules plus the class diary', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByText('Escolas', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Usuários', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Alunos', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Turmas', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Matrículas', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Responsáveis', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Atribuições', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Frequência', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Diário de Classe', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Notas', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Relatórios', { exact: true })).toHaveCount(0)
  })

  test('loads core school and attendance flows', async ({ page }) => {
    await page.goto('/dashboard/escolas')
    await expect(page).toHaveURL(/\/unauthorized$/)
    await page.goto('/dashboard/alunos')
    await expect(page.getByRole('heading', { name: /alunos/i }).first()).toBeVisible()
    await page.goto('/dashboard/turmas')
    await expect(page.getByRole('heading', { name: /turmas/i }).first()).toBeVisible()
    await page.goto('/dashboard/turmas')
    await expect(page.getByRole('heading', { name: /turmas/i }).first()).toBeVisible()
  })

  test('redirects disabled pilot modules but serves the class diary', async ({ page }) => {
    await page.goto('/dashboard/notas')
    await expect(page).toHaveURL(/\/dashboard\?pilotScope=disabled/)
    await page.goto('/dashboard/calendario')
    await expect(page).toHaveURL(/\/dashboard\?pilotScope=disabled/)
    await page.goto('/dashboard/configuracoes')
    await expect(page).toHaveURL(/\/dashboard\?pilotScope=disabled/)
    await page.goto('/dashboard/sessoes')
    await expect(page).toHaveURL(/\/dashboard\?pilotScope=disabled/)

    await page.goto('/dashboard/diario')
    await expect(page).toHaveURL(/\/diario(?:\?|$)/)
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

  test('covers the complete synthetic authentication journey', async ({ page }) => {
    test.setTimeout(60_000)
    const password = 'Synthetic-Only-2026!'
    const roles = [
      ['secretaria@synthetic.invalid', 'Secretário(a)'],
      ['diretora.a@synthetic.invalid', 'Diretor(a)'],
      ['professora.a@synthetic.invalid', 'Professor(a)'],
    ] as const

    await page.context().clearCookies()
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login(?:\?|$)/)

    await page.getByLabel('E-mail', { exact: true }).fill('invalid@synthetic.invalid')
    await page.getByLabel('Senha', { exact: true }).fill('invalid-password')
    await page.getByRole('button', { name: /entrar/i }).click()
    await expect(page.getByRole('alert').filter({ hasText: /credenciais|inválid/i })).toBeVisible()
    await expect(page).toHaveURL(/\/login(?:\?|$)/)

    for (const [email, roleLabel] of roles) {
      await page.getByLabel('E-mail', { exact: true }).fill(email)
      await page.getByLabel('Senha', { exact: true }).fill(password)
      await page.getByRole('button', { name: /entrar/i }).click()
      await expect(page).toHaveURL(/\/dashboard$/)
      await expect(page.getByRole('button', { name: 'Abrir menu do usuário' })).toBeVisible()

      if (email === roles[0][0]) {
        await page.reload()
        await expect(page).toHaveURL(/\/dashboard$/)
        await expect(page.getByRole('button', { name: 'Abrir menu do usuário' })).toBeVisible()
      }

      await page.getByRole('button', { name: 'Abrir menu do usuário' }).click()
      await expect(page.getByText(roleLabel, { exact: true }).last()).toBeVisible()

      if (email === roles[2][0]) {
        await page.getByRole('menuitem', { name: /sair do sistema/i }).click()
        await expect(page).toHaveURL(/\/login$/)
      } else {
        await page.context().clearCookies()
        await page.goto('/login')
      }
    }

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login(?:\?|$)/)
  })
})
