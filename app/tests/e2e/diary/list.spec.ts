import { createClient } from '@supabase/supabase-js'
import { test, expect } from '../support/diagnostics'
import { loginAs } from '../utils/test-helpers'
import type { Database } from '@/types/database'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function getLocalServiceClient() {
  if (!new URL(SUPABASE_URL).hostname.match(/^(127\.0\.0\.1|localhost)$/)) {
    throw new Error('Diary list E2E requires a loopback Supabase URL')
  }
  if (!SUPABASE_SERVICE_KEY.startsWith('sb_secret_')) {
    throw new Error('Diary list E2E requires the local Supabase service key')
  }
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

const className = '1º Ano A E2E'
const firstContent = 'Números e operações'
const secondContent = 'Leitura e interpretação'

let classId = ''
let firstLessonDate = ''
let secondLessonDate = ''

function displayDate(value: string): string {
  return value.split('-').reverse().join('/')
}

async function requireClassId(service: ReturnType<typeof getLocalServiceClient>): Promise<string> {
  const { data: turma, error: turmaError } = await service
    .from('turmas')
    .select('id')
    .eq('nome', className)
    .single()
  if (turmaError || !turma) throw turmaError || new Error('DIARY_E2E_CLASS_MISSING')
  return turma.id
}

async function requireLessonDate(
  service: ReturnType<typeof getLocalServiceClient>,
  turmaId: string,
  content: string,
): Promise<string> {
  const { data: session, error: sessionError } = await service
    .from('sessoes_aula')
    .select('data_aula')
    .eq('turma_id', turmaId)
    .eq('conteudo_programatico', content)
    .single()
  if (sessionError || !session) throw sessionError || new Error('DIARY_E2E_SESSION_MISSING')
  return session.data_aula
}

test.beforeAll(async () => {
  const service = getLocalServiceClient()
  classId = await requireClassId(service)
  const lessonDates = await Promise.all([
    requireLessonDate(service, classId, firstContent),
    requireLessonDate(service, classId, secondContent),
  ])
  firstLessonDate = lessonDates[0]
  secondLessonDate = lessonDates[1]
})

test.describe('Diário de Classe - lista canônica', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'professor@test.com')
    await expect(page.getByText('Painel do Professor')).toBeVisible()
  })

  test('shows the seeded lesson and its canonical details on desktop', async ({ page }) => {
    await page.goto(`/diario?turma=${classId}`)

    await expect(page.getByRole('heading', { name: 'Diário de Classe', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Documento Legal', exact: true })).toBeVisible()
    await expect(page.getByText(
      'O Diário de Classe é um documento oficial na educação brasileira. Todos os registros devem ser completos e verdadeiros.',
      { exact: true },
    )).toBeVisible()
    await expect(page.getByLabel('Turma', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Data Inicial', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Data Final', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Status da Aula', { exact: true })).toBeVisible()

    const row = page.getByRole('row').filter({ hasText: displayDate(firstLessonDate) })
    await expect(row).toContainText(className)
    await expect(row).toContainText('Finalizada')
    await row.click()

    const dialog = page.getByRole('dialog', { name: 'Detalhes da Aula' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText(firstContent, { exact: true })).toBeVisible()
  })

  test('combines filters, exposes an empty state, and clears the form', async ({ page }) => {
    await page.goto('/diario')

    const classFilter = page.getByLabel('Turma', { exact: true })
    await classFilter.click()
    await page.getByRole('option', { name: `${className} - 1º Ano`, exact: true }).click()
    await page.getByLabel('Data Inicial', { exact: true }).fill(firstLessonDate)
    await page.getByLabel('Data Final', { exact: true }).fill(firstLessonDate)

    const statusFilter = page.getByLabel('Status da Aula', { exact: true })
    await statusFilter.click()
    await page.getByRole('option', { name: 'Fechada', exact: true }).click()
    await page.getByRole('button', { name: 'Buscar', exact: true }).click()

    const table = page.getByRole('table')
    await expect(table.getByText(displayDate(firstLessonDate), { exact: true })).toBeVisible()
    await expect(table.getByText(displayDate(secondLessonDate), { exact: true })).toHaveCount(0)

    await page.getByLabel('Data Inicial', { exact: true }).fill('2099-01-01')
    await page.getByLabel('Data Final', { exact: true }).fill('2099-01-01')
    await page.getByRole('button', { name: 'Buscar', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Nenhuma aula encontrada', exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Limpar Filtros', exact: true }).click()
    await expect(page.getByLabel('Data Inicial', { exact: true })).toHaveValue('')
    await expect(page.getByLabel('Data Final', { exact: true })).toHaveValue('')
    await expect(classFilter).toContainText('Todas as turmas')
    await expect(statusFilter).toContainText('Todos os status')
  })

  test('renders the seeded lesson without horizontal overflow at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/diario?turma=${classId}`)

    const mobileList = page.locator('.md\\:hidden.space-y-3')
    await expect(mobileList.getByText(displayDate(firstLessonDate), { exact: true })).toBeVisible()
    await expect(mobileList.getByText(className, { exact: true }).first()).toBeVisible()
    await expect(mobileList.getByText('Finalizada', { exact: true }).first()).toBeVisible()

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(hasHorizontalOverflow).toBe(false)
  })
})
