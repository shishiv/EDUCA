/**
 * Comprehensive E2E Tests for "Abrir Aula" Workflow
 * Task 6.1: Write comprehensive E2E tests for "Abrir Aula" workflow
 * Brazilian Educational Compliance Implementation
 */

import { test, expect, Page, BrowserContext } from '@playwright/test'

// Test data for Brazilian educational context
const testData = {
  teacher: {
    email: 'professor.joao@fronteira.mg.gov.br',
    password: 'TesteSeguro123!',
    nome: 'Professor João Silva',
    cpf: '123.456.789-01',
    papel: 'professor'
  },
  admin: {
    email: 'admin@fronteira.mg.gov.br',
    password: 'AdminSeguro123!',
    nome: 'Administrador Sistema',
    papel: 'admin'
  },
  escola: {
    id: 'escola-municipal-fronteira',
    nome: 'Escola Municipal de Fronteira',
    endereco: 'Rua Principal, 123 - Centro, Fronteira/MG'
  },
  turma: {
    id: 'turma-1a-fundamental',
    nome: '1º Ano A',
    serie: 'Fundamental I',
    turno: 'Manhã',
    totalAlunos: 25
  },
  students: [
    { id: 'aluno-001', nome: 'Ana Silva Santos', cpf: '111.222.333-44' },
    { id: 'aluno-002', nome: 'Bruno Costa Lima', cpf: '222.333.444-55' },
    { id: 'aluno-003', nome: 'Carlos Eduardo Souza', cpf: '333.444.555-66' },
    { id: 'aluno-004', nome: 'Daniela Ferreira', cpf: '444.555.666-77' },
    { id: 'aluno-005', nome: 'Eduardo Pereira', cpf: '555.666.777-88' }
  ]
}

test.describe('Abrir Aula Workflow - Complete E2E Tests', () => {
  let teacherContext: BrowserContext
  let adminContext: BrowserContext
  let teacherPage: Page
  let adminPage: Page

  test.beforeAll(async ({ browser }) => {
    // Create separate contexts for teacher and admin
    teacherContext = await browser.newContext({
      viewport: { width: 1200, height: 800 },
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo'
    })

    adminContext = await browser.newContext({
      viewport: { width: 1200, height: 800 },
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo'
    })

    teacherPage = await teacherContext.newPage()
    adminPage = await adminContext.newPage()
  })

  test.afterAll(async () => {
    await teacherContext.close()
    await adminContext.close()
  })

  test.describe('Authentication and Setup', () => {
    test('should authenticate teacher and admin users', async () => {
      // Teacher login
      await teacherPage.goto('/login')
      await teacherPage.fill('[data-testid="email-input"]', testData.teacher.email)
      await teacherPage.fill('[data-testid="password-input"]', testData.teacher.password)
      await teacherPage.click('[data-testid="login-button"]')

      await expect(teacherPage).toHaveURL('/dashboard/professor')
      await expect(teacherPage.locator('[data-testid="teacher-name"]')).toContainText('Professor João')

      // Admin login
      await adminPage.goto('/login')
      await adminPage.fill('[data-testid="email-input"]', testData.admin.email)
      await adminPage.fill('[data-testid="password-input"]', testData.admin.password)
      await adminPage.click('[data-testid="login-button"]')

      await expect(adminPage).toHaveURL('/dashboard/admin')
      await expect(adminPage.locator('[data-testid="admin-dashboard"]')).toBeVisible()
    })

    test('should display teacher dashboard with assigned classes', async () => {
      await expect(teacherPage.locator('[data-testid="class-card"]')).toBeVisible()
      await expect(teacherPage.locator('[data-testid="class-name"]')).toContainText('1º Ano A')
      await expect(teacherPage.locator('[data-testid="student-count"]')).toContainText('25 alunos')
    })
  })

  test.describe('Abrir Aula Workflow - Core Functionality', () => {
    test('should complete full "Abrir Aula" workflow successfully', async () => {
      // Step 1: Teacher opens a class session
      await teacherPage.click('[data-testid="abrir-aula-button"]')

      // Verify confirmation dialog
      await expect(teacherPage.locator('[data-testid="confirm-dialog"]')).toBeVisible()
      await expect(teacherPage.locator('[data-testid="confirm-message"]')).toContainText('Abrir aula para 1º Ano A')

      await teacherPage.click('[data-testid="confirm-open-session"]')

      // Step 2: Verify session opened successfully
      await expect(teacherPage.locator('[data-testid="success-toast"]')).toContainText('Aula aberta com sucesso')
      await expect(teacherPage.locator('[data-testid="aula-status"]')).toContainText('Aula Aberta')

      // Step 3: Verify session timer is active
      await expect(teacherPage.locator('[data-testid="session-timer"]')).toBeVisible()
      await expect(teacherPage.locator('[data-testid="time-remaining"]')).toContainText('30:')

      // Step 4: Navigate to attendance page
      await teacherPage.click('[data-testid="marcar-frequencia-button"]')
      await expect(teacherPage).toHaveURL(/.*\/frequencia\/.*/)

      // Step 5: Verify attendance grid is enabled
      await expect(teacherPage.locator('[data-testid="attendance-grid"]')).toBeVisible()
      await expect(teacherPage.locator('[data-testid="student-row"]')).toHaveCount(5) // Test students

      // Step 6: Mark attendance for students
      for (let i = 0; i < testData.students.length; i++) {
        const isPresent = i < 4 // Mark first 4 as present, last as absent
        const button = teacherPage.locator(`[data-testid="student-${testData.students[i].id}-${isPresent ? 'present' : 'absent'}"]`)
        await button.click()

        // Verify immediate visual feedback
        await expect(button).toHaveClass(/selected|active/)
      }

      // Step 7: Submit attendance
      await teacherPage.click('[data-testid="submit-attendance"]')
      await expect(teacherPage.locator('[data-testid="attendance-saved"]')).toContainText('Frequência salva')

      // Step 8: Close session
      await teacherPage.click('[data-testid="fechar-aula-button"]')
      await teacherPage.click('[data-testid="confirm-close-session"]')

      // Step 9: Verify session closed
      await expect(teacherPage.locator('[data-testid="aula-status"]')).toContainText('Aula Fechada')
      await expect(teacherPage.locator('[data-testid="attendance-summary"]')).toContainText('4 presentes, 1 ausente')
    })

    test('should handle concurrent teacher access properly', async () => {
      // Create second teacher context
      const secondTeacherContext = await teacherContext.browser()!.newContext()
      const secondTeacherPage = await secondTeacherContext.newPage()

      // Second teacher logs in
      await secondTeacherPage.goto('/login')
      await secondTeacherPage.fill('[data-testid="email-input"]', 'professor.maria@fronteira.mg.gov.br')
      await secondTeacherPage.fill('[data-testid="password-input"]', 'TesteSeguro123!')
      await secondTeacherPage.click('[data-testid="login-button"]')

      // First teacher opens session
      await teacherPage.click('[data-testid="abrir-aula-button"]')
      await teacherPage.click('[data-testid="confirm-open-session"]')

      // Second teacher tries to open same session
      await secondTeacherPage.goto('/dashboard/professor')
      await secondTeacherPage.click('[data-testid="abrir-aula-button"]')

      // Should see conflict error
      await expect(secondTeacherPage.locator('[data-testid="error-toast"]')).toContainText('Outro professor já abriu esta aula')

      await secondTeacherContext.close()
    })

    test('should enforce Brazilian time-lock compliance (18:00 rule)', async () => {
      // Mock current time to 17:55 (5 minutes before lock)
      await teacherPage.addInitScript(() => {
        const mockDate = new Date()
        mockDate.setHours(17, 55, 0, 0)
        Date.now = () => mockDate.getTime()
      })

      await teacherPage.reload()

      // Open session near lock time
      await teacherPage.click('[data-testid="abrir-aula-button"]')
      await teacherPage.click('[data-testid="confirm-open-session"]')

      // Should show time warning
      await expect(teacherPage.locator('[data-testid="time-warning"]')).toContainText('5 minutos restantes')
      await expect(teacherPage.locator('[data-testid="urgent-warning"]')).toContainText('Tempo crítico')

      // Mock time progression to 18:00
      await teacherPage.addInitScript(() => {
        const lockTime = new Date()
        lockTime.setHours(18, 0, 0, 0)
        Date.now = () => lockTime.getTime()
      })

      // Wait for automatic lock
      await teacherPage.waitForTimeout(1000)

      // Should automatically lock at 18:00
      await expect(teacherPage.locator('[data-testid="aula-status"]')).toContainText('Aula Travada')
      await expect(teacherPage.locator('[data-testid="compliance-message"]')).toContainText('legislação educacional brasileira')

      // Attendance controls should be disabled
      await expect(teacherPage.locator('[data-testid="attendance-grid"] button')).toBeDisabled()
    })
  })

  test.describe('Real-time Features and Synchronization', () => {
    test('should synchronize session status across multiple browsers', async () => {
      // Teacher opens session
      await teacherPage.click('[data-testid="abrir-aula-button"]')
      await teacherPage.click('[data-testid="confirm-open-session"]')

      // Admin should see active session in real-time
      await expect(adminPage.locator('[data-testid="active-sessions"]')).toContainText('1º Ano A')
      await expect(adminPage.locator('[data-testid="session-status"]')).toContainText('Ativa')
      await expect(adminPage.locator('[data-testid="teacher-name"]')).toContainText('Professor João')

      // Teacher marks attendance
      await teacherPage.click('[data-testid="marcar-frequencia-button"]')
      await teacherPage.click('[data-testid="student-aluno-001-present"]')
      await teacherPage.click('[data-testid="student-aluno-002-present"]')

      // Admin should see real-time attendance stats
      await expect(adminPage.locator('[data-testid="attendance-stats"]')).toContainText('2/25')
      await expect(adminPage.locator('[data-testid="completion-percentage"]')).toContainText('8%')

      // Teacher closes session
      await teacherPage.click('[data-testid="fechar-aula-button"]')
      await teacherPage.click('[data-testid="confirm-close-session"]')

      // Admin should see session closed
      await expect(adminPage.locator('[data-testid="session-status"]')).toContainText('Fechada')
    })

    test('should handle connection interruptions gracefully', async () => {
      await teacherPage.click('[data-testid="abrir-aula-button"]')
      await teacherPage.click('[data-testid="confirm-open-session"]')

      // Simulate network interruption
      await teacherPage.route('**/api/**', route => route.abort())

      // Try to mark attendance (should queue)
      await teacherPage.click('[data-testid="marcar-frequencia-button"]')
      await teacherPage.click('[data-testid="student-aluno-001-present"]')

      // Should show offline indicator
      await expect(teacherPage.locator('[data-testid="offline-indicator"]')).toBeVisible()
      await expect(teacherPage.locator('[data-testid="sync-pending"]')).toContainText('1 alteração pendente')

      // Restore network
      await teacherPage.unroute('**/api/**')

      // Should automatically sync
      await expect(teacherPage.locator('[data-testid="sync-success"]')).toContainText('Sincronização completa')
      await expect(teacherPage.locator('[data-testid="offline-indicator"]')).not.toBeVisible()
    })
  })

  test.describe('Performance and Mobile Responsiveness', () => {
    test('should meet performance requirements for attendance marking', async () => {
      await teacherPage.click('[data-testid="abrir-aula-button"]')
      await teacherPage.click('[data-testid="confirm-open-session"]')
      await teacherPage.click('[data-testid="marcar-frequencia-button"]')

      // Measure attendance marking speed
      const startTime = Date.now()

      for (let i = 0; i < testData.students.length; i++) {
        const studentId = testData.students[i].id
        await teacherPage.click(`[data-testid="student-${studentId}-present"]`)
      }

      const endTime = Date.now()
      const totalTime = endTime - startTime
      const timePerStudent = totalTime / testData.students.length

      // Should be less than 1 second per student (Brazilian requirement)
      expect(timePerStudent).toBeLessThan(1000)
    })

    test('should work correctly on mobile viewport', async () => {
      // Set mobile viewport
      await teacherPage.setViewportSize({ width: 375, height: 667 })

      await teacherPage.reload()

      // Should have mobile-optimized layout
      await expect(teacherPage.locator('[data-testid="mobile-navigation"]')).toBeVisible()

      // Touch targets should be large enough (minimum 44px)
      const abrirAulaButton = teacherPage.locator('[data-testid="abrir-aula-button"]')
      const buttonBox = await abrirAulaButton.boundingBox()

      expect(buttonBox!.height).toBeGreaterThanOrEqual(44)
      expect(buttonBox!.width).toBeGreaterThanOrEqual(44)

      // Open session on mobile
      await abrirAulaButton.click()
      await teacherPage.click('[data-testid="confirm-open-session"]')

      // Navigate to attendance on mobile
      await teacherPage.click('[data-testid="marcar-frequencia-button"]')

      // Attendance grid should be mobile-optimized
      await expect(teacherPage.locator('[data-testid="mobile-attendance-grid"]')).toBeVisible()

      // Student cards should be touch-friendly
      const studentCard = teacherPage.locator('[data-testid="student-card"]').first()
      const cardBox = await studentCard.boundingBox()

      expect(cardBox!.height).toBeGreaterThanOrEqual(60) // Larger for mobile
    })
  })

  test.describe('Security and Compliance', () => {
    test('should enforce Row Level Security (RLS) policies', async () => {
      // Teacher should only see their assigned classes
      await expect(teacherPage.locator('[data-testid="class-card"]')).toHaveCount(1)
      await expect(teacherPage.locator('[data-testid="class-name"]')).toContainText('1º Ano A')

      // Should not be able to access other classes directly
      await teacherPage.goto('/dashboard/professor/frequencia/unauthorized-class-id')
      await expect(teacherPage.locator('[data-testid="access-denied"]')).toContainText('Acesso negado')
    })

    test('should prevent retroactive attendance modifications', async () => {
      // Open and complete a session
      await teacherPage.click('[data-testid="abrir-aula-button"]')
      await teacherPage.click('[data-testid="confirm-open-session"]')
      await teacherPage.click('[data-testid="marcar-frequencia-button"]')

      // Mark attendance and submit
      await teacherPage.click('[data-testid="student-aluno-001-present"]')
      await teacherPage.click('[data-testid="submit-attendance"]')

      // Close session to trigger lock
      await teacherPage.click('[data-testid="fechar-aula-button"]')
      await teacherPage.click('[data-testid="confirm-close-session"]')

      // Try to modify attendance after submission
      await teacherPage.goto('/dashboard/professor/frequencia/edit/past-session')
      await expect(teacherPage.locator('[data-testid="readonly-message"]')).toContainText('não existe o esquecer')

      // Attendance controls should be disabled
      await expect(teacherPage.locator('[data-testid="attendance-grid"] button')).toBeDisabled()
    })

    test('should validate Brazilian CPF format', async () => {
      await adminPage.goto('/dashboard/admin/students/new')

      // Try invalid CPF
      await adminPage.fill('[data-testid="cpf-input"]', '123.456.789-00') // Invalid
      await adminPage.click('[data-testid="save-student"]')

      await expect(adminPage.locator('[data-testid="cpf-error"]')).toContainText('CPF inválido')

      // Try valid CPF
      await adminPage.fill('[data-testid="cpf-input"]', '123.456.789-09') // Valid
      await adminPage.click('[data-testid="save-student"]')

      await expect(adminPage.locator('[data-testid="cpf-error"]')).not.toBeVisible()
    })
  })

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle session timeout gracefully', async () => {
      // Open session with very short timeout for testing
      await teacherPage.click('[data-testid="abrir-aula-button"]')
      await teacherPage.click('[data-testid="confirm-open-session"]')

      // Mock timeout scenario
      await teacherPage.addInitScript(() => {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('session-timeout', {
            detail: { sessionId: 'current-session' }
          }))
        }, 1000)
      })

      // Should show timeout warning
      await expect(teacherPage.locator('[data-testid="timeout-warning"]')).toContainText('Sessão expirada')

      // Should automatically save any pending changes
      await expect(teacherPage.locator('[data-testid="auto-save-notice"]')).toContainText('Dados salvos automaticamente')
    })

    test('should handle database errors gracefully', async () => {
      // Mock database error
      await teacherPage.route('**/api/aulas/abrir', route =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Database connection failed' })
        })
      )

      await teacherPage.click('[data-testid="abrir-aula-button"]')
      await teacherPage.click('[data-testid="confirm-open-session"]')

      // Should show user-friendly error
      await expect(teacherPage.locator('[data-testid="error-toast"]')).toContainText('Erro temporário')
      await expect(teacherPage.locator('[data-testid="retry-button"]')).toBeVisible()
    })

    test('should handle browser refresh during session', async () => {
      await teacherPage.click('[data-testid="abrir-aula-button"]')
      await teacherPage.click('[data-testid="confirm-open-session"]')

      // Refresh page
      await teacherPage.reload()

      // Should restore session state
      await expect(teacherPage.locator('[data-testid="aula-status"]')).toContainText('Aula Aberta')
      await expect(teacherPage.locator('[data-testid="session-restored"]')).toContainText('Sessão restaurada')
    })
  })

  test.describe('Accessibility and Internationalization', () => {
    test('should support keyboard navigation', async () => {
      // Navigate using keyboard only
      await teacherPage.keyboard.press('Tab') // Focus on first interactive element
      await teacherPage.keyboard.press('Tab') // Focus on Abrir Aula button

      await expect(teacherPage.locator('[data-testid="abrir-aula-button"]')).toBeFocused()

      await teacherPage.keyboard.press('Enter') // Activate button
      await expect(teacherPage.locator('[data-testid="confirm-dialog"]')).toBeVisible()

      await teacherPage.keyboard.press('Tab') // Focus on confirm button
      await teacherPage.keyboard.press('Enter') // Confirm action

      await expect(teacherPage.locator('[data-testid="aula-status"]')).toContainText('Aula Aberta')
    })

    test('should have proper ARIA labels and screen reader support', async () => {
      // Check ARIA labels
      await expect(teacherPage.locator('[data-testid="abrir-aula-button"]')).toHaveAttribute('aria-label', /Abrir aula para/)
      await expect(teacherPage.locator('[data-testid="aula-status"]')).toHaveAttribute('aria-live', 'polite')

      // Check heading structure
      await expect(teacherPage.locator('h1')).toContainText('Dashboard do Professor')
      await expect(teacherPage.locator('h2')).toContainText('Suas Turmas')
    })

    test('should display content in Brazilian Portuguese', async () => {
      // Check Portuguese labels and messages
      await expect(teacherPage.locator('[data-testid="abrir-aula-button"]')).toContainText('Abrir Aula')
      await expect(teacherPage.locator('[data-testid="student-count"]')).toContainText('alunos')
      await expect(teacherPage.locator('[data-testid="morning-shift"]')).toContainText('Manhã')

      // Check date/time formatting
      const dateElement = teacherPage.locator('[data-testid="current-date"]')
      await expect(dateElement).toContainText(/\d{2}\/\d{2}\/\d{4}/) // DD/MM/YYYY format
    })
  })
})

// Performance benchmarks and compliance verification
test.describe('Brazilian Educational Compliance Verification', () => {
  test('should generate compliance audit trail', async () => {
    const auditEvents: any[] = []

    // Capture audit events
    await teacherPage.exposeFunction('logAuditEvent', (event: any) => {
      auditEvents.push(event)
    })

    // Complete workflow with audit logging
    await teacherPage.click('[data-testid="abrir-aula-button"]')
    await teacherPage.click('[data-testid="confirm-open-session"]')
    await teacherPage.click('[data-testid="marcar-frequencia-button"]')
    await teacherPage.click('[data-testid="student-aluno-001-present"]')
    await teacherPage.click('[data-testid="submit-attendance"]')

    // Verify audit trail contains required events
    expect(auditEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: 'aula_opened' }),
        expect.objectContaining({ action: 'attendance_marked' }),
        expect.objectContaining({ action: 'attendance_submitted' })
      ])
    )

    // Each event should have required compliance fields
    auditEvents.forEach(event => {
      expect(event).toHaveProperty('timestamp')
      expect(event).toHaveProperty('user_id')
      expect(event).toHaveProperty('session_id')
      expect(event).toHaveProperty('school_id')
    })
  })

  test('should meet all performance requirements', async () => {
    const performanceMetrics = {
      dashboardLoad: 0,
      sessionOpen: 0,
      attendanceMarking: 0,
      sessionClose: 0
    }

    // Measure dashboard load time
    const dashboardStart = Date.now()
    await teacherPage.goto('/dashboard/professor')
    await teacherPage.waitForLoadState('networkidle')
    performanceMetrics.dashboardLoad = Date.now() - dashboardStart

    // Measure session opening time
    const sessionStart = Date.now()
    await teacherPage.click('[data-testid="abrir-aula-button"]')
    await teacherPage.click('[data-testid="confirm-open-session"]')
    await teacherPage.waitForSelector('[data-testid="aula-status"]')
    performanceMetrics.sessionOpen = Date.now() - sessionStart

    // Measure attendance marking time
    const attendanceStart = Date.now()
    await teacherPage.click('[data-testid="marcar-frequencia-button"]')
    for (const student of testData.students) {
      await teacherPage.click(`[data-testid="student-${student.id}-present"]`)
    }
    performanceMetrics.attendanceMarking = Date.now() - attendanceStart

    // Verify performance requirements
    expect(performanceMetrics.dashboardLoad).toBeLessThan(3000) // < 3s dashboard load
    expect(performanceMetrics.sessionOpen).toBeLessThan(2000) // < 2s session open
    expect(performanceMetrics.attendanceMarking / testData.students.length).toBeLessThan(1000) // < 1s per student

    console.log('Performance Metrics:', performanceMetrics)
  })
})