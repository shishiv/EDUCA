/**
 * J3 — Diretor de escola (school isolation via RLS)
 *
 * Requires: local Supabase stack with demo seed.
 * Mutations: NO direct mutations — verifies read isolation.
 */
import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const DIRECTOR_EMAIL = 'diretora.a@synthetic.invalid'
const DIRECTOR_B_EMAIL = 'diretora.b@synthetic.invalid'
const PASSWORD = 'Synthetic-Only-2026!'
const SCHOOL_A = '10000000-0000-0000-0000-000000000001'
const SCHOOL_B = '10000000-0000-0000-0000-000000000002'

test.describe('J3: director school isolation', () => {
  test('director sees only their own school data via RLS', async () => {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { error } = await client.auth.signInWithPassword({
      email: DIRECTOR_EMAIL,
      password: PASSWORD,
    })
    expect(error).toBeNull()

    // Director A should see students from school A only
    const { data: students } = await client
      .from('alunos')
      .select('id, escola_id')
      .limit(50)

    if (students && students.length > 0) {
      const foreignSchool = students.filter(
        (s: { escola_id: string }) => s.escola_id !== SCHOOL_A
      )
      expect(foreignSchool).toHaveLength(0)
    }
  })

  test('director cannot access another school via browser', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('E-mail', { exact: true }).fill(DIRECTOR_EMAIL)
    await page.getByLabel('Senha', { exact: true }).fill(PASSWORD)
    await page.getByRole('button', { name: /entrar/i }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    // Attempt to access school B's detail page
    await page.goto(`/dashboard/escolas/${SCHOOL_B}`)
    // Should be unauthorized or show no data
    const unauthorized = page.getByText(/não autorizado|unauthorized/i)
    const noData = page.getByText(/não encontrad/i)
    const redirected = page.url().includes('/unauthorized')
    expect(
      (await unauthorized.isVisible().catch(() => false)) ||
      (await noData.isVisible().catch(() => false)) ||
      redirected
    ).toBeTruthy()
  })
})
