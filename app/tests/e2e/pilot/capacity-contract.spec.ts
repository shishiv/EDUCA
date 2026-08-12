import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  PILOT_CAPACITY_AUTH_PASSWORD,
  PILOT_CAPACITY_DIRECTOR_EMAIL,
  PILOT_CAPACITY_SCHOOL_ID,
} from '../../../../supabase/seed-pilot-capacity/pilot-capacity-contract'

test.use({
  storageState: process.env.PILOT_CAPACITY_AUTH_STATE_PATH || path.join(process.cwd(), 'playwright/.pilot-capacity/director.json'),
})

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
// Independent UI oracle receipt: the contract requires five class options.
const EXPECTED_CAPACITY_UI_CLASS_COUNT = 5
const PROBE_SCHOOL_ID = PILOT_CAPACITY_SCHOOL_ID
const PROBE_CLASS_ID = '99000000-0000-0000-0000-000000000011'
const PROBE_STUDENT_ONE_ID = '99000000-0000-0000-0000-000000000021'
const PROBE_STUDENT_TWO_ID = '99000000-0000-0000-0000-000000000022'
const PROBE_ENROLLMENT_ONE_ID = '99000000-0000-0000-0000-000000000031'
const PROBE_ENROLLMENT_TWO_ID = '99000000-0000-0000-0000-000000000032'

function createServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function createDirectorClient() {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await client.auth.signInWithPassword({
    email: PILOT_CAPACITY_DIRECTOR_EMAIL,
    password: PILOT_CAPACITY_AUTH_PASSWORD,
  })
  if (error) throw error
  return client
}

async function removeProbeRows() {
  const service = createServiceClient()
  const enrollmentDelete = await service.from('matriculas').delete().in('id', [PROBE_ENROLLMENT_ONE_ID, PROBE_ENROLLMENT_TWO_ID])
  if (enrollmentDelete.error) throw enrollmentDelete.error
  const studentDelete = await service.from('alunos').delete().in('id', [PROBE_STUDENT_ONE_ID, PROBE_STUDENT_TWO_ID])
  if (studentDelete.error) throw studentDelete.error
  const classDelete = await service.from('turmas').delete().eq('id', PROBE_CLASS_ID)
  if (classDelete.error) throw classDelete.error
}

async function prepareProbeClass() {
  const service = createServiceClient()
  await removeProbeRows()
  const { error: classError } = await service.from('turmas').insert({
    id: PROBE_CLASS_ID,
    import_source_id: 'pilot-capacity:e2e-probe',
    nome: 'Turma E2E Capacity Probe',
    serie: '1 ano',
    turno: 'matutino',
    ano_letivo: 2026,
    capacidade: 1,
    escola_id: PROBE_SCHOOL_ID,
    professor_id: null,
    ativo: true,
  })
  if (classError) throw classError

  const { error: studentsError } = await service.from('alunos').insert([
    {
      id: PROBE_STUDENT_ONE_ID,
      escola_id: PROBE_SCHOOL_ID,
      import_source_id: 'pilot-capacity:e2e-student-1',
      nome_completo: 'Aluno E2E Capacity One',
      data_nascimento: '2018-01-01',
      sexo: 'M',
      ativo: true,
    },
    {
      id: PROBE_STUDENT_TWO_ID,
      escola_id: PROBE_SCHOOL_ID,
      import_source_id: 'pilot-capacity:e2e-student-2',
      nome_completo: 'Aluno E2E Capacity Two',
      data_nascimento: '2018-01-02',
      sexo: 'F',
      ativo: true,
    },
  ])
  if (studentsError) throw studentsError
}

test.describe('isolated pilot capacity contract', () => {
  test('renders the seeded school and five classes through the real UI', async ({ page }) => {
    await page.goto('/dashboard/matriculas/nova')
    await expect(page.getByRole('heading', { name: /nova matrícula/i })).toBeVisible()

    const search = page.getByPlaceholder(/buscar por nome/i)
    await search.fill('Aluno Capacidade 001')
    await expect(page.getByText('Aluno Capacidade 001', { exact: true })).toBeVisible()

    await page.locator('#turma_id').click()
    await expect(page.getByRole('option')).toHaveCount(EXPECTED_CAPACITY_UI_CLASS_COUNT)
    await expect(page.getByText('Turma Capacidade 01 - 1 ano', { exact: true })).toBeVisible()
  })

  test('rejects concurrent active enrollments at the real PostgREST boundary', async () => {
    expect(SUPABASE_SERVICE_ROLE_KEY).toMatch(/^sb_secret_/)
    expect(SUPABASE_ANON_KEY).toMatch(/^sb_publishable_/)
    try {
      await prepareProbeClass()
      const director = await createDirectorClient()
      const attempts = await Promise.all([
        director.from('matriculas').insert({
          id: PROBE_ENROLLMENT_ONE_ID,
          aluno_id: PROBE_STUDENT_ONE_ID,
          turma_id: PROBE_CLASS_ID,
          ano_letivo: 2026,
          situacao: 'ativa',
          observacoes: 'E2E concurrent capacity attempt',
        }),
        director.from('matriculas').insert({
          id: PROBE_ENROLLMENT_TWO_ID,
          aluno_id: PROBE_STUDENT_TWO_ID,
          turma_id: PROBE_CLASS_ID,
          ano_letivo: 2026,
          situacao: 'ativa',
          observacoes: 'E2E concurrent capacity attempt',
        }),
      ])

      const successCount = attempts.filter(attempt => !attempt.error).length
      const capacityErrors = attempts.filter(attempt => attempt.error?.message.includes('PILOT_CAPACITY_EXCEEDED')).length
      expect(successCount).toBe(1)
      expect(capacityErrors).toBe(1)

      const service = createServiceClient()
      const { data, error } = await service
        .from('matriculas')
        .select('id')
        .eq('turma_id', PROBE_CLASS_ID)
        .eq('situacao', 'ativa')
      expect(error).toBeNull()
      expect(data).toHaveLength(1)

      const concurrencyReceiptPath = process.env.PILOT_CAPACITY_CONCURRENCY_RECEIPT_PATH
      if (concurrencyReceiptPath) {
        mkdirSync(path.dirname(concurrencyReceiptPath), { recursive: true })
        writeFileSync(concurrencyReceiptPath, `${JSON.stringify({
          result: 'pass',
          boundary: 'real-postgrest',
          successCount,
          capacityErrors,
          activeEnrollments: data?.length ?? 0,
          errorMarker: 'PILOT_CAPACITY_EXCEEDED',
        }, null, 2)}\n`, 'utf8')
      }
      console.info(`PILOT_CAPACITY_CONCURRENCY_RECEIPT: success_count=${successCount} capacity_errors=${capacityErrors} active_enrollments=${data?.length ?? 0}`)
    } finally {
      await removeProbeRows()
    }
  })
})
