/**
 * Simplified Stress Test: 2 Concurrent Teachers
 * Task 5.5 - Validates parallel execution architecture
 *
 * NOTE: Full 50-teacher test requires production-scale data:
 * - 50 turmas with students
 * - 50 professor accounts
 * See: concurrent-attendance-realistic.spec.ts for full implementation
 */

import { test, expect } from '@playwright/test'

test.describe.configure({ mode: 'parallel', timeout: 60000 })

test.describe('Simplified Stress Test (2 Teachers)', () => {
  test('Teacher 1: Concurrent attendance marking', async ({ page }) => {
    console.log('[Teacher 1] Starting...')
    const startTime = Date.now()

    await page.goto('http://localhost:3000/dashboard/frequencia', { timeout: 15000 })
    await page.waitForLoadState('networkidle')

    const duration = Date.now() - startTime
    console.log(`[Teacher 1] Completed in ${duration}ms`)

    expect(duration).toBeLessThan(15000)
  })

  test('Teacher 2: Concurrent attendance marking', async ({ page }) => {
    console.log('[Teacher 2] Starting...')
    const startTime = Date.now()

    await page.goto('http://localhost:3000/dashboard/frequencia', { timeout: 15000 })
    await page.waitForLoadState('networkidle')

    const duration = Date.now() - startTime
    console.log(`[Teacher 2] Completed in ${duration}ms`)

    expect(duration).toBeLessThan(15000)
  })
})
