/**
 * Mobile Teacher Scenarios - Playwright E2E Tests
 * Task 6.2: Implement Playwright tests for mobile teacher scenarios
 * Brazilian Educational Mobile-First Implementation
 */

import { test, expect, Page, devices } from '@playwright/test'

// Mobile device configurations for Brazilian classrooms
const mobileDevices = {
  smartphone: {
    ...devices['iPhone 13'],
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) Mobile Brazilian Teacher App'
  },
  tablet: {
    ...devices['iPad Pro'],
    viewport: { width: 1024, height: 1366 },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) Tablet Brazilian Classroom'
  },
  androidTablet: {
    ...devices['Galaxy Tab S4'],
    viewport: { width: 1138, height: 712 },
    userAgent: 'Mozilla/5.0 (Android 12; Tablet) Classroom Assistant'
  }
}

// Brazilian classroom scenarios data
const classroomData = {
  teacher: {
    email: 'professora.maria@fronteira.mg.gov.br',
    password: 'MobileSeguro123!',
    nome: 'Professora Maria Santos',
    papel: 'professor'
  },
  realClassroom: {
    location: 'Sala 5A - Escola Municipal Fronteira',
    students: [
      { id: 'aluno-101', nome: 'Ana Beatriz Silva', presente: true },
      { id: 'aluno-102', nome: 'Bruno Henrique Costa', presente: true },
      { id: 'aluno-103', nome: 'Carla Eduarda Lima', presente: false },
      { id: 'aluno-104', nome: 'Daniel Roberto Santos', presente: true },
      { id: 'aluno-105', nome: 'Eduarda Cristina Souza', presente: true },
      { id: 'aluno-106', nome: 'Felipe Gabriel Oliveira', presente: false },
      { id: 'aluno-107', nome: 'Gabriela Vitória Pereira', presente: true },
      { id: 'aluno-108', nome: 'Henrique Lucas Ferreira', presente: true },
      { id: 'aluno-109', nome: 'Isabela Caroline Rodrigues', presente: true },
      { id: 'aluno-110', nome: 'João Victor Almeida', presente: false },
      { id: 'aluno-111', nome: 'Lara Beatriz Cardoso', presente: true },
      { id: 'aluno-112', nome: 'Matheus Eduardo Silva', presente: true },
      { id: 'aluno-113', nome: 'Nicole Fernanda Costa', presente: true },
      { id: 'aluno-114', nome: 'Pedro Henrique Martins', presente: true },
      { id: 'aluno-115', nome: 'Rafaela Cristine Barbosa', presente: true },
      { id: 'aluno-116', nome: 'Samuel Lucas Nascimento', presente: false },
      { id: 'aluno-117', nome: 'Sophia Gabriela Campos', presente: true },
      { id: 'aluno-118', nome: 'Thiago Alexandre Rocha', presente: true },
      { id: 'aluno-119', nome: 'Valentina Sofia Pinto', presente: true },
      { id: 'aluno-120', nome: 'William Eduardo Araujo', presente: true },
      { id: 'aluno-121', nome: 'Yasmin Leticia Moreira', presente: true },
      { id: 'aluno-122', nome: 'Zoe Mariana Teixeira', presente: true }
    ]
  },
  connectivity: {
    poor: { speed: '2G', latency: 300 },
    intermittent: { speed: '3G', dropouts: true },
    good: { speed: '4G', latency: 50 }
  }
}

// Configure mobile test contexts
test.describe('Mobile Teacher Scenarios', () => {
  test.describe.configure({ mode: 'parallel' })

  test.describe('Smartphone Usage - Quick Attendance', () => {
    test.use({ ...mobileDevices.smartphone })

    test('should complete rapid attendance marking on smartphone', async ({ page }) => {
      await setupMobileEnvironment(page, 'smartphone')
      await authenticateTeacher(page)

      // Test rapid session opening on small screen
      await page.click('[data-testid="mobile-menu-toggle"]')
      await page.click('[data-testid="quick-attendance"]')

      // Should show mobile-optimized class selection
      await expect(page.locator('[data-testid="mobile-class-selector"]')).toBeVisible()
      await page.click('[data-testid="class-card-mobile"]')

      // Open session with single tap
      await page.click('[data-testid="mobile-abrir-aula"]')
      await expect(page.locator('[data-testid="session-opened-toast"]')).toBeVisible()

      // Test mobile attendance interface
      await expect(page.locator('[data-testid="mobile-attendance-interface"]')).toBeVisible()

      // Mark attendance with large touch targets
      const students = classroomData.realClassroom.students.slice(0, 5) // Test with 5 students for speed

      for (const student of students) {
        const buttonSelector = `[data-testid="mobile-student-${student.id}-${student.presente ? 'present' : 'absent'}"]`
        const button = page.locator(buttonSelector)

        // Verify touch target size (minimum 44px)
        const boundingBox = await button.boundingBox()
        expect(boundingBox!.height).toBeGreaterThanOrEqual(44)
        expect(boundingBox!.width).toBeGreaterThanOrEqual(44)

        await button.click()

        // Verify haptic feedback simulation
        await expect(button).toHaveClass(/pressed|selected/)
      }

      // Quick save with mobile gesture
      await page.click('[data-testid="mobile-save-attendance"]')
      await expect(page.locator('[data-testid="mobile-save-success"]')).toContainText('Salvo')

      // Close session
      await page.click('[data-testid="mobile-close-session"]')
      await expect(page.locator('[data-testid="session-closed-mobile"]')).toBeVisible()
    })

    test('should handle orientation changes gracefully', async ({ page }) => {
      await setupMobileEnvironment(page, 'smartphone')
      await authenticateTeacher(page)

      // Start in portrait mode
      await page.click('[data-testid="mobile-abrir-aula"]')

      // Simulate rotation to landscape
      await page.setViewportSize({ width: 844, height: 390 })
      await page.waitForTimeout(500) // Wait for layout adjustment

      // Interface should adapt to landscape
      await expect(page.locator('[data-testid="landscape-attendance-grid"]')).toBeVisible()

      // Rotate back to portrait
      await page.setViewportSize({ width: 390, height: 844 })
      await page.waitForTimeout(500)

      // Should return to portrait layout
      await expect(page.locator('[data-testid="portrait-attendance-list"]')).toBeVisible()
    })

    test('should work with poor network conditions', async ({ page }) => {
      // Simulate poor connectivity
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 500) // Add 500ms delay
      })

      await setupMobileEnvironment(page, 'smartphone')
      await authenticateTeacher(page)

      // Should show loading states
      await page.click('[data-testid="mobile-abrir-aula"]')
      await expect(page.locator('[data-testid="mobile-loading"]')).toBeVisible()

      // Should eventually complete despite poor connection
      await expect(page.locator('[data-testid="session-opened-toast"]')).toBeVisible({ timeout: 10000 })

      // Mark attendance with slow connection
      await page.click('[data-testid="mobile-student-aluno-101-present"]')

      // Should queue changes locally
      await expect(page.locator('[data-testid="offline-queue-indicator"]')).toContainText('1 pendente')
    })
  })

  test.describe('Tablet Usage - Classroom Management', () => {
    test.use({ ...mobileDevices.tablet })

    test('should handle full classroom attendance on tablet', async ({ page }) => {
      await setupMobileEnvironment(page, 'tablet')
      await authenticateTeacher(page)

      // Open session on tablet
      await page.click('[data-testid="tablet-abrir-aula"]')
      await expect(page.locator('[data-testid="tablet-session-header"]')).toBeVisible()

      // Should show tablet-optimized attendance grid
      await expect(page.locator('[data-testid="tablet-attendance-grid"]')).toBeVisible()

      // Test performance with full class (22 students)
      const startTime = Date.now()

      for (const student of classroomData.realClassroom.students) {
        const buttonSelector = `[data-testid="tablet-student-${student.id}-${student.presente ? 'present' : 'absent'}"]`
        await page.click(buttonSelector)

        // Should provide immediate visual feedback
        await expect(page.locator(buttonSelector)).toHaveClass(/selected/)
      }

      const endTime = Date.now()
      const totalTime = endTime - startTime
      const timePerStudent = totalTime / classroomData.realClassroom.students.length

      // Should meet performance requirement (< 1s per student)
      expect(timePerStudent).toBeLessThan(1000)

      // Verify attendance summary
      const presentCount = classroomData.realClassroom.students.filter(s => s.presente).length
      const absentCount = classroomData.realClassroom.students.length - presentCount

      await expect(page.locator('[data-testid="attendance-summary"]')).toContainText(`${presentCount} presentes`)
      await expect(page.locator('[data-testid="attendance-summary"]')).toContainText(`${absentCount} ausentes`)

      // Save attendance
      await page.click('[data-testid="tablet-save-attendance"]')
      await expect(page.locator('[data-testid="save-confirmation"]')).toContainText('Frequência salva com sucesso')
    })

    test('should support split-screen attendance and notes', async ({ page }) => {
      await setupMobileEnvironment(page, 'tablet')
      await authenticateTeacher(page)

      await page.click('[data-testid="tablet-abrir-aula"]')

      // Enable split-screen mode
      await page.click('[data-testid="enable-split-screen"]')

      // Should show attendance on left, notes on right
      await expect(page.locator('[data-testid="attendance-panel"]')).toBeVisible()
      await expect(page.locator('[data-testid="notes-panel"]')).toBeVisible()

      // Mark attendance while taking notes
      await page.click('[data-testid="tablet-student-aluno-101-present"]')
      await page.fill('[data-testid="student-notes"]', 'Participação ativa na aula de matemática')

      // Should sync both attendance and notes
      await page.click('[data-testid="save-both"]')
      await expect(page.locator('[data-testid="sync-success"]')).toContainText('Dados sincronizados')
    })

    test('should handle multi-teacher collaboration on tablet', async ({ page, browser }) => {
      await setupMobileEnvironment(page, 'tablet')
      await authenticateTeacher(page)

      // Create second teacher context
      const secondContext = await browser.newContext({ ...mobileDevices.tablet })
      const secondPage = await secondContext.newPage()
      await setupMobileEnvironment(secondPage, 'tablet')

      // Second teacher login
      await secondPage.goto('/login')
      await secondPage.fill('[data-testid="email-input"]', 'professor.auxiliar@fronteira.mg.gov.br')
      await secondPage.fill('[data-testid="password-input"]', 'AuxiliarSeguro123!')
      await secondPage.click('[data-testid="login-button"]')

      // Main teacher opens session
      await page.click('[data-testid="tablet-abrir-aula"]')

      // Auxiliary teacher should see read-only view
      await expect(secondPage.locator('[data-testid="readonly-session-view"]')).toBeVisible()
      await expect(secondPage.locator('[data-testid="collaboration-indicator"]')).toContainText('Professora Maria Santos está conduzindo a aula')

      // Main teacher marks attendance
      await page.click('[data-testid="tablet-student-aluno-101-present"]')

      // Auxiliary teacher should see real-time updates
      await expect(secondPage.locator('[data-testid="realtime-attendance-update"]')).toContainText('Ana Beatriz: Presente')

      await secondContext.close()
    })
  })

  test.describe('Android Tablet - Accessibility Features', () => {
    test.use({ ...mobileDevices.androidTablet })

    test('should support voice commands for attendance', async ({ page }) => {
      await setupMobileEnvironment(page, 'androidTablet')
      await authenticateTeacher(page)

      // Enable voice commands
      await page.click('[data-testid="enable-voice-commands"]')
      await expect(page.locator('[data-testid="voice-ready-indicator"]')).toBeVisible()

      await page.click('[data-testid="android-abrir-aula"]')

      // Simulate voice command
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('voice-command', {
          detail: { command: 'marcar presente Ana Beatriz' }
        }))
      })

      // Should mark student present via voice
      await expect(page.locator('[data-testid="voice-feedback"]')).toContainText('Ana Beatriz marcada como presente')
      await expect(page.locator('[data-testid="android-student-aluno-101-present"]')).toHaveClass(/selected/)

      // Test voice command for absent
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('voice-command', {
          detail: { command: 'marcar ausente Bruno Henrique' }
        }))
      })

      await expect(page.locator('[data-testid="voice-feedback"]')).toContainText('Bruno Henrique marcado como ausente')
      await expect(page.locator('[data-testid="android-student-aluno-102-absent"]')).toHaveClass(/selected/)
    })

    test('should support high contrast and large text modes', async ({ page }) => {
      await setupMobileEnvironment(page, 'androidTablet')

      // Enable accessibility features
      await page.addInitScript(() => {
        localStorage.setItem('accessibility-mode', 'high-contrast-large-text')
      })

      await authenticateTeacher(page)

      // Should load with accessibility styles
      await expect(page.locator('body')).toHaveClass(/high-contrast/)
      await expect(page.locator('[data-testid="large-text-mode"]')).toBeVisible()

      await page.click('[data-testid="android-abrir-aula"]')

      // Attendance buttons should be larger and high contrast
      const attendanceButton = page.locator('[data-testid="android-student-aluno-101-present"]')
      const buttonBox = await attendanceButton.boundingBox()

      expect(buttonBox!.height).toBeGreaterThanOrEqual(60) // Larger for accessibility
      await expect(attendanceButton).toHaveCSS('font-size', /2\d+px/) // Large text
    })
  })

  test.describe('Cross-Device Synchronization', () => {
    test('should sync attendance across multiple mobile devices', async ({ browser }) => {
      // Create multiple device contexts
      const tabletContext = await browser.newContext({ ...mobileDevices.tablet })
      const phoneContext = await browser.newContext({ ...mobileDevices.smartphone })

      const tabletPage = await tabletContext.newPage()
      const phonePage = await phoneContext.newPage()

      // Setup both devices
      await setupMobileEnvironment(tabletPage, 'tablet')
      await setupMobileEnvironment(phonePage, 'smartphone')

      // Authenticate same teacher on both devices
      await authenticateTeacher(tabletPage)
      await authenticateTeacher(phonePage)

      // Open session on tablet
      await tabletPage.click('[data-testid="tablet-abrir-aula"]')

      // Phone should see active session
      await expect(phonePage.locator('[data-testid="active-session-indicator"]')).toContainText('Sessão ativa')

      // Mark attendance on tablet
      await tabletPage.click('[data-testid="tablet-student-aluno-101-present"]')

      // Should sync to phone in real-time
      await expect(phonePage.locator('[data-testid="sync-notification"]')).toContainText('Frequência atualizada')
      await expect(phonePage.locator('[data-testid="student-aluno-101-status"]')).toContainText('Presente')

      // Continue attendance on phone
      await phonePage.click('[data-testid="mobile-student-aluno-102-absent"]')

      // Should sync back to tablet
      await expect(tabletPage.locator('[data-testid="realtime-update"]')).toContainText('Bruno Henrique: Ausente')

      await tabletContext.close()
      await phoneContext.close()
    })

    test('should handle device handoff during attendance', async ({ browser }) => {
      const tabletContext = await browser.newContext({ ...mobileDevices.tablet })
      const phoneContext = await browser.newContext({ ...mobileDevices.smartphone })

      const tabletPage = await tabletContext.newPage()
      const phonePage = await phoneContext.newPage()

      await setupMobileEnvironment(tabletPage, 'tablet')
      await setupMobileEnvironment(phonePage, 'smartphone')
      await authenticateTeacher(tabletPage)
      await authenticateTeacher(phonePage)

      // Start attendance on tablet
      await tabletPage.click('[data-testid="tablet-abrir-aula"]')
      await tabletPage.click('[data-testid="tablet-student-aluno-101-present"]')
      await tabletPage.click('[data-testid="tablet-student-aluno-102-present"]')

      // Simulate tablet battery dying / network loss
      await tabletPage.setOffline(true)

      // Continue on phone
      await phonePage.reload()
      await expect(phonePage.locator('[data-testid="resume-session"]')).toBeVisible()
      await phonePage.click('[data-testid="resume-session"]')

      // Should restore previous attendance state
      await expect(phonePage.locator('[data-testid="student-aluno-101-status"]')).toContainText('Presente')
      await expect(phonePage.locator('[data-testid="student-aluno-102-status"]')).toContainText('Presente')

      // Continue attendance on phone
      await phonePage.click('[data-testid="mobile-student-aluno-103-absent"]')
      await phonePage.click('[data-testid="mobile-save-attendance"]')

      await expect(phonePage.locator('[data-testid="handoff-success"]')).toContainText('Sessão retomada com sucesso')

      await tabletContext.close()
      await phoneContext.close()
    })
  })

  test.describe('Offline Functionality', () => {
    test('should work offline and sync when connection returns', async ({ page }) => {
      await setupMobileEnvironment(page, 'tablet')
      await authenticateTeacher(page)

      // Open session while online
      await page.click('[data-testid="tablet-abrir-aula"]')
      await expect(page.locator('[data-testid="session-opened-toast"]')).toBeVisible()

      // Go offline
      await page.setOffline(true)

      // Should show offline indicator
      await expect(page.locator('[data-testid="offline-mode-indicator"]')).toBeVisible()

      // Mark attendance while offline
      await page.click('[data-testid="tablet-student-aluno-101-present"]')
      await page.click('[data-testid="tablet-student-aluno-102-absent"]')
      await page.click('[data-testid="tablet-student-aluno-103-present"]')

      // Should queue changes locally
      await expect(page.locator('[data-testid="offline-queue"]')).toContainText('3 alterações pendentes')

      // Attempt to save while offline
      await page.click('[data-testid="tablet-save-attendance"]')
      await expect(page.locator('[data-testid="offline-save-notice"]')).toContainText('Salvo localmente')

      // Come back online
      await page.setOffline(false)

      // Should automatically sync
      await expect(page.locator('[data-testid="sync-progress"]')).toBeVisible()
      await expect(page.locator('[data-testid="sync-complete"]')).toContainText('Sincronização completa')
      await expect(page.locator('[data-testid="offline-queue"]')).toContainText('0 pendentes')
    })

    test('should preserve data across app restarts while offline', async ({ page }) => {
      await setupMobileEnvironment(page, 'smartphone')
      await authenticateTeacher(page)

      await page.click('[data-testid="mobile-abrir-aula"]')

      // Go offline and mark attendance
      await page.setOffline(true)
      await page.click('[data-testid="mobile-student-aluno-101-present"]')
      await page.click('[data-testid="mobile-student-aluno-102-absent"]')

      // Simulate app restart (reload page)
      await page.reload()

      // Should restore offline data
      await expect(page.locator('[data-testid="data-restored"]')).toContainText('Dados restaurados')
      await expect(page.locator('[data-testid="student-aluno-101-status"]')).toContainText('Presente')
      await expect(page.locator('[data-testid="student-aluno-102-status"]')).toContainText('Ausente')
      await expect(page.locator('[data-testid="offline-queue"]')).toContainText('2 alterações pendentes')
    })
  })
})

// Helper functions for mobile testing
async function setupMobileEnvironment(page: Page, deviceType: 'smartphone' | 'tablet' | 'androidTablet') {
  // Add mobile-specific scripts
  await page.addInitScript(() => {
    // Mock touch events
    window.TouchEvent = window.TouchEvent || class TouchEvent extends Event {
      constructor(type: string, options: any = {}) {
        super(type, options)
      }
    }

    // Mock device orientation API
    Object.defineProperty(screen, 'orientation', {
      value: {
        angle: 0,
        type: 'portrait-primary',
        addEventListener: () => {},
        removeEventListener: () => {}
      }
    })

    // Mock vibration API for haptic feedback
    navigator.vibrate = (pattern: number | number[]) => {
      console.log('Vibration:', pattern)
      return true
    }
  })

  // Set mobile-specific localStorage
  await page.addInitScript((device) => {
    localStorage.setItem('device-type', device)
    localStorage.setItem('mobile-optimizations', 'true')
    localStorage.setItem('touch-interface', 'enabled')
  }, deviceType)

  await page.goto('/')
}

async function authenticateTeacher(page: Page) {
  await page.goto('/login')
  await page.fill('[data-testid="email-input"]', classroomData.teacher.email)
  await page.fill('[data-testid="password-input"]', classroomData.teacher.password)
  await page.click('[data-testid="login-button"]')

  await expect(page).toHaveURL('/dashboard/professor')
  await expect(page.locator('[data-testid="teacher-name"]')).toContainText('Professora Maria')
}