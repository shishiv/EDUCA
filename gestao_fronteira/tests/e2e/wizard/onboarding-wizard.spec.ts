/**
 * E2E Tests: Wizard de Onboarding
 *
 * Testa o fluxo completo do wizard de onboarding:
 * - Redirecionamento automático para wizard
 * - Validação de CPF inválido
 * - Requisitos mínimos (1 diretor, 2 professores)
 * - Persistência no localStorage
 * - Criação batch de usuários
 * - Redirecionamento para dashboard
 */

import { test, expect, Page } from '@playwright/test'

const ADMIN_EMAIL = 'admin@fronteira.mg.gov.br'
const ADMIN_PASSWORD = 'Admin@Fronteira2025'
const BASE_URL = 'http://localhost:3000'

// Helper: Login como superadmin
async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.fill('input[name="email"]', ADMIN_EMAIL)
  await page.fill('input[name="password"]', ADMIN_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForLoadState('networkidle')
}

// Helper: Limpar localStorage (reset wizard)
async function clearWizardState(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('wizard-onboarding-storage')
  })
}

test.describe('Wizard de Onboarding - Fluxo Completo', () => {
  test.beforeEach(async ({ page }) => {
    // Limpar localStorage antes de cada teste
    await clearWizardState(page)
  })

  test('deve redirecionar admin para wizard se wizard_completed = false', async ({
    page,
  }) => {
    // Login como admin
    await loginAsAdmin(page)

    // Verificar redirecionamento automático para wizard
    await expect(page).toHaveURL(/\/wizard\/onboarding/)

    // Verificar que Step 1 está visível
    await expect(
      page.getByRole('heading', { name: /Bem-vindo ao Sistema Educacional/i })
    ).toBeVisible()
  })

  test('deve exibir 9 escolas no Step 1', async ({ page }) => {
    await page.goto('/wizard/onboarding')
    await page.waitForLoadState('networkidle')

    // Verificar título
    await expect(
      page.getByRole('heading', { name: /Bem-vindo ao Sistema Educacional/i })
    ).toBeVisible()

    // Verificar que exibe "9 escolas"
    await expect(page.getByText(/9 escolas/i)).toBeVisible()

    // Verificar botão "Começar configuração"
    const startButton = page.getByRole('button', {
      name: /Começar configuração/i,
    })
    await expect(startButton).toBeVisible()
    await expect(startButton).toBeEnabled()
  })

  test('deve validar CPF inválido no formulário de diretor', async ({
    page,
  }) => {
    await page.goto('/wizard/onboarding')
    await page.waitForLoadState('networkidle')

    // Step 1: Próximo
    await page.click('button:has-text("Começar configuração")')

    // Step 2: Abrir formulário de diretor
    await page.click('button:has-text("Adicionar Diretor")')

    // Preencher com CPF inválido
    await page.fill('input[name="nome"]', 'Maria Silva')
    await page.fill('input[name="email"]', 'maria.silva@fronteira.mg.gov.br')
    await page.fill('input[name="cpf"]', '111.111.111-11') // CPF inválido
    await page.fill('input[name="telefone"]', '(34) 99999-9999')

    // Selecionar uma escola
    const firstCheckbox = page.locator('input[type="checkbox"]').first()
    await firstCheckbox.check()

    // Tentar adicionar
    await page.click('button:has-text("Adicionar Diretor")')

    // Verificar mensagem de erro
    await expect(page.getByText(/CPF inválido/i)).toBeVisible()
  })

  test('deve validar requisito mínimo de 1 diretor', async ({ page }) => {
    await page.goto('/wizard/onboarding')
    await page.waitForLoadState('networkidle')

    // Step 1: Próximo
    await page.click('button:has-text("Começar configuração")')

    // Step 2: Verificar que botão Próximo está desabilitado
    const nextButton = page.getByRole('button', { name: /Próximo/i })
    await expect(nextButton).toBeDisabled()

    // Verificar mensagem de requisito
    await expect(
      page.getByText(/pelo menos 1 diretor/i)
    ).toBeVisible()
  })

  test('deve permitir adicionar diretor válido', async ({ page }) => {
    await page.goto('/wizard/onboarding')
    await page.waitForLoadState('networkidle')

    // Step 1: Próximo
    await page.click('button:has-text("Começar configuração")')

    // Step 2: Abrir formulário
    await page.click('button:has-text("Adicionar Diretor")')

    // Preencher com CPF válido
    await page.fill('input[name="nome"]', 'Maria Silva')
    await page.fill('input[name="email"]', 'maria.silva@fronteira.mg.gov.br')
    await page.fill('input[name="cpf"]', '123.456.789-09') // CPF válido
    await page.fill('input[name="telefone"]', '(34) 99999-9999')

    // Selecionar uma escola
    const firstCheckbox = page.locator('input[type="checkbox"]').first()
    await firstCheckbox.check()

    // Adicionar
    await page.click('button:has-text("Adicionar Diretor")')

    // Verificar que diretor foi adicionado
    await expect(page.getByText('Maria Silva')).toBeVisible()
    await expect(
      page.getByText('maria.silva@fronteira.mg.gov.br')
    ).toBeVisible()

    // Verificar que botão Próximo está habilitado
    const nextButton = page.getByRole('button', { name: /Próximo/i })
    await expect(nextButton).toBeEnabled()
  })

  test('deve permitir pular steps opcionais (Coordenadores e Secretários)', async ({
    page,
  }) => {
    await page.goto('/wizard/onboarding')
    await page.waitForLoadState('networkidle')

    // Step 1
    await page.click('button:has-text("Começar configuração")')

    // Step 2: Adicionar 1 diretor
    await page.click('button:has-text("Adicionar Diretor")')
    await page.fill('input[name="nome"]', 'Maria Silva')
    await page.fill('input[name="email"]', 'maria@fronteira.mg.gov.br')
    await page.fill('input[name="cpf"]', '123.456.789-09')
    await page.fill('input[name="telefone"]', '(34) 99999-9999')
    const checkbox1 = page.locator('input[type="checkbox"]').first()
    await checkbox1.check()
    await page.click('button:has-text("Adicionar Diretor")')

    // Próximo para Step 3
    await page.click('button[type="button"]:has-text("Próximo")')

    // Step 3: Pular coordenadores
    await expect(
      page.getByRole('button', { name: /Pular esta etapa/i })
    ).toBeVisible()
    await page.click('button:has-text("Pular esta etapa")')

    // Step 4: Pular secretários
    await expect(
      page.getByRole('button', { name: /Pular esta etapa/i })
    ).toBeVisible()
    await page.click('button:has-text("Pular esta etapa")')

    // Step 5: Verificar que chegou em Professores
    await expect(
      page.getByRole('heading', { name: /Criar Professores/i })
    ).toBeVisible()
  })

  test('deve validar requisito mínimo de 2 professores', async ({ page }) => {
    await page.goto('/wizard/onboarding')
    await page.waitForLoadState('networkidle')

    // Navegar até Step 5 (pulando steps anteriores)
    // Step 1
    await page.click('button:has-text("Começar configuração")')

    // Step 2: Adicionar 1 diretor rápido
    await page.click('button:has-text("Adicionar Diretor")')
    await page.fill('input[name="nome"]', 'Diretor Teste')
    await page.fill('input[name="email"]', 'diretor@fronteira.mg.gov.br')
    await page.fill('input[name="cpf"]', '123.456.789-09')
    await page.fill('input[name="telefone"]', '(34) 99999-9999')
    const checkbox1 = page.locator('input[type="checkbox"]').first()
    await checkbox1.check()
    await page.click('button:has-text("Adicionar Diretor")')
    await page.click('button[type="button"]:has-text("Próximo")')

    // Steps 3 e 4: Pular
    await page.click('button:has-text("Pular esta etapa")')
    await page.click('button:has-text("Pular esta etapa")')

    // Step 5: Verificar requisito de 2 professores
    await expect(
      page.getByText(/pelo menos 2 professores/i)
    ).toBeVisible()

    // Botão Próximo deve estar desabilitado
    const nextButton = page.getByRole('button', { name: /Próximo/i })
    await expect(nextButton).toBeDisabled()
  })

  test('deve persistir dados no localStorage ao sair e voltar', async ({
    page,
  }) => {
    await page.goto('/wizard/onboarding')
    await page.waitForLoadState('networkidle')

    // Step 1
    await page.click('button:has-text("Começar configuração")')

    // Step 2: Adicionar diretor
    await page.click('button:has-text("Adicionar Diretor")')
    await page.fill('input[name="nome"]', 'Diretor Persistente')
    await page.fill('input[name="email"]', 'persistente@fronteira.mg.gov.br')
    await page.fill('input[name="cpf"]', '123.456.789-09')
    await page.fill('input[name="telefone"]', '(34) 99999-9999')
    const checkbox = page.locator('input[type="checkbox"]').first()
    await checkbox.check()
    await page.click('button:has-text("Adicionar Diretor")')

    // Recarregar página (simula sair e voltar)
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Verificar que diretor ainda está lá
    await expect(page.getByText('Diretor Persistente')).toBeVisible()
    await expect(
      page.getByText('persistente@fronteira.mg.gov.br')
    ).toBeVisible()
  })
})

test.describe('Wizard de Onboarding - Review e Finalização', () => {
  test.skip('deve exibir resumo completo no Step 6', async ({ page }) => {
    // TODO: Implementar após criação de fixtures para preencher wizard completo
  })

  test.skip('deve criar todos os usuários no banco ao finalizar', async ({
    page,
  }) => {
    // TODO: Implementar com mock do server action
  })

  test.skip('deve redirecionar para dashboard após finalização', async ({
    page,
  }) => {
    // TODO: Implementar verificação de redirecionamento pós-wizard
  })
})
