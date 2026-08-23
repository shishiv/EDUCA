/**
 * J6 — Negativas do Pilot Gate
 *
 * Requires: local Supabase stack with pilot provisioner applied.
 * Mutations: NO — read-only verification of module access denial.
 * Reuses patterns from pilot/core-scope.spec.ts.
 */
import { expect, test } from '@playwright/test'

const DISABLED_MODULES = [
  { path: '/dashboard/notas', label: 'Notas' },
  { path: '/dashboard/calendario', label: 'Calendário' },
  { path: '/dashboard/configuracoes', label: 'Configurações' },
  { path: '/dashboard/sessoes', label: 'Sessões' },
]

test.describe('J6: pilot gate denials', () => {
  test('disabled modules redirect to dashboard with pilotScope=disabled', async ({ page }) => {
    // Assumes authenticated state from setup (pilot provisioner context)
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)

    for (const mod of DISABLED_MODULES) {
      await page.goto(mod.path)
      await expect(page).toHaveURL(/\/dashboard\?pilotScope=disabled/, {
        timeout: 10_000,
      })
    }
  })

  test('enabled modules remain accessible', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)

    await page.goto('/dashboard/alunos')
    await expect(page.getByRole('heading', { name: /alunos/i }).first()).toBeVisible()

    await page.goto('/dashboard/turmas')
    await expect(page.getByRole('heading', { name: /turmas/i }).first()).toBeVisible()
  })

  test('class diary remains accessible despite pilot gate', async ({ page }) => {
    await page.goto('/dashboard/diario')
    // Should redirect to /diario (canonical route)
    await expect(page).toHaveURL(/\/diario(?:\?|$)/)
  })
})
