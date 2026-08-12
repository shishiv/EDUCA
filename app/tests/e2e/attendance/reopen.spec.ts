import { randomUUID } from 'node:crypto'
import { test, expect } from '@playwright/test'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SCHOOL_A = '10000000-0000-0000-0000-000000000001'
const TURMA_A = '30000000-0000-0000-0000-000000000001'
const SESSION_ID = randomUUID()
const CONFLICT_SESSION_ID = randomUUID()
const PASSWORD = 'Synthetic-Only-2026!'

function serviceHeaders() {
  if (!SERVICE_KEY) throw new Error('attendance reopen E2E requires the local service key')
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'content-type': 'application/json',
  }
}

function todayInSaoPaulo(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

async function serviceRequest(
  request: import('@playwright/test').APIRequestContext,
  path: string,
  init: Parameters<import('@playwright/test').APIRequestContext['fetch']>[1] = {}
) {
  const response = await request.fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: { ...serviceHeaders(), ...(init.headers ?? {}) },
  })
  if (!response.ok()) {
    throw new Error(`Local synthetic service request failed: ${response.status()} ${await response.text()}`)
  }
  return response
}

async function userId(
  request: import('@playwright/test').APIRequestContext,
  email: string
): Promise<string> {
  const response = await serviceRequest(request, `/rest/v1/users?select=id&email=eq.${encodeURIComponent(email)}`)
  const rows = await response.json() as Array<{ id: string }>
  if (rows.length !== 1) throw new Error(`Expected one synthetic user for ${email}`)
  return rows[0].id
}

async function login(page: import('@playwright/test').Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: /^entrar$/i }).click()
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 })
}

async function deleteSession(
  request: import('@playwright/test').APIRequestContext,
  sessionId: string
) {
  await serviceRequest(request, `/rest/v1/attendance_reopen_requests?sessao_id=eq.${sessionId}`, { method: 'DELETE' })
  await serviceRequest(request, `/rest/v1/frequencia?sessao_id=eq.${sessionId}`, { method: 'DELETE' })
  await serviceRequest(request, `/rest/v1/sessoes_aula?id=eq.${sessionId}`, { method: 'DELETE' })
}

async function prepareClosedSession(
  request: import('@playwright/test').APIRequestContext,
  withOpenConflict = false
) {
  const professorId = await userId(request, 'professora.a@synthetic.invalid')
  await deleteSession(request, SESSION_ID)
  await deleteSession(request, CONFLICT_SESSION_ID)

  const now = new Date().toISOString()
  await serviceRequest(request, '/rest/v1/sessoes_aula', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    data: {
      id: SESSION_ID,
      turma_id: TURMA_A,
      escola_id: SCHOOL_A,
      professor_id: professorId,
      data_aula: todayInSaoPaulo(),
      status: 'FECHADA',
      aberta_em: now,
      fechada_em: now,
      travada_em: now,
      hash_legal: 'synthetic-reopen-browser-fixture',
      conteudo_programatico: 'Chamada de reabertura E2E',
    },
  })

  if (withOpenConflict) {
    await serviceRequest(request, '/rest/v1/sessoes_aula', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      data: {
        id: CONFLICT_SESSION_ID,
        turma_id: TURMA_A,
        escola_id: SCHOOL_A,
        professor_id: professorId,
        data_aula: todayInSaoPaulo(),
        status: 'ABERTA',
        aberta_em: now,
        conteudo_programatico: 'Sessão aberta que bloqueia a reabertura',
      },
    })
  }
}

async function cleanupSession(request: import('@playwright/test').APIRequestContext) {
  await deleteSession(request, SESSION_ID)
  await deleteSession(request, CONFLICT_SESSION_ID)
}

test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Attendance reopen workflow', () => {
  test.beforeEach(async () => {
    if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Local Supabase variables are required')
    const host = new URL(SUPABASE_URL).hostname
    if (!['127.0.0.1', 'localhost'].includes(host) || !SERVICE_KEY.startsWith('sb_secret_')) {
      throw new Error('Attendance reopen E2E is synthetic-local only')
    }
  })

  test.afterEach(async ({ request }) => {
    await cleanupSession(request)
  })

  test('teacher requests and school director approves only the canonical session', async ({ page, browser, request }) => {
    await prepareClosedSession(request)
    const sessionPath = `/dashboard/turmas/${TURMA_A}/chamada?sessao=${SESSION_ID}`
    await login(page, 'professora.a@synthetic.invalid')
    await page.goto(sessionPath)

    await expect(page.getByRole('region', { name: 'Solicitar reabertura da chamada' })).toBeVisible()
    await page.getByRole('button', { name: 'Solicitar reabertura' }).click()
    await page.getByRole('button', { name: 'Enviar solicitação' }).click()
    await expect(page.getByRole('alert')).toContainText('Informe o motivo da reabertura.')

    await page.getByLabel('Motivo da reabertura').fill('Corrigir a falta após conferir o diário.')
    await page.getByRole('button', { name: 'Enviar solicitação' }).click()
    await expect(page.getByText('Pendente')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Aprovar reabertura' })).toHaveCount(0)

    const foreignContext = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const foreignPage = await foreignContext.newPage()
    try {
      await login(foreignPage, 'diretora.b@synthetic.invalid')
      await foreignPage.goto(sessionPath)
      await expect(foreignPage.getByRole('button', { name: 'Aprovar reabertura' })).toHaveCount(0)
    } finally {
      await foreignContext.close()
    }

    const directorContext = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const directorPage = await directorContext.newPage()
    try {
      await login(directorPage, 'diretora.a@synthetic.invalid')
      await directorPage.goto(sessionPath)
      await expect(directorPage.getByRole('button', { name: 'Aprovar reabertura' })).toBeVisible()
      await directorPage.getByRole('button', { name: 'Aprovar reabertura' }).click()
      await expect(directorPage.getByRole('button', { name: 'Fechar chamada' })).toBeVisible()
      await expect(directorPage.locator('#attendance-session')).toHaveValue(SESSION_ID)
      await expect(directorPage.locator('#attendance-session')).toContainText('Aberta')
    } finally {
      await directorContext.close()
    }

    const sessionResponse = await serviceRequest(request, `/rest/v1/sessoes_aula?id=eq.${SESSION_ID}&select=id,status`)
    await expect(sessionResponse).toBeOK()
    await expect(await sessionResponse.json()).toEqual([{ id: SESSION_ID, status: 'ABERTA' }])
  })

  test('director sees an actionable conflict and preserves the pending request', async ({ page, browser, request }) => {
    await prepareClosedSession(request, true)
    const sessionPath = `/dashboard/turmas/${TURMA_A}/chamada?sessao=${SESSION_ID}`

    await login(page, 'professora.a@synthetic.invalid')
    await page.goto(sessionPath)
    await page.getByRole('button', { name: 'Solicitar reabertura' }).click()
    await page.getByLabel('Motivo da reabertura').fill('Corrigir a falta após conferir o diário.')
    await page.getByRole('button', { name: 'Enviar solicitação' }).click()
    await expect(page.getByText('Pendente')).toBeVisible()

    const directorContext = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const directorPage = await directorContext.newPage()
    try {
      await login(directorPage, 'diretora.a@synthetic.invalid')
      await directorPage.goto(sessionPath)
      await directorPage.getByRole('button', { name: 'Aprovar reabertura' }).click()

      const conflictAlert = directorPage.getByRole('alert').filter({ hasText: 'Já existe uma sessão aberta' })
      await expect(conflictAlert).toBeVisible()
      await expect(conflictAlert).toContainText('Feche a sessão aberta antes de aprovar')
      await expect(directorPage.getByText('Pendente', { exact: true })).toBeVisible()
      await expect(directorPage.getByText(/Sessão fechada/)).toBeVisible()
    } finally {
      await directorContext.close()
    }

    const sessionResponse = await serviceRequest(
      request,
      `/rest/v1/sessoes_aula?id=eq.${SESSION_ID}&select=id,status`
    )
    await expect(sessionResponse).toBeOK()
    await expect(await sessionResponse.json()).toEqual([{ id: SESSION_ID, status: 'FECHADA' }])

    const requestResponse = await serviceRequest(
      request,
      `/rest/v1/attendance_reopen_requests?sessao_id=eq.${SESSION_ID}&select=id,status,decided_by,decided_at,after_state`
    )
    await expect(requestResponse).toBeOK()
    const requestRows = await requestResponse.json() as Array<{
      id: string
      status: string
      decided_by: string | null
      decided_at: string | null
      after_state: unknown
    }>
    await expect(requestRows).toEqual([{
      id: expect.any(String),
      status: 'PENDENTE',
      decided_by: null,
      decided_at: null,
      after_state: null,
    }])

    const conflictResponse = await serviceRequest(
      request,
      `/rest/v1/sessoes_aula?id=eq.${CONFLICT_SESSION_ID}&select=id,status`
    )
    await expect(conflictResponse).toBeOK()
    await expect(await conflictResponse.json()).toEqual([{ id: CONFLICT_SESSION_ID, status: 'ABERTA' }])

    const decisionAuditResponse = await serviceRequest(
      request,
      `/rest/v1/pilot_audit_log?event_type=eq.attendance_reopen_decided&entity_id=eq.${SESSION_ID}&select=event_type,redacted_metadata`
    )
    await expect(decisionAuditResponse).toBeOK()
    const decisionAuditRows = await decisionAuditResponse.json() as Array<{
      event_type: string
      redacted_metadata: { request_id?: string }
    }>
    await expect(decisionAuditRows.filter(row => row.redacted_metadata.request_id === requestRows[0].id)).toEqual([])
  })
})
