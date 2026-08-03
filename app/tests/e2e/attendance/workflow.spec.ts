import { test, expect } from '../support/diagnostics'

test.use({ storageState: 'playwright/.auth/professor.json' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

let classPath: string | null = null
let classId: string | null = null
let attendancePath: string | null = null

async function discoverClass(page: import('@playwright/test').Page) {
  if (classPath && attendancePath) return

  await page.goto('/dashboard/turmas')
  const link = page
    .locator('a[href^="/dashboard/turmas/"]:not([href="/dashboard/turmas/nova"])')
    .first()
  await expect(link).toBeVisible({ timeout: 15000 })

  classPath = await link.getAttribute('href')
  classId = classPath?.split('/').pop() || null
  expect(classPath).toBeTruthy()
  expect(classId).toBeTruthy()
  attendancePath = `${classPath}/chamada`
}

async function clearTodaySessions(request: import('@playwright/test').APIRequestContext) {
  if (!classId) return
  const today = new Date().toISOString().slice(0, 10)
  const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
  const sessionsResponse = await request.get(
    `${SUPABASE_URL}/rest/v1/sessoes_aula?select=id&turma_id=eq.${classId}&data_aula=eq.${today}`,
    { headers }
  )
  expect(sessionsResponse.ok()).toBe(true)
  const sessions: Array<{ id: string }> = await sessionsResponse.json()
  if (sessions.length === 0) return

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

test.describe('Canonical attendance session workflow', () => {
  test.beforeEach(async ({ page, request }) => {
    await discoverClass(page)
    await clearTodaySessions(request)
    await page.goto(attendancePath!)
  })

  test('class details link to the canonical chamada route', async ({ page }) => {
    await page.goto(classPath!)
    await expect(page.getByRole('link', { name: /abrir chamada/i })).toHaveAttribute(
      'href',
      `/dashboard/turmas/${classId}/chamada`
    )
  })

  test('opens one sessoes_aula session for today', async ({ page, request }) => {
    await expect(page.getByRole('button', { name: /abrir chamada/i })).toBeVisible()
    await page.getByRole('button', { name: /abrir chamada/i }).click()
    await expect(page.getByText(/chamada aberta/i)).toBeVisible({ timeout: 10000 })

    const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
    const today = new Date().toISOString().slice(0, 10)
    const response = await request.get(
      `${SUPABASE_URL}/rest/v1/sessoes_aula?select=id,status&turma_id=eq.${classId}&data_aula=eq.${today}`,
      { headers }
    )
    expect(response.ok()).toBe(true)
    const sessions: Array<{ id: string; status: string }> = await response.json()
    expect(sessions).toHaveLength(1)
    expect(sessions[0].status).toBe('ABERTA')
  })

  test('renders P/F/J controls only after a canonical session exists', async ({ page, request, browser }) => {
    await page.getByRole('button', { name: /abrir chamada/i }).click()
    await expect(page.getByText(/chamada aberta/i)).toBeVisible({ timeout: 10000 })

    const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
    const today = new Date().toISOString().slice(0, 10)
    const response = await request.get(
      `${SUPABASE_URL}/rest/v1/sessoes_aula?select=id,status&turma_id=eq.${classId}&data_aula=eq.${today}`,
      { headers }
    )
    expect(response.ok()).toBe(true)
    const sessions: Array<{ id: string; status: string }> = await response.json()
    expect(sessions).toHaveLength(1)
    expect(sessions[0].status).toBe('ABERTA')

    const reloadContext = await browser.newContext({
      storageState: 'playwright/.auth/professor.json',
    })
    const reloadPage = await reloadContext.newPage()
    try {
      await reloadPage.goto(`${attendancePath}?sessao=${sessions[0].id}`)
      await expect(reloadPage.getByRole('button', { name: 'Presente' }).first()).toBeVisible({ timeout: 10000 })
      await expect(reloadPage.getByRole('button', { name: 'Falta' }).first()).toBeVisible()
      await expect(reloadPage.getByRole('button', { name: 'Justificada' }).first()).toBeVisible()
    } finally {
      await reloadContext.close()
    }
  })
})
