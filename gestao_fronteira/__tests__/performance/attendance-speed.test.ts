/**
 * Performance Tests for Attendance Speed Requirements
 * Task 6.3: Write performance tests for attendance speed (< 1s per student)
 * Brazilian Educational Performance Compliance
 */

import { test, expect, Page } from '@playwright/test'
import { performance } from 'perf_hooks'

// Brazilian classroom size scenarios
const classroomScenarios = {
  small: {
    name: 'Turma Pequena (15 alunos)',
    studentCount: 15,
    maxTimeMs: 15000, // 15 seconds total
    targetPerStudentMs: 1000
  },
  medium: {
    name: 'Turma Média (25 alunos)',
    studentCount: 25,
    maxTimeMs: 25000, // 25 seconds total
    targetPerStudentMs: 1000
  },
  large: {
    name: 'Turma Grande (35 alunos)',
    studentCount: 35,
    maxTimeMs: 35000, // 35 seconds total
    targetPerStudentMs: 1000
  },
  maximum: {
    name: 'Turma Máxima (40 alunos)',
    studentCount: 40,
    maxTimeMs: 40000, // 40 seconds total
    targetPerStudentMs: 1000
  }
}

// Performance monitoring utilities
interface PerformanceMetrics {
  totalTime: number
  averagePerStudent: number
  slowestStudent: number
  fastestStudent: number
  clickResponseTimes: number[]
  renderTimes: number[]
  networkLatency: number[]
  memoryUsage: {
    initial: number
    peak: number
    final: number
  }
}

// Generate test students
function generateStudents(count: number) {
  const firstNames = ['Ana', 'Bruno', 'Carla', 'Daniel', 'Eduarda', 'Felipe', 'Gabriela', 'Henrique', 'Isabela', 'João', 'Lara', 'Matheus', 'Nicole', 'Pedro', 'Rafaela', 'Samuel', 'Sophia', 'Thiago', 'Valentina', 'William']
  const lastNames = ['Silva', 'Santos', 'Costa', 'Lima', 'Souza', 'Oliveira', 'Pereira', 'Ferreira', 'Rodrigues', 'Almeida', 'Cardoso', 'Martins', 'Barbosa', 'Nascimento', 'Campos', 'Rocha', 'Pinto', 'Araujo', 'Moreira', 'Teixeira']

  return Array.from({ length: count }, (_, i) => ({
    id: `aluno-${String(i + 1).padStart(3, '0')}`,
    nome: `${firstNames[i % firstNames.length]} ${lastNames[Math.floor(i / firstNames.length) % lastNames.length]}`,
    presente: Math.random() > 0.1 // 90% attendance rate typical for Brazilian schools
  }))
}

test.describe('Attendance Speed Performance Tests', () => {
  let teacherPage: Page

  test.beforeEach(async ({ page }) => {
    teacherPage = page

    // Setup performance monitoring
    await page.addInitScript(() => {
      // Monitor memory usage
      window.performanceMetrics = {
        clickTimes: [],
        renderTimes: [],
        networkTimes: [],
        memorySnapshots: []
      }

      // Override console methods for performance logging
      const originalLog = console.log
      console.log = (...args) => {
        if (args[0]?.includes?.('PERF:')) {
          window.performanceMetrics.logs = window.performanceMetrics.logs || []
          window.performanceMetrics.logs.push({ timestamp: Date.now(), message: args.join(' ') })
        }
        originalLog.apply(console, args)
      }
    })

    // Authenticate teacher
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'professor.performance@fronteira.mg.gov.br')
    await page.fill('[data-testid="password-input"]', 'PerformanceTest123!')
    await page.click('[data-testid="login-button"]')

    await expect(page).toHaveURL('/dashboard/professor')
  })

  Object.entries(classroomScenarios).forEach(([key, scenario]) => {
    test(`should mark attendance for ${scenario.name} within performance targets`, async () => {
      const students = generateStudents(scenario.studentCount)
      const metrics: PerformanceMetrics = {
        totalTime: 0,
        averagePerStudent: 0,
        slowestStudent: 0,
        fastestStudent: Infinity,
        clickResponseTimes: [],
        renderTimes: [],
        networkLatency: [],
        memoryUsage: {
          initial: 0,
          peak: 0,
          final: 0
        }
      }

      // Measure initial memory
      metrics.memoryUsage.initial = await getMemoryUsage(teacherPage)

      // Open session
      const sessionStartTime = performance.now()
      await teacherPage.click('[data-testid="abrir-aula-button"]')
      await teacherPage.click('[data-testid="confirm-open-session"]')
      await teacherPage.waitForSelector('[data-testid="aula-status"]')

      // Navigate to attendance
      await teacherPage.click('[data-testid="marcar-frequencia-button"]')
      await teacherPage.waitForSelector('[data-testid="attendance-grid"]')

      // Wait for all students to load
      await teacherPage.waitForSelector(`[data-testid="student-row"]:nth-child(${students.length})`)

      // Start attendance marking performance test
      const attendanceStartTime = performance.now()

      for (let i = 0; i < students.length; i++) {
        const student = students[i]
        const studentStartTime = performance.now()

        // Click attendance button
        const buttonSelector = `[data-testid="student-${student.id}-${student.presente ? 'present' : 'absent'}"]`

        // Measure click response time
        await teacherPage.click(buttonSelector)

        // Wait for visual feedback
        await teacherPage.waitForSelector(`${buttonSelector}.selected`, { timeout: 2000 })

        const studentEndTime = performance.now()
        const studentTime = studentEndTime - studentStartTime

        metrics.clickResponseTimes.push(studentTime)

        // Track fastest and slowest
        if (studentTime < metrics.fastestStudent) {
          metrics.fastestStudent = studentTime
        }
        if (studentTime > metrics.slowestStudent) {
          metrics.slowestStudent = studentTime
        }

        // Log progress for larger classes
        if (i % 10 === 9 || i === students.length - 1) {
          console.log(`PERF: Marked attendance for ${i + 1}/${students.length} students`)
        }

        // Take memory snapshot periodically
        if (i % 10 === 0) {
          const currentMemory = await getMemoryUsage(teacherPage)
          if (currentMemory > metrics.memoryUsage.peak) {
            metrics.memoryUsage.peak = currentMemory
          }
        }
      }

      const attendanceEndTime = performance.now()
      metrics.totalTime = attendanceEndTime - attendanceStartTime
      metrics.averagePerStudent = metrics.totalTime / students.length

      // Submit attendance and measure network performance
      const submitStartTime = performance.now()
      await teacherPage.click('[data-testid="submit-attendance"]')
      await teacherPage.waitForSelector('[data-testid="attendance-saved"]')
      const submitEndTime = performance.now()

      metrics.networkLatency.push(submitEndTime - submitStartTime)

      // Final memory measurement
      metrics.memoryUsage.final = await getMemoryUsage(teacherPage)

      // Performance assertions
      console.log(`\n=== Performance Results for ${scenario.name} ===`)
      console.log(`Total Time: ${metrics.totalTime.toFixed(2)}ms`)
      console.log(`Average per Student: ${metrics.averagePerStudent.toFixed(2)}ms`)
      console.log(`Fastest Student: ${metrics.fastestStudent.toFixed(2)}ms`)
      console.log(`Slowest Student: ${metrics.slowestStudent.toFixed(2)}ms`)
      console.log(`Submit Latency: ${metrics.networkLatency[0]?.toFixed(2)}ms`)
      console.log(`Memory Usage: ${metrics.memoryUsage.initial}MB -> ${metrics.memoryUsage.peak}MB -> ${metrics.memoryUsage.final}MB`)

      // Critical Performance Requirements (Brazilian Educational Standards)
      expect(metrics.averagePerStudent).toBeLessThan(scenario.targetPerStudentMs) // < 1s per student
      expect(metrics.totalTime).toBeLessThan(scenario.maxTimeMs) // Total time within limits
      expect(metrics.slowestStudent).toBeLessThan(2000) // No single student takes > 2s
      expect(metrics.networkLatency[0]).toBeLessThan(3000) // Submit within 3s

      // Performance Quality Targets
      expect(metrics.fastestStudent).toBeLessThan(500) // Fast students marked quickly
      expect(metrics.memoryUsage.peak - metrics.memoryUsage.initial).toBeLessThan(50) // < 50MB memory growth

      // Consistency checks
      const timeVariance = Math.max(...metrics.clickResponseTimes) - Math.min(...metrics.clickResponseTimes)
      expect(timeVariance).toBeLessThan(1500) // Consistent performance across students

      // Generate performance report
      await generatePerformanceReport(teacherPage, scenario, metrics)
    })
  })

  test('should maintain performance under stress conditions', async () => {
    // Simulate poor network conditions
    await teacherPage.route('**/*', route => {
      setTimeout(() => route.continue(), Math.random() * 200) // Random delay 0-200ms
    })

    // Large class with stress conditions
    const students = generateStudents(40) // Maximum class size
    const startTime = performance.now()

    await teacherPage.click('[data-testid="abrir-aula-button"]')
    await teacherPage.click('[data-testid="confirm-open-session"]')
    await teacherPage.click('[data-testid="marcar-frequencia-button"]')

    // Rapid-fire attendance marking (stress test)
    for (let i = 0; i < students.length; i++) {
      const student = students[i]
      const buttonSelector = `[data-testid="student-${student.id}-${student.presente ? 'present' : 'absent'}"]`

      await teacherPage.click(buttonSelector, { timeout: 1000 })

      // Don't wait for each response in stress test
      if (i % 5 === 0) {
        await teacherPage.waitForTimeout(50) // Brief pause every 5 students
      }
    }

    const endTime = performance.now()
    const totalTime = endTime - startTime
    const averagePerStudent = totalTime / students.length

    // Even under stress, should meet minimum requirements
    expect(averagePerStudent).toBeLessThan(1200) // Allow 20% degradation under stress
    expect(totalTime).toBeLessThan(48000) // Max 48 seconds for 40 students under stress

    console.log(`Stress Test Results: ${totalTime.toFixed(2)}ms total, ${averagePerStudent.toFixed(2)}ms per student`)
  })

  test('should perform well on mobile devices', async () => {
    // Simulate mobile performance constraints
    await teacherPage.emulateMedia({ 'prefers-reduced-motion': 'reduce' })
    await teacherPage.setViewportSize({ width: 375, height: 667 }) // iPhone size

    // Throttle CPU to simulate mobile device
    const client = await teacherPage.context().newCDPSession(teacherPage)
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 }) // 4x slower CPU

    const students = generateStudents(25) // Typical class size
    const mobileMetrics = {
      clickTimes: [],
      renderTimes: []
    }

    await teacherPage.click('[data-testid="mobile-abrir-aula"]')
    await teacherPage.click('[data-testid="confirm-open-session"]')
    await teacherPage.click('[data-testid="mobile-marcar-frequencia"]')

    // Test mobile attendance performance
    for (let i = 0; i < students.length; i++) {
      const student = students[i]
      const clickStart = performance.now()

      await teacherPage.click(`[data-testid="mobile-student-${student.id}-${student.presente ? 'present' : 'absent'}"]`)

      // Wait for haptic feedback animation
      await teacherPage.waitForSelector(`[data-testid="mobile-student-${student.id}-${student.presente ? 'present' : 'absent'}"].selected`)

      const clickEnd = performance.now()
      mobileMetrics.clickTimes.push(clickEnd - clickStart)
    }

    const averageMobileTime = mobileMetrics.clickTimes.reduce((a, b) => a + b, 0) / mobileMetrics.clickTimes.length

    // Mobile performance should still meet requirements (with some allowance)
    expect(averageMobileTime).toBeLessThan(1500) // 1.5s per student on mobile
    expect(Math.max(...mobileMetrics.clickTimes)).toBeLessThan(3000) // No single click > 3s

    console.log(`Mobile Performance: Average ${averageMobileTime.toFixed(2)}ms per student`)

    // Restore normal CPU
    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  })

  test('should handle concurrent users without performance degradation', async ({ browser }) => {
    // Create multiple teacher contexts
    const teacherContexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ])

    const teacherPages = await Promise.all(
      teacherContexts.map(context => context.newPage())
    )

    // Authenticate all teachers
    await Promise.all(teacherPages.map(async (page, index) => {
      await page.goto('/login')
      await page.fill('[data-testid="email-input"]', `professor${index + 1}@fronteira.mg.gov.br`)
      await page.fill('[data-testid="password-input"]', 'ConcurrentTest123!')
      await page.click('[data-testid="login-button"]')
      await expect(page).toHaveURL('/dashboard/professor')
    }))

    // Start concurrent attendance sessions
    const concurrentStartTime = performance.now()

    await Promise.all(teacherPages.map(async (page) => {
      await page.click('[data-testid="abrir-aula-button"]')
      await page.click('[data-testid="confirm-open-session"]')
      await page.click('[data-testid="marcar-frequencia-button"]')
    }))

    // Mark attendance concurrently
    const students = generateStudents(15) // Smaller classes for concurrent test
    const concurrentTimes = []

    for (let i = 0; i < students.length; i++) {
      const student = students[i]
      const studentStartTime = performance.now()

      // All teachers mark attendance simultaneously
      await Promise.all(teacherPages.map(page =>
        page.click(`[data-testid="student-${student.id}-${student.presente ? 'present' : 'absent'}"]`)
      ))

      const studentEndTime = performance.now()
      concurrentTimes.push(studentEndTime - studentStartTime)
    }

    const concurrentEndTime = performance.now()
    const totalConcurrentTime = concurrentEndTime - concurrentStartTime
    const averageConcurrentTime = concurrentTimes.reduce((a, b) => a + b, 0) / concurrentTimes.length

    // Performance should not degrade significantly with concurrent users
    expect(averageConcurrentTime / teacherPages.length).toBeLessThan(1200) // Per teacher per student
    expect(totalConcurrentTime).toBeLessThan(20000) // Total concurrent session < 20s

    console.log(`Concurrent Performance: ${averageConcurrentTime.toFixed(2)}ms average with ${teacherPages.length} teachers`)

    // Cleanup
    await Promise.all(teacherContexts.map(context => context.close()))
  })

  test('should maintain performance with large datasets', async () => {
    // Simulate school with lots of historical data
    await teacherPage.addInitScript(() => {
      // Mock large dataset in localStorage
      const historicalData = Array.from({ length: 1000 }, (_, i) => ({
        sessionId: `session-${i}`,
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        attendance: Array.from({ length: 30 }, (_, j) => ({
          studentId: `student-${j}`,
          present: Math.random() > 0.1
        }))
      }))

      localStorage.setItem('attendance-history', JSON.stringify(historicalData))
      localStorage.setItem('performance-test-data', 'large-dataset')
    })

    await teacherPage.reload()

    const students = generateStudents(30)
    const datasetStartTime = performance.now()

    await teacherPage.click('[data-testid="abrir-aula-button"]')
    await teacherPage.click('[data-testid="confirm-open-session"]')
    await teacherPage.click('[data-testid="marcar-frequencia-button"]')

    // Test attendance with large dataset in background
    const datasetTimes = []
    for (let i = 0; i < students.length; i++) {
      const student = students[i]
      const clickStart = performance.now()

      await teacherPage.click(`[data-testid="student-${student.id}-${student.presente ? 'present' : 'absent'}"]`)

      const clickEnd = performance.now()
      datasetTimes.push(clickEnd - clickStart)
    }

    const datasetEndTime = performance.now()
    const totalDatasetTime = datasetEndTime - datasetStartTime
    const averageDatasetTime = datasetTimes.reduce((a, b) => a + b, 0) / datasetTimes.length

    // Performance should not be affected by large historical dataset
    expect(averageDatasetTime).toBeLessThan(1000) // Still < 1s per student
    expect(totalDatasetTime).toBeLessThan(30000) // Total time acceptable

    console.log(`Large Dataset Performance: ${averageDatasetTime.toFixed(2)}ms per student`)
  })
})

// Helper functions
async function getMemoryUsage(page: Page): Promise<number> {
  return await page.evaluate(() => {
    if (performance.memory) {
      return Math.round(performance.memory.usedJSHeapSize / (1024 * 1024)) // MB
    }
    return 0
  })
}

async function generatePerformanceReport(page: Page, scenario: any, metrics: PerformanceMetrics) {
  const report = {
    scenario: scenario.name,
    timestamp: new Date().toISOString(),
    metrics,
    compliance: {
      averagePerStudentTarget: metrics.averagePerStudent < scenario.targetPerStudentMs,
      totalTimeTarget: metrics.totalTime < scenario.maxTimeMs,
      slowestStudentTarget: metrics.slowestStudent < 2000,
      memoryUsageAcceptable: (metrics.memoryUsage.peak - metrics.memoryUsage.initial) < 50
    },
    recommendations: []
  }

  // Add performance recommendations
  if (metrics.averagePerStudent > 800) {
    report.recommendations.push('Consider optimizing click handlers for faster response')
  }
  if (metrics.slowestStudent > 1500) {
    report.recommendations.push('Investigate UI blocking operations')
  }
  if ((metrics.memoryUsage.peak - metrics.memoryUsage.initial) > 30) {
    report.recommendations.push('Monitor memory leaks in attendance components')
  }

  console.log('\n=== Performance Report ===')
  console.log(JSON.stringify(report, null, 2))

  // Store report for CI/CD systems
  await page.evaluate((reportData) => {
    sessionStorage.setItem('performance-report', JSON.stringify(reportData))
  }, report)
}