import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

test.describe('Educação Infantil Vivências persistence', () => {
  test.use({ storageState: 'playwright/.auth/professor.json' })

  let studentId = ''
  const description = 'Vivência E2E criada pelo professor sintético.'

  test.beforeAll(async () => {
    const { data, error } = await service
      .from('alunos')
      .select('id')
      .eq('nome_completo', 'Pedro Silva E2E')
      .single()
    if (error || !data) throw error || new Error('VIVENCIA_E2E_STUDENT_MISSING')
    studentId = data.id
    await service.from('vivencias').delete().eq('descricao', description)
  })

  test.afterAll(async () => {
    if (studentId) await service.from('vivencias').delete().eq('descricao', description)
  })

  test('creates and reloads a narrative on desktop', async ({ page }) => {
    await page.goto(`/dashboard/alunos/${studentId}/diario/novo`)
    await expect(page.getByText(/registrando vivencia para/i)).toBeVisible()
    await page.getByRole('checkbox').first().click()
    await page.getByLabel(/descri.*viv/i).fill(description)
    await page.getByRole('button', { name: /salvar/i }).click()
    await expect(page).toHaveURL(new RegExp(`/dashboard/alunos/${studentId}/diario$`))
    await expect(page.getByText(description)).toBeVisible()
    await page.reload()
    await expect(page.getByText(description)).toBeVisible()
  })

  test('keeps the form usable at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/dashboard/alunos/${studentId}/diario/novo`)
    await expect(page.getByRole('button', { name: /salvar/i })).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    expect(overflow).toBe(false)
  })
})
