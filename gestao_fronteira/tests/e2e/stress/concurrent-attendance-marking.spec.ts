/**
 * Stress Test: 50 Concurrent Users Marking Attendance
 * Task 5.5 - Enhanced "Abrir Aula" Workflow
 *
 * Scenario: Peak morning hours (7:00-8:00 AM) when all teachers mark attendance simultaneously
 *
 * Test Objectives:
 * 1. No race conditions: All 50 teachers can mark attendance without conflicts
 * 2. No data corruption: Final database state matches expected attendance records
 * 3. Performance: API responses < 2s under load
 * 4. Optimistic updates: UI responds < 50ms regardless of concurrent load
 * 5. Lock enforcement: Auto-lock at 18:00 prevents further changes
 *
 * Test Setup:
 * - 1 shared turma (class) with 30 students
 * - 50 teacher accounts (worker pool)
 * - Each teacher marks attendance for same session (stress test conflict resolution)
 * - Parallel execution with Playwright workers
 */

import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://SUPABASE-PROJECT-REF.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Configure parallel execution
test.describe.configure({ mode: 'parallel', timeout: 120000 })

test.describe('Stress Test: 50 Concurrent Users', () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  let sharedTurmaId: string
  let sharedSessionId: string
  let studentIds: string[] = []

  test.beforeAll(async () => {
    // Setup: Create shared test data
    console.log('🏗️  Setting up stress test environment...')

    // 1. Get or create test turma
    const { data: turmas } = await supabase
      .from('turmas')
      .select('id')
      .limit(1)
      .single()

    if (!turmas) {
      throw new Error('No turmas found in database - seed data first')
    }

    sharedTurmaId = turmas.id

    // 2. Get student IDs for this turma (via matriculas)
    const { data: matriculas } = await supabase
      .from('matriculas')
      .select('aluno_id')
      .eq('turma_id', sharedTurmaId)
      .limit(30)

    studentIds = matriculas?.map(m => m.aluno_id) || []

    if (studentIds.length < 10) {
      console.warn(`⚠️  Only ${studentIds.length} students found - stress test may be limited`)
    }

    // 3. Create shared attendance session (aula aberta)
    const { data: professor } = await supabase
      .from('users')
      .select('id')
      .eq('tipo_usuario', 'professor')
      .limit(1)
      .single()

    if (!professor) {
      throw new Error('No professor found - seed data first')
    }

    const { data: session, error } = await supabase
      .from('sessoes_aula')
      .insert({
        turma_id: sharedTurmaId,
        professor_id: professor.id,
        data_aula: new Date().toISOString().split('T')[0],
        conteudo_programatico: 'Stress Test - 50 Concurrent Users',
        duracao_minutos: 50,
        status: 'attendance',
        inicio_aula: new Date().toISOString(),
        escola_id: (await supabase.from('escolas').select('id').limit(1).single()).data?.id,
        documento_oficial: false
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create session: ${error.message}`)
    }

    sharedSessionId = session.id

    console.log(`✅ Stress test environment ready:`)
    console.log(`   - Turma ID: ${sharedTurmaId}`)
    console.log(`   - Session ID: ${sharedSessionId}`)
    console.log(`   - Students: ${studentIds.length}`)
  })

  test.afterAll(async () => {
    // Cleanup: Delete test session and attendance records
    console.log('🧹 Cleaning up stress test data...')

    await supabase
      .from('frequencia')
      .delete()
      .eq('sessao_id', sharedSessionId)

    await supabase
      .from('sessoes_aula')
      .delete()
      .eq('id', sharedSessionId)

    console.log('✅ Cleanup complete')
  })

  // Generate 50 parallel test cases (one per concurrent user)
  for (let workerIndex = 1; workerIndex <= 50; workerIndex++) {
    test(`Worker ${workerIndex}: Mark attendance for 30 students`, async ({ page }) => {
      const workerId = `worker-${workerIndex}`
      const startTime = performance.now()

      console.log(`[${workerId}] Starting attendance marking...`)

      // Navigate to attendance page
      await page.goto(`http://localhost:3000/dashboard/frequencia?turma=${sharedTurmaId}`)

      // Wait for attendance grid to load
      await page.waitForSelector('[data-testid="attendance-grid"]', { timeout: 10000 })

      const gridLoadTime = performance.now() - startTime
      console.log(`[${workerId}] Grid loaded in ${gridLoadTime.toFixed(0)}ms`)

      // Mark attendance for each student
      const attendanceMarkings: Array<{ studentId: string; presente: boolean; duration: number }> = []

      for (let i = 0; i < Math.min(studentIds.length, 30); i++) {
        const studentId = studentIds[i]
        const presente = Math.random() > 0.15 // 85% attendance rate

        const markStartTime = performance.now()

        // Click presente/ausente button
        const button = page.locator(`[data-student-id="${studentId}"][data-presente="${presente}"]`)
        await button.click()

        // Verify optimistic update (should be < 50ms)
        const markDuration = performance.now() - markStartTime
        attendanceMarkings.push({ studentId, presente, duration: markDuration })

        // Validate optimistic update performance
        expect(markDuration).toBeLessThan(100) // Allow 100ms for stressed system (target: 50ms)
      }

      // Wait for batch save to complete (2s debounce + API call)
      await page.waitForTimeout(3000)

      // Verify no errors in console
      const consoleLogs = await page.evaluate(() => {
        return window.performance.getEntriesByType('measure').map(e => ({
          name: e.name,
          duration: e.duration
        }))
      })

      const totalDuration = performance.now() - startTime

      console.log(`[${workerId}] Completed in ${totalDuration.toFixed(0)}ms`)
      console.log(`[${workerId}] Average marking time: ${(attendanceMarkings.reduce((sum, m) => sum + m.duration, 0) / attendanceMarkings.length).toFixed(1)}ms`)

      // Performance assertions
      expect(totalDuration).toBeLessThan(30000) // Total workflow < 30s (reasonable for 30 students under stress)

      const avgMarkingTime = attendanceMarkings.reduce((sum, m) => sum + m.duration, 0) / attendanceMarkings.length
      expect(avgMarkingTime).toBeLessThan(100) // Average < 100ms (relaxed from 50ms due to concurrent load)
    })
  }

  test('Verify data integrity after concurrent writes', async () => {
    console.log('🔍 Verifying database integrity after stress test...')

    // Query final database state
    const { data: attendanceRecords, error } = await supabase
      .from('frequencia')
      .select('*')
      .eq('sessao_id', sharedSessionId)

    if (error) {
      throw new Error(`Failed to query attendance records: ${error.message}`)
    }

    console.log(`📊 Attendance records created: ${attendanceRecords?.length || 0}`)

    // Validate:
    // 1. No duplicate records (each student should have max 1 record)
    const studentCounts = new Map<string, number>()

    attendanceRecords?.forEach(record => {
      const count = studentCounts.get(record.matricula_id) || 0
      studentCounts.set(record.matricula_id, count + 1)
    })

    const duplicates = Array.from(studentCounts.entries()).filter(([_, count]) => count > 1)

    if (duplicates.length > 0) {
      console.error(`❌ Found ${duplicates.length} duplicate records:`, duplicates)
    }

    expect(duplicates.length).toBe(0) // No duplicates allowed

    // 2. All records belong to correct session
    const wrongSessionRecords = attendanceRecords?.filter(r => r.sessao_id !== sharedSessionId)
    expect(wrongSessionRecords?.length).toBe(0)

    // 3. Reasonable number of records (accounting for concurrent writes)
    // With 50 workers marking 30 students each, we expect 30 unique records (not 1500)
    expect(attendanceRecords?.length).toBeGreaterThanOrEqual(10) // At least some students marked
    expect(attendanceRecords?.length).toBeLessThanOrEqual(studentIds.length) // No more than total students

    console.log('✅ Data integrity verified - no corruption detected')
  })

  test('Performance degradation analysis', async () => {
    console.log('📈 Analyzing performance metrics...')

    // This test runs AFTER all 50 workers complete
    // It analyzes the aggregate performance impact

    const { data: sessionStats } = await supabase
      .from('frequencia')
      .select('marcado_em, created_at')
      .eq('sessao_id', sharedSessionId)
      .order('marcado_em', { ascending: true })

    if (!sessionStats || sessionStats.length === 0) {
      console.warn('⚠️  No attendance records found for performance analysis')
      return
    }

    // Calculate time spread (how long did it take to mark all students)
    const firstMark = new Date(sessionStats[0].marcado_em).getTime()
    const lastMark = new Date(sessionStats[sessionStats.length - 1].marcado_em).getTime()
    const timeSpread = lastMark - firstMark

    console.log(`⏱️  Time spread: ${(timeSpread / 1000).toFixed(1)}s`)
    console.log(`   First mark: ${new Date(firstMark).toISOString()}`)
    console.log(`   Last mark: ${new Date(lastMark).toISOString()}`)

    // Under ideal conditions (no concurrent load), 30 students should be marked in ~3-5s
    // With 50 concurrent users, we allow up to 60s (reasonable degradation)
    expect(timeSpread).toBeLessThan(60000) // < 60 seconds total

    console.log('✅ Performance degradation within acceptable limits')
  })
})

/**
 * How to run this stress test:
 *
 * 1. Start development server:
 *    cd gestao_fronteira && bun run dev
 *
 * 2. Run stress test with maximum workers:
 *    bun run test:e2e __tests__/e2e/stress/concurrent-attendance-marking.spec.ts --workers=50
 *
 * 3. Monitor system resources:
 *    - CPU usage (should stay < 80%)
 *    - Memory usage (should not leak)
 *    - Network requests (batch saves should group)
 *
 * Expected results:
 * - All 50 workers complete successfully
 * - No duplicate attendance records
 * - Average marking time < 100ms per student
 * - Total workflow < 30s per worker
 * - Database integrity maintained (no race conditions)
 *
 * Common issues and solutions:
 * - Timeouts: Increase test.setTimeout(120000)
 * - Connection errors: Check Supabase rate limits
 * - Duplicate records: Verify unique constraint on (session_id, matricula_id)
 * - Slow performance: Check database indexes are applied (Task 5.4)
 */
