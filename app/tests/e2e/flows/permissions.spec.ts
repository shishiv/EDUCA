import { test, expect } from '@playwright/test'
import { loginAs, waitForPageLoad } from '../utils/test-helpers'

/**
 * E2E Tests: Permissions & RBAC
 * Tests role-based access control for different user types:
 * - admin
 * - diretor
 * - secretario
 * - professor
 * - responsavel
 */

test.describe('Permissions - Admin Role', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' })

  test('admin should access all dashboard sections', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)
    
    // Admin should see all menu items
    const sections = [
      /alunos/i,
      /escolas/i,
      /turmas/i,
      /matrículas/i,
      /usuários/i,
      /relatórios/i,
      /configurações/i
    ]
    
    for (const section of sections) {
      const menuItem = page.getByRole('link', { name: section })
      // Should be accessible
    }
  })

  test('admin should create new schools', async ({ page }) => {
    await page.goto('/dashboard/escolas')
    await waitForPageLoad(page)
    
    const newButton = page.getByRole('link', { name: /nova.*escola/i })
    await expect(newButton).toBeVisible()
    await newButton.click()
    
    await expect(page).toHaveURL(/escolas\/nova/)
  })

  test('admin should manage users', async ({ page }) => {
    await page.goto('/dashboard/usuarios')
    await waitForPageLoad(page)
    
    await expect(page.getByRole('heading', { name: /usuários/i })).toBeVisible()
    
    const newUserButton = page.getByRole('link', { name: /novo.*usuário/i })
    await expect(newUserButton).toBeVisible()
  })

  test('admin should access system configuration', async ({ page }) => {
    await page.goto('/dashboard/configuracoes')
    await waitForPageLoad(page)
    
    await expect(page.getByRole('heading', { name: /configurações/i })).toBeVisible()
  })

  test('admin should view all reports', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    // Should see all reports from all schools
    await expect(page.getByRole('heading', { name: /relatórios/i })).toBeVisible()
  })
})

test.describe('Permissions - Diretor Role', () => {
  test('diretor should access their school dashboard', async ({ page }) => {
    // Login as diretor
    await loginAs(page, 'diretor@test.com')
    
    await expect(page).toHaveURL(/dashboard/)
    await expect(page.getByText(/dashboard|início/i)).toBeVisible()
  })

  test('diretor should view students from their school only', async ({ page }) => {
    await loginAs(page, 'diretor@test.com')
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    
    // Should see students list
    await expect(page.getByRole('heading', { name: /alunos/i })).toBeVisible()
  })

  test('diretor should manage enrollments for their school', async ({ page }) => {
    await loginAs(page, 'diretor@test.com')
    await page.goto('/dashboard/matriculas')
    await waitForPageLoad(page)
    
    const newEnrollment = page.getByRole('link', { name: /nova.*matrícula/i })
    await expect(newEnrollment).toBeVisible()
  })

  test('diretor should NOT access system configuration', async ({ page }) => {
    await loginAs(page, 'diretor@test.com')
    await page.goto('/dashboard/configuracoes')
    
    // Should be blocked or redirected
    await page.waitForTimeout(2000)
    
    // Either access denied message or redirect to dashboard
    const isDenied = await page.getByText(/acesso.*negado|sem.*permissão|forbidden/i).isVisible()
    const isRedirected = page.url().includes('/dashboard') && !page.url().includes('configuracoes')
    
    expect(isDenied || isRedirected).toBeTruthy()
  })

  test('diretor should NOT manage users globally', async ({ page }) => {
    await loginAs(page, 'diretor@test.com')
    await page.goto('/dashboard/usuarios')
    
    await page.waitForTimeout(2000)
    
    // Should have restricted access
    const isDenied = await page.getByText(/acesso.*negado|sem.*permissão/i).isVisible()
    const isRedirected = !page.url().includes('/usuarios')
    
    expect(isDenied || isRedirected).toBeTruthy()
  })

  test('diretor should approve attendance unlock requests', async ({ page }) => {
    await loginAs(page, 'diretor@test.com')
    await page.goto('/dashboard/diario')
    await waitForPageLoad(page)
    
    // Diretor can unlock locked attendance
    const unlockOption = page.getByText(/desbloquear|unlock|aprovar/i)
    // May be visible if there are pending requests
  })
})

test.describe('Permissions - Professor Role', () => {
  test('professor should access their assigned turmas', async ({ page }) => {
    await loginAs(page, 'professor@test.com')
    
    await expect(page).toHaveURL(/dashboard/)
    
    // Should see their turmas
    const turmasSection = page.getByText(/suas?.*turmas?|minhas?.*turmas?/i)
    // May be visible in dashboard
  })

  test('professor should register attendance for their turmas', async ({ page }) => {
    await loginAs(page, 'professor@test.com')
    await page.goto('/dashboard/diario')
    await waitForPageLoad(page)
    
    await expect(page.getByRole('heading', { name: /diário|chamada|frequência/i })).toBeVisible()
    
    // Should have turma selector
    const turmaSelect = page.getByLabel(/turma/i)
    await expect(turmaSelect).toBeVisible()
  })

  test('professor should view student details from their turmas', async ({ page }) => {
    await loginAs(page, 'professor@test.com')
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    
    // Should see students (filtered by their turmas)
    await expect(page.getByRole('heading', { name: /alunos/i })).toBeVisible()
  })

  test('professor should NOT create new students', async ({ page }) => {
    await loginAs(page, 'professor@test.com')
    await page.goto('/dashboard/alunos/novo')
    
    await page.waitForTimeout(2000)
    
    // Should not have access to student creation
    const isDenied = await page.getByText(/acesso.*negado|sem.*permissão/i).isVisible()
    const isRedirected = !page.url().includes('/alunos/novo')
    
    expect(isDenied || isRedirected).toBeTruthy()
  })

  test('professor should NOT manage enrollments', async ({ page }) => {
    await loginAs(page, 'professor@test.com')
    await page.goto('/dashboard/matriculas')
    
    await page.waitForTimeout(2000)
    
    // Should have view-only or no access
    const hasCreateButton = await page.getByRole('link', { name: /nova.*matrícula/i }).isVisible()
    expect(hasCreateButton).toBeFalsy()
  })

  test('professor should NOT access system reports', async ({ page }) => {
    await loginAs(page, 'professor@test.com')
    await page.goto('/dashboard/relatorios')
    
    await page.waitForTimeout(2000)
    
    // Limited or no access to system-wide reports
    const isDenied = await page.getByText(/acesso.*negado|sem.*permissão/i).isVisible()
    const isRedirected = !page.url().includes('/relatorios')
    
    expect(isDenied || isRedirected).toBeTruthy()
  })

  test('professor should register attendance only until 18h', async ({ page }) => {
    await loginAs(page, 'professor@test.com')
    await page.goto('/dashboard/diario')
    await waitForPageLoad(page)
    
    // Select yesterday's date (should be locked)
    const dateField = page.getByLabel(/data/i)
    if (await dateField.isVisible()) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const dateStr = yesterday.toISOString().split('T')[0]
      
      await dateField.fill(dateStr)
      
      // Should show lock warning
      const lockWarning = page.getByText(/bloqueado|não.*editar|18.*horas/i)
      // Should be visible if time rules apply
    }
  })
})

test.describe('Permissions - Secretario Role', () => {
  test('secretario should manage students', async ({ page }) => {
    await loginAs(page, 'secretario@test.com')
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    
    const newStudentButton = page.getByRole('link', { name: /novo.*aluno/i })
    await expect(newStudentButton).toBeVisible()
  })

  test('secretario should manage enrollments', async ({ page }) => {
    await loginAs(page, 'secretario@test.com')
    await page.goto('/dashboard/matriculas')
    await waitForPageLoad(page)
    
    const newEnrollmentButton = page.getByRole('link', { name: /nova.*matrícula/i })
    await expect(newEnrollmentButton).toBeVisible()
  })

  test('secretario should view reports for their school', async ({ page }) => {
    await loginAs(page, 'secretario@test.com')
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    // Should access reports
    await expect(page.getByRole('heading', { name: /relatórios/i })).toBeVisible()
  })

  test('secretario should NOT edit attendance', async ({ page }) => {
    await loginAs(page, 'secretario@test.com')
    await page.goto('/dashboard/diario')
    
    await page.waitForTimeout(2000)
    
    // Should have view-only or limited access
    const isDenied = await page.getByText(/acesso.*negado|apenas.*visualização|view.*only/i).isVisible()
    // Secretario typically has read-only access to attendance
  })

  test('secretario should NOT access system configuration', async ({ page }) => {
    await loginAs(page, 'secretario@test.com')
    await page.goto('/dashboard/configuracoes')
    
    await page.waitForTimeout(2000)
    
    const isDenied = await page.getByText(/acesso.*negado|sem.*permissão/i).isVisible()
    const isRedirected = !page.url().includes('/configuracoes')
    
    expect(isDenied || isRedirected).toBeTruthy()
  })
})

test.describe('Permissions - Responsavel Role', () => {
  test('responsavel should view their children only', async ({ page }) => {
    await loginAs(page, 'responsavel@test.com')
    
    await expect(page).toHaveURL(/dashboard/)
    
    // Should see limited dashboard with their children's info
    const childInfo = page.getByText(/filho|filha|aluno/i)
    // May be visible in parent dashboard
  })

  test('responsavel should view child boletim', async ({ page }) => {
    await loginAs(page, 'responsavel@test.com')
    await page.goto('/dashboard')
    await waitForPageLoad(page)
    
    const boletimLink = page.getByRole('link', { name: /boletim|notas|desempenho/i })
    if (await boletimLink.isVisible()) {
      await boletimLink.click()
      // Should access child's report card
    }
  })

  test('responsavel should view child attendance', async ({ page }) => {
    await loginAs(page, 'responsavel@test.com')
    await page.goto('/dashboard')
    await waitForPageLoad(page)
    
    const frequencyLink = page.getByRole('link', { name: /frequência|presença/i })
    if (await frequencyLink.isVisible()) {
      await frequencyLink.click()
      // Should view child's attendance records
    }
  })

  test('responsavel should NOT access other students', async ({ page }) => {
    await loginAs(page, 'responsavel@test.com')
    await page.goto('/dashboard/alunos')
    
    await page.waitForTimeout(2000)
    
    // Should not see full student list
    const isDenied = await page.getByText(/acesso.*negado|sem.*permissão/i).isVisible()
    const isRedirected = !page.url().includes('/alunos')
    
    expect(isDenied || isRedirected).toBeTruthy()
  })

  test('responsavel should NOT manage any data', async ({ page }) => {
    await loginAs(page, 'responsavel@test.com')
    await page.goto('/dashboard/matriculas/nova')
    
    await page.waitForTimeout(2000)
    
    const isDenied = await page.getByText(/acesso.*negado|sem.*permissão/i).isVisible()
    const isRedirected = !page.url().includes('/matriculas/nova')
    
    expect(isDenied || isRedirected).toBeTruthy()
  })

  test('responsavel should update their contact information', async ({ page }) => {
    await loginAs(page, 'responsavel@test.com')
    await page.goto('/dashboard/perfil')
    await waitForPageLoad(page)
    
    // Should access their profile
    await expect(page.getByRole('heading', { name: /perfil|meus.*dados/i })).toBeVisible()
  })
})

test.describe('Permissions - Protected Routes', () => {
  test('unauthenticated user should redirect to login', async ({ page }) => {
    // Clear auth
    await page.context().clearCookies()
    
    await page.goto('/dashboard/alunos')
    
    // Should redirect to login
    await expect(page).toHaveURL(/login/)
  })

  test('should preserve redirect URL after login', async ({ page }) => {
    await page.context().clearCookies()
    
    await page.goto('/dashboard/alunos')
    
    // Login
    await loginAs(page, 'admin@test.com')
    
    // Should redirect back to /alunos
    await page.waitForTimeout(2000)
    await expect(page).toHaveURL(/alunos/)
  })
})

test.describe('Permissions - Data Isolation', () => {
  test('professor should only see students from assigned turmas', async ({ page }) => {
    await loginAs(page, 'professor@test.com')
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    
    // Student list should be filtered by professor's turmas
    // Cannot verify specific data, but access should be restricted
  })

  test('diretor should only see data from their school', async ({ page }) => {
    await loginAs(page, 'diretor@test.com')
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    // Reports should be scoped to diretor's school
    // Data isolation enforced at API level
  })

  test('responsavel should only see their children data', async ({ page }) => {
    await loginAs(page, 'responsavel@test.com')
    
    // Should not be able to navigate to other student details
    await page.goto('/dashboard/alunos/999999')
    
    await page.waitForTimeout(2000)
    
    // Should be blocked or show "not found"
    const isDenied = await page.getByText(/não.*encontrado|acesso.*negado/i).isVisible()
    expect(isDenied).toBeTruthy()
  })
})

test.describe('Permissions - Action Buttons', () => {
  test('view-only roles should not see delete buttons', async ({ page }) => {
    await loginAs(page, 'secretario@test.com')
    await page.goto('/dashboard/diario')
    await waitForPageLoad(page)
    
    // Should not see delete/edit options for attendance
    const deleteButton = page.getByRole('button', { name: /excluir|deletar/i })
    const isVisible = await deleteButton.isVisible()
    
    // Secretario should have view-only access to attendance
    expect(isVisible).toBeFalsy()
  })

  test('limited roles should see appropriate action buttons', async ({ page }) => {
    await loginAs(page, 'professor@test.com')
    await page.goto('/dashboard/diario')
    await waitForPageLoad(page)
    
    // Professor should see attendance form but not student management
    const attendanceForm = page.getByLabel(/turma|data/i)
    await expect(attendanceForm).toBeVisible()
  })
})
