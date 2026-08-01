import { test, expect } from '../support/diagnostics'
import { navigateToDashboard } from '../utils/test-helpers'

test.use({ storageState: 'playwright/.auth/professor.json' })

let attendancePath: string | null = null

async function openAttendance(page: import('@playwright/test').Page) {
  if (!attendancePath) {
    await page.goto('/dashboard/turmas')
    const classLink = page
      .locator('a[href^="/dashboard/turmas/"]:not([href="/dashboard/turmas/nova"])')
      .first()
    await expect(classLink).toBeVisible({ timeout: 15000 })
    const detailPath = await classLink.getAttribute('href')
    expect(detailPath).toBeTruthy()
    attendancePath = `${detailPath}/chamada`
  }

  await page.goto(attendancePath)
  try {
    await expect(page.getByRole('button', { name: 'Presente' }).first()).toBeVisible({ timeout: 5000 })
  } catch {
    await navigateToDashboard(page, 'professor@test.com')
    await page.goto(attendancePath)
    await expect(page.getByRole('button', { name: 'Presente' }).first()).toBeVisible({ timeout: 15000 })
  }
}

async function setPressed(
  button: import('@playwright/test').Locator,
  pressed: boolean
) {
  const current = await button.getAttribute('aria-pressed')
  if ((current === 'true') !== pressed) await button.click()
  await expect(button).toHaveAttribute('aria-pressed', String(pressed))
}

test.describe('Attendance grid', () => {
  test.beforeEach(async ({ page }) => {
    await openAttendance(page)
  })

  test('renders one P/F/J control group per seeded student', async ({ page }) => {
    const present = page.getByRole('button', { name: 'Presente' })
    const absent = page.getByRole('button', { name: 'Falta' })
    const justified = page.getByRole('button', { name: 'Justificada' })
    expect(await present.count()).toBeGreaterThan(0)
    await expect(absent).toHaveCount(await present.count())
    await expect(justified).toHaveCount(await present.count())
  })

  test('shows aggregate attendance statistics and save state', async ({ page }) => {
    await expect(page.locator('p').filter({ hasText: /presentes/i }).first()).toBeVisible()
    await expect(page.getByText(/\d+% frequencia/i)).toBeVisible()
    // A new attendance date defaults all students to present and requires save.
    await expect(page.getByRole('button', { name: 'Salvar', exact: true })).toBeEnabled()
    await expect(page.getByText(/alteracoes nao salvas/i)).toBeVisible()
  })

  test('marks a student present and exposes unsaved changes', async ({ page }) => {
    const present = page.getByRole('button', { name: 'Presente' }).first()
    await setPressed(present, false)
    await setPressed(present, true)
    await expect(page.getByText(/alteracoes nao salvas/i)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Salvar', exact: true })).toBeEnabled()
  })

  test('toggles an active status off', async ({ page }) => {
    const absent = page.getByRole('button', { name: 'Falta' }).first()
    await setPressed(absent, true)
    await absent.click()
    await expect(absent).toHaveAttribute('aria-pressed', 'false')
  })

  test('captures a mandatory justification', async ({ page }) => {
    const justified = page.getByRole('button', { name: 'Justificada' }).first()
    await justified.click()
    const dialog = page.getByRole('dialog', { name: /justificar falta/i })
    await expect(dialog).toBeVisible()
    const confirm = dialog.getByRole('button', { name: /confirmar/i })
    await expect(confirm).toBeDisabled()
    await dialog.getByLabel(/motivo/i).fill('Atestado médico apresentado pela família')
    await expect(confirm).toBeEnabled()
    await confirm.click()
    await expect(dialog).toBeHidden()
    await expect(justified).toHaveAttribute('aria-pressed', 'true')
  })

  test('supports keyboard activation', async ({ page }) => {
    const present = page.getByRole('button', { name: 'Presente' }).first()
    await present.focus()
    await expect(present).toBeFocused()
    await page.keyboard.press('Space')
    await expect(page.getByText(/alteracoes nao salvas/i)).toBeVisible()
  })

  test('saves and persists attendance after reload', async ({ page }) => {
    const present = page.getByRole('button', { name: 'Presente' }).first()
    await setPressed(present, true)
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByText('Chamada salva com sucesso!')).toBeVisible({ timeout: 10000 })
    await openAttendance(page)
    await expect(page.getByRole('button', { name: 'Presente' }).first()).toHaveAttribute('aria-pressed', 'true', { timeout: 15000 })
  })

  test('navigates to the previous day', async ({ page }) => {
    const dateButton = page.getByRole('button', { name: /selecionar data/i })
    const before = await dateButton.textContent()
    await page.getByRole('button', { name: /dia anterior/i }).click()
    await expect(dateButton).not.toHaveText(before || '')
  })

  test('disables editing for a future date', async ({ page }) => {
    await page.getByRole('button', { name: /proximo dia/i }).click()
    await expect(page.getByRole('button', { name: 'Presente' }).first()).toBeDisabled()
    await expect(page.getByText('Travada', { exact: true })).toBeVisible()
  })

  test('keeps touch targets at least 44px on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 720 })
    await openAttendance(page)
    const box = await page.getByRole('button', { name: 'Presente' }).first().boundingBox()
    expect(box?.width).toBeGreaterThanOrEqual(44)
    expect(box?.height).toBeGreaterThanOrEqual(44)
  })
})
