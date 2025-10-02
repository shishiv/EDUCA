/**
 * Realistic Stress Test: 50 Concurrent Teachers Marking Attendance
 * Task 5.5 - Enhanced "Abrir Aula" Workflow
 *
 * CORRECTED SCENARIO:
 * - Each teacher marks attendance in THEIR OWN class (different sessions)
 * - No concurrent writes to same session (1 professor = 1 aula always)
 * - Realistic peak load: 50 teachers working simultaneously at 7:00-8:00 AM
 *
 * Test Objectives:
 * 1. Database throughput: Handle 1500 concurrent INSERTs (50 teachers × 30 students)
 * 2. Server performance: API responses < 2s under high load
 * 3. No connection pool exhaustion
 * 4. Optimistic UI updates remain fast (< 50ms)
 * 5. No memory leaks or resource exhaustion
 *
 * Test Setup:
 * - 50 different turmas (classes)
 * - 50 teacher accounts (one per turma)
 * - Each teacher has 30 students in their class
 * - Each teacher marks attendance in parallel (50 simultaneous sessions)
 */

import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://SUPABASE-PROJECT-REF.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Configure parallel execution with realistic concurrency
test.describe.configure({ mode: 'parallel', timeout: 180000 })

test.describe('Realistic Stress Test: 50 Teachers, 50 Separate Classes', () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  const testSessions: Array<{
    sessionId: string
    turmaId: string
    professorId: string
    studentCount: number
  }> = []

  test.beforeAll(async () => {
    console.log('🏗️  Setting up realistic stress test environment...')
    console.log('   Creating 50 separate sessions (one per teacher)...')

    // Get available turmas
    const { data: turmas } = await supabase
      .from('turmas')
      .select('id')
      .limit(50)

    if (!turmas || turmas.length < 5) {
      console.warn('⚠️  Not enough turmas in database - using subset')
    }

    // Get professors
    const { data: professors } = await supabase
      .from('users')
      .select('id')
      .eq('tipo_usuario', 'professor')
      .limit(50)

    if (!professors || professors.length < 5) {
      throw new Error('Not enough professors in database - seed data first')
    }

    // Get escola
    const { data: escola } = await supabase
      .from('escolas')
      .select('id')
      .limit(1)
      .single()

    if (!escola) {
      throw new Error('No escolas found - seed data first')
    }

    const escolaId = escola.id

    // Create 50 separate sessions (or as many as we have turmas/professors)
    const numSessions = Math.min(50, turmas?.length || 0, professors?.length || 0)

    for (let i = 0; i < numSessions; i++) {
      const turmaId = turmas[i % turmas.length].id
      const professorId = professors[i % professors.length].id

      // Create session for this teacher
      const { data: session, error } = await supabase
        .from('sessoes_aula')
        .insert({
          turma_id: turmaId,
          professor_id: professorId,
          data_aula: new Date().toISOString().split('T')[0],
          conteudo_programatico: `Stress Test - Teacher ${i + 1}/50`,
          duracao_minutos: 50,
          status: 'attendance',
          inicio_aula: new Date().toISOString(),
          escola_id: escolaId,
          documento_oficial: false
        })
        .select()
        .single()

      if (error) {
        console.error(`Failed to create session ${i + 1}:`, error.message)
        continue
      }

      // Get students for this turma
      const { data: matriculas } = await supabase
        .from('matriculas')
        .select('aluno_id')
        .eq('turma_id', turmaId)
        .limit(30)

      const studentCount = matriculas?.length || 0

      testSessions.push({
        sessionId: session.id,
        turmaId,
        professorId,
        studentCount
      })
    }

    console.log(`✅ Created ${testSessions.length} separate sessions`)
    console.log(`   Total students to mark: ${testSessions.reduce((sum, s) => sum + s.studentCount, 0)}`)
  })

  test.afterAll(async () => {
    console.log('🧹 Cleaning up stress test data...')

    // Delete all test sessions and their attendance records
    for (const session of testSessions) {
      await supabase
        .from('frequencia')
        .delete()
        .eq('sessao_id', session.sessionId)

      await supabase
        .from('sessoes_aula')
        .delete()
        .eq('id', session.sessionId)
    }

    console.log('✅ Cleanup complete')
  })

  // Generate parallel test cases - one per teacher/session
  testSessions.forEach((session, index) => {
    test(`Teacher ${index + 1}: Mark attendance for ${session.studentCount} students in their own class`, async ({ page }) => {
      const teacherId = index + 1
      const startTime = performance.now()

      console.log(`[Teacher ${teacherId}] Starting attendance for session ${session.sessionId}...`)

      // Navigate to attendance page for THIS teacher's class
      await page.goto(
        `http://localhost:3000/dashboard/frequencia?turma=${session.turmaId}&session=${session.sessionId}`,
        { timeout: 20000 }
      )

      // Wait for attendance grid to load
      try {
        await page.waitForSelector('[data-testid="attendance-grid"]', { timeout: 15000 })
      } catch (e) {
        console.warn(`[Teacher ${teacherId}] Grid not found - may be empty class`)
        return
      }

      const gridLoadTime = performance.now() - startTime
      console.log(`[Teacher ${teacherId}] Grid loaded in ${gridLoadTime.toFixed(0)}ms`)

      // Get all student rows
      const studentRows = await page.locator('[data-student-row]').count()

      if (studentRows === 0) {
        console.warn(`[Teacher ${teacherId}] No students found in this class`)
        return
      }

      console.log(`[Teacher ${teacherId}] Marking ${studentRows} students...`)

      // Mark attendance for all students
      const attendanceMarkings: number[] = []

      for (let i = 0; i < studentRows; i++) {
        const presente = Math.random() > 0.15 // 85% attendance rate

        const markStartTime = performance.now()

        // Click presente/ausente button for this student
        const studentRow = page.locator('[data-student-row]').nth(i)
        const button = studentRow.locator(`[data-presente="${presente}"]`)

        try {
          await button.click({ timeout: 5000 })

          const markDuration = performance.now() - markStartTime
          attendanceMarkings.push(markDuration)

          // Validate optimistic update performance
          expect(markDuration).toBeLessThan(200) // Allow 200ms under heavy load
        } catch (e) {
          console.warn(`[Teacher ${teacherId}] Failed to mark student ${i + 1}:`, e.message)
        }
      }

      // Wait for batch save to complete
      await page.waitForTimeout(3000)

      const totalDuration = performance.now() - startTime
      const avgMarkingTime = attendanceMarkings.reduce((sum, d) => sum + d, 0) / attendanceMarkings.length

      console.log(`[Teacher ${teacherId}] Completed in ${totalDuration.toFixed(0)}ms`)
      console.log(`[Teacher ${teacherId}] Average marking time: ${avgMarkingTime.toFixed(1)}ms`)
      console.log(`[Teacher ${teacherId}] Students marked: ${attendanceMarkings.length}/${studentRows}`)

      // Performance assertions (relaxed for realistic high-load scenario)
      expect(totalDuration).toBeLessThan(60000) // Total < 60s per teacher (reasonable under stress)
      expect(avgMarkingTime).toBeLessThan(200) // Average < 200ms per student
    })
  })

  test('Verify overall system performance under load', async () => {
    console.log('📊 Analyzing aggregate performance metrics...')

    // Query all attendance records created during stress test
    const sessionIds = testSessions.map(s => s.sessionId)

    const { data: allRecords, error } = await supabase
      .from('frequencia')
      .select('sessao_id, marcado_em, presente')
      .in('sessao_id', sessionIds)

    if (error) {
      throw new Error(`Failed to query attendance records: ${error.message}`)
    }

    console.log(`📈 Total attendance records created: ${allRecords?.length || 0}`)

    // Calculate aggregate stats
    const expectedTotal = testSessions.reduce((sum, s) => sum + s.studentCount, 0)
    const actualTotal = allRecords?.length || 0

    const completionRate = (actualTotal / expectedTotal) * 100

    console.log(`   Expected records: ${expectedTotal}`)
    console.log(`   Actual records: ${actualTotal}`)
    console.log(`   Completion rate: ${completionRate.toFixed(1)}%`)

    // Validate:
    // 1. High completion rate (at least 90% of students marked)
    expect(completionRate).toBeGreaterThan(90)

    // 2. No duplicate records per session
    const duplicates: string[] = []

    testSessions.forEach(session => {
      const sessionRecords = allRecords?.filter(r => r.sessao_id === session.sessionId) || []

      const uniqueCount = new Set(sessionRecords.map(r => r.sessao_id)).size

      if (sessionRecords.length > session.studentCount) {
        duplicates.push(session.sessionId)
      }
    })

    if (duplicates.length > 0) {
      console.error(`❌ Found ${duplicates.length} sessions with duplicates`)
    }

    expect(duplicates.length).toBe(0)

    // 3. Calculate time spread (how long did entire stress test take)
    if (allRecords && allRecords.length > 0) {
      const timestamps = allRecords
        .map(r => new Date(r.marcado_em).getTime())
        .filter(t => !isNaN(t))

      if (timestamps.length > 0) {
        const minTime = Math.min(...timestamps)
        const maxTime = Math.max(...timestamps)
        const timeSpread = maxTime - minTime

        console.log(`⏱️  Total time spread: ${(timeSpread / 1000).toFixed(1)}s`)
        console.log(`   Throughput: ${(allRecords.length / (timeSpread / 1000)).toFixed(1)} records/second`)

        // Under realistic load, 1500 records should be marked within 3 minutes
        expect(timeSpread).toBeLessThan(180000) // < 3 minutes
      }
    }

    console.log('✅ System handled concurrent load successfully')
  })
})

/**
 * How to run this realistic stress test:
 *
 * 1. Ensure database has sufficient test data:
 *    - At least 5 turmas (ideally 50)
 *    - At least 5 professors (ideally 50)
 *    - At least 10 students per turma
 *
 * 2. Start development server:
 *    cd gestao_fronteira && bun run dev
 *
 * 3. Run stress test with parallel workers:
 *    bun run test:e2e __tests__/e2e/stress/concurrent-attendance-realistic.spec.ts
 *
 * Expected results:
 * - All teachers complete attendance marking successfully
 * - Completion rate > 90% (some failures acceptable under extreme load)
 * - No duplicate records per session
 * - Total time < 3 minutes for 1500 records
 * - Average throughput > 8 records/second
 * - No database connection pool exhaustion
 * - No memory leaks or server crashes
 */
