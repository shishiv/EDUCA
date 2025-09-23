/**
 * Multi-Session Real-time Tests
 * Task 5.6: Test real-time features across multiple browser sessions
 */

import { jest } from '@jest/globals'
import { Page, Browser, BrowserContext } from 'playwright'
import { test, expect } from '@playwright/test'

// Mock data for testing
const mockTeacher = {
  id: 'teacher-123',
  nome: 'Professor João',
  email: 'professor@escola.gov.br',
  papel: 'professor',
  escola_id: 'escola-1'
}

const mockClass = {
  id: 'turma-1',
  nome: '1º Ano A',
  serie: 'Fundamental I',
  turno: 'Manhã',
  escola_id: 'escola-1'
}

const mockSession = {
  id: 'session-123',
  turma_id: 'turma-1',
  professor_id: 'teacher-123',
  aberta_em: new Date().toISOString(),
  status: 'aberta',
  tempo_limite_minutos: 30
}

// Helper function to setup authenticated session
async function setupAuthenticatedSession(page: Page, user: typeof mockTeacher) {
  // Mock authentication
  await page.addInitScript((userData) => {
    window.localStorage.setItem('supabase.auth.token', JSON.stringify({
      user: userData,
      access_token: 'mock-token',
      expires_at: Date.now() + 3600000
    }))
  }, user)

  // Mock Supabase client
  await page.addInitScript(() => {
    window.mockSupabase = {
      auth: {
        getUser: () => Promise.resolve({ data: { user: window.mockUser }, error: null }),
        getSession: () => Promise.resolve({ data: { session: { user: window.mockUser } }, error: null })
      },
      channel: () => ({
        on: () => ({ subscribe: () => {} }),
        subscribe: () => {},
        unsubscribe: () => {}
      }),
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: window.mockSession, error: null })
          })
        }),
        insert: () => Promise.resolve({ data: [window.mockSession], error: null }),
        update: () => Promise.resolve({ data: [window.mockSession], error: null })
      })
    }
  })
}

// Helper function to simulate session events
async function simulateSessionEvent(page: Page, eventType: string, data: any) {
  await page.evaluate(({ eventType, data }) => {
    const event = new CustomEvent('supabase-realtime', {
      detail: { eventType, new: data }
    })
    window.dispatchEvent(event)
  }, { eventType, data })
}

test.describe('Multi-Session Real-time Features', () => {
  let browser: Browser
  let teacherContext: BrowserContext
  let adminContext: BrowserContext
  let teacherPage: Page
  let adminPage: Page

  test.beforeAll(async ({ browser: testBrowser }) => {
    browser = testBrowser

    // Create separate contexts for teacher and admin
    teacherContext = await browser.newContext({
      viewport: { width: 1200, height: 800 }
    })

    adminContext = await browser.newContext({
      viewport: { width: 1200, height: 800 }
    })

    teacherPage = await teacherContext.newPage()
    adminPage = await adminContext.newPage()
  })

  test.afterAll(async () => {
    await teacherContext.close()
    await adminContext.close()
  })

  test('should sync aula status across teacher and admin sessions', async () => {
    // Setup teacher session
    await setupAuthenticatedSession(teacherPage, mockTeacher)
    await teacherPage.goto('/dashboard/professor')

    // Setup admin session
    const mockAdmin = { ...mockTeacher, id: 'admin-123', papel: 'admin' }
    await setupAuthenticatedSession(adminPage, mockAdmin)
    await adminPage.goto('/dashboard/admin')

    // Wait for both pages to load
    await expect(teacherPage.locator('[data-testid="teacher-dashboard"]')).toBeVisible()
    await expect(adminPage.locator('[data-testid="admin-dashboard"]')).toBeVisible()

    // Teacher opens a session
    await teacherPage.click('[data-testid="abrir-aula-button"]')

    // Simulate real-time event propagation
    await simulateSessionEvent(teacherPage, 'INSERT', mockSession)
    await simulateSessionEvent(adminPage, 'INSERT', mockSession)

    // Verify both sessions see the update
    await expect(teacherPage.locator('[data-testid="aula-status-indicator"]')).toContainText('Aula Aberta')
    await expect(adminPage.locator('[data-testid="session-monitor"]')).toContainText('1º Ano A')

    // Admin should see teacher's active session
    await expect(adminPage.locator('[data-testid="active-sessions"]')).toContainText('Professor João')
  })

  test('should sync attendance updates in real-time', async () => {
    // Both sessions already set up from previous test

    // Mock student data
    const mockStudents = [
      { id: 'student-1', nome: 'João Silva' },
      { id: 'student-2', nome: 'Maria Santos' },
      { id: 'student-3', nome: 'Pedro Costa' }
    ]

    // Navigate to attendance page on teacher session
    await teacherPage.goto('/dashboard/professor/frequencia/turma-1')
    await expect(teacherPage.locator('[data-testid="attendance-grid"]')).toBeVisible()

    // Mark first student as present
    await teacherPage.click('[data-testid="student-1-present"]')

    // Simulate attendance update event
    const attendanceUpdate = {
      id: 'att-1',
      session_id: 'session-123',
      aluno_id: 'student-1',
      presente: true,
      updated_at: new Date().toISOString()
    }

    await simulateSessionEvent(teacherPage, 'INSERT', attendanceUpdate)
    await simulateSessionEvent(adminPage, 'INSERT', attendanceUpdate)

    // Verify attendance stats update in real-time on admin dashboard
    await expect(adminPage.locator('[data-testid="attendance-stats"]')).toContainText('1/3')

    // Mark another student
    await teacherPage.click('[data-testid="student-2-absent"]')

    const secondUpdate = {
      ...attendanceUpdate,
      id: 'att-2',
      aluno_id: 'student-2',
      presente: false
    }

    await simulateSessionEvent(teacherPage, 'INSERT', secondUpdate)
    await simulateSessionEvent(adminPage, 'INSERT', secondUpdate)

    // Stats should update
    await expect(adminPage.locator('[data-testid="attendance-stats"]')).toContainText('1/2')
  })

  test('should handle session locking across all sessions', async () => {
    // Simulate automatic session locking at 18:00
    const lockedSession = {
      ...mockSession,
      status: 'travada',
      travada_em: new Date().toISOString(),
      travada_automaticamente: true
    }

    // Send lock event to both sessions
    await simulateSessionEvent(teacherPage, 'UPDATE', lockedSession)
    await simulateSessionEvent(adminPage, 'UPDATE', lockedSession)

    // Teacher should see locked status
    await expect(teacherPage.locator('[data-testid="aula-status-indicator"]')).toContainText('Aula Travada')

    // Attendance controls should be disabled
    await expect(teacherPage.locator('[data-testid="attendance-grid"] button')).toBeDisabled()

    // Admin should see compliance notification
    await expect(adminPage.locator('[data-testid="compliance-alert"]')).toContainText('Bloqueio Automático')

    // Verify Brazilian compliance message
    await expect(teacherPage.locator('[data-testid="compliance-message"]')).toContainText('legislação educacional brasileira')
  })

  test('should handle connection issues gracefully across sessions', async () => {
    // Simulate connection loss on teacher session
    await teacherPage.evaluate(() => {
      window.dispatchEvent(new Event('offline'))
    })

    // Teacher should show offline indicator
    await expect(teacherPage.locator('[data-testid="connection-status"]')).toContainText('Offline')

    // Offline banner should appear
    await expect(teacherPage.locator('[data-testid="offline-banner"]')).toBeVisible()

    // Admin session should remain connected
    await expect(adminPage.locator('[data-testid="connection-status"]')).toContainText('Online')

    // Simulate connection restoration
    await teacherPage.evaluate(() => {
      window.dispatchEvent(new Event('online'))
    })

    // Wait for reconnection
    await expect(teacherPage.locator('[data-testid="connection-status"]')).toContainText('Online')
    await expect(teacherPage.locator('[data-testid="offline-banner"]')).not.toBeVisible()
  })

  test('should sync time warnings across sessions', async () => {
    // Simulate time warning (10 minutes remaining)
    const timeWarningData = {
      sessionId: 'session-123',
      minutesRemaining: 10,
      urgent: true
    }

    await teacherPage.evaluate((data) => {
      const event = new CustomEvent('time-warning', { detail: data })
      window.dispatchEvent(event)
    }, timeWarningData)

    await adminPage.evaluate((data) => {
      const event = new CustomEvent('time-warning', { detail: data })
      window.dispatchEvent(event)
    }, timeWarningData)

    // Both sessions should show warning
    await expect(teacherPage.locator('[data-testid="time-warning"]')).toContainText('10 minutos')
    await expect(adminPage.locator('[data-testid="session-warning"]')).toContainText('Tempo crítico')

    // Warning should have urgent styling
    await expect(teacherPage.locator('[data-testid="time-warning"]')).toHaveClass(/text-red/)
  })

  test('should handle concurrent teacher access conflicts', async () => {
    // Create second teacher context
    const secondTeacherContext = await browser.newContext()
    const secondTeacherPage = await secondTeacherContext.newPage()

    const secondTeacher = {
      ...mockTeacher,
      id: 'teacher-456',
      nome: 'Professora Maria'
    }

    await setupAuthenticatedSession(secondTeacherPage, secondTeacher)
    await secondTeacherPage.goto('/dashboard/professor')

    // First teacher tries to open a session
    await teacherPage.click('[data-testid="abrir-aula-button"]')

    // Second teacher tries to open the same session
    await secondTeacherPage.click('[data-testid="abrir-aula-button"]')

    // Second teacher should get conflict error
    await expect(secondTeacherPage.locator('[data-testid="error-message"]')).toContainText('Outro professor já abriu')

    // First teacher should maintain control
    await expect(teacherPage.locator('[data-testid="aula-status-indicator"]')).toContainText('Aula Aberta')

    await secondTeacherContext.close()
  })

  test('should maintain data consistency during network interruptions', async () => {
    // Start with a session open
    await simulateSessionEvent(teacherPage, 'INSERT', mockSession)

    // Make some attendance changes
    await teacherPage.click('[data-testid="student-1-present"]')
    await teacherPage.click('[data-testid="student-2-present"]')

    // Simulate network interruption
    await teacherPage.route('**/api/**', route => route.abort())

    // Try to make more changes (should queue)
    await teacherPage.click('[data-testid="student-3-absent"]')

    // Should show pending sync indicator
    await expect(teacherPage.locator('[data-testid="sync-pending"]')).toBeVisible()

    // Restore network
    await teacherPage.unroute('**/api/**')

    // Changes should sync automatically
    await expect(teacherPage.locator('[data-testid="sync-pending"]')).not.toBeVisible()
    await expect(teacherPage.locator('[data-testid="sync-success"]')).toBeVisible()
  })

  test('should handle high-frequency updates without performance degradation', async () => {
    const startTime = Date.now()

    // Simulate rapid attendance updates (stress test)
    for (let i = 0; i < 50; i++) {
      const update = {
        id: `att-${i}`,
        session_id: 'session-123',
        aluno_id: `student-${i % 10}`,
        presente: i % 2 === 0,
        updated_at: new Date().toISOString()
      }

      await simulateSessionEvent(teacherPage, 'INSERT', update)
    }

    const endTime = Date.now()
    const processingTime = endTime - startTime

    // Should complete within reasonable time (< 5 seconds)
    expect(processingTime).toBeLessThan(5000)

    // UI should remain responsive
    await expect(teacherPage.locator('[data-testid="attendance-grid"]')).toBeVisible()
    await teacherPage.click('[data-testid="test-button"]') // Should still be clickable

    // Memory usage should be reasonable
    const memoryUsage = await teacherPage.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })

    // Should not exceed 100MB
    if (memoryUsage > 0) {
      expect(memoryUsage).toBeLessThan(100 * 1024 * 1024)
    }
  })

  test('should synchronize Brazilian compliance events', async () => {
    // Simulate automatic 18:00 lock trigger
    const complianceEvent = {
      type: 'automatic_lock',
      sessionId: 'session-123',
      timestamp: new Date().toISOString(),
      rule: 'brazilian_education_law_18h_lock',
      triggered_by: 'system'
    }

    await teacherPage.evaluate((event) => {
      window.dispatchEvent(new CustomEvent('compliance-event', { detail: event }))
    }, complianceEvent)

    await adminPage.evaluate((event) => {
      window.dispatchEvent(new CustomEvent('compliance-event', { detail: event }))
    }, complianceEvent)

    // Both sessions should log compliance event
    const teacherLogs = await teacherPage.evaluate(() =>
      window.localStorage.getItem('compliance-log')
    )
    const adminLogs = await adminPage.evaluate(() =>
      window.localStorage.getItem('compliance-log')
    )

    expect(teacherLogs).toContain('automatic_lock')
    expect(adminLogs).toContain('automatic_lock')

    // Compliance banner should appear
    await expect(teacherPage.locator('[data-testid="compliance-banner"]')).toContainText('18:00')
    await expect(adminPage.locator('[data-testid="audit-log"]')).toContainText('Bloqueio Automático')
  })
})