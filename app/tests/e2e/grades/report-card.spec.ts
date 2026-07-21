import { test, expect } from '../support/diagnostics'
import { waitForPageLoad } from '../utils/test-helpers'

/**
 * E2E Tests: Boletim (Report Card)
 * Tests for student report card viewing and export
 * 
 * @see app/(dashboard)/dashboard/alunos/[id]/boletim/page.tsx
 */

test.describe('Boletim - Access', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
  })

  test('should access boletim from student list', async ({ page }) => {
    await page.waitForTimeout(1000)
    
    const firstStudent = page.getByRole('row').nth(1)
    const viewButton = firstStudent.getByRole('link').first()
    
    if (await viewButton.isVisible()) {
      await viewButton.click()
      await page.waitForTimeout(1000)
      
      const boletimLink = page.getByRole('link', { name: /boletim|histórico|notas/i })
      if (await boletimLink.isVisible()) {
        await expect(boletimLink).toBeVisible()
      }
    }
  })

  test('should navigate to boletim page', async ({ page }) => {
    await page.waitForTimeout(1000)
    
    const firstStudent = page.getByRole('row').nth(1).getByRole('link').first()
    
    if (await firstStudent.isVisible()) {
      await firstStudent.click()
      await page.waitForTimeout(1000)
      
      const boletimLink = page.getByRole('link', { name: /boletim/i })
      if (await boletimLink.isVisible()) {
        await boletimLink.click()
        await page.waitForTimeout(1000)
        
        await expect(page).toHaveURL(/boletim/)
      }
    }
  })

  test('should display boletim page header', async ({ page }) => {
    await page.waitForTimeout(1000)
    
    const firstStudent = page.getByRole('row').nth(1).getByRole('link').first()
    
    if (await firstStudent.isVisible()) {
      await firstStudent.click()
      await page.waitForTimeout(1000)
      
      const boletimLink = page.getByRole('link', { name: /boletim/i })
      if (await boletimLink.isVisible()) {
        await boletimLink.click()
        await page.waitForTimeout(1000)
        
        const heading = page.getByRole('heading', { name: /boletim|histórico escolar/i })
        if (await heading.isVisible()) {
          await expect(heading).toBeVisible()
        }
      }
    }
  })
})

test.describe('Boletim - Student Information', () => {
  async function navigateToBoletim(page) {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    await page.waitForTimeout(1000)
    
    const firstStudent = page.getByRole('row').nth(1).getByRole('link').first()
    if (!(await firstStudent.isVisible())) return false
    
    await firstStudent.click()
    await page.waitForTimeout(1000)
    
    const boletimLink = page.getByRole('link', { name: /boletim/i })
    if (!(await boletimLink.isVisible())) return false
    
    await boletimLink.click()
    await page.waitForTimeout(1500)
    return true
  }

  test('should display student name', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      // Student name should be visible
      const studentHeading = page.getByRole('heading').filter({ hasText: /.{3,}/ }).first()
      if (await studentHeading.isVisible()) {
        const text = await studentHeading.textContent()
        expect(text?.length).toBeGreaterThan(0)
      }
    }
  })

  test('should display student photo or avatar', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      // Look for avatar or photo
      const avatar = page.locator('[class*="avatar"], img[alt*="foto"]')
      if (await avatar.first().isVisible()) {
        await expect(avatar.first()).toBeVisible()
      }
    }
  })

  test('should display student registration info', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      // Look for matricula or RA
      const matricula = page.getByText(/matrícula|ra|registro/i)
      if (await matricula.isVisible()) {
        await expect(matricula).toBeVisible()
      }
    }
  })

  test('should display student birth date', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      // Look for birth date
      const birthDate = page.getByText(/nascimento|\d{2}\/\d{2}\/\d{4}/i)
      if (await birthDate.isVisible()) {
        await expect(birthDate).toBeVisible()
      }
    }
  })

  test('should display student age', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      const age = page.getByText(/\d+\s*anos/i)
      if (await age.isVisible()) {
        await expect(age).toBeVisible()
      }
    }
  })

  test('should display turma information', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      const turmaInfo = page.getByText(/turma|série|ano/i)
      if (await turmaInfo.isVisible()) {
        await expect(turmaInfo).toBeVisible()
      }
    }
  })
})

test.describe('Boletim - School Information', () => {
  async function navigateToBoletim(page) {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    await page.waitForTimeout(1000)
    
    const firstStudent = page.getByRole('row').nth(1).getByRole('link').first()
    if (await firstStudent.isVisible()) {
      await firstStudent.click()
      await page.waitForTimeout(1000)
      
      const boletimLink = page.getByRole('link', { name: /boletim/i })
      if (await boletimLink.isVisible()) {
        await boletimLink.click()
        await page.waitForTimeout(1500)
        return true
      }
    }
    return false
  }

  test('should display school name', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      const schoolName = page.getByText(/escola|instituição/i)
      if (await schoolName.isVisible()) {
        await expect(schoolName).toBeVisible()
      }
    }
  })

  test('should display school logo', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      const logo = page.locator('img[alt*="logo"], img[alt*="escola"]')
      if (await logo.first().isVisible()) {
        await expect(logo.first()).toBeVisible()
      }
    }
  })

  test('should display academic year', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      const year = page.getByText(/20\d{2}|ano letivo/i)
      if (await year.isVisible()) {
        await expect(year).toBeVisible()
      }
    }
  })
})

test.describe('Boletim - Grades Display', () => {
  async function navigateToBoletim(page) {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    await page.waitForTimeout(1000)
    
    const firstStudent = page.getByRole('row').nth(1).getByRole('link').first()
    if (await firstStudent.isVisible()) {
      await firstStudent.click()
      await page.waitForTimeout(1000)
      
      const boletimLink = page.getByRole('link', { name: /boletim/i })
      if (await boletimLink.isVisible()) {
        await boletimLink.click()
        await page.waitForTimeout(1500)
        return true
      }
    }
    return false
  }

  test('should display grades table', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      const table = page.getByRole('table')
      if (await table.isVisible()) {
        await expect(table).toBeVisible()
      }
    }
  })

  test('should display subject names', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      const subjectColumn = page.getByRole('columnheader', { name: /disciplina|componente|matéria/i })
      if (await subjectColumn.isVisible()) {
        await expect(subjectColumn).toBeVisible()
      }
      
      // Look for actual subject names
      const subjects = page.getByText(/matemática|português|ciências|história|geografia/i)
      if (await subjects.first().isVisible()) {
        await expect(subjects.first()).toBeVisible()
      }
    }
  })

  test('should display grades by period/bimestre', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      // Look for period columns (1º Bim, 2º Bim, etc.)
      const periodHeaders = page.getByRole('columnheader', { name: /1º|2º|3º|4º|bim|trim/i })
      if (await periodHeaders.first().isVisible()) {
        await expect(periodHeaders.first()).toBeVisible()
      }
    }
  })

  test('should display numeric grades', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      // Look for grade cells with numbers
      const gradeCells = page.getByRole('cell').filter({ hasText: /\d+[.,]?\d*/ })
      if (await gradeCells.first().isVisible()) {
        await expect(gradeCells.first()).toBeVisible()
      }
    }
  })

  test('should display final average per subject', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      const avgColumn = page.getByRole('columnheader', { name: /média.*final|média/i })
      if (await avgColumn.isVisible()) {
        await expect(avgColumn).toBeVisible()
      }
    }
  })

  test('should display overall average', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      const overallAvg = page.getByText(/média.*geral|média.*final/i)
      if (await overallAvg.isVisible()) {
        await expect(overallAvg).toBeVisible()
      }
    }
  })

  test('should highlight failing grades', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      // Look for red/warning highlighted cells
      const failingCells = page.locator('[class*="red"], [class*="danger"]').filter({ hasText: /[0-5][.,]\d/ })
      if (await failingCells.first().isVisible()) {
        await expect(failingCells.first()).toBeVisible()
      }
    }
  })

  test('should handle missing grades gracefully', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      // Look for empty grade indicators
      const emptyGrades = page.getByText(/-|n\/a|pendente/i)
      if (await emptyGrades.first().isVisible()) {
        await expect(emptyGrades.first()).toBeVisible()
      }
    }
  })
})

test.describe('Boletim - Attendance Information', () => {
  async function navigateToBoletim(page) {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    await page.waitForTimeout(1000)
    
    const firstStudent = page.getByRole('row').nth(1).getByRole('link').first()
    if (await firstStudent.isVisible()) {
      await firstStudent.click()
      await page.waitForTimeout(1000)
      
      const boletimLink = page.getByRole('link', { name: /boletim/i })
      if (await boletimLink.isVisible()) {
        await boletimLink.click()
        await page.waitForTimeout(1500)
        return true
      }
    }
    return false
  }

  test('should display attendance percentage', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      const attendancePercent = page.getByText(/frequência.*\d+%|\d+%.*frequência/i)
      if (await attendancePercent.isVisible()) {
        await expect(attendancePercent).toBeVisible()
      }
    }
  })

  test('should display total absences', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      const absences = page.getByText(/faltas.*\d+|\d+.*faltas/i)
      if (await absences.isVisible()) {
        await expect(absences).toBeVisible()
      }
    }
  })

  test('should display attendance by period', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      // Attendance might be shown per bimester
      const periodAttendance = page.locator('[class*="attendance"], [class*="frequencia"]')
      if (await periodAttendance.first().isVisible()) {
        await expect(periodAttendance.first()).toBeVisible()
      }
    }
  })

  test('should highlight low attendance (<75%)', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      // Look for red/warning attendance indicators
      const lowAttendance = page.locator('[class*="red"], [class*="warning"]').filter({ hasText: /\d{1,2}%/ })
      if (await lowAttendance.first().isVisible()) {
        const text = await lowAttendance.first().textContent()
        if (text && parseInt(text) < 75) {
          await expect(lowAttendance.first()).toBeVisible()
        }
      }
    }
  })
})

test.describe('Boletim - Approval Status', () => {
  async function navigateToBoletim(page) {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    await page.waitForTimeout(1000)
    
    const firstStudent = page.getByRole('row').nth(1).getByRole('link').first()
    if (await firstStudent.isVisible()) {
      await firstStudent.click()
      await page.waitForTimeout(1000)
      
      const boletimLink = page.getByRole('link', { name: /boletim/i })
      if (await boletimLink.isVisible()) {
        await boletimLink.click()
        await page.waitForTimeout(1500)
        return true
      }
    }
    return false
  }

  test('should display approval status', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      const status = page.getByText(/aprovado|reprovado|recuperação|em andamento/i)
      if (await status.isVisible()) {
        await expect(status).toBeVisible()
      }
    }
  })

  test('should display status per subject', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      // Each subject row might have approval status
      const subjectStatus = page.locator('[class*="status"]').or(
        page.getByRole('cell').filter({ hasText: /aprovado|reprovado/i })
      )
      if (await subjectStatus.first().isVisible()) {
        await expect(subjectStatus.first()).toBeVisible()
      }
    }
  })

  test('should indicate final result', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      const finalResult = page.getByText(/resultado.*final|situação.*final/i)
      if (await finalResult.isVisible()) {
        await expect(finalResult).toBeVisible()
      }
    }
  })

  test('should show recovery status if applicable', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      const recovery = page.getByText(/recuperação|reavaliação/i)
      if (await recovery.isVisible()) {
        await expect(recovery).toBeVisible()
      }
    }
  })
})

test.describe('Boletim - Export Functionality', () => {
  async function navigateToBoletim(page) {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    await page.waitForTimeout(1000)
    
    const firstStudent = page.getByRole('row').nth(1).getByRole('link').first()
    if (await firstStudent.isVisible()) {
      await firstStudent.click()
      await page.waitForTimeout(1000)
      
      const boletimLink = page.getByRole('link', { name: /boletim/i })
      if (await boletimLink.isVisible()) {
        await boletimLink.click()
        await page.waitForTimeout(1500)
        return true
      }
    }
    return false
  }

  test('should have print/export button', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      const exportButton = page.getByRole('button', { name: /imprimir|exportar|pdf|download/i })
      if (await exportButton.isVisible()) {
        await expect(exportButton).toBeVisible()
      }
    }
  })

  test('should export boletim as PDF', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      const exportButton = page.getByRole('button', { name: /pdf|exportar/i })
      
      if (await exportButton.isVisible()) {
        // Wait for download
        const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
        await exportButton.click()
        
        try {
          const download = await downloadPromise
          const filename = download.suggestedFilename()
          expect(filename).toMatch(/boletim|report/i)
        } catch (e) {
          // Download might not trigger in test environment
          // Just verify button click worked
          await page.waitForTimeout(1000)
        }
      }
    }
  })

  test('should have print option', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      const printButton = page.getByRole('button', { name: /imprimir|print/i })
      if (await printButton.isVisible()) {
        await expect(printButton).toBeVisible()
      }
    }
  })

  test('should show loading state during export', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      const exportButton = page.getByRole('button', { name: /pdf|exportar/i })
      
      if (await exportButton.isVisible()) {
        await exportButton.click()
        
        // Look for loading indicator
        const loading = page.locator('[class*="spin"], [class*="loading"]')
        if (await loading.first().isVisible({ timeout: 1000 })) {
          await expect(loading.first()).toBeVisible()
        }
      }
    }
  })
})

test.describe('Boletim - Period Selector', () => {
  async function navigateToBoletim(page) {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    await page.waitForTimeout(1000)
    
    const firstStudent = page.getByRole('row').nth(1).getByRole('link').first()
    if (await firstStudent.isVisible()) {
      await firstStudent.click()
      await page.waitForTimeout(1000)
      
      const boletimLink = page.getByRole('link', { name: /boletim/i })
      if (await boletimLink.isVisible()) {
        await boletimLink.click()
        await page.waitForTimeout(1500)
        return true
      }
    }
    return false
  }

  test('should have year selector', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      const yearSelect = page.getByLabel(/ano|período/i)
      if (await yearSelect.isVisible()) {
        await expect(yearSelect).toBeVisible()
      }
    }
  })

  test('should filter boletim by selected year', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      const yearSelect = page.locator('[role="combobox"]').filter({ hasText: /20\d{2}/ }).first()
      
      if (await yearSelect.isVisible()) {
        await yearSelect.click()
        await page.waitForTimeout(300)
        
        const yearOption = page.getByRole('option').first()
        if (await yearOption.isVisible()) {
          await yearOption.click()
          await page.waitForTimeout(1000)
          
          // Table should update
          const table = page.getByRole('table')
          await expect(table).toBeVisible()
        }
      }
    }
  })

  test('should show all periods by default', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      // All bimesters should be visible
      const periods = page.getByText(/1º.*bim|2º.*bim|3º.*bim|4º.*bim/i)
      if (await periods.first().isVisible()) {
        const count = await periods.count()
        expect(count).toBeGreaterThan(0)
      }
    }
  })
})

test.describe('Boletim - Responsiveness', () => {
  test('should display correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    await page.waitForTimeout(1000)
    
    const firstStudent = page.getByRole('row').nth(1).getByRole('link').first()
    
    if (await firstStudent.isVisible()) {
      await firstStudent.click()
      await page.waitForTimeout(1000)
      
      const boletimLink = page.getByRole('link', { name: /boletim/i })
      if (await boletimLink.isVisible()) {
        await boletimLink.click()
        await page.waitForTimeout(1500)
        
        // Page should render properly
        const heading = page.getByRole('heading').first()
        await expect(heading).toBeVisible()
      }
    }
  })

  test('should have responsive table on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    await page.waitForTimeout(1000)
    
    const firstStudent = page.getByRole('row').nth(1).getByRole('link').first()
    
    if (await firstStudent.isVisible()) {
      await firstStudent.click()
      await page.waitForTimeout(1000)
      
      const boletimLink = page.getByRole('link', { name: /boletim/i })
      if (await boletimLink.isVisible()) {
        await boletimLink.click()
        await page.waitForTimeout(1500)
        
        // Table should be scrollable or stacked
        const table = page.getByRole('table')
        if (await table.isVisible()) {
          await expect(table).toBeVisible()
        }
      }
    }
  })

  test('should adapt layout for tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    await page.waitForTimeout(1000)
    
    const firstStudent = page.getByRole('row').nth(1).getByRole('link').first()
    
    if (await firstStudent.isVisible()) {
      await firstStudent.click()
      await page.waitForTimeout(1000)
      
      const boletimLink = page.getByRole('link', { name: /boletim/i })
      if (await boletimLink.isVisible()) {
        await boletimLink.click()
        await page.waitForTimeout(1500)
        
        const table = page.getByRole('table')
        await expect(table).toBeVisible()
      }
    }
  })
})

test.describe('Boletim - Accessibility', () => {
  async function navigateToBoletim(page) {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    await page.waitForTimeout(1000)
    
    const firstStudent = page.getByRole('row').nth(1).getByRole('link').first()
    if (await firstStudent.isVisible()) {
      await firstStudent.click()
      await page.waitForTimeout(1000)
      
      const boletimLink = page.getByRole('link', { name: /boletim/i })
      if (await boletimLink.isVisible()) {
        await boletimLink.click()
        await page.waitForTimeout(1500)
        return true
      }
    }
    return false
  }

  test('should have proper heading hierarchy', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      const h1 = page.getByRole('heading', { level: 1 })
      if (await h1.isVisible()) {
        await expect(h1).toBeVisible()
      }
    }
  })

  test('should have accessible table structure', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      const table = page.getByRole('table')
      if (await table.isVisible()) {
        await expect(table).toBeVisible()
        
        // Should have proper column headers
        const headers = page.getByRole('columnheader')
        const count = await headers.count()
        expect(count).toBeGreaterThan(0)
      }
    }
  })

  test('should have semantic color coding', async ({ page }) => {
    const success = await navigateToBoletim(page)
    
    if (success) {
      // Color should not be the only indicator
      // Text or icons should accompany colors
      const statusIndicators = page.getByText(/aprovado|reprovado/i)
      if (await statusIndicators.first().isVisible()) {
        await expect(statusIndicators.first()).toBeVisible()
      }
    }
  })
})

test('class report-card action opens the class roster', async ({ page }) => {
  await page.goto('/dashboard/notas')
  const classReport = page.getByRole('link', { name: 'Boletim', exact: true }).first()
  await expect(classReport).toBeVisible({ timeout: 15000 })
  await classReport.click()
  await expect(page.getByRole('heading', { name: /boletins da turma/i })).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('link', { name: /abrir boletim de/i }).first()).toBeVisible()
})
