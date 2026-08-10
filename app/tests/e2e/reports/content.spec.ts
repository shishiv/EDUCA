import { createClient } from '@supabase/supabase-js'
import { test, expect } from '../support/diagnostics'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const MATH_CONTENT_TITLE = 'Adição com números naturais'
const PORTUGUESE_CONTENT_TITLE = 'Leitura de textos informativos'

type ContentSnapshot = Record<string, unknown> & { id: string }

async function openReport(page: import('@playwright/test').Page, path = '/relatorios/conteudo') {
  const backgroundResponses = Promise.all([
    page.waitForResponse(
      response => response.url().includes('/rest/v1/matriculas?'),
      { timeout: 15000 },
    ).catch(() => null),
    page.waitForResponse(
      response => response.url().includes('/rest/v1/frequencia?'),
      { timeout: 15000 },
    ).catch(() => null),
  ])
  await page.goto(path)
  await expect(page.getByRole('heading', { name: /relatório de conteúdo ministrado|relatorio de conteudo ministrado/i })).toBeVisible({ timeout: 15000 })
  await expect(page.getByLabel('Turma', { exact: true })).toBeVisible({ timeout: 15000 })
  await backgroundResponses
  await page.waitForLoadState('networkidle')
}

async function generateReport(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /gerar relatorio/i }).click()
  await expect(page.getByText(MATH_CONTENT_TITLE, { exact: true })).toBeVisible({ timeout: 15000 })
}

async function selectDiscipline(page: import('@playwright/test').Page, label: string) {
  await page.getByLabel(/disciplina/i).click()
  await page.getByRole('option', { name: label, exact: true }).click()
}

function getLocalAdminClient() {
  if (!new URL(SUPABASE_URL).hostname.match(/^(127\.0\.0\.1|localhost)$/)) {
    throw new Error('Content report E2E requires a loopback Supabase URL')
  }
  if (!SUPABASE_SERVICE_KEY.startsWith('sb_secret_')) {
    throw new Error('Content report E2E requires the local Supabase service key')
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function readContentSnapshot(title = MATH_CONTENT_TITLE): Promise<ContentSnapshot> {
  const admin = getLocalAdminClient()
  const { data, error } = await admin
    .from('conteudo_aula')
    .select('*')
    .eq('tema', title)
    .single()
  if (error || !data) throw new Error(`Failed to load canonical content snapshot: ${error?.message || 'missing row'}`)
  return data as ContentSnapshot
}

async function readDownloadBytes(download: import('@playwright/test').Download): Promise<Buffer> {
  const stream = await download.createReadStream()
  if (!stream) throw new Error('Generated PDF download stream was unavailable')
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks)
}

test.describe('Content report', () => {
  test.beforeEach(async ({ page }) => {
    // Isolate the report contract from the legacy realtime channel. Report
    // requests still use the real Supabase API and the isolated test database.
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('dev_auth_bypass', 'true')
      } catch {
        // Non-page navigations do not expose localStorage.
      }
    })
    await openReport(page)
  })

  test('shows description, filters and disabled export before generation', async ({ page }) => {
    await expect(page.getByText(/visualize o conteúdo das aulas|visualize o conteudo das aulas/i)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Filtros', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /exportar pdf/i })).toBeDisabled()
  })

  test('provides accessible class, discipline and period filters', async ({ page }) => {
    await expect(page.getByLabel('Turma', { exact: true })).toBeVisible()
    await expect(page.getByLabel(/disciplina/i)).toBeVisible()
    await expect(page.getByLabel('Período', { exact: true })).toBeVisible()
  })

  test('shows custom date controls for a custom period', async ({ page }) => {
    await page.getByLabel('Período', { exact: true }).click()
    await page.getByRole('option', { name: /personalizado/i }).click()
    await expect(page.getByRole('button', { name: 'Data Inicio', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Data Fim', exact: true })).toBeVisible()
  })

  test('generates the seeded lesson and summary', async ({ page }) => {
    await generateReport(page)
    await expect(page.getByText('Aulas', { exact: true }).last()).toBeVisible()
    await expect(page.getByText('Habilidades BNCC', { exact: true }).last()).toBeVisible()
    await expect(page.getByText('Média/Aula', { exact: true })).toBeVisible()
    await expect(page.getByText('Disciplinas', { exact: true })).toBeVisible()
  })

  test('shows lesson objective, BNCC skill and methodology', async ({ page }) => {
    await generateReport(page)
    await expect(page.getByText(/resolver e elaborar problemas de adição/i)).toBeVisible()
    await expect(page.getByText('EF01MA06', { exact: true })).toBeVisible()
    await expect(page.getByText(/resolução colaborativa de problemas/i)).toBeVisible()
  })

  test('switches between Aulas, BNCC and Tabela tabs', async ({ page }) => {
    await generateReport(page)
    await page.getByRole('tab', { name: 'BNCC', exact: true }).click()
    await expect(page.getByText('EF01MA06', { exact: true })).toBeVisible()
    await page.getByRole('tab', { name: 'Tabela', exact: true }).click()
    const table = page.getByRole('table')
    await expect(table).toBeVisible()
    await expect(table.getByRole('columnheader', { name: /data/i })).toBeVisible()
    await expect(table.getByRole('columnheader', { name: /tema/i })).toBeVisible()
  })

  test('filters report by a specific class', async ({ page }) => {
    await page.getByLabel('Turma', { exact: true }).click()
    const option = page.getByRole('option').filter({ hasNotText: /todas as turmas/i }).first()
    await option.click()
    await generateReport(page)
    await expect(page.getByText(MATH_CONTENT_TITLE, { exact: true })).toBeVisible()
  })

  test('applies the discipline filter to the canonical database query', async ({ page }) => {
    const contentRequests: string[] = []
    page.on('request', request => {
      if (request.url().includes('/rest/v1/conteudo_aula')) contentRequests.push(request.url())
    })

    await selectDiscipline(page, 'Matematica')
    await generateReport(page)
    await expect(page.getByText(PORTUGUESE_CONTENT_TITLE, { exact: true })).not.toBeVisible()

    await selectDiscipline(page, 'Lingua Portuguesa')
    await page.getByRole('button', { name: /gerar relatorio/i }).click()
    await expect(page.getByText(PORTUGUESE_CONTENT_TITLE, { exact: true })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(MATH_CONTENT_TITLE, { exact: true })).not.toBeVisible()

    const filteredRequest = contentRequests
      .map(url => decodeURIComponent(url))
      .find(url => /sessoes_aula\.disciplinas\.codigo=(?:in|eq)\./.test(url))
    expect(filteredRequest).toBeTruthy()
  })

  test('shows the canonical session, class, school, teacher and BNCC joins', async ({ page }) => {
    await page.getByLabel('Turma', { exact: true }).click()
    const classOption = page.getByRole('option', {
      name: /1º Ano A E2E.*CEMEI Pequenos Passos/i,
    })
    await expect(classOption).toBeVisible()
    await classOption.click()

    await generateReport(page)
    await expect(page.getByText(MATH_CONTENT_TITLE, { exact: true })).toBeVisible()
    await expect(page.getByText('EF01MA06', { exact: true })).toBeVisible()
    await expect(page.getByText(/Professor\(a\): Professor Teste/i).first()).toBeVisible()
  })

  test('enables and downloads PDF after generation', async ({ page }) => {
    await generateReport(page)
    const exportButton = page.getByRole('button', { name: /exportar pdf/i })
    await expect(exportButton).toBeEnabled()
    const downloadPromise = page.waitForEvent('download')
    await exportButton.click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
    const pdf = await readDownloadBytes(download)
    expect(pdf.subarray(0, 4).toString('ascii')).toBe('%PDF')
    expect(pdf.length).toBeGreaterThan(1000)
  })

  test('remains usable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 720 })
    await expect(page.getByRole('button', { name: /gerar relatorio/i })).toBeVisible()
    await expect(page.getByLabel('Turma', { exact: true })).toBeVisible()
  })

  test('blocks PDF export with an explicit empty state for a period without content', async ({ page }) => {
    await page.getByLabel('Período', { exact: true }).click()
    await page.getByRole('option', { name: /mês anterior|mes anterior/i }).click()
    await page.getByRole('button', { name: /gerar relatorio/i }).click()

    await expect(page.getByTestId('content-report-empty-state')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/pdf está indisponível|pdf esta indisponivel/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /exportar pdf/i })).toBeDisabled()
  })

  test('deliberate break: removing canonical content turns red, then restore turns green', async ({ page }) => {
    const snapshot = await readContentSnapshot(PORTUGUESE_CONTENT_TITLE)
    const admin = getLocalAdminClient()

    await generateReport(page)
    await expect(page.getByText(PORTUGUESE_CONTENT_TITLE, { exact: true })).toBeVisible()

    try {
      const { data: deletedRows, error: deleteError } = await admin
        .from('conteudo_aula')
        .delete()
        .eq('id', snapshot.id)
        .select('id')
      if (deleteError) throw deleteError
      expect(deletedRows).toHaveLength(1)
      const { data: remainingCanonicalRows, error: remainingError } = await admin
        .from('conteudo_aula')
        .select('id, tema')
      if (remainingError) throw remainingError
      expect(remainingCanonicalRows).not.toContainEqual(expect.objectContaining({ tema: PORTUGUESE_CONTENT_TITLE }))

      await selectDiscipline(page, 'Lingua Portuguesa')
      await page.getByRole('button', { name: /gerar relatorio/i }).click()
      await expect(page.getByTestId('content-report-empty-state')).toBeVisible({ timeout: 15000 })

      let expectedContentTurnedRed = false
      try {
        await expect(page.getByText(PORTUGUESE_CONTENT_TITLE, { exact: true })).toBeVisible({ timeout: 1500 })
      } catch {
        expectedContentTurnedRed = true
      }
      expect(expectedContentTurnedRed).toBe(true)

      const { error: restoreError } = await admin.from('conteudo_aula').insert(snapshot)
      if (restoreError) throw restoreError

      await page.getByLabel('Turma', { exact: true }).click()
      await page.getByRole('option', { name: /1º Ano A E2E.*CEMEI Pequenos Passos/i }).click()
      await selectDiscipline(page, 'Lingua Portuguesa')
      await page.getByRole('button', { name: /gerar relatorio/i }).click()
      await expect(page.getByText(PORTUGUESE_CONTENT_TITLE, { exact: true })).toBeVisible()
    } finally {
      await admin.from('conteudo_aula').upsert(snapshot, { onConflict: 'id' })
    }
  })
})
