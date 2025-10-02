/**
 * Quick Stress Test: 5 Concurrent Users (Validation)
 * Validates stress test infrastructure before running full 50-worker test
 */

import { test, expect } from '@playwright/test'

test.describe.configure({ mode: 'parallel', timeout: 60000 })

test.describe('Quick Stress Validation (5 workers)', () => {
  for (let i = 1; i <= 5; i++) {
    test(`Worker ${i}: Load attendance page concurrently`, async ({ page }) => {
      console.log(`[Worker ${i}] Starting...`)

      const startTime = Date.now()

      // Navigate to attendance page
      await page.goto('http://localhost:3000/dashboard/frequencia', { timeout: 15000 })

      // Wait for page to be ready
      await page.waitForLoadState('networkidle', { timeout: 10000 })

      const duration = Date.now() - startTime
      console.log(`[Worker ${i}] Completed in ${duration}ms`)

      // Verify page loaded successfully
      const title = await page.title()
      expect(title).toBeTruthy()

      // Performance assertion
      expect(duration).toBeLessThan(15000) // Should load within 15s even under stress
    })
  }
})
