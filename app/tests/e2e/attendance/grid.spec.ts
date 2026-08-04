import { getTodaySaoPaulo } from '@/lib/date-utils'
import { test, expect } from '../support/diagnostics'
import { discoverE2EAttendancePaths } from './attendance-fixtures'
import { navigateToDashboard } from '../utils/test-helpers'

test.use({ storageState: 'playwright/.auth/professor.json' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const serviceHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }

let attendancePath: string | null = null
let attendanceClassId: string | null = null

async function openAttendance(
  page: import('@playwright/test').Page,
  request: import('@playwright/test').APIRequestContext
) {
  if (!attendancePath || !attendanceClassId) {
    const fixture = await discoverE2EAttendancePaths(page)
    attendancePath = fixture.attendancePath
    attendanceClassId = fixture.classId
  }

  await page.goto(attendancePath)
  try {
    await expect(page.getByRole('button', { name: /presente/i }).first()).toBeVisible({ timeout: 5000 })
  } catch {
    await navigateToDashboard(page, 'professor@test.com')
    await page.goto(attendancePath)
    await expect(page.getByRole('button', { name: /abrir chamada/i })).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: /abrir chamada/i }).click()
    await expect(page.getByText(/chamada aberta/i)).toBeVisible({ timeout: 15000 })
    // The session is server-owned. Confirm the canonical row before loading
    // the exact session URL, instead of trusting a stale no-session render.
    const today = getTodaySaoPaulo()
    const sessionResponse = await request.get(
      `${SUPABASE_URL}/rest/v1/sessoes_aula?select=id,status&turma_id=eq.${attendanceClassId}&data_aula=eq.${today}`,
      { headers: serviceHeaders }
    )
    expect(sessionResponse.ok()).toBe(true)
    const sessions: Array<{ id: string; status: string }> = await sessionResponse.json()
    expect(sessions).toHaveLength(1)
    expect(sessions[0].status).toBe('ABERTA')
    await page.goto(`${attendancePath}?sessao=${sessions[0].id}`)
    await expect(page.getByRole('button', { name: /presente/i }).first()).toBeVisible({ timeout: 15000 })
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
  test.beforeEach(async ({ page, request }) => {
    await openAttendance(page, request)
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
    // Canonical attendance opens with no saved marks; saving becomes available after an edit.
    await expect(page.getByRole('button', { name: 'Salvar', exact: true })).toBeDisabled()
    await expect(page.getByText(/alteracoes nao salvas/i)).toHaveCount(0)
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

  test('saves and persists attendance after reload', async ({ page, browser }) => {
    const sessionId = await page.locator('#attendance-session').inputValue()
    expect(sessionId).toMatch(/^[0-9a-f-]{36}$/)
    await test.info().attach('attendance-session.txt', {
      body: Buffer.from(sessionId),
      contentType: 'text/plain',
    })
    const attendanceNavigation = page.goto(`${attendancePath}?sessao=${sessionId}`)
    const attendanceRead = page.waitForRequest(request =>
      request.method() === 'GET' &&
      request.url().includes('/rest/v1/frequencia') &&
      request.url().includes(sessionId)
    )
    await attendanceRead
    await attendanceNavigation

    const saveButton = page.getByRole('button', { name: 'Salvar', exact: true })
    await expect(saveButton).toBeDisabled()
    const present = page.getByRole('button', { name: 'Presente' }).first()
    await setPressed(present, false)
    await setPressed(present, true)
    await expect(saveButton).toBeEnabled()
    await saveButton.click()
    await expect(page.getByText('Chamada salva com sucesso!')).toBeVisible({ timeout: 10000 })
    const reloadContext = await browser.newContext({
      storageState: 'playwright/.auth/professor.json',
    })
    const reloadPage = await reloadContext.newPage()
    try {
      const savedAttendanceRead = reloadPage.waitForResponse(response =>
        response.request().method() === 'GET' &&
        response.url().includes('/rest/v1/frequencia') &&
        response.url().includes(sessionId) &&
        response.ok()
      )
      await reloadPage.goto(`${attendancePath}?sessao=${sessionId}`)
      await savedAttendanceRead
      await expect(reloadPage.getByRole('button', { name: 'Presente' }).first()).toHaveAttribute('aria-pressed', 'true', { timeout: 15000 })
    } finally {
      await reloadContext.close()
    }
  })

  test('navigates to the previous day', async ({ page }) => {
    const dateButton = page.getByRole('button', { name: /selecionar data/i })
    const before = await dateButton.textContent()
    await page.getByRole('button', { name: /dia anterior/i }).click()
    await expect(dateButton).not.toHaveText(before || '')
  })

  test('does not offer an open session for a future date', async ({ page }) => {
    await page.getByRole('button', { name: /proximo dia/i }).click()
    await expect(page.getByText(/nenhuma chamada nesta data/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /abrir chamada/i })).toHaveCount(0)
  })

  test('keeps touch targets at least 44px on mobile', async ({ page, request }) => {
    await page.setViewportSize({ width: 375, height: 720 })
    await openAttendance(page, request)
    const box = await page.getByRole('button', { name: 'Presente' }).first().boundingBox()
    expect(box?.width).toBeGreaterThanOrEqual(44)
    expect(box?.height).toBeGreaterThanOrEqual(44)
  })
})
