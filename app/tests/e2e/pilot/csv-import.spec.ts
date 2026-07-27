import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'

const csv = [
  'synthetic_marker,source_id,school_code,class_code,student_name,birth_date,sex,guardian_name,guardian_phone,guardian_relationship',
  'SYNTHETIC-EDUCA-PILOT,csv-e2e-student,SYN-A,CLASS-A,Aluno CSV Sintetico,2018-05-20,M,Responsavel CSV Sintetico,(11) 98888-0000,mae',
].join('\n')

test('dry-runs, stages, approves, publishes, and cleans synthetic CSV', async ({ page, browser }) => {
  await page.goto('/dashboard')
  const dryRun = await page.evaluate(async csvPayload => {
    const response = await fetch('/api/pilot/imports', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ csv: csvPayload, dryRun: true }),
    })
    return { status: response.status, body: await response.json() }
  }, csv)
  expect(dryRun).toEqual(expect.objectContaining({
    status: 200,
    body: expect.objectContaining({ report: expect.objectContaining({ valid: true, validRows: 1 }), validationToken: expect.any(String) }),
  }))

  const staged = await page.evaluate(async ({ csvPayload, validationToken }) => {
    const response = await fetch('/api/pilot/imports', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ csv: csvPayload, validationToken, idempotencyKey: 'csv-e2e-batch-001' }),
    })
    return { status: response.status, body: await response.json() }
  }, { csvPayload: csv, validationToken: dryRun.body.validationToken })
  expect(staged.status).toBe(201)
  const batchId = staged.body.batch.id as string

  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const { data: encryptedBatch } = await service.from('pilot_import_batches').select('encrypted_payload,status').eq('id', batchId).single()
  expect(encryptedBatch?.status).toBe('pending_approval')
  expect(encryptedBatch?.encrypted_payload).not.toContain('Aluno CSV Sintetico')

  const makerAttempt = await page.evaluate(async id => (await fetch(`/api/pilot/imports/${id}/approval`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ decision: 'approved' }),
  })).status, batchId)
  expect(makerAttempt).toBe(403)

  const directorContext = await browser.newContext()
  const directorPage = await directorContext.newPage()
  await directorPage.goto('/login')
  await directorPage.getByLabel('E-mail', { exact: true }).fill('diretora.a@synthetic.invalid')
  await directorPage.getByLabel('Senha', { exact: true }).fill('Synthetic-Only-2026!')
  await directorPage.getByRole('button', { name: /entrar/i }).click()
  await expect(directorPage).toHaveURL(/dashboard/)
  const approval = await directorPage.evaluate(async id => {
    const response = await fetch(`/api/pilot/imports/${id}/approval`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ decision: 'approved' }),
    })
    return { status: response.status, body: await response.json() }
  }, batchId)
  expect(approval).toEqual(expect.objectContaining({ status: 200, body: expect.objectContaining({ batch: expect.objectContaining({ status: 'published' }) }) }))
  await directorContext.close()

  const [{ data: student }, { data: cleanedBatch }] = await Promise.all([
    service.from('alunos').select('id,nome_completo').eq('import_source_id', 'csv-e2e-student').single(),
    service.from('pilot_import_batches').select('status,encrypted_payload,cleaned_at').eq('id', batchId).single(),
  ])
  expect(student?.nome_completo).toBe('Aluno CSV Sintetico')
  expect(cleanedBatch).toEqual(expect.objectContaining({ status: 'published', encrypted_payload: null, cleaned_at: expect.any(String) }))
})
