/**
 * J2 — Operador municipal sintético (admin)
 *
 * Requires: local Supabase stack with demo seed.
 * Mutations: YES — disposable local stack only.
 * Never run against the shared public sandbox.
 */
import { expect, test } from '@playwright/test'

const ADMIN_EMAIL = 'admin.sintetico@synthetic.invalid'
const PASSWORD = 'Synthetic-Only-2026!'
const CLASS_ID = '30000000-0000-0000-0000-000000000001'

test.describe('J2: municipal operator journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('E-mail', { exact: true }).fill(ADMIN_EMAIL)
    await page.getByLabel('Senha', { exact: true }).fill(PASSWORD)
    await page.getByRole('button', { name: /entrar/i }).click()
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('navigates core modules: schools, students, classes, enrollments', async ({ page }) => {
    await page.goto('/dashboard/escolas')
    await expect(page.getByRole('heading', { name: /escolas/i }).first()).toBeVisible()

    await page.goto('/dashboard/alunos')
    await expect(page.getByRole('heading', { name: /alunos/i }).first()).toBeVisible()

    await page.goto('/dashboard/turmas')
    await expect(page.getByRole('heading', { name: /turmas/i }).first()).toBeVisible()

    await page.goto('/dashboard/matriculas')
    await expect(page.getByRole('heading', { name: /matrículas/i }).first()).toBeVisible()
  })

  test('opens attendance session, saves, and verifies persistence', async ({ page }) => {
    await page.goto(`/dashboard/turmas/${CLASS_ID}/chamada`)
    await expect(page).toHaveURL(new RegExp(`${CLASS_ID}/chamada`))

    // If session not open, open it
    const openButton = page.getByRole('button', { name: /abrir chamada/i })
    if (await openButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await openButton.click()
    }

    await expect(page.getByText(/chamada aberta/i)).toBeVisible({ timeout: 10_000 })

    // Toggle first student's attendance
    const absent = page.getByRole('button', { name: 'Falta', exact: true }).first()
    await absent.click()
    await expect(absent).toHaveAttribute('aria-pressed', 'true')

    // Save
    const saveButton = page.getByRole('button', { name: 'Salvar', exact: true })
    await saveButton.click()
    await expect(page.getByText(/salva com sucesso/i)).toBeVisible()

    // Verify persistence
    await page.reload()
    await expect(page.getByRole('button', { name: 'Falta', exact: true }).first())
      .toHaveAttribute('aria-pressed', 'true')
  })
})
