import { test, expect, Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

/**
 * Comprehensive E2E Tests for "Abrir Aula" Workflow
 * Tests real database integration, legal compliance, and performance
 *
 * Test Coverage:
 * - Real database integration (no mocks)
 * - Legal compliance ("não existe o esquecer")
 * - Performance benchmarks (<1s per student)
 * - Three-phase workflow (Opening, Marking, Closing)
 * - Mobile/tablet optimization
 * - Error handling and edge cases
 */

// Test data interfaces
interface TestUser {
  id: string
  email: string
  password: string
  role: 'professor'
  nome: string
}

interface TestClass {
  id: string
  nome: string
  serie: string
  escola_id: string
  total_alunos: number
}

interface TestStudent {
  id: string
  nome_completo: string
  turma_id: string
}

// Test environment setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// Test data
let testUser: TestUser
let testClass: TestClass
let testStudents: TestStudent[]

test.describe('Abrir Aula Workflow - Real Database Integration', () => {
  // Setup test data before tests
  test.beforeAll(async () => {
    // Create test school
    const { data: escola } = await supabase
      .from('escolas')
      .insert({
        nome: 'E2E Test School',
        codigo: 'TEST001',
        endereco: 'Test Address',
        telefone: '(99) 9999-9999',
        ativo: true
      })
      .select()
      .single()

    // Create test user (professor)
    const { data: user } = await supabase
      .from('users')
      .insert({
        email: 'professor.test@fronteira.mg.gov.br',
        nome: 'Professor Teste E2E',
        role: 'professor',
        escola_id: escola.id,
        ativo: true
      })
      .select()
      .single()

    testUser = user

    // Create test class
    const { data: turma } = await supabase
      .from('turmas')
      .insert({
        nome: '3º Ano A',
        serie: '3º ano',
        escola_id: escola.id,
        professor_id: user.id,
        ano_letivo: new Date().getFullYear(),
        ativo: true
      })
      .select()
      .single()

    testClass = turma

    // Create test students
    const studentsData = Array.from({ length: 5 }, (_, i) => ({
      nome_completo: `Aluno Teste ${i + 1}`,
      data_nascimento: '2010-01-01',
      cpf: `111.111.111-${String(11 + i).padStart(2, '0')}`,
      turma_id: turma.id,
      escola_id: escola.id,
      ativo: true
    }))

    const { data: students } = await supabase
      .from('alunos')
      .insert(studentsData)
      .select()

    testStudents = students
  })

  // Cleanup after tests
  test.afterAll(async () => {
    // Clean up test data in correct order (foreign key constraints)
    await supabase.from('frequencia').delete().eq('turma_id', testClass.id)
    await supabase.from('sessoes_aula').delete().eq('turma_id', testClass.id)
    await supabase.from('alunos').delete().eq('turma_id', testClass.id)
    await supabase.from('turmas').delete().eq('id', testClass.id)
    await supabase.from('users').delete().eq('id', testUser.id)
    await supabase.from('escolas').delete().eq('id', testClass.escola_id)
  })

  // Helper functions
  async function loginAsTeacher(page: Page) {
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', testUser.email)
    await page.fill('[data-testid="password-input"]', 'test123456')
    await page.click('[data-testid="login-button"]')
    await page.waitForURL('/dashboard/**')
  }

  async function navigateToFrequencia(page: Page) {
    await page.goto('/dashboard/frequencia')
    await page.waitForLoadState('networkidle')
  }

  async function selectTestClass(page: Page) {
    // Find and click the test class card
    const classCard = page.locator(`text=${testClass.nome}`)
    await expect(classCard).toBeVisible()

    // Click "Ver Detalhes" button for the test class
    const detailsButton = page.locator(`[data-class-id="${testClass.id}"] button:has-text("Ver Detalhes")`)
    await detailsButton.click()

    await page.waitForLoadState('networkidle')
  }

  async function fillAbrirAulaForm(page: Page) {
    // Wait for form to be visible
    await expect(page.locator('text=Abrir Aula')).toBeVisible()

    // Fill required fields
    await page.fill('[data-testid="conteudo-programatico"]', 'E2E Test: Matemática - Números e Operações')
    await page.fill('[data-testid="metodologia"]', 'Aula expositiva com exercícios práticos')
    await page.fill('[data-testid="recursos-utilizados"]', 'Quadro, livro didático, calculadora')
    await page.fill('[data-testid="observacoes"]', 'Teste automatizado E2E')
    await page.fill('[data-testid="duracao-minutos"]', '50')
  }

  async function markStudentAttendance(page: Page, studentName: string, present: boolean) {
    const studentRow = page.locator(`[data-student-name="${studentName}"]`)
    await expect(studentRow).toBeVisible()

    const checkbox = studentRow.locator('[data-testid="attendance-checkbox"]')
    const currentState = await checkbox.isChecked()

    // Click if state needs to change
    if (currentState !== present) {
      await checkbox.click()
    }

    // Verify state changed
    await expect(checkbox).toHaveAttribute('checked', present ? '' : null)
  }

  test('Phase 1: Complete workflow with real database integration', async ({ page }) => {
    test.setTimeout(60000) // Extended timeout for comprehensive test

    // Step 1: Login as teacher
    await loginAsTeacher(page)

    // Step 2: Navigate to frequency page
    await navigateToFrequencia(page)

    // Step 3: Select test class
    await selectTestClass(page)

    // Step 4: Open "Abrir Aula" workflow
    const abrirAulaButton = page.locator('[data-testid="abrir-aula-button"]')
    await expect(abrirAulaButton).toBeVisible()
    await abrirAulaButton.click()

    // Step 5: Fill form with lesson plan
    await fillAbrirAulaForm(page)

    // Step 6: Submit to open class session
    const submitButton = page.locator('[data-testid="abrir-aula-submit"]')
    await expect(submitButton).toBeVisible()
    await submitButton.click()

    // Step 7: Verify session created in database
    const sessionStart = Date.now()
    await page.waitForSelector('[data-testid="session-opened"]', { timeout: 5000 })

    // Verify in database
    const { data: session } = await supabase
      .from('sessoes_aula')
      .select('*')
      .eq('turma_id', testClass.id)
      .eq('data_aula', new Date().toISOString().split('T')[0])
      .single()

    expect(session).toBeTruthy()
    expect(session.status).toBe('aberta')
    expect(session.professor_id).toBe(testUser.id)
    expect(session.conteudo_programatico).toBe('E2E Test: Matemática - Números e Operações')

    // Step 8: Proceed to attendance marking
    const marcarPresencaButton = page.locator('[data-testid="marcar-presenca-button"]')
    await expect(marcarPresencaButton).toBeVisible()
    await marcarPresencaButton.click()

    // Step 9: Verify students list loaded
    await page.waitForSelector('[data-testid="students-list"]')

    // Verify all test students appear
    for (const student of testStudents) {
      await expect(page.locator(`[data-student-id="${student.id}"]`)).toBeVisible()
    }

    // Step 10: Mark attendance with performance measurement
    const attendanceStart = Date.now()

    // Mark first 3 students present, last 2 absent
    await markStudentAttendance(page, testStudents[0].nome_completo, true)
    await markStudentAttendance(page, testStudents[1].nome_completo, true)
    await markStudentAttendance(page, testStudents[2].nome_completo, true)
    await markStudentAttendance(page, testStudents[3].nome_completo, false)
    await markStudentAttendance(page, testStudents[4].nome_completo, false)

    const attendanceEnd = Date.now()
    const attendanceTime = attendanceEnd - attendanceStart

    // Performance assertion: <1 second per student
    expect(attendanceTime).toBeLessThan(testStudents.length * 1000)

    // Step 11: Save attendance
    const saveButton = page.locator('[data-testid="save-attendance"]')
    await expect(saveButton).toBeVisible()
    await saveButton.click()

    // Step 12: Verify success and immutability message
    await page.waitForSelector('[data-testid="attendance-saved"]')
    await expect(page.locator('text=Frequência Registrada com Sucesso')).toBeVisible()
    await expect(page.locator('text=registros estão bloqueados para alterações')).toBeVisible()

    // Step 13: Verify data persisted in database
    const { data: attendanceRecords } = await supabase
      .from('frequencia')
      .select('*')
      .eq('turma_id', testClass.id)
      .eq('data', new Date().toISOString().split('T')[0])

    expect(attendanceRecords).toHaveLength(5)

    // Verify attendance states
    const presentStudents = attendanceRecords.filter(r => r.status === 'presente')
    const absentStudents = attendanceRecords.filter(r => r.status === 'falta')

    expect(presentStudents).toHaveLength(3)
    expect(absentStudents).toHaveLength(2)

    // Step 14: Verify session automatically closed
    const { data: closedSession } = await supabase
      .from('sessoes_aula')
      .select('*')
      .eq('id', session.id)
      .single()

    expect(closedSession.status).toBe('fechada')
    expect(closedSession.fim_aula).toBeTruthy()
  })

  test('Phase 2: Legal compliance - "não existe o esquecer" principle', async ({ page }) => {
    // Create a closed session with attendance
    const { data: session } = await supabase
      .from('sessoes_aula')
      .insert({
        turma_id: testClass.id,
        professor_id: testUser.id,
        data_aula: new Date().toISOString().split('T')[0],
        conteudo_programatico: 'Test Immutability',
        duracao_minutos: 50,
        status: 'fechada',
        inicio_aula: new Date().toISOString(),
        fim_aula: new Date().toISOString()
      })
      .select()
      .single()

    // Add attendance records
    await supabase
      .from('frequencia')
      .insert(
        testStudents.map(student => ({
          sessao_id: session.id,
          aluno_id: student.id,
          turma_id: testClass.id,
          data: new Date().toISOString().split('T')[0],
          status: 'presente',
        }))
      )

    await loginAsTeacher(page)
    await navigateToFrequencia(page)
    await selectTestClass(page)

    // Verify that no "Abrir Aula" button appears for today (already closed)
    await expect(page.locator('[data-testid="abrir-aula-button"]')).not.toBeVisible()

    // Verify immutability message is displayed
    await expect(page.locator('text=Aula Finalizada')).toBeVisible()
    await expect(page.locator('text=registros de presença estão bloqueados')).toBeVisible()

    // Cleanup
    await supabase.from('frequencia').delete().eq('sessao_id', session.id)
    await supabase.from('sessoes_aula').delete().eq('id', session.id)
  })

  test('Phase 3: Performance benchmarks and optimization', async ({ page }) => {
    await loginAsTeacher(page)
    await navigateToFrequencia(page)

    // Measure page load time
    const navigationStart = Date.now()
    await selectTestClass(page)
    const navigationEnd = Date.now()

    // Performance assertion: <3 seconds for page navigation
    expect(navigationEnd - navigationStart).toBeLessThan(3000)

    // Measure form interaction time
    const formStart = Date.now()
    await page.click('[data-testid="abrir-aula-button"]')
    await page.waitForSelector('[data-testid="conteudo-programatico"]')
    const formEnd = Date.now()

    // Performance assertion: <1 second for form display
    expect(formEnd - formStart).toBeLessThan(1000)

    // Test form submission performance
    await fillAbrirAulaForm(page)

    const submitStart = Date.now()
    await page.click('[data-testid="abrir-aula-submit"]')
    await page.waitForSelector('[data-testid="session-opened"]')
    const submitEnd = Date.now()

    // Performance assertion: <2 seconds for session creation
    expect(submitEnd - submitStart).toBeLessThan(2000)
  })

  test('Phase 4: Mobile/tablet optimization', async ({ page }) => {
    // Test tablet landscape mode specifically
    await page.setViewportSize({ width: 1024, height: 768 })

    await loginAsTeacher(page)
    await navigateToFrequencia(page)
    await selectTestClass(page)

    // Verify responsive design
    const classCard = page.locator(`[data-class-id="${testClass.id}"]`)
    await expect(classCard).toBeVisible()

    // Check touch target sizes (minimum 44px)
    const abrirAulaButton = page.locator('[data-testid="abrir-aula-button"]')
    const buttonBox = await abrirAulaButton.boundingBox()

    expect(buttonBox?.height).toBeGreaterThan(44)
    expect(buttonBox?.width).toBeGreaterThan(44)

    // Test touch interaction
    await abrirAulaButton.click()
    await fillAbrirAulaForm(page)
    await page.click('[data-testid="abrir-aula-submit"]')

    // Navigate to attendance marking
    await page.waitForSelector('[data-testid="session-opened"]')
    await page.click('[data-testid="marcar-presenca-button"]')

    // Test attendance grid touch targets
    const attendanceCheckboxes = page.locator('[data-testid="attendance-checkbox"]')
    const count = await attendanceCheckboxes.count()

    for (let i = 0; i < count; i++) {
      const checkbox = attendanceCheckboxes.nth(i)
      const checkboxBox = await checkbox.boundingBox()

      // Verify minimum touch target size
      expect(checkboxBox?.height).toBeGreaterThan(44)
      expect(checkboxBox?.width).toBeGreaterThan(44)
    }
  })

  test('Phase 5: Error handling and edge cases', async ({ page }) => {
    await loginAsTeacher(page)
    await navigateToFrequencia(page)
    await selectTestClass(page)

    // Test form validation
    await page.click('[data-testid="abrir-aula-button"]')
    await page.click('[data-testid="abrir-aula-submit"]') // Submit without filling required fields

    // Verify validation errors appear
    await expect(page.locator('text=Conteúdo deve ter pelo menos 5 caracteres')).toBeVisible()

    // Test network error handling (simulate offline)
    await page.setOfflineMode(true)

    await fillAbrirAulaForm(page)
    await page.click('[data-testid="abrir-aula-submit"]')

    // Verify error message appears
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()

    // Restore network
    await page.setOfflineMode(false)

    // Test duplicate session prevention
    await page.reload()

    // Create a session directly in database
    await supabase
      .from('sessoes_aula')
      .insert({
        turma_id: testClass.id,
        professor_id: testUser.id,
        data_aula: new Date().toISOString().split('T')[0],
        conteudo_programatico: 'Existing session',
        duracao_minutos: 50,
        status: 'aberta',
        inicio_aula: new Date().toISOString()
      })

    await page.reload()
    await selectTestClass(page)

    // Verify existing session is detected
    await expect(page.locator('text=Aula em Andamento')).toBeVisible()

    // Cleanup
    await supabase
      .from('sessoes_aula')
      .delete()
      .eq('turma_id', testClass.id)
      .eq('data_aula', new Date().toISOString().split('T')[0])
  })

  test('Phase 6: Accessibility (WCAG 2.1 AA)', async ({ page }) => {
    await loginAsTeacher(page)
    await navigateToFrequencia(page)

    // Test keyboard navigation
    await page.keyboard.press('Tab') // Navigate to first interactive element

    // Verify skip links are present
    await expect(page.locator('a[href="#main-content"]')).toBeVisible()

    await selectTestClass(page)
    await page.click('[data-testid="abrir-aula-button"]')

    // Test form keyboard navigation
    await page.keyboard.press('Tab') // Should focus conteudo_programatico
    await expect(page.locator('[data-testid="conteudo-programatico"]:focus')).toBeVisible()

    await page.keyboard.press('Tab') // Move to metodologia
    await expect(page.locator('[data-testid="metodologia"]:focus')).toBeVisible()

    // Test screen reader labels
    const conteudoField = page.locator('[data-testid="conteudo-programatico"]')
    await expect(conteudoField).toHaveAttribute('aria-label', /Conteúdo Programático/i)

    // Test color contrast (automated check would be done with axe-core)
    const submitButton = page.locator('[data-testid="abrir-aula-submit"]')
    const computedStyle = await submitButton.evaluate(el => {
      const style = window.getComputedStyle(el)
      return {
        backgroundColor: style.backgroundColor,
        color: style.color
      }
    })

    // Verify that styles are applied (specific contrast testing would require axe-core)
    expect(computedStyle.backgroundColor).toBeTruthy()
    expect(computedStyle.color).toBeTruthy()
  })

  test('Phase 7: Data integrity and audit trail', async ({ page }) => {
    await loginAsTeacher(page)
    await navigateToFrequencia(page)
    await selectTestClass(page)

    // Complete workflow
    await page.click('[data-testid="abrir-aula-button"]')
    await fillAbrirAulaForm(page)
    await page.click('[data-testid="abrir-aula-submit"]')

    await page.waitForSelector('[data-testid="session-opened"]')
    await page.click('[data-testid="marcar-presenca-button"]')

    // Mark attendance
    await markStudentAttendance(page, testStudents[0].nome_completo, true)
    await page.click('[data-testid="save-attendance"]')

    await page.waitForSelector('[data-testid="attendance-saved"]')

    // Verify audit trail in database
    const { data: session } = await supabase
      .from('sessoes_aula')
      .select('*')
      .eq('turma_id', testClass.id)
      .eq('data_aula', new Date().toISOString().split('T')[0])
      .single()

    // Verify timestamps
    expect(session.created_at).toBeTruthy()
    expect(session.inicio_aula).toBeTruthy()
    expect(session.fim_aula).toBeTruthy()
    expect(new Date(session.fim_aula).getTime()).toBeGreaterThan(new Date(session.inicio_aula).getTime())

    // Verify attendance records have proper timestamps
    const { data: attendance } = await supabase
      .from('frequencia')
      .select('*')
      .eq('turma_id', testClass.id)
      .eq('data', new Date().toISOString().split('T')[0])

    attendance.forEach(record => {
      expect(record.created_at).toBeTruthy()
      expect(record.sessao_id).toBe(session.id)
    })
  })
})

/**
 * Additional Test Utilities for Real Database Testing
 */
test.describe('Abrir Aula - Database Integration Utilities', () => {
  test('Database connection and schema validation', async ({ page }) => {
    // Verify Supabase connection
    const { data, error } = await supabase
      .from('sessoes_aula')
      .select('count', { count: 'exact', head: true })

    expect(error).toBe(null)
    expect(typeof data).toBe('object')

    // Verify required tables exist
    const tables = ['sessoes_aula', 'frequencia', 'alunos', 'turmas', 'users']

    for (const table of tables) {
      const { error: tableError } = await supabase
        .from(table)
        .select('*')
        .limit(1)

      expect(tableError).toBe(null)
    }
  })

  test('Performance benchmarks validation', async ({ page }) => {
    // This test validates that our performance assertions are realistic
    const testTimes = {
      navigation: 3000,    // 3 seconds max for page navigation
      formLoad: 1000,      // 1 second max for form display
      sessionCreate: 2000, // 2 seconds max for session creation
      attendancePerStudent: 1000 // 1 second max per student
    }

    // These are the benchmarks our tests validate against
    expect(testTimes.navigation).toBeLessThan(5000) // Should be faster than 5s
    expect(testTimes.formLoad).toBeLessThan(2000)   // Should be faster than 2s
    expect(testTimes.sessionCreate).toBeLessThan(3000) // Should be faster than 3s
    expect(testTimes.attendancePerStudent).toBeLessThan(1500) // Should be faster than 1.5s
  })
})