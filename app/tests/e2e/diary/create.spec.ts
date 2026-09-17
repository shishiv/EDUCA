import { createClient } from '@supabase/supabase-js'
import { test, expect } from '../support/diagnostics'
import { loginAs } from '../utils/test-helpers'
import type { Database } from '@/types/database'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function getLocalServiceClient() {
  if (!new URL(SUPABASE_URL).hostname.match(/^(127\.0\.0\.1|localhost)$/)) {
    throw new Error('Diary creation E2E requires a loopback Supabase URL')
  }
  if (!SUPABASE_SERVICE_KEY.startsWith('sb_secret_')) {
    throw new Error('Diary creation E2E requires the local Supabase service key')
  }
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

let studentId = ''

test.beforeAll(async () => {
  const service = getLocalServiceClient()
  const { data, error } = await service
    .from('alunos')
    .select('id')
    .eq('nome_completo', 'Pedro Silva E2E')
    .single()
  if (error || !data) throw error || new Error('VIVENCIA_E2E_STUDENT_MISSING')
  studentId = data.id
})

test.describe('Diário Infantil - criação disponível ao professor titular', () => {
  test.use({ storageState: { cookies: [], origins: [] }, timezoneId: 'America/Sao_Paulo' })

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'professor@test.com')
    await expect(page.getByText('Painel do Professor')).toBeVisible()
  })

  test('opens the implemented form from the student diary and cancels without writing', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-09-10T00:30:00Z'))
    const createRequests: string[] = []
    page.on('request', request => {
      if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/vivencias') {
        createRequests.push(request.url())
      }
    })

    await page.goto(`/dashboard/alunos/${studentId}/diario`)
    await expect(page.getByRole('heading', { name: 'Diario Infantil', exact: true })).toBeVisible()

    const newVivencia = page.getByRole('link', { name: 'Nova Vivencia', exact: true })
    await expect(newVivencia).toHaveAttribute('href', `/dashboard/alunos/${studentId}/diario/novo`)
    await newVivencia.click()
    await expect(page).toHaveURL(new RegExp(`/dashboard/alunos/${studentId}/diario/novo$`))

    const form = page.getByRole('form', { name: 'Registrar vivência de Pedro Silva E2E' })
    await expect(form).toBeVisible()
    await expect(form.getByText('Pedro Silva E2E', { exact: true })).toBeVisible()

    const date = form.getByLabel('Data da Vivência *', { exact: true })
    await expect(date).toHaveValue('2026-09-09')
    await expect(date).toHaveAttribute('max', '2026-09-09')

    const campos = form.getByRole('checkbox')
    await expect(campos).toHaveCount(5)
    await campos.nth(0).press('Space')
    await campos.nth(1).click()
    await expect(campos.nth(0)).toHaveAttribute('aria-checked', 'true')
    await expect(campos.nth(1)).toHaveAttribute('aria-checked', 'true')

    await expect(form.getByLabel('Descrição da Vivência *', { exact: true })).toBeEditable()
    await expect(form.getByLabel(/Observações Adicionais/)).toBeEditable()
    await expect(form.getByRole('button', { name: 'Salvar Vivência', exact: true })).toBeEnabled()

    await form.getByLabel('Descrição da Vivência *', { exact: true }).fill('Alteração local que será descartada ao cancelar.')
    await form.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/dashboard/alunos/${studentId}/diario$`))
    expect(createRequests).toEqual([])
  })

  test('requires the implemented date, experience-field, and narrative constraints', async ({ page }) => {
    await page.goto(`/dashboard/alunos/${studentId}/diario/novo`)
    const form = page.getByRole('form', { name: 'Registrar vivência de Pedro Silva E2E' })
    await expect(form).toBeVisible()

    await form.getByLabel('Data da Vivência *', { exact: true }).clear()
    await form.getByLabel('Descrição da Vivência *', { exact: true }).fill('Curta')
    await form.getByRole('button', { name: 'Salvar Vivência', exact: true }).click()

    await expect(form.getByRole('alert').filter({
      hasText: 'A data da vivência é obrigatória',
    })).toBeVisible()
    await expect(form.getByRole('alert').filter({
      hasText: 'Selecione pelo menos um Campo de Experiência',
    })).toBeVisible()
    await expect(form.getByRole('alert').filter({
      hasText: 'A descrição deve ter no mínimo 20 caracteres',
    })).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/dashboard/alunos/${studentId}/diario/novo$`))
  })
})
