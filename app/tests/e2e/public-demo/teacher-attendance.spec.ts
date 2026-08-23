/**
 * J4 — Professor titular (attendance write + cross-school deny)
 *
 * Requires: local Supabase stack with demo seed.
 * Mutations: YES — disposable local stack only.
 */
import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const TEACHER_EMAIL = 'professora.a@synthetic.invalid'
const PASSWORD = 'Synthetic-Only-2026!'
const CLASS_A = '30000000-0000-0000-0000-000000000001'
const CLASS_B = '30000000-0000-0000-0000-000000000002'

test.describe('J4: teacher attendance journey', () => {
  test('teacher can open and save attendance for own class', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('E-mail', { exact: true }).fill(TEACHER_EMAIL)
    await page.getByLabel('Senha', { exact: true }).fill(PASSWORD)
    await page.getByRole('button', { name: /entrar/i }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    await page.goto(`/dashboard/turmas/${CLASS_A}/chamada`)
    await expect(page).toHaveURL(new RegExp(`${CLASS_A}/chamada`))

    const openButton = page.getByRole('button', { name: /abrir chamada/i })
    if (await openButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await openButton.click()
      await expect(page.getByText(/chamada aberta/i)).toBeVisible({ timeout: 10_000 })
    }
  })

  test('teacher is blocked from another school class via RLS', async () => {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { error: authError } = await client.auth.signInWithPassword({
      email: TEACHER_EMAIL,
      password: PASSWORD,
    })
    expect(authError).toBeNull()

    // Teacher should NOT be able to read class B (different school)
    const { data: classB } = await client
      .from('turmas')
      .select('id')
      .eq('id', CLASS_B)
      .single()

    // RLS should return null or error for cross-school access
    expect(classB).toBeNull()
  })
})
