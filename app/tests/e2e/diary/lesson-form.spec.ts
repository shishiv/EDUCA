import { createClient } from '@supabase/supabase-js'
import { test, expect } from '../support/diagnostics'
import { loginAs } from '../utils/test-helpers'
import type { Database } from '@/types/database'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function getLocalServiceClient() {
  if (!new URL(SUPABASE_URL).hostname.match(/^(127\.0\.0\.1|localhost)$/)) {
    throw new Error('Diary lesson form E2E requires a loopback Supabase URL')
  }
  if (!SUPABASE_SERVICE_KEY.startsWith('sb_secret_')) {
    throw new Error('Diary lesson form E2E requires the local Supabase service key')
  }
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

let classId = ''

test.beforeAll(async () => {
  const service = getLocalServiceClient()
  const { data, error } = await service
    .from('turmas')
    .select('id')
    .eq('nome', '1º Ano A E2E')
    .single()
  if (error || !data) throw error || new Error('DIARY_E2E_CLASS_MISSING')
  classId = data.id
})

async function openLessonDialog(page: import('@playwright/test').Page) {
  await page.goto(`/diario?turma=${classId}`)
  await expect(page.getByRole('heading', { name: 'Diário de Classe', exact: true })).toBeVisible()
  const newLesson = page.getByRole('button', { name: 'Nova Aula', exact: true })
  await expect(newLesson).toBeVisible()
  await newLesson.click()
  const dialog = page.getByRole('dialog', { name: 'Nova Aula' })
  await expect(dialog).toBeVisible()
  return dialog
}

test.describe('Diário de Classe - formulário de aula disponível', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'professor@test.com')
    await expect(page.getByText('Painel do Professor')).toBeVisible()
  })

  test('shows only the implemented lesson fields and discards a cancelled draft', async ({ page }) => {
    const dialog = await openLessonDialog(page)

    await expect(dialog.getByText('Data da Aula', { exact: true })).toBeVisible()
    await expect(dialog.getByLabel('Tema/Conteúdo *', { exact: true })).toBeEditable()
    await expect(dialog.getByLabel('Objetivo *', { exact: true })).toBeEditable()
    await expect(dialog.getByLabel('Habilidades BNCC', { exact: true })).toBeEditable()
    await expect(dialog.getByLabel('Metodologia', { exact: true })).toBeEditable()
    await expect(dialog.getByLabel('Recursos Utilizados', { exact: true })).toBeEditable()
    await expect(dialog.getByLabel('Observações', { exact: true })).toBeEditable()
    await expect(dialog.getByLabel(/disciplina|matéria/i)).toHaveCount(0)
    await expect(dialog.getByText('Campos de Experiencia', { exact: true })).toHaveCount(0)

    await dialog.getByLabel('Tema/Conteúdo *', { exact: true }).fill('Rascunho descartado')
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await expect(dialog).toHaveCount(0)

    const reopened = await openLessonDialog(page)
    await expect(reopened.getByLabel('Tema/Conteúdo *', { exact: true })).toHaveValue('')
    await reopened.getByRole('button', { name: 'Cancelar', exact: true }).click()
  })

  test('enforces required lengths and BNCC code format before submission', async ({ page }) => {
    const dialog = await openLessonDialog(page)
    await dialog.getByLabel('Tema/Conteúdo *', { exact: true }).fill('AB')
    await dialog.getByLabel('Objetivo *', { exact: true }).fill('Curto')
    await dialog.getByLabel('Habilidades BNCC', { exact: true }).fill('INVALID123')
    await dialog.getByRole('button', { name: 'Salvar Aula', exact: true }).click()

    await expect(dialog.getByText('Tema deve ter pelo menos 3 caracteres', { exact: true })).toBeVisible()
    await expect(dialog.getByText('Objetivo deve ter pelo menos 10 caracteres', { exact: true })).toBeVisible()
    await expect(dialog.getByText('Codigo de habilidade BNCC invalido: INVALID123', { exact: true })).toBeVisible()
    await expect(dialog).toBeVisible()
  })
})
