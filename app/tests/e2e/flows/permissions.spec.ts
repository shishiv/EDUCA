import { test, expect } from '../support/diagnostics'

const AUTH = 'playwright/.auth'

async function expectAllowed(page: import('@playwright/test').Page, route: string) {
  await page.goto(route)
  await expect(page).toHaveURL(new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  await expect(page.locator('main')).toBeVisible({ timeout: 10000 })
}

async function expectDenied(page: import('@playwright/test').Page, route: string) {
  await page.goto(route)
  await expect(page).toHaveURL(/\/unauthorized/, { timeout: 10000 })
  await expect(page.getByRole('heading', { name: /acesso não autorizado/i })).toBeVisible()
}

test.describe('Permissions - Admin', () => {
  test.use({ storageState: `${AUTH}/user.json` })

  for (const entry of [
    { label: 'users', route: '/dashboard/usuarios' },
    { label: 'schools', route: '/dashboard/escolas' },
    { label: 'feature flags', route: '/dashboard/flags' },
    { label: 'settings', route: '/dashboard/configuracoes' },
    { label: 'reports', route: '/dashboard/relatorios' },
  ]) {
    test(`can open ${entry.label}`, async ({ page }) => {
      await expectAllowed(page, entry.route)
    })
  }
})

test.describe('Permissions - Diretor', () => {
  test.use({ storageState: `${AUTH}/diretor.json` })

  for (const entry of [
    { label: 'students', route: '/dashboard/alunos' },
    { label: 'enrollment', route: '/dashboard/matriculas' },
    { label: 'assignments', route: '/dashboard/atribuicoes' },
    { label: 'settings', route: '/dashboard/configuracoes' },
  ]) {
    test(`can open ${entry.label}`, async ({ page }) => {
      await expectAllowed(page, entry.route)
    })
  }

  for (const entry of [
    { label: 'users', route: '/dashboard/usuarios' },
    { label: 'schools', route: '/dashboard/escolas' },
    { label: 'feature flags', route: '/dashboard/flags' },
  ]) {
    test(`cannot open ${entry.label}`, async ({ page }) => {
      await expectDenied(page, entry.route)
    })
  }
})

test.describe('Permissions - Secretario', () => {
  test.use({ storageState: `${AUTH}/secretario.json` })

  for (const entry of [
    { label: 'students', route: '/dashboard/alunos' },
    { label: 'enrollment', route: '/dashboard/matriculas' },
    { label: 'guardians', route: '/dashboard/responsaveis' },
    { label: 'reports', route: '/dashboard/relatorios' },
    { label: 'grades', route: '/dashboard/notas' },
    { label: 'attendance', route: '/diario/frequencia' },
  ]) {
    test(`can open ${entry.label}`, async ({ page }) => {
      await expectAllowed(page, entry.route)
    })
  }

  for (const entry of [
    { label: 'users', route: '/dashboard/usuarios' },
    { label: 'schools', route: '/dashboard/escolas' },
    { label: 'settings', route: '/dashboard/configuracoes' },
  ]) {
    test(`cannot open ${entry.label}`, async ({ page }) => {
      await expectDenied(page, entry.route)
    })
  }
})

test.describe('Permissions - Professor', () => {
  test.use({ storageState: `${AUTH}/professor.json` })

  test('sees the teacher-specific dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByText('Dashboard do Professor')).toBeVisible({ timeout: 15000 })
  })

  for (const entry of [
    { label: 'classes', route: '/dashboard/turmas' },
    { label: 'diary', route: '/dashboard/diario' },
    { label: 'attendance', route: '/diario/frequencia' },
    { label: 'grades', route: '/dashboard/notas' },
  ]) {
    test(`can open ${entry.label}`, async ({ page }) => {
      await expectAllowed(page, entry.route)
    })
  }

  for (const entry of [
    { label: 'student creation', route: '/dashboard/alunos/novo' },
    { label: 'class creation', route: '/dashboard/turmas/nova' },
    { label: 'enrollment', route: '/dashboard/matriculas' },
    { label: 'reports', route: '/dashboard/relatorios' },
    { label: 'settings', route: '/dashboard/configuracoes' },
    { label: 'users', route: '/dashboard/usuarios' },
    { label: 'schools', route: '/dashboard/escolas' },
  ]) {
    test(`cannot open ${entry.label}`, async ({ page }) => {
      await expectDenied(page, entry.route)
    })
  }
})

test.describe('Permissions - Responsavel boundary', () => {
  test.use({ storageState: `${AUTH}/responsavel.json` })

  for (const entry of [
    { label: 'dashboard', route: '/dashboard' },
    { label: 'students', route: '/dashboard/alunos' },
    { label: 'grades', route: '/dashboard/notas' },
    { label: 'reports', route: '/dashboard/relatorios' },
  ]) {
    test(`cannot open ${entry.label}`, async ({ page }) => {
      await expectDenied(page, entry.route)
    })
  }

  test('can access public privacy content', async ({ page }) => {
    await page.goto('/politica-privacidade')
    await expect(page).toHaveURL(/politica-privacidade/)
    await expect(page.locator('main')).toBeVisible()
  })
})
