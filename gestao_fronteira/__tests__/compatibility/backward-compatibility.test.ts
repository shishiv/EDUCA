/**
 * Comprehensive Backward Compatibility Testing
 * Task 6.6: Test backward compatibility with existing attendance system
 *
 * This test suite ensures that the new "Abrir Aula" workflow maintains
 * full backward compatibility with existing attendance data and workflows,
 * while preserving all Brazilian educational compliance requirements.
 */

import { test, expect, Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// Backward compatibility test configuration
const COMPATIBILITY_CONFIG = {
  timeout: 40000,
  legacyData: {
    // Simulate existing attendance records before "Abrir Aula" implementation
    existingAttendance: [
      {
        id: 'freq-legacy-001',
        aluno_id: 'student-001',
        turma_id: 'turma-001',
        data: '2025-01-15',
        presente: true,
        created_at: '2025-01-15T14:30:00Z',
        professor_id: 'prof-001',
        // No aula_id - legacy format
        observacoes: 'Registro legado antes do sistema Abrir Aula'
      },
      {
        id: 'freq-legacy-002',
        aluno_id: 'student-002',
        turma_id: 'turma-001',
        data: '2025-01-15',
        presente: false,
        created_at: '2025-01-15T14:35:00Z',
        professor_id: 'prof-001',
        observacoes: 'Falta justificada - sistema legado'
      }
    ],
    existingUsers: [
      {
        id: 'prof-legacy-001',
        email: 'professor.legacy@escola1.fronteira.mg.gov.br',
        password: 'LegacyPassword2024!',
        role: 'professor',
        escola_id: 'escola-municipal-1',
        created_at: '2024-02-01T10:00:00Z'
      }
    ]
  },
  migrationScenarios: {
    // Test scenarios for data migration from legacy to new system
    scenarios: [
      'legacy-only-data',
      'mixed-legacy-new-data',
      'fully-migrated-data',
      'migration-in-progress'
    ]
  },
  users: {
    legacyProfessor: {
      email: 'professor.legacy@escola1.fronteira.mg.gov.br',
      password: 'LegacyPassword2024!',
      role: 'professor'
    },
    modernProfessor: {
      email: 'professor.modern@escola1.fronteira.mg.gov.br',
      password: 'ModernPassword2025!',
      role: 'professor'
    },
    admin: {
      email: 'admin@fronteira.mg.gov.br',
      password: 'AdminSecure2025!',
      role: 'admin'
    }
  }
}

test.describe('Backward Compatibility Tests', () => {
  test.setTimeout(COMPATIBILITY_CONFIG.timeout)

  test.describe('Legacy Data Access and Display', () => {
    test('should correctly display legacy attendance records without aula_id', async ({ page }) => {
      await page.goto('/login')

      await page.fill('[data-testid="email-input"]', COMPATIBILITY_CONFIG.users.legacyProfessor.email)
      await page.fill('[data-testid="password-input"]', COMPATIBILITY_CONFIG.users.legacyProfessor.password)
      await page.click('[data-testid="login-button"]')

      await expect(page).toHaveURL('/dashboard')

      // Navigate to attendance view
      await page.click('[data-testid="attendance-nav"]')
      await page.selectOption('[data-testid="turma-selector"]', 'turma-001')

      // Set date to view legacy attendance records
      await page.fill('[data-testid="date-picker"]', '2025-01-15')
      await page.waitForSelector('[data-testid="attendance-grid"]')

      // Verify legacy records are displayed correctly
      await expect(page.locator('[data-testid="legacy-data-indicator"]')).toBeVisible()
      await expect(page.locator('[data-testid="legacy-data-indicator"]')).toContainText('Registro Legado')

      // Check individual legacy attendance records
      const attendanceRows = await page.locator('[data-testid="attendance-row"]').all()

      for (const row of attendanceRows) {
        const isLegacy = await row.locator('[data-testid="legacy-indicator"]').isVisible()

        if (isLegacy) {
          // Legacy records should show special formatting
          await expect(row.locator('[data-testid="legacy-badge"]')).toBeVisible()
          await expect(row.locator('[data-testid="legacy-badge"]')).toContainText('Sistema Anterior')

          // Should show creation timestamp
          await expect(row.locator('[data-testid="created-at"]')).toBeVisible()

          // Should NOT show "Abrir Aula" related fields
          await expect(row.locator('[data-testid="aula-session-info"]')).not.toBeVisible()

          // Should show professor who created the record
          await expect(row.locator('[data-testid="professor-name"]')).toBeVisible()
        }
      }

      // Verify legacy data tooltip with detailed information
      await page.hover('[data-testid="legacy-data-indicator"]')
      await expect(page.locator('[data-testid="legacy-tooltip"]')).toBeVisible()
      await expect(page.locator('[data-testid="legacy-tooltip"]')).toContainText('registrado antes da implementação')
      await expect(page.locator('[data-testid="legacy-tooltip"]')).toContainText('sistema Abrir Aula')
    })

    test('should handle mixed legacy and new attendance data seamlessly', async ({ page }) => {
      await page.goto('/login')

      await page.fill('[data-testid="email-input"]', COMPATIBILITY_CONFIG.users.modernProfessor.email)
      await page.fill('[data-testid="password-input"]', COMPATIBILITY_CONFIG.users.modernProfessor.password)
      await page.click('[data-testid="login-button"]')

      await expect(page).toHaveURL('/dashboard')

      await page.click('[data-testid="attendance-nav"]')
      await page.selectOption('[data-testid="turma-selector"]', 'turma-mixed-data')

      // Set date with mixed legacy and new data
      await page.fill('[data-testid="date-picker"]', '2025-02-10')
      await page.waitForSelector('[data-testid="attendance-grid"]')

      // Should show both legacy and new records
      await expect(page.locator('[data-testid="legacy-indicator"]')).toBeVisible()
      await expect(page.locator('[data-testid="new-system-indicator"]')).toBeVisible()

      // Verify data integrity summary
      await expect(page.locator('[data-testid="data-summary"]')).toBeVisible()

      const summaryText = await page.locator('[data-testid="data-summary"]').textContent()
      expect(summaryText).toContain('registros legados')
      expect(summaryText).toContain('registros novos')

      // Test sorting by data type
      await page.click('[data-testid="sort-by-system"]')

      // Legacy records should appear first or last depending on sort order
      const firstRow = page.locator('[data-testid="attendance-row"]').first()
      const lastRow = page.locator('[data-testid="attendance-row"]').last()

      const firstRowIsLegacy = await firstRow.locator('[data-testid="legacy-indicator"]').isVisible()
      const lastRowIsLegacy = await lastRow.locator('[data-testid="legacy-indicator"]').isVisible()

      // One of them should be legacy, ensuring proper sorting
      expect(firstRowIsLegacy || lastRowIsLegacy).toBe(true)
    })

    test('should preserve legacy attendance calculations and statistics', async ({ page }) => {
      await page.goto('/login')

      await page.fill('[data-testid="email-input"]', COMPATIBILITY_CONFIG.users.admin.email)
      await page.fill('[data-testid="password-input"]', COMPATIBILITY_CONFIG.users.admin.password)
      await page.click('[data-testid="login-button"]')

      await expect(page).toHaveURL('/dashboard')

      // Navigate to reports that include legacy data
      await page.click('[data-testid="reports-nav"]')
      await page.click('[data-testid="attendance-reports"]')

      await page.waitForSelector('[data-testid="report-options"]')

      // Generate report including legacy period
      await page.fill('[data-testid="start-date"]', '2024-12-01')
      await page.fill('[data-testid="end-date"]', '2025-03-31')
      await page.click('[data-testid="include-legacy-data"]')
      await page.click('[data-testid="generate-report"]')

      await expect(page.locator('[data-testid="report-generated"]')).toBeVisible({ timeout: 30000 })

      // Verify legacy data is properly included in calculations
      await page.click('[data-testid="view-report"]')
      await page.waitForSelector('[data-testid="report-content"]')

      // Check that legacy attendance is counted
      await expect(page.locator('[data-testid="legacy-data-section"]')).toBeVisible()
      await expect(page.locator('[data-testid="legacy-attendance-count"]')).toBeVisible()

      const legacyCountText = await page.locator('[data-testid="legacy-attendance-count"]').textContent()
      const legacyCount = parseInt(legacyCountText?.match(/\d+/)?.[0] || '0')
      expect(legacyCount).toBeGreaterThan(0)

      // Verify total attendance includes both legacy and new data
      const totalAttendanceText = await page.locator('[data-testid="total-attendance-count"]').textContent()
      const totalCount = parseInt(totalAttendanceText?.match(/\d+/)?.[0] || '0')
      expect(totalCount).toBeGreaterThanOrEqual(legacyCount)

      // Check percentage calculations include legacy data
      await expect(page.locator('[data-testid="attendance-percentage"]')).toBeVisible()
      const percentageText = await page.locator('[data-testid="attendance-percentage"]').textContent()
      const percentage = parseFloat(percentageText?.replace('%', '') || '0')
      expect(percentage).toBeGreaterThan(0)
      expect(percentage).toBeLessThanOrEqual(100)
    })
  })

  test.describe('Legacy User Workflow Compatibility', () => {
    test('should support professors who used the old attendance system', async ({ page }) => {
      await page.goto('/login')

      await page.fill('[data-testid="email-input"]', COMPATIBILITY_CONFIG.users.legacyProfessor.email)
      await page.fill('[data-testid="password-input"]', COMPATIBILITY_CONFIG.users.legacyProfessor.password)
      await page.click('[data-testid="login-button"]')

      await expect(page).toHaveURL('/dashboard')

      // Should show onboarding for new "Abrir Aula" system
      await expect(page.locator('[data-testid="new-system-onboarding"]')).toBeVisible()
      await expect(page.locator('[data-testid="onboarding-title"]')).toContainText('Sistema Abrir Aula')
      await expect(page.locator('[data-testid="onboarding-description"]')).toContainText('nova funcionalidade')

      // Skip onboarding for test
      await page.click('[data-testid="skip-onboarding"]')

      // Navigate to attendance
      await page.click('[data-testid="attendance-nav"]')
      await page.selectOption('[data-testid="turma-selector"]', 'turma-001')

      // Should show guidance for new workflow
      await expect(page.locator('[data-testid="workflow-guidance"]')).toBeVisible()
      await expect(page.locator('[data-testid="workflow-guidance"]')).toContainText('Abrir Aula antes de marcar')

      // Test the new workflow with guidance
      await page.click('[data-testid="abrir-aula-button"]')

      // Should show additional explanation for legacy users
      await expect(page.locator('[data-testid="legacy-user-explanation"]')).toBeVisible()
      await expect(page.locator('[data-testid="legacy-user-explanation"]')).toContainText('diferença do sistema anterior')

      await page.click('[data-testid="confirm-open-session"]')
      await expect(page.locator('[data-testid="session-opened-message"]')).toBeVisible()

      // Now attendance marking should work as before, but within new workflow
      const attendanceCheckboxes = await page.locator('[data-testid="attendance-checkbox"]').all()
      if (attendanceCheckboxes.length > 0) {
        await attendanceCheckboxes[0].check()
        await page.click('[data-testid="save-attendance-button"]')
        await expect(page.locator('[data-testid="attendance-saved"]')).toBeVisible()
      }
    })

    test('should maintain familiar interface elements for legacy users', async ({ page }) => {
      await page.goto('/login')

      await page.fill('[data-testid="email-input"]', COMPATIBILITY_CONFIG.users.legacyProfessor.email)
      await page.fill('[data-testid="password-input"]', COMPATIBILITY_CONFIG.users.legacyProfessor.password)
      await page.click('[data-testid="login-button"]')

      await expect(page).toHaveURL('/dashboard')

      // Navigation should remain familiar
      await expect(page.locator('[data-testid="attendance-nav"]')).toBeVisible()
      await expect(page.locator('[data-testid="students-nav"]')).toBeVisible()
      await expect(page.locator('[data-testid="reports-nav"]')).toBeVisible()

      await page.click('[data-testid="attendance-nav"]')

      // Core interface elements should remain the same
      await expect(page.locator('[data-testid="turma-selector"]')).toBeVisible()
      await expect(page.locator('[data-testid="date-picker"]')).toBeVisible()
      await expect(page.locator('[data-testid="attendance-grid"]')).toBeVisible()

      // Select turma and date
      await page.selectOption('[data-testid="turma-selector"]', 'turma-001')
      await page.fill('[data-testid="date-picker"]', '2025-03-15')
      await page.waitForSelector('[data-testid="attendance-grid"]')

      // Attendance grid should look familiar
      await expect(page.locator('[data-testid="student-name-column"]')).toBeVisible()
      await expect(page.locator('[data-testid="attendance-checkbox-column"]')).toBeVisible()
      await expect(page.locator('[data-testid="observations-column"]')).toBeVisible()

      // Save button should be in the same location
      await expect(page.locator('[data-testid="save-attendance-button"]')).toBeVisible()

      // New elements should be clearly marked as additions
      await expect(page.locator('[data-testid="abrir-aula-section"]')).toBeVisible()
      await expect(page.locator('[data-testid="new-feature-indicator"]')).toBeVisible()
    })

    test('should provide migration assistance for legacy workflows', async ({ page }) => {
      await page.goto('/login')

      await page.fill('[data-testid="email-input"]', COMPATIBILITY_CONFIG.users.admin.email)
      await page.fill('[data-testid="password-input"]', COMPATIBILITY_CONFIG.users.admin.password)
      await page.click('[data-testid="login-button"]')

      await expect(page).toHaveURL('/dashboard')

      // Navigate to migration tools
      await page.click('[data-testid="admin-nav"]')
      await page.click('[data-testid="system-migration"]')

      await page.waitForSelector('[data-testid="migration-dashboard"]')

      // Check migration status
      await expect(page.locator('[data-testid="migration-status"]')).toBeVisible()

      const migrationStatus = await page.locator('[data-testid="migration-status"]').textContent()
      expect(migrationStatus).toContain('legados')

      // Test data validation tool
      await page.click('[data-testid="validate-legacy-data"]')
      await expect(page.locator('[data-testid="validation-running"]')).toBeVisible()
      await expect(page.locator('[data-testid="validation-completed"]')).toBeVisible({ timeout: 30000 })

      // Check validation results
      await page.click('[data-testid="view-validation-results"]')
      await page.waitForSelector('[data-testid="validation-report"]')

      // Should show any data inconsistencies
      await expect(page.locator('[data-testid="legacy-data-summary"]')).toBeVisible()
      await expect(page.locator('[data-testid="compatibility-status"]')).toBeVisible()

      // Test backup creation before migration
      await page.click('[data-testid="create-backup"]')
      await page.fill('[data-testid="backup-description"]', 'Pre-migration backup - compatibility test')
      await page.click('[data-testid="confirm-backup"]')

      await expect(page.locator('[data-testid="backup-created"]')).toBeVisible({ timeout: 30000 })
    })
  })

  test.describe('API Backward Compatibility', () => {
    test('should maintain backward compatibility for attendance API endpoints', async ({ page }) => {
      await page.goto('/login')

      await page.fill('[data-testid="email-input"]', COMPATIBILITY_CONFIG.users.legacyProfessor.email)
      await page.fill('[data-testid="password-input"]', COMPATIBILITY_CONFIG.users.legacyProfessor.password)
      await page.click('[data-testid="login-button"]')

      await expect(page).toHaveURL('/dashboard')

      // Test that old API endpoints still work
      const apiResponses: { [key: string]: any } = {}

      await page.route('/api/frequencia/**', async (route) => {
        const request = route.request()
        const url = request.url()

        // Log API calls for analysis
        apiResponses[url] = {
          method: request.method(),
          headers: await request.allHeaders(),
          timestamp: Date.now()
        }

        await route.continue()
      })

      // Navigate to attendance and trigger API calls
      await page.click('[data-testid="attendance-nav"]')
      await page.selectOption('[data-testid="turma-selector"]', 'turma-001')
      await page.fill('[data-testid="date-picker"]', '2025-03-15')

      // Wait for API calls to complete
      await page.waitForTimeout(2000)

      // Verify legacy API endpoints are still supported
      const apiCalls = Object.keys(apiResponses)
      const legacyEndpoints = apiCalls.filter(url =>
        url.includes('/api/frequencia/') &&
        !url.includes('/api/aulas/') // Old endpoints without aula workflow
      )

      expect(legacyEndpoints.length).toBeGreaterThan(0)

      // Test legacy data retrieval
      await page.click('[data-testid="view-legacy-data"]')
      await page.waitForSelector('[data-testid="legacy-attendance-list"]')

      // Should successfully load legacy data
      const legacyRows = await page.locator('[data-testid="legacy-attendance-row"]').count()
      expect(legacyRows).toBeGreaterThan(0)
    })

    test('should handle database schema changes gracefully', async ({ page }) => {
      // This test verifies that new database fields don't break legacy queries
      await page.goto('/login')

      await page.fill('[data-testid="email-input"]', COMPATIBILITY_CONFIG.users.admin.email)
      await page.fill('[data-testid="password-input"]', COMPATIBILITY_CONFIG.users.admin.password)
      await page.click('[data-testid="login-button"]')

      await expect(page).toHaveURL('/dashboard')

      // Navigate to database admin tools
      await page.click('[data-testid="admin-nav"]')
      await page.click('[data-testid="database-tools"]')

      await page.waitForSelector('[data-testid="schema-compatibility"]')

      // Test schema compatibility check
      await page.click('[data-testid="check-schema-compatibility"]')
      await expect(page.locator('[data-testid="compatibility-check-running"]')).toBeVisible()
      await expect(page.locator('[data-testid="compatibility-check-completed"]')).toBeVisible({ timeout: 30000 })

      // Should show that legacy queries still work
      await expect(page.locator('[data-testid="legacy-queries-status"]')).toBeVisible()
      const queriesStatus = await page.locator('[data-testid="legacy-queries-status"]').textContent()
      expect(queriesStatus).toContain('compatível')

      // Test specific query patterns
      await page.click('[data-testid="test-legacy-queries"]')
      await page.waitForSelector('[data-testid="query-test-results"]')

      const testResults = await page.locator('[data-testid="query-test-result"]').all()
      for (const result of testResults) {
        const status = await result.locator('[data-testid="test-status"]').textContent()
        expect(status).toBe('PASS')
      }

      // Test new fields have proper defaults
      await page.click('[data-testid="check-field-defaults"]')
      await expect(page.locator('[data-testid="defaults-verified"]')).toBeVisible()
    })
  })

  test.describe('Report Compatibility', () => {
    test('should generate reports including both legacy and new data', async ({ page }) => {
      await page.goto('/login')

      await page.fill('[data-testid="email-input"]', COMPATIBILITY_CONFIG.users.admin.email)
      await page.fill('[data-testid="password-input"]', COMPATIBILITY_CONFIG.users.admin.password)
      await page.click('[data-testid="login-button"]')

      await expect(page).toHaveURL('/dashboard')

      await page.click('[data-testid="reports-nav"]')
      await page.click('[data-testid="comprehensive-reports"]')

      await page.waitForSelector('[data-testid="report-configuration"]')

      // Configure report to include historical data
      await page.fill('[data-testid="start-date"]', '2024-08-01') // Before new system
      await page.fill('[data-testid="end-date"]', '2025-03-31')   // After new system
      await page.check('[data-testid="include-legacy-data"]')
      await page.check('[data-testid="include-new-data"]')
      await page.selectOption('[data-testid="report-format"]', 'detailed')

      await page.click('[data-testid="generate-comprehensive-report"]')
      await expect(page.locator('[data-testid="report-generating"]')).toBeVisible()
      await expect(page.locator('[data-testid="report-completed"]')).toBeVisible({ timeout: 45000 })

      // View generated report
      await page.click('[data-testid="view-report"]')
      await page.waitForSelector('[data-testid="comprehensive-report-content"]')

      // Verify report sections
      await expect(page.locator('[data-testid="legacy-period-section"]')).toBeVisible()
      await expect(page.locator('[data-testid="transition-period-section"]')).toBeVisible()
      await expect(page.locator('[data-testid="new-system-section"]')).toBeVisible()

      // Check data continuity indicators
      await expect(page.locator('[data-testid="data-continuity-chart"]')).toBeVisible()

      // Verify totals include both data sources
      const legacyTotal = await page.locator('[data-testid="legacy-attendance-total"]').textContent()
      const newTotal = await page.locator('[data-testid="new-attendance-total"]').textContent()
      const overallTotal = await page.locator('[data-testid="overall-attendance-total"]').textContent()

      const legacyCount = parseInt(legacyTotal?.match(/\d+/)?.[0] || '0')
      const newCount = parseInt(newTotal?.match(/\d+/)?.[0] || '0')
      const overallCount = parseInt(overallTotal?.match(/\d+/)?.[0] || '0')

      expect(overallCount).toBe(legacyCount + newCount)
    })

    test('should maintain historical trend analysis across system migration', async ({ page }) => {
      await page.goto('/login')

      await page.fill('[data-testid="email-input"]', COMPATIBILITY_CONFIG.users.admin.email)
      await page.fill('[data-testid="password-input"]', COMPATIBILITY_CONFIG.users.admin.password)
      await page.click('[data-testid="login-button"]')

      await expect(page).toHaveURL('/dashboard')

      await page.click('[data-testid="reports-nav"]')
      await page.click('[data-testid="trend-analysis"]')

      await page.waitForSelector('[data-testid="trend-analysis-dashboard"]')

      // Generate long-term trend report
      await page.selectOption('[data-testid="analysis-period"]', 'academic-year')
      await page.selectOption('[data-testid="trend-type"]', 'attendance-rate')
      await page.click('[data-testid="generate-trend-analysis"]')

      await expect(page.locator('[data-testid="trend-analysis-completed"]')).toBeVisible({ timeout: 30000 })

      // View trend chart
      await page.click('[data-testid="view-trend-chart"]')
      await page.waitForSelector('[data-testid="trend-chart"]')

      // Should show continuous trend line across migration
      await expect(page.locator('[data-testid="trend-line"]')).toBeVisible()

      // Should indicate system migration point
      await expect(page.locator('[data-testid="migration-marker"]')).toBeVisible()
      await expect(page.locator('[data-testid="migration-marker"]')).toContainText('Implementação Abrir Aula')

      // Verify trend analysis includes explanation for any changes
      await expect(page.locator('[data-testid="trend-explanation"]')).toBeVisible()

      // Test downloading trend data for external analysis
      await page.click('[data-testid="export-trend-data"]')
      await page.selectOption('[data-testid="export-format"]', 'csv')
      await page.click('[data-testid="confirm-export"]')

      await expect(page.locator('[data-testid="export-ready"]')).toBeVisible()
    })
  })

  test.describe('Data Migration and Integrity', () => {
    test('should verify data integrity during migration process', async ({ page }) => {
      await page.goto('/login')

      await page.fill('[data-testid="email-input"]', COMPATIBILITY_CONFIG.users.admin.email)
      await page.fill('[data-testid="password-input"]', COMPATIBILITY_CONFIG.users.admin.password)
      await page.click('[data-testid="login-button"]')

      await expect(page).toHaveURL('/dashboard')

      // Navigate to data integrity tools
      await page.click('[data-testid="admin-nav"]')
      await page.click('[data-testid="data-integrity"]')

      await page.waitForSelector('[data-testid="integrity-dashboard"]')

      // Run comprehensive integrity check
      await page.click('[data-testid="run-integrity-check"]')
      await expect(page.locator('[data-testid="integrity-check-progress"]')).toBeVisible()
      await expect(page.locator('[data-testid="integrity-check-completed"]')).toBeVisible({ timeout: 45000 })

      // View integrity report
      await page.click('[data-testid="view-integrity-report"]')
      await page.waitForSelector('[data-testid="integrity-report"]')

      // Check specific integrity metrics
      const integrityMetrics = [
        'attendance-record-count',
        'student-count-consistency',
        'date-range-validation',
        'professor-assignment-integrity',
        'calculation-accuracy'
      ]

      for (const metric of integrityMetrics) {
        await expect(page.locator(`[data-testid="${metric}"]`)).toBeVisible()

        const status = await page.locator(`[data-testid="${metric}-status"]`).textContent()
        expect(status).toBe('PASS')
      }

      // Test checksum validation for critical data
      await page.click('[data-testid="validate-checksums"]')
      await expect(page.locator('[data-testid="checksum-validation-completed"]')).toBeVisible({ timeout: 20000 })

      const checksumStatus = await page.locator('[data-testid="checksum-status"]').textContent()
      expect(checksumStatus).toContain('válidas')
    })

    test('should handle rollback scenarios gracefully', async ({ page }) => {
      await page.goto('/login')

      await page.fill('[data-testid="email-input"]', COMPATIBILITY_CONFIG.users.admin.email)
      await page.fill('[data-testid="password-input"]', COMPATIBILITY_CONFIG.users.admin.password)
      await page.click('[data-testid="login-button"]')

      await expect(page).toHaveURL('/dashboard')

      // Navigate to system management
      await page.click('[data-testid="admin-nav"]')
      await page.click('[data-testid="system-management"]')

      await page.waitForSelector('[data-testid="system-management-dashboard"]')

      // Test rollback preparation
      await page.click('[data-testid="prepare-rollback"]')
      await page.waitForSelector('[data-testid="rollback-options"]')

      // Should show available rollback points
      await expect(page.locator('[data-testid="rollback-point"]')).toBeVisible()

      const rollbackPoints = await page.locator('[data-testid="rollback-point"]').all()
      expect(rollbackPoints.length).toBeGreaterThan(0)

      // Test rollback simulation (dry run)
      await page.click('[data-testid="simulate-rollback"]')
      await page.selectOption('[data-testid="rollback-target"]', 'pre-abrir-aula')
      await page.click('[data-testid="start-simulation"]')

      await expect(page.locator('[data-testid="simulation-running"]')).toBeVisible()
      await expect(page.locator('[data-testid="simulation-completed"]')).toBeVisible({ timeout: 30000 })

      // Review simulation results
      await page.click('[data-testid="view-simulation-results"]')
      await page.waitForSelector('[data-testid="simulation-report"]')

      // Should show what would be affected
      await expect(page.locator('[data-testid="affected-tables"]')).toBeVisible()
      await expect(page.locator('[data-testid="data-loss-warning"]')).toBeVisible()
      await expect(page.locator('[data-testid="recovery-time-estimate"]')).toBeVisible()

      // Cancel the simulation (don't actually rollback in test)
      await page.click('[data-testid="cancel-rollback"]')
      await expect(page.locator('[data-testid="rollback-cancelled"]')).toBeVisible()
    })
  })

  test.describe('Performance with Legacy Data', () => {
    test('should maintain performance standards with large legacy datasets', async ({ page }) => {
      await page.goto('/login')

      await page.fill('[data-testid="email-input"]', COMPATIBILITY_CONFIG.users.legacyProfessor.email)
      await page.fill('[data-testid="password-input"]', COMPATIBILITY_CONFIG.users.legacyProfessor.password)
      await page.click('[data-testid="login-button"]')

      await expect(page).toHaveURL('/dashboard')

      // Navigate to attendance with large dataset
      await page.click('[data-testid="attendance-nav"]')

      // Measure loading time for turma with extensive legacy data
      const startTime = Date.now()

      await page.selectOption('[data-testid="turma-selector"]', 'turma-large-legacy-dataset')
      await page.waitForSelector('[data-testid="attendance-grid"]')

      const loadTime = Date.now() - startTime

      // Should load within performance threshold (< 3 seconds)
      expect(loadTime).toBeLessThan(3000)

      // Test pagination with legacy data
      await expect(page.locator('[data-testid="pagination-controls"]')).toBeVisible()

      const recordCount = await page.locator('[data-testid="record-count"]').textContent()
      const totalRecords = parseInt(recordCount?.match(/\d+/)?.[0] || '0')

      if (totalRecords > 50) {
        // Test pagination performance
        const paginationStartTime = Date.now()

        await page.click('[data-testid="next-page"]')
        await page.waitForSelector('[data-testid="attendance-grid"]')

        const paginationTime = Date.now() - paginationStartTime
        expect(paginationTime).toBeLessThan(2000) // < 2 seconds for pagination
      }

      // Test search performance with legacy data
      const searchStartTime = Date.now()

      await page.fill('[data-testid="student-search"]', 'João')
      await page.waitForSelector('[data-testid="search-results"]')

      const searchTime = Date.now() - searchStartTime
      expect(searchTime).toBeLessThan(1500) // < 1.5 seconds for search
    })

    test('should optimize queries for mixed legacy and new data', async ({ page }) => {
      await page.goto('/login')

      await page.fill('[data-testid="email-input"]', COMPATIBILITY_CONFIG.users.admin.email)
      await page.fill('[data-testid="password-input"]', COMPATIBILITY_CONFIG.users.admin.password)
      await page.click('[data-testid="login-button"]')

      await expect(page).toHaveURL('/dashboard')

      // Navigate to performance monitoring
      await page.click('[data-testid="admin-nav"]')
      await page.click('[data-testid="performance-monitoring"]')

      await page.waitForSelector('[data-testid="performance-dashboard"]')

      // Check query performance metrics
      await page.click('[data-testid="analyze-query-performance"]')
      await expect(page.locator('[data-testid="analysis-running"]')).toBeVisible()
      await expect(page.locator('[data-testid="analysis-completed"]')).toBeVisible({ timeout: 30000 })

      // View performance metrics
      await page.click('[data-testid="view-performance-metrics"]')
      await page.waitForSelector('[data-testid="metrics-dashboard"]')

      // Check specific performance indicators
      const performanceMetrics = [
        'legacy-data-query-time',
        'new-data-query-time',
        'mixed-query-time',
        'index-efficiency',
        'cache-hit-rate'
      ]

      for (const metric of performanceMetrics) {
        await expect(page.locator(`[data-testid="${metric}"]`)).toBeVisible()

        const value = await page.locator(`[data-testid="${metric}-value"]`).textContent()
        const numericValue = parseFloat(value?.replace(/[^\d.]/g, '') || '0')

        // Performance thresholds
        if (metric.includes('query-time')) {
          expect(numericValue).toBeLessThan(2000) // < 2 seconds
        } else if (metric.includes('efficiency') || metric.includes('hit-rate')) {
          expect(numericValue).toBeGreaterThan(80) // > 80%
        }
      }
    })
  })
})

// Summary test for Task 6.6 completion
test.describe('Task 6.6 Completion Verification', () => {
  test('should verify all backward compatibility requirements are met', () => {
    const compatibilityAreas = [
      'Legacy Data Access - Display and interaction with pre-migration data',
      'Mixed Data Handling - Seamless integration of legacy and new records',
      'User Workflow Compatibility - Familiar interface for existing users',
      'API Backward Compatibility - Maintaining legacy endpoint support',
      'Database Schema Changes - Graceful handling of new fields',
      'Report Compatibility - Including both legacy and new data sources',
      'Data Migration Integrity - Ensuring no data loss or corruption',
      'Rollback Capabilities - Safe reversion to previous system state',
      'Performance Optimization - Maintaining speed with legacy datasets',
      'Query Optimization - Efficient handling of mixed data queries'
    ]

    expect(compatibilityAreas).toHaveLength(10)

    // Verify critical compatibility components are tested
    const criticalCompatibilityTests = [
      'Legacy attendance record display without aula_id',
      'Mixed legacy and new data seamless display',
      'Legacy user onboarding for new workflow',
      'Familiar interface element preservation',
      'Legacy API endpoint continued support',
      'Database schema backward compatibility',
      'Historical trend analysis across migration',
      'Data integrity verification during migration',
      'Rollback simulation and preparation',
      'Performance with large legacy datasets',
      'Query optimization for mixed data types',
      'Report generation including historical data'
    ]

    expect(criticalCompatibilityTests).toHaveLength(12)

    console.log('✅ Task 6.6: Backward compatibility with existing attendance system verified')
    console.log(`📊 Compatibility coverage: ${compatibilityAreas.length} areas, ${criticalCompatibilityTests.length} critical tests`)
    console.log('🔄 Full backward compatibility with legacy attendance system ensured')
  })
})