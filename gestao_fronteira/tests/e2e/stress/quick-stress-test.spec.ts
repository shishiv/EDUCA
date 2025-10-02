/**
 * Quick Stress Test: 5 Concurrent Users (Validation)
 * Validates stress test setup before running full 50-worker test
 */

import { test, expect } from '@playwright/test'

test.describe.configure({ mode: 'parallel', timeout: 60000 })

test.describe('Quick Stress Test (5 workers)', () => {
  for (let i = 1; i <= 5; i++) {
    test(`Worker ${i}: Navigate to attendance page`, async ({ page }) => {
      console.log(`[Worker ${i}] Starting...`)
      
      const startTime = performance.now()
      await page.goto('http://localhost:3000/dashboard/frequencia', { timeout: 15000 })
      
      // Check if page loads
      await page.waitForLoadState('networkidle', { timeout: 10000 })
      
      const duration = performance.now() - startTime
      console.log(`[Worker ${i}] Completed in ${duration.toFixed(0)}ms`)
      
      expect(duration).toBeLessThan(15000)
    })
  }
})
