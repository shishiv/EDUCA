import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'
import {
  PILOT_DESCRIPTIVE_CONTENT_IDS,
  PILOT_DESCRIPTIVE_REPORT_ID,
  PILOT_DESCRIPTIVE_STUDENT_ID,
} from '../../../../supabase/seed-pilot-descriptive/pilot-descriptive-contract'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const reportRoute = `/api/pilot/descriptive-reports/${PILOT_DESCRIPTIVE_REPORT_ID}/pdf`

function createLocalServiceClient() {
  const host = new URL(supabaseUrl).hostname
  if (host !== '127.0.0.1' && host !== 'localhost') {
    throw new Error(`PILOT_DESCRIPTIVE_E2E_LOCAL_DATABASE_REQUIRED: ${host}`)
  }
  if (!serviceRoleKey.startsWith('sb_secret_')) {
    throw new Error('PILOT_DESCRIPTIVE_E2E_SERVICE_KEY_REQUIRED: local sb_secret key is required')
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function openDescriptiveReport(page: import('@playwright/test').Page) {
  await page.goto(`/diario/relatorios/${PILOT_DESCRIPTIVE_STUDENT_ID}`)
  await expect(
    page.getByRole('heading', { name: 'Criança Descritiva Sintética', exact: true })
  ).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Finalizado', { exact: true })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('button', { name: 'Emitir PDF', exact: true })).toBeVisible({ timeout: 15_000 })
}

test.describe.serial('bounded descriptive-report PDF emission', () => {
  test('renders the seeded finalized report in the authenticated browser DOM', async ({ page }, testInfo) => {
    await openDescriptiveReport(page)
    await expect(page.getByText('1 Semestre de 2026', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Emitir PDF', exact: true })).toBeEnabled()
    await page.screenshot({ path: testInfo.outputPath('descriptive-report-desktop.png'), fullPage: true })

    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.getByRole('button', { name: 'Emitir PDF', exact: true })).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('descriptive-report-mobile-390x844.png') })
  })

  test('emits a real PDF artifact from canonical taught content', async ({ page }, testInfo) => {
    await openDescriptiveReport(page)

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Emitir PDF', exact: true }).click()
    const download = await downloadPromise
    const artifactPath = testInfo.outputPath(download.suggestedFilename())
    await download.saveAs(artifactPath)
    await testInfo.attach(download.suggestedFilename(), {
      path: artifactPath,
      contentType: 'application/pdf',
    })
    const evidenceDirectory = path.join(process.cwd(), '.pilot-evidence')
    const evidencePath = path.join(evidenceDirectory, download.suggestedFilename())
    await mkdir(evidenceDirectory, { recursive: true })
    await copyFile(artifactPath, evidencePath)
    const bytes = await readFile(artifactPath)

    expect(download.suggestedFilename()).toBe(`relatorio_descritivo_2026_primeiro_${PILOT_DESCRIPTIVE_REPORT_ID}.pdf`)
    expect(bytes.subarray(0, 5).toString('ascii')).toBe('%PDF-')
    expect(bytes.length).toBeGreaterThan(0)

    const pdfReceiptPath = process.env.PILOT_DESCRIPTIVE_PDF_RECEIPT_PATH
    if (pdfReceiptPath) {
      await writeFile(pdfReceiptPath, `${JSON.stringify({
        result: 'pass',
        boundary: 'real-playwright-browser',
        filename: download.suggestedFilename(),
        artifactPath: evidencePath,
        bytes: bytes.length,
        pdfHeader: bytes.subarray(0, 5).toString('ascii'),
      }, null, 2)}\n`, 'utf8')
    }
    console.info(`PILOT_DESCRIPTIVE_PDF_RECEIPT: filename=${download.suggestedFilename()} bytes=${bytes.length} artifact=${evidencePath}`)
  })

  test('deliberate break: removing canonical content blocks emission in the browser', async ({ page }) => {
    const service = createLocalServiceClient()
    const { data: snapshot, error: snapshotError } = await service
      .from('conteudo_aula')
      .select('*')
      .in('id', [...PILOT_DESCRIPTIVE_CONTENT_IDS])
    if (snapshotError || !snapshot) throw snapshotError ?? new Error('PILOT_DESCRIPTIVE_E2E_CONTENT_SNAPSHOT_MISSING')

    let breakObserved = false
    try {
      const { data: deleted, error: deleteError } = await service
        .from('conteudo_aula')
        .delete()
        .in('id', [...PILOT_DESCRIPTIVE_CONTENT_IDS])
        .select('id')
      if (deleteError) throw deleteError
      expect(deleted).toHaveLength(PILOT_DESCRIPTIVE_CONTENT_IDS.length)

      await openDescriptiveReport(page)
      const blockedResponse = page.waitForResponse(response => {
        const requestUrl = new URL(response.url())
        return requestUrl.pathname === reportRoute && response.request().method() === 'GET'
      })
      await page.getByRole('button', { name: 'Emitir PDF', exact: true }).click()
      const response = await blockedResponse

      expect(response.status()).toBe(422)
      await expect(page.getByTestId('descriptive-report-emission-error')).toContainText(
        'Não há conteúdo ministrado registrado no período deste relatório'
      )
      breakObserved = true
    } finally {
      const { error: restoreError } = await service.from('conteudo_aula').insert(snapshot)
      if (restoreError) throw restoreError

      const deliberateBreakReceiptPath = process.env.PILOT_DESCRIPTIVE_PRODUCT_BREAK_RECEIPT_PATH
      if (deliberateBreakReceiptPath && breakObserved) {
        await writeFile(deliberateBreakReceiptPath, `${JSON.stringify({
          result: 'pass',
          target: 'canonical-content-removal',
          boundary: 'real-browser-and-postgrest',
          observedStatus: 422,
          restored: true,
        }, null, 2)}\n`, 'utf8')
      }
      if (breakObserved) {
        console.info('PILOT_DESCRIPTIVE_DELIBERATE_BREAK_RECEIPT: removed_content_blocked_pdf=true restored=true status=422')
      }
    }
  })
})
