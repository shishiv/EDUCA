import { test, expect } from '../support/diagnostics'
import { navigateToDashboard } from '../utils/test-helpers'

test.use({ storageState: 'playwright/.auth/professor.json' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

let classPath: string | null = null
let classId: string | null = null

async function openClass(page: import('@playwright/test').Page) {
  if (!classPath) {
    await page.goto('/dashboard/turmas')
    const link = page
      .locator('a[href^="/dashboard/turmas/"]:not([href="/dashboard/turmas/nova"])')
      .first()
    await expect(link).toBeVisible({ timeout: 15000 })
    classPath = await link.getAttribute('href')
    classId = classPath?.split('/').pop() || null
    expect(classPath).toBeTruthy()
    expect(classId).toBeTruthy()
  }
  await page.goto(classPath!)
  const openButton = page.getByRole('button', { name: /abrir aula/i })
  try {
    await expect(openButton).toBeVisible({ timeout: 5000 })
  } catch {
    await navigateToDashboard(page, 'professor@test.com')
    await page.goto(classPath!)
    await expect(openButton).toBeVisible({ timeout: 15000 })
  }
}

async function clearTodaySession(request: import('@playwright/test').APIRequestContext) {
  if (!classId) return
  const today = new Date().toISOString().slice(0, 10)
  const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
  const sessionsResponse = await request.get(
    `${SUPABASE_URL}/rest/v1/sessoes_aula?select=id&turma_id=eq.${classId}&data_aula=eq.${today}`,
    { headers }
  )
  expect(sessionsResponse.ok()).toBe(true)
  const sessions: Array<{ id: string }> = await sessionsResponse.json()
  if (sessions.length > 0) {
    const ids = sessions.map(session => session.id).join(',')
    const attendanceDelete = await request.delete(
      `${SUPABASE_URL}/rest/v1/frequencia?sessao_id=in.(${ids})`,
      { headers }
    )
    expect(attendanceDelete.ok()).toBe(true)
    const sessionDelete = await request.delete(
      `${SUPABASE_URL}/rest/v1/sessoes_aula?id=in.(${ids})`,
      { headers }
    )
    expect(sessionDelete.ok()).toBe(true)
  }
}

async function openWorkflow(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /abrir aula/i }).click()
  const dialog = page.getByRole('dialog', { name: /abrir aula/i })
  await expect(dialog).toBeVisible()
  return dialog
}

test.describe('Attendance session workflow', () => {
  test.beforeEach(async ({ page, request }) => {
    await openClass(page)
    await clearTodaySession(request)
  })

  test('opens the Abrir Aula dialog from class details', async ({ page }) => {
    const dialog = await openWorkflow(page)
    await expect(dialog.getByText(/inicie uma nova sessão/i).first()).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Abrir Aula', exact: true })).toBeEnabled()
  })

  test('cancels without creating a session', async ({ page }) => {
    const dialog = await openWorkflow(page)
    await dialog.getByRole('button', { name: /cancelar/i }).click()
    await expect(dialog).toBeHidden()
  })

  test('creates today session and closes the dialog', async ({ page, request }) => {
    const dialog = await openWorkflow(page)
    await dialog.getByRole('button', { name: 'Abrir Aula', exact: true }).click()
    await expect(page.getByText(/aula aberta com sucesso/i)).toBeVisible({ timeout: 10000 })
    await expect(dialog).toBeHidden()

    const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
    const today = new Date().toISOString().slice(0, 10)
    const response = await request.get(
      `${SUPABASE_URL}/rest/v1/sessoes_aula?select=id&turma_id=eq.${classId}&data_aula=eq.${today}`,
      { headers }
    )
    expect(response.ok()).toBe(true)
    expect((await response.json()).length).toBe(1)
  })

  test('prevents a duplicate session for the same class and date', async ({ page }) => {
    let dialog = await openWorkflow(page)
    await dialog.getByRole('button', { name: 'Abrir Aula', exact: true }).click()
    await expect(dialog).toBeHidden({ timeout: 10000 })

    dialog = await openWorkflow(page)
    await dialog.getByRole('button', { name: 'Abrir Aula', exact: true }).click()
    await expect(page.getByText(/já existe uma sessao|ja existe uma sessao/i)).toBeVisible({ timeout: 10000 })
    await expect(dialog).toBeVisible()
  })

  test('shows a loading state while the session is created', async ({ page }) => {
    await page.route('**/rest/v1/sessoes_aula*', async route => {
      await new Promise(resolve => setTimeout(resolve, 600))
      await route.continue()
    })
    const dialog = await openWorkflow(page)
    const create = dialog.getByRole('button', { name: 'Abrir Aula', exact: true })
    const submission = create.click()
    await expect(dialog.getByRole('button', { name: /abrindo/i })).toBeDisabled()
    await submission
  })

  test('attendance link points to the implemented frequency route', async ({ page }) => {
    const link = page.getByRole('link', { name: /marcar frequência/i })
    await expect(link).toHaveAttribute('href', new RegExp(`^/diario/frequencia\\?turma=${classId}$`))
  })
})
