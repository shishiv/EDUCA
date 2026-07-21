import { test, expect } from '../support/diagnostics'
import { navigateToDashboard } from '../utils/test-helpers'

test.use({ storageState: 'playwright/.auth/professor.json' })

let attendancePath: string | null = null

async function openJustification(page: import('@playwright/test').Page) {
  if (!attendancePath) {
    await page.goto('/dashboard/turmas')
    const classLink = page
      .locator('a[href^="/dashboard/turmas/"]:not([href="/dashboard/turmas/nova"])')
      .first()
    await expect(classLink).toBeVisible({ timeout: 15000 })
    attendancePath = `${await classLink.getAttribute('href')}/chamada`
  }

  await page.goto(attendancePath)
  const button = page.getByRole('button', { name: 'Justificada' }).first()
  try {
    await expect(button).toBeVisible({ timeout: 5000 })
  } catch {
    await navigateToDashboard(page, 'professor@test.com')
    await page.goto(attendancePath)
    await expect(button).toBeVisible({ timeout: 15000 })
  }
  await button.click()
  const dialog = page.getByRole('dialog', { name: /justificar falta/i })
  await expect(dialog).toBeVisible()
  return { button, dialog }
}

test.describe('Attendance justification dialog', () => {
  test('opens with the selected student context', async ({ page }) => {
    const { dialog } = await openJustification(page)
    await expect(dialog.getByText(/informe o motivo/i)).toBeVisible()
    await expect(dialog.getByLabel(/motivo/i)).toBeVisible()
  })

  test('auto-focuses the justification textarea', async ({ page }) => {
    const { dialog } = await openJustification(page)
    await expect(dialog.getByLabel(/motivo/i)).toBeFocused()
  })

  test('requires non-whitespace content', async ({ page }) => {
    const { dialog } = await openJustification(page)
    const confirm = dialog.getByRole('button', { name: /confirmar/i })
    await expect(confirm).toBeDisabled()
    await dialog.getByLabel(/motivo/i).fill('   ')
    await expect(confirm).toBeDisabled()
    await dialog.getByLabel(/motivo/i).fill('Consulta médica')
    await expect(confirm).toBeEnabled()
  })

  test('confirms with Ctrl+Enter', async ({ page }) => {
    const { button, dialog } = await openJustification(page)
    const textarea = dialog.getByLabel(/motivo/i)
    await textarea.fill('Atestado médico')
    await textarea.press('Control+Enter')
    await expect(dialog).toBeHidden()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  test('cancels without changing the status', async ({ page }) => {
    const { dialog } = await openJustification(page)
    await dialog.getByLabel(/motivo/i).fill('Rascunho descartado')
    await dialog.getByRole('button', { name: /cancelar/i }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('button', { name: 'Justificada' }).first()).toHaveAttribute('aria-pressed', 'false')
  })

  test('closes on Escape', async ({ page }) => {
    const { dialog } = await openJustification(page)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })

  test('traps keyboard focus inside the dialog', async ({ page }) => {
    const { dialog } = await openJustification(page)
    await dialog.getByLabel(/motivo/i).focus()
    for (let index = 0; index < 6; index += 1) {
      await page.keyboard.press('Tab')
      const inside = await dialog.evaluate(element => element.contains(document.activeElement))
      expect(inside).toBe(true)
    }
  })

  test('exposes accessible labels for every action', async ({ page }) => {
    const { dialog } = await openJustification(page)
    await expect(dialog.getByRole('button', { name: /cancelar/i })).toBeVisible()
    await expect(dialog.getByRole('button', { name: /confirmar/i })).toBeVisible()
    await expect(dialog.getByLabel(/motivo/i)).toHaveAttribute('placeholder', /atestado/i)
  })
})
